import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownUp, Zap, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SwapFormProps {
  onCreateSwap: (swapData: any) => void;
}

const SwapForm = ({ onCreateSwap }: SwapFormProps) => {
  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("ATOM");
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [timelockDuration, setTimelockDuration] = useState("3600");

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

  const handleCreateSwap = () => {
    if (!amount || !recipientAddress) {
      alert("Please fill in all required fields");
      return;
    }

    const swapData = {
      fromToken,
      toToken,
      amount,
      recipientAddress,
      timelockDuration: parseInt(timelockDuration),
      timestamp: Date.now()
    };

    onCreateSwap(swapData);
  };

  const getTokenChain = (symbol: string) => {
    return tokens.find(t => t.symbol === symbol)?.chain || "Unknown";
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          Create Atomic Swap
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
            Recipient Address ({getTokenChain(toToken)})
          </Label>
          <Input
            id="recipient"
            placeholder={getTokenChain(toToken) === "Cosmos" ? "cosmos1..." : "0x..."}
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
          />
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
          disabled={!amount || !recipientAddress}
        >
          <Zap className="w-4 h-4 mr-2" />
          Create Atomic Swap
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