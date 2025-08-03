package types

import (
	"encoding/binary"
	"fmt"
)

const (
	// ModuleName defines the module name
	ModuleName = "atomicswap"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// RouterKey defines the module's message routing key
	RouterKey = ModuleName

	// QuerierRoute defines the module's query routing key
	QuerierRoute = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_atomicswap"

	// Version defines the current version the IBC module supports
	Version = "atomicswap-1"

	// PortID is the default port id that module binds to
	PortID = "atomicswap"
)

var (
	// AtomicSwapKeyPrefix is the prefix for atomic swap keys
	AtomicSwapKeyPrefix = []byte{0x01}

	// AtomicSwapByRecipientPrefix is the prefix for atomic swap by recipient keys
	AtomicSwapByRecipientPrefix = []byte{0x02}

	// AtomicSwapBySenderPrefix is the prefix for atomic swap by sender keys
	AtomicSwapBySenderPrefix = []byte{0x03}

	// AtomicSwapByStatusPrefix is the prefix for atomic swap by status keys
	AtomicSwapByStatusPrefix = []byte{0x04}

	// AssetSupplyPrefix is the prefix for asset supply keys
	AssetSupplyPrefix = []byte{0x05}

	// ParamsKey is the prefix for params keys
	ParamsKey = []byte{0x06}

	// PortKey defines the key to store the port ID in store
	PortKey = []byte{0x07}

	// NextSwapIDKey is the key for the next swap ID
	NextSwapIDKey = []byte{0x08}
)

// AtomicSwapKey returns the store key to retrieve an AtomicSwap from the index fields
func AtomicSwapKey(swapID string) []byte {
	return append(AtomicSwapKeyPrefix, []byte(swapID)...)
}

// AtomicSwapByRecipientKey returns the store key for atomic swaps by recipient
func AtomicSwapByRecipientKey(recipient string, swapID string) []byte {
	key := append(AtomicSwapByRecipientPrefix, []byte(recipient)...)
	key = append(key, []byte("/")...)
	return append(key, []byte(swapID)...)
}

// AtomicSwapBySenderKey returns the store key for atomic swaps by sender
func AtomicSwapBySenderKey(sender string, swapID string) []byte {
	key := append(AtomicSwapBySenderPrefix, []byte(sender)...)
	key = append(key, []byte("/")...)
	return append(key, []byte(swapID)...)
}

// AtomicSwapByStatusKey returns the store key for atomic swaps by status
func AtomicSwapByStatusKey(status SwapStatus, swapID string) []byte {
	statusBytes := make([]byte, 8)
	binary.BigEndian.PutUint64(statusBytes, uint64(status))
	key := append(AtomicSwapByStatusPrefix, statusBytes...)
	key = append(key, []byte("/")...)
	return append(key, []byte(swapID)...)
}

// AssetSupplyKey returns the store key for asset supplies
func AssetSupplyKey(denom string) []byte {
	return append(AssetSupplyPrefix, []byte(denom)...)
}

// GetAtomicSwapIDBytes returns the byte representation of the swapID
func GetAtomicSwapIDBytes(swapID string) []byte {
	return []byte(swapID)
}

// GetAtomicSwapIDFromBytes returns swapID in string format from a byte array
func GetAtomicSwapIDFromBytes(bz []byte) string {
	return string(bz)
}

// ParseAtomicSwapByRecipientKey parses the recipient and swap ID from the key
func ParseAtomicSwapByRecipientKey(key []byte) (string, string, error) {
	if len(key) <= len(AtomicSwapByRecipientPrefix) {
		return "", "", fmt.Errorf("invalid key length")
	}

	keyWithoutPrefix := key[len(AtomicSwapByRecipientPrefix):]
	parts := string(keyWithoutPrefix)
	
	// Find the separator
	sepIndex := -1
	for i, char := range parts {
		if char == '/' {
			sepIndex = i
			break
		}
	}
	
	if sepIndex == -1 {
		return "", "", fmt.Errorf("separator not found in key")
	}

	recipient := parts[:sepIndex]
	swapID := parts[sepIndex+1:]

	return recipient, swapID, nil
}

// ParseAtomicSwapBySenderKey parses the sender and swap ID from the key
func ParseAtomicSwapBySenderKey(key []byte) (string, string, error) {
	if len(key) <= len(AtomicSwapBySenderPrefix) {
		return "", "", fmt.Errorf("invalid key length")
	}

	keyWithoutPrefix := key[len(AtomicSwapBySenderPrefix):]
	parts := string(keyWithoutPrefix)
	
	// Find the separator
	sepIndex := -1
	for i, char := range parts {
		if char == '/' {
			sepIndex = i
			break
		}
	}
	
	if sepIndex == -1 {
		return "", "", fmt.Errorf("separator not found in key")
	}

	sender := parts[:sepIndex]
	swapID := parts[sepIndex+1:]

	return sender, swapID, nil
}

// ParseAtomicSwapByStatusKey parses the status and swap ID from the key
func ParseAtomicSwapByStatusKey(key []byte) (SwapStatus, string, error) {
	if len(key) <= len(AtomicSwapByStatusPrefix)+8 {
		return SWAP_STATUS_OPEN, "", fmt.Errorf("invalid key length")
	}

	statusBytes := key[len(AtomicSwapByStatusPrefix):len(AtomicSwapByStatusPrefix)+8]
	status := SwapStatus(binary.BigEndian.Uint64(statusBytes))

	keyWithoutPrefix := key[len(AtomicSwapByStatusPrefix)+8:]
	parts := string(keyWithoutPrefix)
	
	if len(parts) < 2 || parts[0] != '/' {
		return status, "", fmt.Errorf("invalid key format")
	}

	swapID := parts[1:]

	return status, swapID, nil
}

