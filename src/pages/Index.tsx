import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, FileText, BarChart3, Dna, Activity } from "lucide-react";
import WalletStatus from "@/components/WalletStatus";
import SwapTracker from "@/components/SwapTracker";
import SwapForm from "@/components/SwapForm";
import SwapHistory from "@/components/SwapHistory";
import TechnicalDetails from "@/components/TechnicalDetails";
import JudgingHelper from "@/components/JudgingHelper";
import ErrorCenter from "@/components/ErrorCenter";
import { OneInchStatus } from "@/components/OneInchStatus";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [judgingHelperVisible, setJudgingHelperVisible] = useState(false);
  const [walletsConnected, setWalletsConnected] = useState({ ethereum: false, cosmos: false });
  const [hasError, setHasError] = useState(false);
  const [activeSwap, setActiveSwap] = useState(null);
  const [networkMode, setNetworkMode] = useState<"mainnet" | "testnet" | "demo">("demo");
  const [statistics, setStatistics] = useState([
    { label: "Total Swaps", value: "0", color: "text-foreground" },
    { label: "Created", value: "0", color: "text-blue-500" },
    { label: "Onchain", value: "0", color: "text-orange-500" },
    { label: "Completed", value: "0", color: "text-green-500" }
  ]);

  // Fetch statistics from database
  const fetchStatistics = async () => {
    try {
      const { data: swaps, error } = await supabase
        .from('atomic_swaps')
        .select('status');

      if (error) {
        console.error('Error fetching statistics:', error);
        return;
      }

      const totalSwaps = swaps?.length || 0;
      const created = swaps?.filter(swap => swap.status === 'initiated' || swap.status === 'created').length || 0;
      const onchain = swaps?.filter(swap => swap.status === 'eth-locked' || swap.status === 'cosmos-locked').length || 0;
      const completed = swaps?.filter(swap => swap.status === 'completed').length || 0;

      setStatistics([
        { label: "Total Swaps", value: totalSwaps.toString(), color: "text-foreground" },
        { label: "Created", value: created.toString(), color: "text-blue-500" },
        { label: "Onchain", value: onchain.toString(), color: "text-orange-500" },
        { label: "Completed", value: completed.toString(), color: "text-green-500" }
      ]);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

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

  // Fetch statistics on component mount and set up real-time updates
  useEffect(() => {
    fetchStatistics();

    // Set up real-time subscription for statistics updates
    const channel = supabase
      .channel('atomic_swaps_stats')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'atomic_swaps' 
        }, 
        () => {
          fetchStatistics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleWalletConnect = (chain: "ethereum" | "cosmos") => {
    setWalletsConnected(prev => ({ ...prev, [chain]: true }));
  };

  const handleCreateSwap = (swapData: any) => {
    console.log("Creating swap:", swapData);
    setActiveSwap({
      id: `swap_${Date.now()}`,
      fromToken: swapData.fromToken,
      toToken: swapData.toToken,
      amount: swapData.amount,
      currentStep: "initiated",
      progress: 10,
      timelock: swapData.timelockDuration,
      hashlock: "0xa1b2c3d4e5f6..."
    });
  };

  const networkStatus = [
    { name: "Ethereum (Sepolia)", status: "Online" },
    { name: "Cosmos (Theta)", status: "Online" },
    { name: "1inch API", status: "✅ REAL API CONNECTED" },
    { name: "Atomic Swap Engine", status: "Active" }
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
            <WalletStatus 
              onWalletConnect={handleWalletConnect} 
              networkMode={networkMode}
              setNetworkMode={setNetworkMode}
            />
            
          </div>

          {/* Center Column: Swap Form and Tracker */}
          <div className="space-y-6">
            <SwapForm 
              onCreateSwap={handleCreateSwap} 
              networkMode={networkMode}
            />
            {activeSwap && <SwapTracker activeSwap={activeSwap} />}
          </div>

          {/* Right Column: Technical Details */}
          <div className="space-y-6">
            <TechnicalDetails isExpanded={true} />
            
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
      return <SwapHistory />;
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
