import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Terminal, 
  Zap, 
  AlertTriangle, 
  Database, 
  Video, 
  Eye,
  EyeOff,
  Play,
  Square,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JudgingHelperProps {
  isVisible: boolean;
  onClose: () => void;
}

const JudgingHelper = ({ isVisible, onClose }: JudgingHelperProps) => {
  const [activeTools, setActiveTools] = useState({
    accelerator: false,
    errorSim: false,
    mockData: false,
    autoDemo: false
  });
  const [demoRecording, setDemoRecording] = useState(false);

  const toggleTool = (tool: keyof typeof activeTools) => {
    setActiveTools(prev => ({ ...prev, [tool]: !prev[tool] }));
  };

  const startDemo = () => {
    setDemoRecording(true);
    // Simulate demo recording
    setTimeout(() => setDemoRecording(false), 10000);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              <CardTitle>JUDGING HELPER - ACCESS GRANTED</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-green-100 text-sm">
            Demo tools for EthGlobal Unite DeFi judging • Ctrl+J to toggle
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Transaction Accelerator */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">Transaction Accelerator</span>
                  {activeTools.accelerator && (
                    <Badge className="bg-yellow-100 text-yellow-800">5x Speed</Badge>
                  )}
                </div>
                <Switch
                  checked={activeTools.accelerator}
                  onCheckedChange={() => toggleTool("accelerator")}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Accelerate blockchain confirmations for demo purposes
              </p>
            </CardContent>
          </Card>

          {/* Error Simulator */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="font-medium">Error Simulator</span>
                  {activeTools.errorSim && (
                    <Badge variant="destructive">Active</Badge>
                  )}
                </div>
                <Switch
                  checked={activeTools.errorSim}
                  onCheckedChange={() => toggleTool("errorSim")}
                />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Simulate API failures, node disconnections, and contract errors
              </p>
              {activeTools.errorSim && (
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" className="text-xs">
                    API Fail
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs">
                    Node Down
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs">
                    Gas Error
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mock Data Generator */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Mock Data Generator</span>
                  {activeTools.mockData && (
                    <Badge className="bg-blue-100 text-blue-800">10 Swaps</Badge>
                  )}
                </div>
                <Switch
                  checked={activeTools.mockData}
                  onCheckedChange={() => toggleTool("mockData")}
                />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Generate realistic swap history and transaction data
              </p>
              {activeTools.mockData && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs">
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Regenerate
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs">
                    Clear All
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto-Demo Recorder */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">Auto-Demo Recorder</span>
                  {demoRecording && (
                    <Badge className="bg-red-100 text-red-800 animate-pulse">
                      REC
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startDemo}
                    disabled={demoRecording}
                    className="text-xs"
                  >
                    {demoRecording ? (
                      <Square className="w-3 h-3 mr-1" />
                    ) : (
                      <Play className="w-3 h-3 mr-1" />
                    )}
                    {demoRecording ? "Recording..." : "Start Demo"}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Automated demo flow: Connect wallets → Create swap → Complete transaction
              </p>
            </CardContent>
          </Card>

          {/* Current Demo Status */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">DEMO ACTIVE</span>
              </div>
              <p className="text-sm text-green-700">
                Mocking ETH→ATOM swap with accelerated confirmations
              </p>
              <div className="mt-3 flex gap-2">
                <Badge variant="outline" className="text-xs">
                  Sepolia Testnet
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Theta Testnet
                </Badge>
                <Badge variant="outline" className="text-xs">
                  1inch API Mock
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Judge Instructions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use accelerator to speed up blockchain demos</li>
                <li>• Error simulator shows recovery capabilities</li>
                <li>• Mock data demonstrates production-ready UI</li>
                <li>• Auto-demo provides hands-free presentation</li>
                <li>• Press Ctrl+J to hide this panel anytime</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default JudgingHelper;