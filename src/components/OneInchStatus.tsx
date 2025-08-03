import { useOneInchAPI } from '@/hooks/useOneInchAPI';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RefreshCw, Zap } from 'lucide-react';

export const OneInchStatus = () => {
  const { status, isLoading, healthCheck, getQuote, getFusionQuote, getSupportedChains } = useOneInchAPI();

  const handleDemoQuote = async () => {
    // Demo ETH -> USDC quote
    const result = await getQuote(
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
      '0xA0b86a33E6441041f35e27C7Cf42f3E95465DF6E', // USDC
      '1000000000000000000' // 1 ETH
    );
    
    if (result.success) {
      alert('✅ Real 1inch quote received! Check console for details.');
    } else {
      alert('❌ Quote failed: ' + result.error);
    }
  };

  const handleDemoFusionQuote = async () => {
    // Demo ETH (Ethereum) -> MATIC (Polygon) quote
    const result = await getFusionQuote(
      '1',   // Ethereum
      '137', // Polygon
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
      '0x0000000000000000000000000000000000001010', // MATIC
      '1000000000000000000' // 1 ETH
    );
    
    if (result.success) {
      alert('✅ Real Fusion+ quote received! Check console for details.');
    } else {
      alert('❌ Fusion+ quote failed: ' + result.error);
    }
  };

  const handleDemoChains = async () => {
    const result = await getSupportedChains();
    
    if (result.success) {
      alert('✅ Supported chains loaded! Check console for details.');
    } else {
      alert('❌ Failed to load chains: ' + result.error);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          1inch API Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">API Connection:</span>
          <div className="flex items-center gap-2">
            {status.isConnected ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  ✅ REAL API CONNECTED
                </Badge>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <Badge variant="destructive">
                  ❌ DISCONNECTED
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* API Key Info */}
        {status.apiKeyUsed && (
          <div className="text-xs text-muted-foreground">
            <p><strong>API Key:</strong> {status.apiKeyUsed}</p>
            <p><strong>Last Check:</strong> {status.lastChecked?.toLocaleTimeString()}</p>
          </div>
        )}

        {/* Error Display */}
        {status.error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            <strong>Error:</strong> {status.error}
          </div>
        )}

        {/* Controls */}
        <div className="space-y-2">
          <Button 
            onClick={healthCheck} 
            disabled={isLoading}
            variant="outline" 
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>

          {status.isConnected && (
            <div className="grid grid-cols-1 gap-2">
              <Button onClick={handleDemoQuote} variant="secondary" size="sm">
                🚀 Demo: Real Quote
              </Button>
              <Button onClick={handleDemoFusionQuote} variant="secondary" size="sm">
                🌉 Demo: Fusion+ Quote
              </Button>
              <Button onClick={handleDemoChains} variant="secondary" size="sm">
                🔗 Demo: Supported Chains
              </Button>
            </div>
          )}
        </div>

        {/* Real API Notice */}
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
          <p><strong>✨ REAL 1inch Integration!</strong></p>
          <p>This connects to actual 1inch APIs - no mock data!</p>
        </div>
      </CardContent>
    </Card>
  );
};