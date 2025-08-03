import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface APIStatus {
  isConnected: boolean;
  lastChecked: Date | null;
  apiKeyUsed: string | null;
  error: string | null;
}

interface QuoteData {
  success: boolean;
  data?: any;
  error?: string;
  endpoint_called?: string;
  note?: string;
}

export const useOneInchAPI = () => {
  const [status, setStatus] = useState<APIStatus>({
    isConnected: false,
    lastChecked: null,
    apiKeyUsed: null,
    error: null
  });

  const [isLoading, setIsLoading] = useState(false);

  const healthCheck = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('oneinch-api', {
        body: { endpoint: 'health' }
      });

      if (error) {
        console.error('❌ Health check error:', error);
        setStatus({
          isConnected: false,
          lastChecked: new Date(),
          apiKeyUsed: null,
          error: error.message
        });
        return false;
      }

      if (data?.success) {
        console.log('✅ 1inch API Health Check Passed:', data);
        setStatus({
          isConnected: true,
          lastChecked: new Date(),
          apiKeyUsed: data.api_key_used,
          error: null
        });
        return true;
      } else {
        setStatus({
          isConnected: false,
          lastChecked: new Date(),
          apiKeyUsed: null,
          error: data?.error || 'Unknown error'
        });
        return false;
      }
    } catch (error: any) {
      console.error('❌ Health check failed:', error);
      setStatus({
        isConnected: false,
        lastChecked: new Date(),
        apiKeyUsed: null,
        error: error.message
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getQuote = async (src: string, dst: string, amount: string, chainId: string = '1'): Promise<QuoteData> => {
    try {
      console.log(`🚀 Getting REAL 1inch quote: ${amount} ${src} -> ${dst} on chain ${chainId}`);
      
      const { data, error } = await supabase.functions.invoke('oneinch-api', {
        body: {
          endpoint: 'quote',
          chainId,
          src,
          dst,
          amount
        }
      });

      if (error) {
        console.error('❌ Quote error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ REAL 1inch quote received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Quote failed:', error);
      return { success: false, error: error.message };
    }
  };

  const getFusionQuote = async (
    srcChainId: string,
    dstChainId: string, 
    srcToken: string,
    dstToken: string,
    amount: string
  ): Promise<QuoteData> => {
    try {
      console.log(`🚀 Getting REAL Fusion+ quote: ${amount} from chain ${srcChainId} to ${dstChainId}`);
      
      const { data, error } = await supabase.functions.invoke('oneinch-api', {
        body: {
          endpoint: 'fusion-quote',
          srcChainId,
          dstChainId,
          srcToken,
          dstToken,
          amount
        }
      });

      if (error) {
        console.error('❌ Fusion+ quote error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ REAL Fusion+ quote received:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Fusion+ quote failed:', error);
      return { success: false, error: error.message };
    }
  };

  const getSupportedChains = async (): Promise<QuoteData> => {
    try {
      console.log(`🚀 Getting REAL Fusion+ supported chains`);
      
      const { data, error } = await supabase.functions.invoke('oneinch-api', {
        body: { endpoint: 'fusion-chains' }
      });

      if (error) {
        console.error('❌ Supported chains error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ REAL Fusion+ supported chains:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Supported chains failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Auto health check on mount
  useEffect(() => {
    healthCheck();
  }, []);

  return {
    status,
    isLoading,
    healthCheck,
    getQuote,
    getFusionQuote,
    getSupportedChains
  };
};