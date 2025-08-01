package types

import (
	"fmt"
	"time"

	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	"gopkg.in/yaml.v2"
)

var _ paramtypes.ParamSet = (*Params)(nil)

// Parameter store keys
var (
	KeyMinBlockLock    = []byte("MinBlockLock")
	KeyMaxBlockLock    = []byte("MaxBlockLock")
	KeySupportedAssets = []byte("SupportedAssets")
)

// ParamKeyTable the param key table for launch module
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// NewParams creates a new Params instance
func NewParams(minBlockLock, maxBlockLock uint64, supportedAssets []string) Params {
	return Params{
		MinBlockLock:    minBlockLock,
		MaxBlockLock:    maxBlockLock,
		SupportedAssets: supportedAssets,
	}
}

// DefaultParams returns a default set of parameters
func DefaultParams() Params {
	return NewParams(
		220,    // ~1 hour at 15 second blocks
		518400, // ~3 months at 15 second blocks
		[]string{"uatom", "stake"}, // Default supported assets
	)
}

// ParamSetPairs get the params.ParamSet
func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
	return paramtypes.ParamSetPairs{
		paramtypes.NewParamSetPair(KeyMinBlockLock, &p.MinBlockLock, validateMinBlockLock),
		paramtypes.NewParamSetPair(KeyMaxBlockLock, &p.MaxBlockLock, validateMaxBlockLock),
		paramtypes.NewParamSetPair(KeySupportedAssets, &p.SupportedAssets, validateSupportedAssets),
	}
}

// Validate validates the set of params
func (p Params) Validate() error {
	if err := validateMinBlockLock(p.MinBlockLock); err != nil {
		return err
	}

	if err := validateMaxBlockLock(p.MaxBlockLock); err != nil {
		return err
	}

	if err := validateSupportedAssets(p.SupportedAssets); err != nil {
		return err
	}

	if p.MinBlockLock >= p.MaxBlockLock {
		return fmt.Errorf("min block lock must be less than max block lock")
	}

	return nil
}

// String implements the Stringer interface.
func (p Params) String() string {
	out, _ := yaml.Marshal(p)
	return string(out)
}

func validateMinBlockLock(i interface{}) error {
	v, ok := i.(uint64)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}

	if v == 0 {
		return fmt.Errorf("min block lock must be positive")
	}

	return nil
}

func validateMaxBlockLock(i interface{}) error {
	v, ok := i.(uint64)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}

	if v == 0 {
		return fmt.Errorf("max block lock must be positive")
	}

	return nil
}

func validateSupportedAssets(i interface{}) error {
	v, ok := i.([]string)
	if !ok {
		return fmt.Errorf("invalid parameter type: %T", i)
	}

	if len(v) == 0 {
		return fmt.Errorf("supported assets cannot be empty")
	}

	// Check for duplicates
	seen := make(map[string]bool)
	for _, asset := range v {
		if seen[asset] {
			return fmt.Errorf("duplicate asset: %s", asset)
		}
		seen[asset] = true

		if len(asset) == 0 {
			return fmt.Errorf("asset denom cannot be empty")
		}
	}

	return nil
}

// Params defines the parameters for the module.
type Params struct {
	MinBlockLock    uint64   `protobuf:"varint,1,opt,name=min_block_lock,json=minBlockLock,proto3" json:"min_block_lock,omitempty" yaml:"min_block_lock"`
	MaxBlockLock    uint64   `protobuf:"varint,2,opt,name=max_block_lock,json=maxBlockLock,proto3" json:"max_block_lock,omitempty" yaml:"max_block_lock"`
	SupportedAssets []string `protobuf:"bytes,3,rep,name=supported_assets,json=supportedAssets,proto3" json:"supported_assets,omitempty" yaml:"supported_assets"`
}

