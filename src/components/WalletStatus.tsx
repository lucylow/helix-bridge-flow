import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CheckCircle, Loader2, AlertCircle, Globe, TestTube, Play } from "lucide-react";

type WalletState = "disconnected" | "connecting" | "connected" | "error";
type NetworkMode = "mainnet" | "testnet" | "demo";

interface WalletStatusProps {
  onWalletConnect: (chain: "ethereum" | "cosmos") => void;
}

const WalletStatus = ({ onWalletConnect }: WalletStatusProps) => {
  const [networkMode, setNetworkMode] = useState<NetworkMode>("demo");
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

  const getNetworkBadge = (chain: "ethereum" | "cosmos") => {
    if (networkMode === "demo") {
      return <Badge variant="outline" className="text-xs">Demo</Badge>;
    }
    
    if (chain === "ethereum") {
      return networkMode === "mainnet" 
        ? <Badge variant="outline" className="text-xs">Mainnet</Badge>
        : <Badge variant="outline" className="text-xs">Sepolia</Badge>;
    } else {
      return networkMode === "mainnet"
        ? <Badge variant="outline" className="text-xs">Hub</Badge>
        : <Badge variant="outline" className="text-xs">Theta</Badge>;
    }
  };

  const handleConnect = async (chain: "ethereum" | "cosmos") => {
    if (networkMode === "demo") {
      // Demo mode - simulate connection
      const setState = chain === "ethereum" ? setEthState : setCosmosState;
      const setAddress = chain === "ethereum" ? setEthAddress : setCosmosAddress;
      
      setState("connecting");
      
      setTimeout(() => {
        const mockAddress = chain === "ethereum" 
          ? "0x23A4B...c9ae" 
          : "cosmos1x3z...k8m9";
        setAddress(mockAddress);
        setState("connected");
        onWalletConnect(chain);
      }, 2000);
    } else {
      // Real wallet connection would go here
      // For now, show error to indicate real wallet integration needed
      const setState = chain === "ethereum" ? setEthState : setCosmosState;
      setState("error");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Wallet Status</h3>
      
      {/* Network Mode Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">Network Mode</span>
            </div>
            <Tabs value={networkMode} onValueChange={(value) => setNetworkMode(value as NetworkMode)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="mainnet" className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Mainnet
                </TabsTrigger>
                <TabsTrigger value="testnet" className="flex items-center gap-1">
                  <TestTube className="w-3 h-3" />
                  Testnet
                </TabsTrigger>
                <TabsTrigger value="demo" className="flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  Demo
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {networkMode === "demo" && (
              <p className="text-xs text-muted-foreground">
                Demo mode uses simulated wallets for testing
              </p>
            )}
            {networkMode !== "demo" && (
              <p className="text-xs text-muted-foreground">
                Connect your real {networkMode} wallets
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
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
                  {getNetworkBadge("ethereum")}
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
                  {getNetworkBadge("cosmos")}
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