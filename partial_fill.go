package types

import (
	"crypto/sha256"
	"fmt"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tendermint/tendermint/crypto/merkle"
)

// Order status constants
const (
	StatusOpen      = "open"
	StatusPartially = "partially_filled"
	StatusFilled    = "filled"
	StatusSettled   = "settled"
	StatusExpired   = "expired"
)

// PartialFillOrder represents an order with partial fill capability
type PartialFillOrder struct {
	ID               string         `json:"id"`
	Maker            sdk.AccAddress `json:"maker"`
	TotalAmount      sdk.Int        `json:"total_amount"`
	FilledAmount     sdk.Int        `json:"filled_amount"`
	MerkleRoot       []byte         `json:"merkle_root"`
	CurrentFillLevel uint8          `json:"current_fill_level"` // 0-3: partial fills, 4: completion
	Status           string         `json:"status"`
	MakerDenom       string         `json:"maker_denom"`
	TakerDenom       string         `json:"taker_denom"`
	Expiration       time.Time      `json:"expiration"`
	ChainReferences  []ChainRef     `json:"chain_refs"` // Cross-chain state references
}

// ChainRef tracks cross-chain state synchronization
type ChainRef struct {
	ChainID     string `json:"chain_id"`
	StateRoot   []byte `json:"state_root"`
	BlockHeight int64  `json:"block_height"`
}

// FillOperation represents a single fill action
type FillOperation struct {
	Type        string         `json:"type"`         // "partial" or "completion"
	Resolver    sdk.AccAddress `json:"resolver"`     // Executing resolver
	Amount      sdk.Int        `json:"amount"`       // Filled amount (0 for completion)
	SecretHash  []byte         `json:"secret_hash"`  // Hash of revealed secret
	ChainID     string         `json:"chain_id"`     // Origin chain
	BlockHeight int64          `json:"block_height"` // Block height of operation
}

// NewPartialFillOrder creates a new partial fill order
func NewPartialFillOrder(
	id string,
	maker sdk.AccAddress,
	totalAmount sdk.Int,
	merkleRoot []byte,
	makerDenom string,
	takerDenom string,
	expiration time.Time,
	chainRefs []ChainRef,
) PartialFillOrder {
	return PartialFillOrder{
		ID:               id,
		Maker:            maker,
		TotalAmount:      totalAmount,
		FilledAmount:     sdk.NewInt(0),
		MerkleRoot:       merkleRoot,
		CurrentFillLevel: 0,
		Status:           StatusOpen,
		MakerDenom:       makerDenom,
		TakerDenom:       takerDenom,
		Expiration:       expiration,
		ChainReferences:  chainRefs,
	}
}

// HandleFill handles both partial fills and completion operations
func (order *PartialFillOrder) HandleFill(
	ctx sdk.Context,
	resolver sdk.AccAddress,
	secret []byte,
	proof *merkle.SimpleProof,
) (sdk.Int, error) {

	// Validate order state
	if err := order.validateState(ctx.BlockTime()); err != nil {
		return sdk.Int{}, err
	}

	// Determine operation type
	operationType := "partial"
	if order.CurrentFillLevel == 4 {
		operationType = "completion"
	}

	// Verify Merkle proof
	if err := verifySecretProof(secret, proof, order.MerkleRoot, order.CurrentFillLevel); err != nil {
		return sdk.Int{}, err
	}

	// Process operation
	switch operationType {
	case "partial":
		return order.handlePartialFill(ctx, resolver, secret)
	case "completion":
		return sdk.ZeroInt(), order.handleCompletion(ctx, resolver, secret)
	default:
		return sdk.Int{}, fmt.Errorf("invalid operation type")
	}
}

func (order *PartialFillOrder) validateState(blockTime time.Time) error {
	switch {
	case order.Status == StatusSettled || order.Status == StatusExpired:
		return fmt.Errorf("order %s in terminal state: %s", order.ID, order.Status)
	case blockTime.After(order.Expiration):
		order.Status = StatusExpired
		return fmt.Errorf("order expired")
	case order.CurrentFillLevel > 4:
		return fmt.Errorf("invalid fill level: %d", order.CurrentFillLevel)
	}
	return nil
}

func verifySecretProof(secret []byte, proof *merkle.SimpleProof, root []byte, level uint8) error {
	leafHash := sha256.Sum256(secret)
	
	if proof.Index != int64(level) {
		return fmt.Errorf("proof level %d ≠ current level %d", proof.Index, level)
	}
	
	if !proof.Verify(root, leafHash[:]) {
		return fmt.Errorf("merkle proof verification failed")
	}
	return nil
}

func (order *PartialFillOrder) handlePartialFill(
	ctx sdk.Context,
	resolver sdk.AccAddress,
	secret []byte,
) (sdk.Int, error) {
	
	// Calculate fill amount
	fillAmount := order.calculatePartialFillAmount()
	if fillAmount.IsZero() {
		return sdk.Int{}, fmt.Errorf("invalid fill amount calculation")
	}

	// Update state
	order.FilledAmount = order.FilledAmount.Add(fillAmount)
	order.CurrentFillLevel++

	// Transition status
	switch {
	case order.FilledAmount.LT(order.TotalAmount):
		order.Status = StatusPartially
	case order.FilledAmount.Equal(order.TotalAmount):
		order.Status = StatusFilled
	default:
		return sdk.Int{}, fmt.Errorf("fill amount exceeds total")
	}

	return fillAmount, nil
}

func (order *PartialFillOrder) calculatePartialFillAmount() sdk.Int {
	switch order.CurrentFillLevel {
	case 0: // 0% → 25%
		return order.TotalAmount.QuoRaw(4)
	case 1: // 25% → 50%
		return order.TotalAmount.QuoRaw(4)
	case 2: // 50% → 75%
		return order.TotalAmount.QuoRaw(4)
	case 3: // 75% → 100%
		return order.TotalAmount.Sub(order.FilledAmount)
	default:
		return sdk.ZeroInt()
	}
}

func (order *PartialFillOrder) handleCompletion(
	ctx sdk.Context,
	resolver sdk.AccAddress,
	secret []byte,
) error {
	
	// Final validation
	if order.Status != StatusFilled {
		return fmt.Errorf("completion requires fully filled status")
	}

	// Update state
	order.Status = StatusSettled
	order.CurrentFillLevel++

	return nil
}

// CrossChainSync synchronizes state with other chains
func (order *PartialFillOrder) CrossChainSync(
	ctx sdk.Context,
	keeper interface{},
) error {
	
	// Update latest state references
	order.ChainReferences = append(order.ChainReferences, ChainRef{
		ChainID:     ctx.ChainID(),
		StateRoot:   []byte("state_root_placeholder"),
		BlockHeight: ctx.BlockHeight(),
	})

	return nil
}

