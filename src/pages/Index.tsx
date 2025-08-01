import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, FileText, BarChart3, Dna } from "lucide-react";
import WalletStatus from "@/components/WalletStatus";
import SwapTracker from "@/components/SwapTracker";
import TechnicalDetails from "@/components/TechnicalDetails";
import JudgingHelper from "@/components/JudgingHelper";
import ErrorCenter from "@/components/ErrorCenter";

const Index = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [judgingHelperVisible, setJudgingHelperVisible] = useState(false);
  const [walletsConnected, setWalletsConnected] = useState({ ethereum: false, cosmos: false });
  const [hasError, setHasError] = useState(true);
  const [techDetailsExpanded, setTechDetailsExpanded] = useState(false);

  // Keyboard shortcut for judging helper
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        setJudgingHelperVisible(!judgingHelperVisible);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [judgingHelperVisible]);

  const handleWalletConnect = (chain: "ethereum" | "cosmos") => {
    setWalletsConnected(prev => ({ ...prev, [chain]: true }));
  };

  const networkStatus = [
    { name: "Ethereum (Sepolia)", status: "Online" },
    { name: "Cosmos (Theta)", status: "Online" },
    { name: "1inch API", status: "Error" },
    { name: "Atomic Swap Engine", status: "Active" }
  ];

  const statistics = [
    { label: "Total Swaps", value: "0", color: "text-foreground" },
    { label: "Created", value: "0", color: "text-blue-500" },
    { label: "Onchain", value: "0", color: "text-orange-500" },
    { label: "Completed", value: "0", color: "text-green-500" }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Online":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Online</Badge>;
      case "Error":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>;
      case "Active":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderTabContent = () => {
    if (activeTab === "create") {
      return (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Dual Wallet Status */}
          <div className="space-y-6">
            <WalletStatus onWalletConnect={handleWalletConnect} />
            
            {/* Error Recovery Center */}
            <ErrorCenter 
              hasError={hasError} 
              errorType="api" 
              onErrorResolved={() => setHasError(false)}
            />
          </div>

          {/* Center Column: Animated Swap Tracker */}
          <div>
            <SwapTracker />
          </div>

          {/* Right Column: Technical Details */}
          <div className="space-y-6">
            <TechnicalDetails 
              isExpanded={techDetailsExpanded}
              onToggle={() => setTechDetailsExpanded(!techDetailsExpanded)}
            />
            
            {/* Judging Helper Access Hint */}
            <Card className="border-dashed border-gray-300">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Dna className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Judge Access</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+J</kbd> for demo tools
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (activeTab === "history") {
      return (
        <div className="text-center py-16">
          <Zap className="w-16 h-16 mx-auto mb-4 text-orange-500" />
          <h2 className="text-xl font-semibold mb-2">No atomic swaps yet</h2>
          <p className="text-muted-foreground mb-6">Create your first atomic swap to see it here</p>
          <Button onClick={() => setActiveTab("create")}>Create Swap</Button>
        </div>
      );
    }

    // Status tab
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Network Status</h3>
            <div className="space-y-3">
              {networkStatus.map((network, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{network.name}</span>
                  {getStatusBadge(network.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Statistics</h3>
            <div className="space-y-3">
              {statistics.map((stat, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{stat.label}</span>
                  <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                1
              </div>
              <div>
                <h1 className="text-xl font-bold">1inch Fusion+ <span className="text-blue-600">Cosmos</span></h1>
                <p className="text-sm text-muted-foreground">Cross-chain atomic swaps</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">API: h6VoEtvR...paXr</span>
              <Badge variant="destructive">Error</Badge>
              <Button>Connect Wallets</Button>
            </div>
          </div>
        </div>
      </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Dna className="w-8 h-8 text-blue-600 animate-pulse" />
              <h2 className="text-2xl font-semibold">Helix Cross-Chain Atomic Swaps</h2>
              <Dna className="w-8 h-8 text-purple-600 animate-pulse" />
            </div>
            <p className="text-muted-foreground">
              Professional implementation for EthGlobal Unite DeFi • Press Ctrl+J for judge tools
            </p>
          </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === "create" ? "default" : "outline"}
            onClick={() => setActiveTab("create")}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Create Swap
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            History
          </Button>
          <Button
            variant={activeTab === "status" ? "default" : "outline"}
            onClick={() => setActiveTab("status")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Status
          </Button>
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Judging Helper Panel */}
        <JudgingHelper 
          isVisible={judgingHelperVisible}
          onClose={() => setJudgingHelperVisible(false)}
        />
      </div>
    </div>
  );
};

export default Index;
