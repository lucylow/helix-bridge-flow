import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Copy, ExternalLink, Timer, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface TechnicalDetailsProps {
  isExpanded?: boolean;
  onToggle?: () => void;
}

const TechnicalDetails = ({ isExpanded = false, onToggle }: TechnicalDetailsProps) => {
  const [expanded, setExpanded] = useState(isExpanded);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const handleToggle = () => {
    const newState = !expanded;
    setExpanded(newState);
    onToggle?.();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const technicalData = {
    hashlock: {
      value: "0xa1b2c3d4e5f6789012345678901234567890abcdef",
      status: "verified",
      algorithm: "SHA256"
    },
    timelock: {
      expiration: "2024-01-15 14:30:00 UTC",
      remaining: "6h 42m",
      blocks: "1,247"
    },
    contracts: {
      ethereum: "0x742d35Cc7a4C9c8f1b8B8D8fA8f8f8f8f8f8f8f8",
      cosmos: "cosmos1x3z4y5w6v7u8t9s0r1q2p3o4n5m6l7k8j9i0h1"
    },
    gas: {
      estimated: "0.0023 ETH",
      used: "0.0021 ETH",
      savings: "8.7%"
    },
    transactions: {
      initTx: "0xabc123...",
      lockTx: "0xdef456...",
      claimTx: "pending"
    }
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={handleToggle}
        className="w-full justify-between p-3 h-auto"
      >
        <span className="font-medium">Show tech details</span>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </Button>

      {expanded && (
        <div className="space-y-4 animate-fade-in">
          {/* Hashlock Verification */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="font-medium">Hashlock Verification</span>
                <Badge className="bg-green-100 text-green-800 border-green-200">Verified</Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Algorithm:</span>
                  <span className="font-mono">{technicalData.hashlock.algorithm}</span>
                </div>
                
                <div className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground">Hash:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs truncate max-w-32">
                      {technicalData.hashlock.value}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(technicalData.hashlock.value, "hashlock")}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    {copiedItem === "hashlock" && (
                      <span className="text-xs text-green-600 animate-fade-in">Copied!</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timelock Information */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Timer className="w-4 h-4 text-orange-500" />
                <span className="font-medium">Timelock Status</span>
                <Badge variant="outline">{technicalData.timelock.remaining}</Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expiration:</span>
                  <span className="font-mono text-xs">{technicalData.timelock.expiration}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blocks remaining:</span>
                  <span className="font-medium">{technicalData.timelock.blocks}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Links */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Contract Addresses</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Ethereum (Sepolia)</span>
                    <p className="text-xs text-muted-foreground font-mono">
                      {technicalData.contracts.ethereum}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Etherscan
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Cosmos (Theta)</span>
                    <p className="text-xs text-muted-foreground font-mono">
                      {technicalData.contracts.cosmos}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Mintscan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gas Metrics */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Gas Metrics</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated:</span>
                  <span>{technicalData.gas.estimated}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Used:</span>
                  <span>{technicalData.gas.used}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Savings:</span>
                  <span className="text-green-600 font-medium">{technicalData.gas.savings}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Transaction History</h4>
              
              <div className="space-y-2 text-sm">
                {Object.entries(technicalData.transactions).map(([key, txHash]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-muted-foreground capitalize">
                      {key.replace('Tx', ' Transaction')}:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-mono text-xs",
                        txHash === "pending" ? "text-orange-500" : "text-foreground"
                      )}>
                        {txHash}
                      </span>
                      {txHash !== "pending" && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TechnicalDetails;