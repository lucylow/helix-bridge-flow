package types

// Event types for the atomicswap module
const (
	EventTypeCreateAtomicSwap = "create_atomic_swap"
	EventTypeClaimAtomicSwap  = "claim_atomic_swap"
	EventTypeRefundAtomicSwap = "refund_atomic_swap"

	AttributeKeySwapID           = "swap_id"
	AttributeKeySender           = "sender"
	AttributeKeyRecipient        = "recipient"
	AttributeKeyClaimer          = "claimer"
	AttributeKeyRefunder         = "refunder"
	AttributeKeyAmount           = "amount"
	AttributeKeyRandomNumberHash = "random_number_hash"
	AttributeKeyRandomNumber     = "random_number"
	AttributeKeyTimestamp        = "timestamp"
	AttributeKeyHeightSpan       = "height_span"
	AttributeKeyCrossChain       = "cross_chain"
	AttributeKeyDirection        = "direction"
	AttributeKeyStatus           = "status"
	AttributeKeyExpireHeight     = "expire_height"

	AttributeValueCategory = ModuleName
)

