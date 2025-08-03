package types

import (
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/msgservice"
)

// RegisterCodec registers the necessary x/atomicswap interfaces and concrete types
// on the provided LegacyAmino codec. These types are used for Amino JSON serialization.
func RegisterCodec(cdc *codec.LegacyAmino) {
	cdc.RegisterConcrete(&MsgCreateAtomicSwap{}, "atomicswap/MsgCreateAtomicSwap", nil)
	cdc.RegisterConcrete(&MsgClaimAtomicSwap{}, "atomicswap/MsgClaimAtomicSwap", nil)
	cdc.RegisterConcrete(&MsgRefundAtomicSwap{}, "atomicswap/MsgRefundAtomicSwap", nil)
}

// RegisterInterfaces registers the x/atomicswap interfaces types with the interface registry
func RegisterInterfaces(registry types.InterfaceRegistry) {
	registry.RegisterImplementations((*sdk.Msg)(nil),
		&MsgCreateAtomicSwap{},
		&MsgClaimAtomicSwap{},
		&MsgRefundAtomicSwap{},
	)

	msgservice.RegisterMsgServiceDesc(registry, &_Msg_serviceDesc)
}

var (
	// Amino is the legacy amino codec
	Amino = codec.NewLegacyAmino()
	// ModuleCdc is the codec for the module
	ModuleCdc = codec.NewProtoCodec(types.NewInterfaceRegistry())
)

func init() {
	RegisterCodec(Amino)
	Amino.Seal()
}

