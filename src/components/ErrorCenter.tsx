import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Wifi, 
  Server, 
  Link, 
  RefreshCw, 
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

type ErrorType = "api" | "network" | "contract" | "wallet" | null;

interface ErrorCenterProps {
  hasError?: boolean;
  errorType?: ErrorType;
  onErrorResolved?: () => void;
}

const ErrorCenter = ({ hasError = true, errorType = "api", onErrorResolved }: ErrorCenterProps) => {
  const [expanded, setExpanded] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [fixing, setFixing] = useState(false);

  const errorConfigs = {
    api: {
      title: "1inch API Disconnected",
      description: "Unable to fetch price quotes and routing data",
      icon: Server,
      color: "text-red-500",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    network: {
      title: "Network Connection Lost",
      description: "Cannot connect to Ethereum or Cosmos networks",
      icon: Wifi,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    },
    contract: {
      title: "Smart Contract Error",
      description: "Transaction failed on blockchain",
      icon: Link,
      color: "text-red-500",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    wallet: {
      title: "Wallet Connection Issue",
      description: "Unable to connect to MetaMask or Keplr",
      icon: AlertTriangle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200"
    }
  };

  const currentError = errorType ? errorConfigs[errorType] : null;

  const startDiagnosis = async () => {
    setDiagnosing(true);
    setExpanded(true);
    
    try {
      const response = await fetch(`https://jzgfrpdqvxxbruvfyeih.supabase.co/functions/v1/oneinch-api?endpoint=tokens&chainId=1`, {
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6Z2ZycGRxdnh4YnJ1dmZ5ZWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNTI4MTYsImV4cCI6MjA2OTcyODgxNn0.SMcM_rnuTCSB9a98ORYaPSOMMcQMw7LLJOskyXP9ICg`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('1inch API test successful:', data);
      }
    } catch (error) {
      console.error('1inch API test failed:', error);
    } finally {
      setDiagnosing(false);
    }
  };

  const startFix = async () => {
    setFixing(true);
    
    // Simulate fix process
    setTimeout(() => {
      setFixing(false);
      onErrorResolved?.();
    }, 3000);
  };

  const solutions = {
    api: [
      "Check API key configuration",
      "Verify network connectivity",
      "Switch to backup API endpoint",
      "Contact 1inch support"
    ],
    network: [
      "Check internet connection",
      "Refresh MetaMask connection",
      "Switch network in wallet",
      "Try different RPC endpoint"
    ],
    contract: [
      "Increase gas limit",
      "Check contract permissions",
      "Verify transaction parameters",
      "Retry with higher gas price"
    ],
    wallet: [
      "Unlock wallet extension",
      "Refresh page and reconnect",
      "Clear browser cache",
      "Update wallet extension"
    ]
  };

  if (!hasError || !currentError) {
    return null;
  }

  const Icon = currentError.icon;

  return (
    <div className="space-y-4">
      {/* Main Error Banner */}
      <Alert className={cn(
        "border-2 transition-all duration-300 cursor-pointer",
        currentError.borderColor,
        currentError.bgColor,
        "hover:shadow-md",
        expanded && "shadow-lg"
      )} onClick={() => setExpanded(!expanded)}>
        <Icon className={cn("h-4 w-4", currentError.color)} />
        <AlertDescription className="flex items-center justify-between w-full">
          <div>
            <span className="font-medium">{currentError.title}</span>
            <span className="text-muted-foreground ml-2">• Fix guide</span>
          </div>
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3 h-3" />
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </AlertDescription>
      </Alert>

      {/* Expanded Error Recovery Flow */}
      {expanded && (
        <Card className="animate-fade-in border-2 border-dashed border-gray-200">
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <div className={cn(
                "w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                currentError.bgColor
              )}>
                <Icon className={cn("w-8 h-8", currentError.color)} />
              </div>
              <h3 className="text-lg font-semibold mb-2">3-Step Error Recovery</h3>
              <p className="text-sm text-muted-foreground">{currentError.description}</p>
            </div>

            {/* Step 1: Diagnose */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                    1
                  </Badge>
                  <span className="font-medium">Diagnose</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={startDiagnosis}
                  disabled={diagnosing}
                >
                  {diagnosing ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Auto-detect"
                  )}
                </Button>
              </div>
              
              {diagnosing && (
                <div className="text-sm text-muted-foreground animate-pulse">
                  Analyzing connection status, API responses, and network configuration...
                </div>
              )}
            </div>

            {/* Step 2: Fix */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                    2
                  </Badge>
                  <span className="font-medium">Fix</span>
                </div>
                <Button 
                  size="sm"
                  onClick={startFix}
                  disabled={fixing || diagnosing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {fixing ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    "Apply Solution"
                  )}
                </Button>
              </div>

              {/* Solution Steps */}
              <div className="space-y-2">
                {errorType && solutions[errorType].map((solution, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "text-sm p-2 rounded border transition-colors",
                      fixing && index === 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50"
                    )}
                  >
                    {solution}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Retry */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full w-6 h-6 flex items-center justify-center p-0">
                    3
                  </Badge>
                  <span className="font-medium">Retry</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  disabled={diagnosing || fixing}
                >
                  1-Click Replay
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Automatically retry the failed operation with optimized parameters
              </p>
            </div>

            {/* DNA Repair Animation Placeholder */}
            <div className="text-center py-4">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={cn(
                  "h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-1000",
                  fixing ? "w-full" : "w-0"
                )}>
                  {fixing && (
                    <div className="w-full h-full bg-gradient-to-r from-blue-400 to-green-400 animate-pulse"></div>
                  )}
                </div>
              </div>
              {fixing && (
                <p className="text-xs text-muted-foreground mt-2 animate-pulse">
                  DNA repair sequence initiated...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ErrorCenter;