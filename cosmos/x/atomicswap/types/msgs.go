package types

import (
	"time"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

const (
	TypeMsgCreateAtomicSwap = "create_atomic_swap"
	TypeMsgClaimAtomicSwap  = "claim_atomic_swap"
	TypeMsgRefundAtomicSwap = "refund_atomic_swap"
)

var (
	_ sdk.Msg = &MsgCreateAtomicSwap{}
	_ sdk.Msg = &MsgClaimAtomicSwap{}
	_ sdk.Msg = &MsgRefundAtomicSwap{}
)

// MsgCreateAtomicSwap defines the message for creating an atomic swap
type MsgCreateAtomicSwap struct {
	Sender           string    `json:"sender" yaml:"sender"`
	Recipient        string    `json:"recipient" yaml:"recipient"`
	RecipientOtherChain string `json:"recipient_other_chain" yaml:"recipient_other_chain"`
	SenderOtherChain string    `json:"sender_other_chain" yaml:"sender_other_chain"`
	RandomNumberHash string    `json:"random_number_hash" yaml:"random_number_hash"`
	Timestamp        int64     `json:"timestamp" yaml:"timestamp"`
	Amount           sdk.Coins `json:"amount" yaml:"amount"`
	HeightSpan       uint64    `json:"height_span" yaml:"height_span"`
	CrossChain       bool      `json:"cross_chain" yaml:"cross_chain"`
}

// NewMsgCreateAtomicSwap creates a new MsgCreateAtomicSwap instance
func NewMsgCreateAtomicSwap(
	sender, recipient, recipientOtherChain, senderOtherChain, randomNumberHash string,
	timestamp int64, amount sdk.Coins, heightSpan uint64, crossChain bool,
) *MsgCreateAtomicSwap {
	return &MsgCreateAtomicSwap{
		Sender:              sender,
		Recipient:           recipient,
		RecipientOtherChain: recipientOtherChain,
		SenderOtherChain:    senderOtherChain,
		RandomNumberHash:    randomNumberHash,
		Timestamp:           timestamp,
		Amount:              amount,
		HeightSpan:          heightSpan,
		CrossChain:          crossChain,
	}
}

// Route returns the route for the message
func (msg MsgCreateAtomicSwap) Route() string {
	return RouterKey
}

// Type returns the type for the message
func (msg MsgCreateAtomicSwap) Type() string {
	return TypeMsgCreateAtomicSwap
}

// GetSigners returns the signers for the message
func (msg MsgCreateAtomicSwap) GetSigners() []sdk.AccAddress {
	sender, err := sdk.AccAddressFromBech32(msg.Sender)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{sender}
}

// GetSignBytes returns the sign bytes for the message
func (msg MsgCreateAtomicSwap) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(&msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic validates the message
func (msg MsgCreateAtomicSwap) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Sender)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid sender address (%s)", err)
	}

	_, err = sdk.AccAddressFromBech32(msg.Recipient)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid recipient address (%s)", err)
	}

	if len(msg.RandomNumberHash) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "random number hash cannot be empty")
	}

	if !msg.Amount.IsValid() || msg.Amount.IsZero() {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidCoins, "amount must be positive")
	}

	if msg.HeightSpan == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "height span must be positive")
	}

	if msg.Timestamp <= 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "timestamp must be positive")
	}

	return nil
}

// MsgClaimAtomicSwap defines the message for claiming an atomic swap
type MsgClaimAtomicSwap struct {
	Sender       string `json:"sender" yaml:"sender"`
	SwapID       string `json:"swap_id" yaml:"swap_id"`
	RandomNumber string `json:"random_number" yaml:"random_number"`
}

// NewMsgClaimAtomicSwap creates a new MsgClaimAtomicSwap instance
func NewMsgClaimAtomicSwap(sender, swapID, randomNumber string) *MsgClaimAtomicSwap {
	return &MsgClaimAtomicSwap{
		Sender:       sender,
		SwapID:       swapID,
		RandomNumber: randomNumber,
	}
}

// Route returns the route for the message
func (msg MsgClaimAtomicSwap) Route() string {
	return RouterKey
}

// Type returns the type for the message
func (msg MsgClaimAtomicSwap) Type() string {
	return TypeMsgClaimAtomicSwap
}

// GetSigners returns the signers for the message
func (msg MsgClaimAtomicSwap) GetSigners() []sdk.AccAddress {
	sender, err := sdk.AccAddressFromBech32(msg.Sender)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{sender}
}

// GetSignBytes returns the sign bytes for the message
func (msg MsgClaimAtomicSwap) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(&msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic validates the message
func (msg MsgClaimAtomicSwap) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Sender)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid sender address (%s)", err)
	}

	if len(msg.SwapID) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "swap ID cannot be empty")
	}

	if len(msg.RandomNumber) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "random number cannot be empty")
	}

	return nil
}

// MsgRefundAtomicSwap defines the message for refunding an atomic swap
type MsgRefundAtomicSwap struct {
	Sender string `json:"sender" yaml:"sender"`
	SwapID string `json:"swap_id" yaml:"swap_id"`
}

// NewMsgRefundAtomicSwap creates a new MsgRefundAtomicSwap instance
func NewMsgRefundAtomicSwap(sender, swapID string) *MsgRefundAtomicSwap {
	return &MsgRefundAtomicSwap{
		Sender: sender,
		SwapID: swapID,
	}
}

// Route returns the route for the message
func (msg MsgRefundAtomicSwap) Route() string {
	return RouterKey
}

// Type returns the type for the message
func (msg MsgRefundAtomicSwap) Type() string {
	return TypeMsgRefundAtomicSwap
}

// GetSigners returns the signers for the message
func (msg MsgRefundAtomicSwap) GetSigners() []sdk.AccAddress {
	sender, err := sdk.AccAddressFromBech32(msg.Sender)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{sender}
}

// GetSignBytes returns the sign bytes for the message
func (msg MsgRefundAtomicSwap) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(&msg)
	return sdk.MustSortJSON(bz)
}

// ValidateBasic validates the message
func (msg MsgRefundAtomicSwap) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Sender)
	if err != nil {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid sender address (%s)", err)
	}

	if len(msg.SwapID) == 0 {
		return sdkerrors.Wrap(sdkerrors.ErrInvalidRequest, "swap ID cannot be empty")
	}

	return nil
}

