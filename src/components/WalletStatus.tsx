import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle, Loader2, AlertCircle } from "lucide-react";

type WalletState = "disconnected" | "connecting" | "connected" | "error";

interface WalletStatusProps {
  onWalletConnect: (chain: "ethereum" | "cosmos") => void;
}

const WalletStatus = ({ onWalletConnect }: WalletStatusProps) => {
  const [ethState, setEthState] = useState<WalletState>("disconnected");
  const [cosmosState, setCosmosState] = useState<WalletState>("disconnected");
  const [ethAddress, setEthAddress] = useState("");
  const [cosmosAddress, setCosmosAddress] = useState("");

  const getStateIcon = (state: WalletState) => {
    switch (state) {
      case "disconnected":
        return <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />;
      case "connecting":
        return <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />;
      case "connected":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStateText = (state: WalletState, address?: string) => {
    switch (state) {
      case "disconnected":
        return "Connect";
      case "connecting":
        return "Approving...";
      case "connected":
        return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected";
      case "error":
        return "Error";
    }
  };

  const handleConnect = async (chain: "ethereum" | "cosmos") => {
    const setState = chain === "ethereum" ? setEthState : setCosmosState;
    const setAddress = chain === "ethereum" ? setEthAddress : setCosmosAddress;
    
    setState("connecting");
    
    // Simulate connection process
    setTimeout(() => {
      const mockAddress = chain === "ethereum" 
        ? "0x23A4B...c9ae" 
        : "cosmos1x3z...k8m9";
      setAddress(mockAddress);
      setState("connected");
      onWalletConnect(chain);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Wallet Status</h3>
      
      {/* Ethereum Wallet */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Ethereum</span>
                  <Badge variant="outline" className="text-xs">Sepolia</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {getStateIcon(ethState)}
                  <span className="text-xs text-muted-foreground">
                    {getStateText(ethState, ethAddress)}
                  </span>
                </div>
              </div>
            </div>
            {ethState === "disconnected" && (
              <Button
                size="sm"
                onClick={() => handleConnect("ethereum")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cosmos Wallet */}
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Cosmos</span>
                  <Badge variant="outline" className="text-xs">Theta</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {getStateIcon(cosmosState)}
                  <span className="text-xs text-muted-foreground">
                    {getStateText(cosmosState, cosmosAddress)}
                  </span>
                </div>
              </div>
            </div>
            {cosmosState === "disconnected" && (
              <Button
                size="sm"
                onClick={() => handleConnect("cosmos")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection Priority Indicator */}
      {ethState === "connected" && cosmosState === "connected" && (
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xs text-green-700 font-medium">
            Both wallets connected · Ready for atomic swaps
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletStatus;