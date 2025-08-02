import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SwapHistoryItem {
  id: string;
  from_token: string;
  to_token: string;
  amount: number;
  status: string;
  created_at: string;
  completed_at?: string;
  eth_tx_hash?: string;
  cosmos_tx_hash?: string;
  completion_proof?: any;
}

const SwapHistory = () => {
  const [swaps, setSwaps] = useState<SwapHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSwapHistory();
  }, []);

  const fetchSwapHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('atomic_swaps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch swap history:', error);
      } else {
        setSwaps(data || []);
      }
    } catch (error) {
      console.error('Error fetching swap history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case "initiated":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Initiated</Badge>;
      case "eth-locked":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">ETH Locked</Badge>;
      case "atom-locked":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">ATOM Locked</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 mx-auto mb-2 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading swap history...</p>
      </div>
    );
  }

  if (swaps.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">No swaps yet</h2>
        <p className="text-muted-foreground mb-6">Create your first atomic swap to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Swap History</h3>
        <Button variant="outline" size="sm" onClick={fetchSwapHistory}>
          Refresh
        </Button>
      </div>

      {swaps.map((swap) => (
        <Card key={swap.id} className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{swap.from_token}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{swap.to_token}</span>
                </div>
                <span className="text-lg font-bold">{swap.amount}</span>
              </div>
              {getStatusBadge(swap.status)}
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">{formatDate(swap.created_at)}</p>
                </div>
                {swap.completed_at && (
                  <div>
                    <span className="text-muted-foreground">Completed:</span>
                    <p className="font-medium">{formatDate(swap.completed_at)}</p>
                  </div>
                )}
              </div>

              {swap.status === "completed" && (swap.eth_tx_hash || swap.cosmos_tx_hash) && (
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Transaction Hashes</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    {swap.eth_tx_hash && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Ethereum:</span>
                        <button className="font-mono text-blue-600 hover:text-blue-800 flex items-center gap-1">
                          {swap.eth_tx_hash.slice(0, 10)}...{swap.eth_tx_hash.slice(-6)}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {swap.cosmos_tx_hash && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Cosmos:</span>
                        <button className="font-mono text-purple-600 hover:text-purple-800 flex items-center gap-1">
                          {swap.cosmos_tx_hash.slice(0, 15)}...{swap.cosmos_tx_hash.slice(-6)}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {swap.completion_proof?.gas_used && (
                <div className="text-xs text-muted-foreground">
                  Gas used: <span className="font-medium text-green-600">{swap.completion_proof.gas_used}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SwapHistory;