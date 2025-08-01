import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { 
  Wallet, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  Copy,
  Unplug,
  Zap
} from 'lucide-react'

const WalletConnect = ({ onConnect, onDisconnect, ethAddress, cosmosAddress }) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [showWalletDialog, setShowWalletDialog] = useState(false)

  const isConnected = ethAddress && cosmosAddress

  const connectEthereumWallet = async () => {
    try {
      // Simulate MetaMask connection
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        return accounts[0]
      } else {
        // Simulate connection for demo
        return '0x' + Math.random().toString(16).substr(2, 40)
      }
    } catch (error) {
      throw new Error('Failed to connect Ethereum wallet')
    }
  }

  const connectCosmosWallet = async () => {
    try {
      // Simulate Keplr connection
      if (typeof window.keplr !== 'undefined') {
        await window.keplr.enable('cosmoshub-4')
        const offlineSigner = window.keplr.getOfflineSigner('cosmoshub-4')
        const accounts = await offlineSigner.getAccounts()
        return accounts[0].address
      } else {
        // Simulate connection for demo
        return 'cosmos1' + Math.random().toString(36).substr(2, 38)
      }
    } catch (error) {
      throw new Error('Failed to connect Cosmos wallet')
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    setConnectionError('')

    try {
      const ethAddr = await connectEthereumWallet()
      const cosmosAddr = await connectCosmosWallet()
      
      onConnect(ethAddr, cosmosAddr)
      setShowWalletDialog(false)
    } catch (error) {
      setConnectionError(error.message)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    onDisconnect()
    setShowWalletDialog(false)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="text-green-600 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Connected
        </Badge>
        
        <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Wallet className="w-4 h-4 mr-2" />
              {formatAddress(ethAddress)}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Wallet className="w-5 h-5" />
                <span>Connected Wallets</span>
              </DialogTitle>
              <DialogDescription>
                Your connected wallet addresses for cross-chain swaps
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Ethereum Wallet */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">ETH</span>
                    </div>
                    <span>Ethereum</span>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {ethAddress}
                    </code>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(ethAddress)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Connected via MetaMask • Sepolia Testnet
                  </p>
                </CardContent>
              </Card>

              {/* Cosmos Wallet */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">ATOM</span>
                    </div>
                    <span>Cosmos</span>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {cosmosAddress}
                    </code>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(cosmosAddress)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Connected via Keplr • Theta Testnet
                  </p>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex space-x-2 pt-4">
                <Button variant="outline" onClick={handleDisconnect} className="flex-1">
                  <Unplug className="w-4 h-4 mr-2" />
                  Disconnect All
                </Button>
                <Button variant="outline" className="flex-1">
                  <Zap className="w-4 h-4 mr-2" />
                  Switch Network
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
      <DialogTrigger asChild>
        <Button>
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallets
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wallet className="w-5 h-5" />
            <span>Connect Wallets</span>
          </DialogTitle>
          <DialogDescription>
            Connect both Ethereum and Cosmos wallets to enable cross-chain atomic swaps
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Required Wallets */}
          <div className="space-y-4">
            <h3 className="font-semibold">Required Wallets</h3>
            
            {/* Ethereum */}
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-600">ETH</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">Ethereum</h4>
                      <p className="text-sm text-muted-foreground">MetaMask, WalletConnect</p>
                    </div>
                  </div>
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Cosmos */}
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-purple-600">ATOM</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">Cosmos</h4>
                      <p className="text-sm text-muted-foreground">Keplr, Cosmostation</p>
                    </div>
                  </div>
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Connection Error */}
          {connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}

          {/* Connect Button */}
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="w-full"
            size="lg"
          >
            {isConnecting ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-pulse" />
                Connecting Wallets...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Connect Both Wallets
              </>
            )}
          </Button>

          {/* Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Both wallets are required to create and manage atomic swaps between Ethereum and Cosmos networks.
            </AlertDescription>
          </Alert>

          {/* Supported Networks */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Supported Networks:</p>
            <p>Ethereum: Sepolia Testnet • Cosmos: Theta Testnet</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WalletConnect

