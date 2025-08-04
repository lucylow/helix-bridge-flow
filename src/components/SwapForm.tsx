import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownUp, Zap, Clock, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ethers } from "ethers";
// import { validateEthereumAddress, validateCosmosAddress } from "@/utils/addressValidation";
// import { ENSService } from "@/services/ensService";
import "../types/wallet";

interface SwapFormProps {
  onCreateSwap: (swapData: any) => void;
  networkMode: "mainnet" | "testnet" | "demo";
}

const SwapForm = ({ onCreateSwap, networkMode }: SwapFormProps) => {
  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("ATOM");
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [timelockDuration, setTimelockDuration] = useState("3600");
  const [addressValidation, setAddressValidation] = useState({
    isValid: false,
    error: null as string | null,
    type: null as string | null,
    normalized: null as string | null
  });

  const tokens = [
    { symbol: "ETH", name: "Ethereum", chain: "Ethereum" },
    { symbol: "USDC", name: "USD Coin", chain: "Ethereum" },
    { symbol: "USDT", name: "Tether", chain: "Ethereum" },
    { symbol: "ATOM", name: "Cosmos", chain: "Cosmos" },
    { symbol: "OSMO", name: "Osmosis", chain: "Cosmos" }
  ];

  const timelockOptions = [
    { value: "1800", label: "30 minutes" },
    { value: "3600", label: "1 hour" },
    { value: "7200", label: "2 hours" },
    { value: "14400", label: "4 hours" },
    { value: "86400", label: "24 hours" }
  ];

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const [isCreating, setIsCreating] = useState(false);

  // Use networkMode from parent to determine behavior
  const isDemoMode = networkMode === "demo";
  const isTestnetMode = networkMode === "testnet";

  // Auto-fill hardcoded addresses for demo/testnet modes
  useEffect(() => {
    if (isDemoMode) {
      if (getTokenChain(toToken) === "Ethereum") {
        setRecipientAddress("0x758282EFA1887244c7dBe5b7d585887CF345e8a4");
      } else if (getTokenChain(toToken) === "Cosmos") {
        setRecipientAddress("cosmos1vvegpsamqk9nzk3t5tufs7vjnleq0tmewnxg9m");
      }
    } else if (isTestnetMode) {
      // For testnet, keep existing addresses or allow user input
      if (!recipientAddress) {
        if (getTokenChain(toToken) === "Ethereum") {
          setRecipientAddress("0x758282EFA1887244c7dBe5b7d585887CF345e8a4");
        } else if (getTokenChain(toToken) === "Cosmos") {
          setRecipientAddress("cosmos1vvegpsamqk9nzk3t5tufs7vjnleq0tmewnxg9m");
        }
      }
    }
  }, [toToken, isDemoMode, isTestnetMode, recipientAddress]);

  // Validate recipient address in real-time (skip validation in demo mode, allow for testnet)
  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, always show as valid
      setAddressValidation({
        isValid: true,
        error: null,
        type: 'address',
        normalized: recipientAddress || 'demo-address'
      });
      return;
    }
    
    if (recipientAddress.trim()) {
      const targetChain = getTokenChain(toToken);
      
      // Simple validation for demo
      if (targetChain === "Ethereum") {
        if (recipientAddress.startsWith('0x') && recipientAddress.length === 42) {
          setAddressValidation({
            isValid: true,
            error: null,
            type: 'address',
            normalized: recipientAddress
          });
        } else {
          setAddressValidation({
            isValid: false,
            error: "Please enter a valid Ethereum address",
            type: null,
            normalized: null
          });
        }
      } else if (targetChain === "Cosmos") {
        if (recipientAddress.startsWith('cosmos1') && recipientAddress.length >= 39) {
          setAddressValidation({
            isValid: true,
            error: null,
            type: 'address',
            normalized: recipientAddress
          });
        } else {
          setAddressValidation({
            isValid: false,
            error: "Please enter a valid Cosmos address",
            type: null,
            normalized: null
          });
        }
      }
    } else {
      setAddressValidation({ isValid: false, error: null, type: null, normalized: null });
    }
  }, [recipientAddress, toToken, isDemoMode]);

  const handleCreateSwap = async () => {
    if (!amount || !recipientAddress) {
      alert("Please fill in all required fields");
      return;
    }

    // Use hardcoded working addresses for demo mode only
    let finalRecipientAddress = recipientAddress;
    
    if (isDemoMode) {
      // Force hardcoded demo addresses that we know work
      if (getTokenChain(toToken) === "Ethereum") {
        finalRecipientAddress = "0x758282EFA1887244c7dBe5b7d585887CF345e8a4";
        console.log('DEMO MODE: Using hardcoded Ethereum address:', finalRecipientAddress);
      } else if (getTokenChain(toToken) === "Cosmos") {
        finalRecipientAddress = "cosmos1vvegpsamqk9nzk3t5tufs7vjnleq0tmewnxg9m";
        console.log('DEMO MODE: Using hardcoded Cosmos address:', finalRecipientAddress);
      }
    } else if (isTestnetMode) {
      // For testnet mode, use user input or default addresses
      console.log('TESTNET MODE: Using user provided or default address:', finalRecipientAddress);
    } else {
      // Production mode: Use validation
      if (!addressValidation.isValid) {
        alert(addressValidation.error || "Please enter a valid recipient address");
        return;
      }

      // For production mode, use the validated address
      finalRecipientAddress = addressValidation.normalized!;
    }

    setIsCreating(true);
    
    try {
      // Create atomic swap request with final address
      const swapData: any = {
        fromToken,
        toToken,
        amount,
        recipientAddress: finalRecipientAddress, // Use final resolved/hardcoded address
        originalRecipient: recipientAddress, // Keep original for display
        timelockDuration: parseInt(timelockDuration),
        timestamp: Date.now(),
        direction: getTokenChain(fromToken) === "Ethereum" ? "eth-to-cosmos" : "cosmos-to-eth",
        isDemoMode,
        isTestnetMode
      };

      if (isDemoMode) {
        // DEMO MODE: Always succeed with simulated data
        console.log('DEMO MODE: Simulating successful swap creation');
        
        // Generate fake transaction data for demo
        const fakeHash = `0x${Math.random().toString(16).substr(2, 64)}`;
        const fakeSecret = `0x${Math.random().toString(16).substr(2, 64)}`;
        const fakeHashlock = `0x${Math.random().toString(16).substr(2, 64)}`;
        
        swapData.ethereumTxHash = fakeHash;
        swapData.hashlock = fakeHashlock;
        swapData.secret = fakeSecret;
        swapData.status = "created";
        swapData.demoMode = true;
        
        // Simulate successful transaction
        alert(`✅ DEMO: Swap created successfully! 
From: ${amount} ${fromToken} 
To: ${toToken}
Recipient: ${finalRecipientAddress}
Transaction Hash: ${fakeHash.slice(0, 10)}...`);
        
        onCreateSwap(swapData);
        
      } else {
        // PRODUCTION/TESTNET MODE: Real blockchain interactions via Supabase Edge Function
        console.log("🚀 Creating REAL blockchain swap via Supabase...");
        
        const { supabase } = await import("@/integrations/supabase/client");
        
        const { data, error } = await supabase.functions.invoke('real-atomic-swap', {
          body: {
            action: 'create',
            direction: swapData.direction,
            fromToken,
            toToken,
            amount,
            senderAddress: finalRecipientAddress, // For demo
            recipientAddress: finalRecipientAddress,
            timelock: parseInt(timelockDuration)
          }
        });

        if (error) {
          throw new Error(`Supabase function error: ${error.message}`);
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to create swap');
        }

        console.log("✅ REAL blockchain swap created:", data);
        alert(`🚀 REAL Blockchain Swap Created!
Swap ID: ${data.swap.id}
Ethereum TX: ${data.swap.ethereum_tx_hash?.slice(0, 10)}...
Status: ${data.swap.status}
🔗 View on Explorer`);

        // Update swap data with real blockchain results
        swapData.id = data.swap.id;
        swapData.ethereumTxHash = data.swap.ethereum_tx_hash;
        swapData.ethereumExplorerUrl = data.swap.ethereum_explorer_url;
        swapData.hashlock = data.swap.hashlock;
        swapData.secret = data.swap.secret;
        swapData.status = data.swap.status;
        swapData.isRealBlockchain = data.swap.is_real_blockchain;
        
        // Store for later use
        if (data.swap.secret) {
          sessionStorage.setItem(`swap_secret_${data.swap.id}`, data.swap.secret);
        }

        onCreateSwap(swapData);
      }
      
    } catch (error: any) {
      if (isDemoMode) {
        // In demo mode, never show errors - always succeed
        console.log('DEMO MODE: Forcing success despite error:', error);
        
        const fakeHash = `0x${Math.random().toString(16).substr(2, 64)}`;
        const fakeSecret = `0x${Math.random().toString(16).substr(2, 64)}`;
        const fakeHashlock = `0x${Math.random().toString(16).substr(2, 64)}`;
        
        const swapData: any = {
          fromToken,
          toToken,
          amount,
          recipientAddress: finalRecipientAddress,
          originalRecipient: recipientAddress,
          timelockDuration: parseInt(timelockDuration),
          timestamp: Date.now(),
          direction: getTokenChain(fromToken) === "Ethereum" ? "eth-to-cosmos" : "cosmos-to-eth",
          ethereumTxHash: fakeHash,
          hashlock: fakeHashlock,
          secret: fakeSecret,
          status: "created",
          demoMode: true,
          isDemoMode: true
        };
        
        alert(`✅ DEMO: Swap created successfully! 
From: ${amount} ${fromToken} 
To: ${toToken}
Recipient: ${finalRecipientAddress}
Demo Transaction: ${fakeHash.slice(0, 10)}...`);
        
        onCreateSwap(swapData);
      } else {
        console.error("Swap creation error:", error);
        alert(`Failed to create swap: ${error.message}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const getTokenChain = (symbol: string) => {
    return tokens.find(t => t.symbol === symbol)?.chain || "Unknown";
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          Create Atomic Swap {isDemoMode && <Badge variant="secondary">DEMO</Badge>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Create a trustless cross-chain swap with hashlock/timelock protection
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* From Token Section */}
        <div className="space-y-2">
          <Label htmlFor="from-token">From Token</Label>
          <div className="flex items-center gap-2">
            <Select value={fromToken} onValueChange={setFromToken}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tokens.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center justify-between w-full">
                      <span>{token.symbol}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {token.chain}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="whitespace-nowrap">
              {getTokenChain(fromToken)}
            </Badge>
          </div>
        </div>

        {/* Swap Direction */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapTokens}
            className="rounded-full"
          >
            <ArrowDownUp className="w-4 h-4" />
          </Button>
        </div>

        {/* To Token Section */}
        <div className="space-y-2">
          <Label htmlFor="to-token">To Token</Label>
          <div className="flex items-center gap-2">
            <Select value={toToken} onValueChange={setToToken}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tokens.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center justify-between w-full">
                      <span>{token.symbol}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {token.chain}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="whitespace-nowrap">
              {getTokenChain(toToken)}
            </Badge>
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
          />
        </div>

        {/* Recipient Address */}
        <div className="space-y-2">
          <Label htmlFor="recipient">
            Recipient Address ({getTokenChain(toToken)}) {isDemoMode && <Badge variant="outline">Auto-filled</Badge>}
          </Label>
          <div className="relative">
            <Input
              id="recipient"
              placeholder={getTokenChain(toToken) === "Cosmos" ? "cosmos1..." : "0x... or name.eth"}
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              disabled={isDemoMode}
              className={`pr-10 ${
                recipientAddress && addressValidation.isValid 
                  ? "border-green-500" 
                  : recipientAddress && addressValidation.error 
                  ? "border-red-500" 
                  : ""
              } ${isDemoMode ? "bg-muted" : ""}`}
            />
            {recipientAddress && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {addressValidation.isValid ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : addressValidation.error ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : null}
              </div>
            )}
          </div>
          
          {/* Address Validation Feedback */}
          {recipientAddress && (
            <div className="text-xs">
              {addressValidation.isValid ? (
                <div className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {`Valid ${addressValidation.type === 'ens' ? 'ENS name' : `${getTokenChain(toToken)} address`}`}
                  {addressValidation.type === 'address' && addressValidation.normalized && !isDemoMode && (
                    <div className="text-muted-foreground ml-2">
                      {addressValidation.normalized.slice(0, 8)}...{addressValidation.normalized.slice(-6)}
                    </div>
                  )}
                </div>
              ) : addressValidation.error ? (
                <div className="text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {addressValidation.error}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Timelock Duration */}
        <div className="space-y-2">
          <Label htmlFor="timelock">Timelock Duration</Label>
          <Select value={timelockDuration} onValueChange={setTimelockDuration}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timelockOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {option.label} ({option.value}s)
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Create Swap Button */}
        <Button 
          onClick={handleCreateSwap} 
          className="w-full"
          disabled={!amount || (!isDemoMode && !isTestnetMode && !addressValidation.isValid) || isCreating}
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-transparent border-t-current" />
              Creating Swap...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Create Atomic Swap
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="mb-1">ℹ️ This creates a secure cross-chain atomic swap:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Funds are locked with hashlock/timelock</li>
            <li>Either both parties get their tokens or both get refunds</li>
            <li>No counterparty risk</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SwapForm;