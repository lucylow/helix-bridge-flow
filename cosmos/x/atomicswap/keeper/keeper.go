package keeper

import (
	"fmt"

	"github.com/cosmos/cosmos-sdk/codec"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	"github.com/tendermint/tendermint/libs/log"

	"github.com/fusion-cosmos-extension/x/atomicswap/types"
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	cdc        codec.BinaryCodec
	storeKey   storetypes.StoreKey
	memKey     storetypes.StoreKey
	paramstore paramtypes.Subspace

	bankKeeper    types.BankKeeper
	accountKeeper types.AccountKeeper
	channelKeeper types.ChannelKeeper
	portKeeper    types.PortKeeper
	scopedKeeper  types.ScopedKeeper
}

// NewKeeper creates a new atomicswap Keeper instance
func NewKeeper(
	cdc codec.BinaryCodec,
	storeKey,
	memKey storetypes.StoreKey,
	ps paramtypes.Subspace,
	bankKeeper types.BankKeeper,
	accountKeeper types.AccountKeeper,
	channelKeeper types.ChannelKeeper,
	portKeeper types.PortKeeper,
	scopedKeeper types.ScopedKeeper,
) *Keeper {
	// set KeyTable if it has not already been set
	if !ps.HasKeyTable() {
		ps = ps.WithKeyTable(types.ParamKeyTable())
	}

	return &Keeper{
		cdc:           cdc,
		storeKey:      storeKey,
		memKey:        memKey,
		paramstore:    ps,
		bankKeeper:    bankKeeper,
		accountKeeper: accountKeeper,
		channelKeeper: channelKeeper,
		portKeeper:    portKeeper,
		scopedKeeper:  scopedKeeper,
	}
}

// Logger returns a module-specific logger.
func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

// CreateAtomicSwap creates a new atomic swap
func (k Keeper) CreateAtomicSwap(
	ctx sdk.Context,
	sender, recipient, recipientOtherChain, senderOtherChain, randomNumberHash string,
	timestamp int64,
	amount sdk.Coins,
	heightSpan uint64,
	crossChain bool,
) (string, error) {
	// Generate swap ID
	swapID := types.GetSwapID(sender, recipient, randomNumberHash, timestamp)

	// Check if swap already exists
	if k.HasAtomicSwap(ctx, swapID) {
		return "", fmt.Errorf("atomic swap with ID %s already exists", swapID)
	}

	// Validate addresses
	senderAddr, err := sdk.AccAddressFromBech32(sender)
	if err != nil {
		return "", fmt.Errorf("invalid sender address: %w", err)
	}

	recipientAddr, err := sdk.AccAddressFromBech32(recipient)
	if err != nil {
		return "", fmt.Errorf("invalid recipient address: %w", err)
	}

	// Check sender has sufficient balance
	if !k.bankKeeper.HasBalance(ctx, senderAddr, amount[0]) {
		return "", fmt.Errorf("insufficient balance")
	}

	// Calculate expiration height
	currentHeight := uint64(ctx.BlockHeight())
	expireHeight := currentHeight + heightSpan

	// Determine direction
	direction := types.SWAP_DIRECTION_OUTGOING
	if crossChain {
		direction = types.SWAP_DIRECTION_INCOMING
	}

	// Create atomic swap
	atomicSwap := types.NewAtomicSwap(
		swapID,
		sender,
		recipient,
		recipientOtherChain,
		senderOtherChain,
		randomNumberHash,
		timestamp,
		amount,
		heightSpan,
		crossChain,
		direction,
		expireHeight,
	)

	// Validate the swap
	if err := types.ValidateAtomicSwap(atomicSwap); err != nil {
		return "", fmt.Errorf("invalid atomic swap: %w", err)
	}

	// Lock the funds by sending them to the module account
	moduleAddr := k.accountKeeper.GetModuleAddress(types.ModuleName)
	if err := k.bankKeeper.SendCoins(ctx, senderAddr, moduleAddr, amount); err != nil {
		return "", fmt.Errorf("failed to lock funds: %w", err)
	}

	// Store the atomic swap
	k.SetAtomicSwap(ctx, atomicSwap)

	// Update asset supply
	k.UpdateAssetSupply(ctx, amount[0], direction)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeCreateAtomicSwap,
			sdk.NewAttribute(types.AttributeKeySwapID, swapID),
			sdk.NewAttribute(types.AttributeKeySender, sender),
			sdk.NewAttribute(types.AttributeKeyRecipient, recipient),
			sdk.NewAttribute(types.AttributeKeyAmount, amount.String()),
			sdk.NewAttribute(types.AttributeKeyRandomNumberHash, randomNumberHash),
			sdk.NewAttribute(types.AttributeKeyTimestamp, fmt.Sprintf("%d", timestamp)),
			sdk.NewAttribute(types.AttributeKeyHeightSpan, fmt.Sprintf("%d", heightSpan)),
			sdk.NewAttribute(types.AttributeKeyCrossChain, fmt.Sprintf("%t", crossChain)),
		),
	)

	return swapID, nil
}

// ClaimAtomicSwap claims an atomic swap by revealing the random number
func (k Keeper) ClaimAtomicSwap(ctx sdk.Context, swapID, randomNumber, claimer string) error {
	// Get the atomic swap
	atomicSwap, found := k.GetAtomicSwap(ctx, swapID)
	if !found {
		return fmt.Errorf("atomic swap with ID %s not found", swapID)
	}

	// Check if swap can be claimed
	currentHeight := uint64(ctx.BlockHeight())
	if !atomicSwap.CanClaim(currentHeight) {
		return fmt.Errorf("atomic swap cannot be claimed")
	}

	// Validate claimer is the recipient
	if claimer != atomicSwap.Recipient {
		return fmt.Errorf("only recipient can claim the swap")
	}

	// Validate random number
	if !atomicSwap.ValidateRandomNumber(randomNumber) {
		return fmt.Errorf("invalid random number")
	}

	// Get recipient address
	recipientAddr, err := sdk.AccAddressFromBech32(atomicSwap.Recipient)
	if err != nil {
		return fmt.Errorf("invalid recipient address: %w", err)
	}

	// Transfer funds from module account to recipient
	moduleAddr := k.accountKeeper.GetModuleAddress(types.ModuleName)
	if err := k.bankKeeper.SendCoins(ctx, moduleAddr, recipientAddr, atomicSwap.Amount); err != nil {
		return fmt.Errorf("failed to transfer funds: %w", err)
	}

	// Update swap status
	atomicSwap.Status = types.SWAP_STATUS_COMPLETED
	atomicSwap.RandomNumber = randomNumber
	atomicSwap.ClosedBlock = ctx.BlockHeight()

	// Store updated swap
	k.SetAtomicSwap(ctx, atomicSwap)

	// Update asset supply
	k.UpdateAssetSupply(ctx, atomicSwap.Amount[0], atomicSwap.Direction)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeClaimAtomicSwap,
			sdk.NewAttribute(types.AttributeKeySwapID, swapID),
			sdk.NewAttribute(types.AttributeKeyClaimer, claimer),
			sdk.NewAttribute(types.AttributeKeyRandomNumber, randomNumber),
			sdk.NewAttribute(types.AttributeKeyAmount, atomicSwap.Amount.String()),
		),
	)

	return nil
}

// RefundAtomicSwap refunds an expired atomic swap
func (k Keeper) RefundAtomicSwap(ctx sdk.Context, swapID, refunder string) error {
	// Get the atomic swap
	atomicSwap, found := k.GetAtomicSwap(ctx, swapID)
	if !found {
		return fmt.Errorf("atomic swap with ID %s not found", swapID)
	}

	// Check if swap can be refunded
	currentHeight := uint64(ctx.BlockHeight())
	if !atomicSwap.CanRefund(currentHeight) {
		return fmt.Errorf("atomic swap cannot be refunded")
	}

	// Validate refunder is the sender
	if refunder != atomicSwap.Sender {
		return fmt.Errorf("only sender can refund the swap")
	}

	// Get sender address
	senderAddr, err := sdk.AccAddressFromBech32(atomicSwap.Sender)
	if err != nil {
		return fmt.Errorf("invalid sender address: %w", err)
	}

	// Transfer funds from module account back to sender
	moduleAddr := k.accountKeeper.GetModuleAddress(types.ModuleName)
	if err := k.bankKeeper.SendCoins(ctx, moduleAddr, senderAddr, atomicSwap.Amount); err != nil {
		return fmt.Errorf("failed to refund funds: %w", err)
	}

	// Update swap status
	atomicSwap.Status = types.SWAP_STATUS_EXPIRED
	atomicSwap.ClosedBlock = ctx.BlockHeight()

	// Store updated swap
	k.SetAtomicSwap(ctx, atomicSwap)

	// Update asset supply
	k.UpdateAssetSupply(ctx, atomicSwap.Amount[0], atomicSwap.Direction)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeRefundAtomicSwap,
			sdk.NewAttribute(types.AttributeKeySwapID, swapID),
			sdk.NewAttribute(types.AttributeKeyRefunder, refunder),
			sdk.NewAttribute(types.AttributeKeyAmount, atomicSwap.Amount.String()),
		),
	)

	return nil
}

// SetAtomicSwap stores an atomic swap
func (k Keeper) SetAtomicSwap(ctx sdk.Context, atomicSwap types.AtomicSwap) {
	store := ctx.KVStore(k.storeKey)
	bz := k.cdc.MustMarshal(&atomicSwap)
	store.Set(types.AtomicSwapKey(atomicSwap.ID), bz)

	// Set secondary indexes
	store.Set(types.AtomicSwapByRecipientKey(atomicSwap.Recipient, atomicSwap.ID), []byte{})
	store.Set(types.AtomicSwapBySenderKey(atomicSwap.Sender, atomicSwap.ID), []byte{})
	store.Set(types.AtomicSwapByStatusKey(atomicSwap.Status, atomicSwap.ID), []byte{})
}

// GetAtomicSwap retrieves an atomic swap by ID
func (k Keeper) GetAtomicSwap(ctx sdk.Context, swapID string) (types.AtomicSwap, bool) {
	store := ctx.KVStore(k.storeKey)
	bz := store.Get(types.AtomicSwapKey(swapID))
	if bz == nil {
		return types.AtomicSwap{}, false
	}

	var atomicSwap types.AtomicSwap
	k.cdc.MustUnmarshal(bz, &atomicSwap)
	return atomicSwap, true
}

// HasAtomicSwap checks if an atomic swap exists
func (k Keeper) HasAtomicSwap(ctx sdk.Context, swapID string) bool {
	store := ctx.KVStore(k.storeKey)
	return store.Has(types.AtomicSwapKey(swapID))
}

// DeleteAtomicSwap removes an atomic swap from the store
func (k Keeper) DeleteAtomicSwap(ctx sdk.Context, swapID string) {
	// Get the swap first to clean up indexes
	atomicSwap, found := k.GetAtomicSwap(ctx, swapID)
	if !found {
		return
	}

	store := ctx.KVStore(k.storeKey)
	
	// Remove main entry
	store.Delete(types.AtomicSwapKey(swapID))
	
	// Remove secondary indexes
	store.Delete(types.AtomicSwapByRecipientKey(atomicSwap.Recipient, swapID))
	store.Delete(types.AtomicSwapBySenderKey(atomicSwap.Sender, swapID))
	store.Delete(types.AtomicSwapByStatusKey(atomicSwap.Status, swapID))
}

// GetAllAtomicSwaps retrieves all atomic swaps
func (k Keeper) GetAllAtomicSwaps(ctx sdk.Context) []types.AtomicSwap {
	store := ctx.KVStore(k.storeKey)
	iterator := sdk.KVStorePrefixIterator(store, types.AtomicSwapKeyPrefix)
	defer iterator.Close()

	var swaps []types.AtomicSwap
	for ; iterator.Valid(); iterator.Next() {
		var swap types.AtomicSwap
		k.cdc.MustUnmarshal(iterator.Value(), &swap)
		swaps = append(swaps, swap)
	}

	return swaps
}

// UpdateAssetSupply updates the asset supply for a given coin and direction
func (k Keeper) UpdateAssetSupply(ctx sdk.Context, coin sdk.Coin, direction types.SwapDirection) {
	// This is a simplified implementation
	// In a real implementation, you would track incoming/outgoing supplies
	// and update them based on the swap direction and status
	
	supply, found := k.GetAssetSupply(ctx, coin.Denom)
	if !found {
		supply = types.NewAssetSupply(
			sdk.NewCoin(coin.Denom, sdk.ZeroInt()),
			sdk.NewCoin(coin.Denom, sdk.ZeroInt()),
			sdk.NewCoin(coin.Denom, sdk.ZeroInt()),
			sdk.NewCoin(coin.Denom, sdk.ZeroInt()),
			0,
		)
	}

	// Update supply based on direction
	if direction == types.SWAP_DIRECTION_INCOMING {
		supply.IncomingSupply = supply.IncomingSupply.Add(coin)
	} else {
		supply.OutgoingSupply = supply.OutgoingSupply.Add(coin)
	}

	k.SetAssetSupply(ctx, supply, coin.Denom)
}

// SetAssetSupply stores an asset supply
func (k Keeper) SetAssetSupply(ctx sdk.Context, supply types.AssetSupply, denom string) {
	store := ctx.KVStore(k.storeKey)
	bz := k.cdc.MustMarshal(&supply)
	store.Set(types.AssetSupplyKey(denom), bz)
}

// GetAssetSupply retrieves an asset supply by denom
func (k Keeper) GetAssetSupply(ctx sdk.Context, denom string) (types.AssetSupply, bool) {
	store := ctx.KVStore(k.storeKey)
	bz := store.Get(types.AssetSupplyKey(denom))
	if bz == nil {
		return types.AssetSupply{}, false
	}

	var supply types.AssetSupply
	k.cdc.MustUnmarshal(bz, &supply)
	return supply, true
}

