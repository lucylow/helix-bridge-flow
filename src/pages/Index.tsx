import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, FileText, BarChart3 } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("status");

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
    switch (activeTab) {
      case "create":
        return (
          <div className="text-center py-16">
            <Zap className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <h2 className="text-xl font-semibold mb-2">Create Atomic Swap</h2>
            <p className="text-muted-foreground mb-6">Set up a new cross-chain atomic swap</p>
            <Button>Start Swap Creation</Button>
          </div>
        );
      case "history":
        return (
          <div className="text-center py-16">
            <Zap className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h2 className="text-xl font-semibold mb-2">No atomic swaps yet</h2>
            <p className="text-muted-foreground mb-6">Create your first atomic swap to see it here</p>
            <Button onClick={() => setActiveTab("create")}>Create Swap</Button>
          </div>
        );
      case "status":
      default:
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
    }
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
          <h2 className="text-2xl font-semibold mb-2">Connect your Ethereum and Cosmos wallets to start creating atomic swaps.</h2>
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
      </div>
    </div>
  );
};

export default Index;
