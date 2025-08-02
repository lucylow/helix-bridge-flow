import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type SwapStep = "initiated" | "eth-locked" | "atom-locked" | "completed";

interface SwapData {
  id: string;
  fromToken: string;
  toToken: string;
  amount: string;
  currentStep: SwapStep;
  progress: number;
  timelock: number;
  hashlock: string;
}

interface SwapTrackerProps {
  activeSwap?: SwapData;
}

const SwapTracker = ({ activeSwap }: SwapTrackerProps) => {
  const [currentStep, setCurrentStep] = useState<SwapStep>("initiated");
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const steps = [
    { key: "initiated", label: "Swap Initiated", icon: Loader2, color: "text-yellow-500" },
    { key: "eth-locked", label: "ETH Locked", icon: Clock, color: "text-blue-500" },
    { key: "atom-locked", label: "ATOM Locked", icon: Clock, color: "text-purple-500" },
    { key: "completed", label: "Completed", icon: CheckCircle, color: "text-green-500" }
  ];

  const fetchQuote = async () => {
    try {
      const response = await fetch(`https://jzgfrpdqvxxbruvfyeih.supabase.co/functions/v1/oneinch-api?endpoint=quote&chainId=1&src=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&dst=0xA0b86a33E6441b8e5e8e8e8e8e8e8e8e8e8e8e8e&amount=1000000000000000000`, {
        headers: {
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6Z2ZycGRxdnh4YnJ1dmZ5ZWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNTI4MTYsImV4cCI6MjA2OTcyODgxNn0.SMcM_rnuTCSB9a98ORYaPSOMMcQMw7LLJOskyXP9ICg`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setCurrentStep('eth-locked');
        setProgress(25);
        
        setTimeout(() => {
          setCurrentStep('atom-locked');
          setProgress(75);
          setTimeout(() => {
            setCurrentStep('completed');
            setProgress(100);
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
          }, 2000);
        }, 2000);
      }
    } catch (error) {
      console.error('Quote fetch failed:', error);
    }
  };

  useEffect(() => {
    if (activeSwap) {
      setCurrentStep(activeSwap.currentStep);
      setProgress(activeSwap.progress);
    } else {
      // Auto-start demo
      fetchQuote();
    }
  }, [activeSwap]);

  useEffect(() => {
    if (currentStep === "completed") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [currentStep]);

  const getStepStatus = (stepKey: string) => {
    const stepIndex = steps.findIndex(s => s.key === stepKey);
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const mockSwap: SwapData = {
    id: "swap_001",
    fromToken: "ETH",
    toToken: "ATOM",
    amount: "0.5",
    currentStep,
    progress,
    timelock: 7200,
    hashlock: "0xa1b2c3..."
  };

  const swap = activeSwap || mockSwap;

  return (
    <div className="space-y-6 relative">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <Sparkles className="absolute top-4 left-4 text-yellow-400 animate-bounce" />
          <Sparkles className="absolute top-8 right-6 text-blue-400 animate-bounce delay-100" />
          <Sparkles className="absolute bottom-8 left-8 text-purple-400 animate-bounce delay-200" />
        </div>
      )}

      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Atomic Swap Tracker</h3>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>{swap.fromToken}</span>
          <div className="w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
          <span>{swap.toToken}</span>
        </div>
      </div>

      {/* Progress Bar with DNA Strand Effect */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <div className="relative">
              <Progress value={progress} className="h-2" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-green-500/20 rounded-full animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Timeline */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.key);
          const Icon = step.icon;
          
          return (
            <div key={step.key} className="relative">
              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-5 top-10 w-0.5 h-12 bg-gradient-to-b from-blue-500/30 to-purple-500/30"></div>
              )}
              
              <Card className={cn(
                "transition-all duration-500",
                status === "active" && "ring-2 ring-primary ring-offset-2",
                status === "completed" && "bg-green-50 border-green-200"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      status === "completed" && "bg-green-100",
                      status === "active" && "bg-primary/10",
                      status === "pending" && "bg-muted"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        status === "completed" && "text-green-600",
                        status === "active" && step.color + " animate-spin",
                        status === "pending" && "text-muted-foreground"
                      )} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "font-medium",
                          status === "completed" && "text-green-700",
                          status === "active" && "text-primary"
                        )}>
                          {step.label}
                        </span>
                        
                        <Badge variant={
                          status === "completed" ? "default" : 
                          status === "active" ? "secondary" : "outline"
                        }>
                          {status === "completed" ? "✓" : 
                           status === "active" ? "●" : "○"}
                        </Badge>
                      </div>
                      
                      {status === "active" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Processing...
                        </p>
                      )}
                      
                      {status === "completed" && step.key !== "completed" && (
                        <p className="text-xs text-green-600 mt-1">
                          Confirmed on blockchain
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Swap Details */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{swap.amount} {swap.fromToken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timelock:</span>
              <span className="font-medium">{Math.floor(swap.timelock / 3600)}h remaining</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hashlock:</span>
              <span className="font-mono text-xs">{swap.hashlock}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SwapTracker;