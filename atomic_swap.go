package types

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

// SwapStatus represents the status of an atomic swap
type SwapStatus int

const (
	// SWAP_STATUS_OPEN represents an open swap
	SWAP_STATUS_OPEN SwapStatus = iota
	// SWAP_STATUS_COMPLETED represents a completed swap
	SWAP_STATUS_COMPLETED
	// SWAP_STATUS_EXPIRED represents an expired swap
	SWAP_STATUS_EXPIRED
)

// String returns the string representation of SwapStatus
func (status SwapStatus) String() string {
	switch status {
	case SWAP_STATUS_OPEN:
		return "Open"
	case SWAP_STATUS_COMPLETED:
		return "Completed"
	case SWAP_STATUS_EXPIRED:
		return "Expired"
	default:
		return "Unknown"
	}
}

// SwapDirection represents the direction of an atomic swap
type SwapDirection int

const (
	// SWAP_DIRECTION_INCOMING represents an incoming swap
	SWAP_DIRECTION_INCOMING SwapDirection = iota
	// SWAP_DIRECTION_OUTGOING represents an outgoing swap
	SWAP_DIRECTION_OUTGOING
)

// String returns the string representation of SwapDirection
func (direction SwapDirection) String() string {
	switch direction {
	case SWAP_DIRECTION_INCOMING:
		return "Incoming"
	case SWAP_DIRECTION_OUTGOING:
		return "Outgoing"
	default:
		return "Unknown"
	}
}

// AtomicSwap represents an atomic swap
type AtomicSwap struct {
	ID                   string        `json:"id" yaml:"id"`
	Sender               string        `json:"sender" yaml:"sender"`
	Recipient            string        `json:"recipient" yaml:"recipient"`
	RecipientOtherChain  string        `json:"recipient_other_chain" yaml:"recipient_other_chain"`
	SenderOtherChain     string        `json:"sender_other_chain" yaml:"sender_other_chain"`
	RandomNumberHash     string        `json:"random_number_hash" yaml:"random_number_hash"`
	RandomNumber         string        `json:"random_number" yaml:"random_number"`
	Timestamp            int64         `json:"timestamp" yaml:"timestamp"`
	Amount               sdk.Coins     `json:"amount" yaml:"amount"`
	HeightSpan           uint64        `json:"height_span" yaml:"height_span"`
	Status               SwapStatus    `json:"status" yaml:"status"`
	CrossChain           bool          `json:"cross_chain" yaml:"cross_chain"`
	Direction            SwapDirection `json:"direction" yaml:"direction"`
	ClosedBlock          int64         `json:"closed_block" yaml:"closed_block"`
	ExpireHeight         uint64        `json:"expire_height" yaml:"expire_height"`
}

// NewAtomicSwap creates a new AtomicSwap
func NewAtomicSwap(
	id, sender, recipient, recipientOtherChain, senderOtherChain, randomNumberHash string,
	timestamp int64, amount sdk.Coins, heightSpan uint64, crossChain bool, direction SwapDirection,
	expireHeight uint64,
) AtomicSwap {
	return AtomicSwap{
		ID:                  id,
		Sender:              sender,
		Recipient:           recipient,
		RecipientOtherChain: recipientOtherChain,
		SenderOtherChain:    senderOtherChain,
		RandomNumberHash:    randomNumberHash,
		Timestamp:           timestamp,
		Amount:              amount,
		HeightSpan:          heightSpan,
		Status:              SWAP_STATUS_OPEN,
		CrossChain:          crossChain,
		Direction:           direction,
		ExpireHeight:        expireHeight,
	}
}

// GetSwapID generates a unique swap ID
func GetSwapID(sender, recipient, randomNumberHash string, timestamp int64) string {
	hash := sha256.Sum256([]byte(fmt.Sprintf("%s:%s:%s:%d", sender, recipient, randomNumberHash, timestamp)))
	return hex.EncodeToString(hash[:])
}

// ValidateAtomicSwap validates an atomic swap
func ValidateAtomicSwap(swap AtomicSwap) error {
	if len(swap.ID) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "swap ID cannot be empty")
	}

	_, err := sdk.AccAddressFromBech32(swap.Sender)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid sender address (%s)", err)
	}

	_, err = sdk.AccAddressFromBech32(swap.Recipient)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid recipient address (%s)", err)
	}

	if len(swap.RandomNumberHash) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "random number hash cannot be empty")
	}

	if !swap.Amount.IsValid() || swap.Amount.IsZero() {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidCoins, "amount must be positive")
	}

	if swap.HeightSpan == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "height span must be positive")
	}

	if swap.Timestamp <= 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "timestamp must be positive")
	}

	return nil
}

// IsExpired checks if the swap has expired
func (swap AtomicSwap) IsExpired(currentHeight uint64) bool {
	return currentHeight >= swap.ExpireHeight
}

// CanClaim checks if the swap can be claimed
func (swap AtomicSwap) CanClaim(currentHeight uint64) bool {
	return swap.Status == SWAP_STATUS_OPEN && !swap.IsExpired(currentHeight)
}

// CanRefund checks if the swap can be refunded
func (swap AtomicSwap) CanRefund(currentHeight uint64) bool {
	return swap.Status == SWAP_STATUS_OPEN && swap.IsExpired(currentHeight)
}

// ValidateRandomNumber validates that the random number matches the hash
func (swap AtomicSwap) ValidateRandomNumber(randomNumber string) bool {
	if len(randomNumber) == 0 {
		return false
	}

	// Decode the random number from hex
	randomNumberBytes, err := hex.DecodeString(randomNumber)
	if err != nil {
		return false
	}

	// Calculate SHA256 hash
	hash := sha256.Sum256(randomNumberBytes)
	calculatedHash := hex.EncodeToString(hash[:])

	// Compare with stored hash (case insensitive)
	return strings.EqualFold(calculatedHash, swap.RandomNumberHash)
}

// GetClaimableAmount returns the amount that can be claimed
func (swap AtomicSwap) GetClaimableAmount() sdk.Coins {
	if swap.Status == SWAP_STATUS_OPEN {
		return swap.Amount
	}
	return sdk.NewCoins()
}

// String returns a human readable string representation of an AtomicSwap
func (swap AtomicSwap) String() string {
	return fmt.Sprintf(`AtomicSwap:
  ID:                   %s
  Sender:               %s
  Recipient:            %s
  RecipientOtherChain:  %s
  SenderOtherChain:     %s
  RandomNumberHash:     %s
  RandomNumber:         %s
  Timestamp:            %d
  Amount:               %s
  HeightSpan:           %d
  Status:               %s
  CrossChain:           %t
  Direction:            %s
  ClosedBlock:          %d
  ExpireHeight:         %d`,
		swap.ID,
		swap.Sender,
		swap.Recipient,
		swap.RecipientOtherChain,
		swap.SenderOtherChain,
		swap.RandomNumberHash,
		swap.RandomNumber,
		swap.Timestamp,
		swap.Amount.String(),
		swap.HeightSpan,
		swap.Status.String(),
		swap.CrossChain,
		swap.Direction.String(),
		swap.ClosedBlock,
		swap.ExpireHeight,
	)
}

// AssetSupply represents the supply of an asset
type AssetSupply struct {
	IncomingSupply sdk.Coin `json:"incoming_supply" yaml:"incoming_supply"`
	OutgoingSupply sdk.Coin `json:"outgoing_supply" yaml:"outgoing_supply"`
	CurrentSupply  sdk.Coin `json:"current_supply" yaml:"current_supply"`
	TimeLimitedCurrentSupply sdk.Coin `json:"time_limited_current_supply" yaml:"time_limited_current_supply"`
	TimeElapsed    time.Duration `json:"time_elapsed" yaml:"time_elapsed"`
}

// NewAssetSupply creates a new AssetSupply
func NewAssetSupply(incomingSupply, outgoingSupply, currentSupply, timeLimitedSupply sdk.Coin, timeElapsed time.Duration) AssetSupply {
	return AssetSupply{
		IncomingSupply:           incomingSupply,
		OutgoingSupply:           outgoingSupply,
		CurrentSupply:            currentSupply,
		TimeLimitedCurrentSupply: timeLimitedSupply,
		TimeElapsed:              timeElapsed,
	}
}

// String returns a human readable string representation of an AssetSupply
func (supply AssetSupply) String() string {
	return fmt.Sprintf(`AssetSupply:
  IncomingSupply:           %s
  OutgoingSupply:           %s
  CurrentSupply:            %s
  TimeLimitedCurrentSupply: %s
  TimeElapsed:              %s`,
		supply.IncomingSupply.String(),
		supply.OutgoingSupply.String(),
		supply.CurrentSupply.String(),
		supply.TimeLimitedCurrentSupply.String(),
		supply.TimeElapsed.String(),
	)
}

