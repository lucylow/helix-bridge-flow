import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { 
  ArrowLeftRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Eye, 
  Key, 
  RefreshCw,
  Copy,
  AlertTriangle
} from 'lucide-react'

const SwapHistory = ({ swaps, onUpdateStatus }) => {
  const [selectedSwap, setSelectedSwap] = useState(null)
  const [claimSecret, setClaimSecret] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatTimelock = (timelock) => {
    const hours = Math.floor(timelock / 3600)
    const minutes = Math.floor((timelock % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const handleClaimSwap = async (swapId) => {
    if (!claimSecret) return

    setIsProcessing(true)
    try {
      // Simulate claim process
      await new Promise(resolve => setTimeout(resolve, 2000))
      onUpdateStatus(swapId, 'completed', 'claim_tx_' + Math.random().toString(36).substr(2, 9))
      setClaimSecret('')
      setSelectedSwap(null)
    } catch (error) {
      console.error('Claim failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRefundSwap = async (swapId) => {
    setIsProcessing(true)
    try {
      // Simulate refund process
      await new Promise(resolve => setTimeout(resolve, 2000))
      onUpdateStatus(swapId, 'failed', 'refund_tx_' + Math.random().toString(36).substr(2, 9))
      setSelectedSwap(null)
    } catch (error) {
      console.error('Refund failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const isExpired = (swap) => {
    const expiryTime = swap.timestamp + (swap.timelock * 1000)
    return Date.now() > expiryTime
  }

  if (swaps.length === 0) {
    return (
      <div className="text-center py-12">
        <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No swaps yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first atomic swap to see it here
        </p>
        <Button variant="outline">
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Create Swap
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {swaps.map((swap) => (
        <Card key={swap.id} className="transition-all hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getStatusIcon(swap.status)}
                <div>
                  <h3 className="font-semibold">
                    {swap.fromToken} → {swap.toToken}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(swap.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={getStatusColor(swap.status)}>
                  {swap.status}
                </Badge>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setSelectedSwap(swap)}>
                      <Eye className="w-4 h-4 mr-2" />
                      Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <ArrowLeftRight className="w-5 h-5" />
                        <span>Swap Details</span>
                      </DialogTitle>
                      <DialogDescription>
                        Complete information about this atomic swap
                      </DialogDescription>
                    </DialogHeader>
                    
                    {selectedSwap && (
                      <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Swap ID</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {selectedSwap.id}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyToClipboard(selectedSwap.id)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Status</Label>
                            <div className="mt-1">
                              <Badge variant={getStatusColor(selectedSwap.status)}>
                                {selectedSwap.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Swap Details */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">From</Label>
                            <p className="text-sm mt-1">
                              {selectedSwap.amount} {selectedSwap.fromToken}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">To</Label>
                            <p className="text-sm mt-1">
                              {selectedSwap.amount} {selectedSwap.toToken}
                            </p>
                          </div>
                        </div>

                        {/* Addresses */}
                        <div className="space-y-3">
                          <div>
                            <Label className="text-sm font-medium">Sender</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                                {selectedSwap.sender}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyToClipboard(selectedSwap.sender)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Recipient</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                                {selectedSwap.recipient}
                              </code>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyToClipboard(selectedSwap.recipient)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Technical Details */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Timelock</Label>
                            <p className="text-sm mt-1">{formatTimelock(selectedSwap.timelock)}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Network</Label>
                            <p className="text-sm mt-1 capitalize">{selectedSwap.network}</p>
                          </div>
                        </div>

                        {/* Hashlock */}
                        <div>
                          <Label className="text-sm font-medium">Hashlock</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                              {selectedSwap.hashlock}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => copyToClipboard(selectedSwap.hashlock)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Memo */}
                        {selectedSwap.memo && (
                          <div>
                            <Label className="text-sm font-medium">Memo</Label>
                            <p className="text-sm mt-1 bg-muted p-2 rounded">
                              {selectedSwap.memo}
                            </p>
                          </div>
                        )}

                        {/* Transaction Hash */}
                        {selectedSwap.txHash && (
                          <div>
                            <Label className="text-sm font-medium">Transaction Hash</Label>
                            <div className="flex items-center space-x-2 mt-1">
                              <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                                {selectedSwap.txHash}
                              </code>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        {selectedSwap.status === 'pending' && (
                          <div className="space-y-4 pt-4 border-t">
                            {isExpired(selectedSwap) ? (
                              <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  This swap has expired and can be refunded.
                                </AlertDescription>
                              </Alert>
                            ) : (
                              <Alert>
                                <Clock className="h-4 w-4" />
                                <AlertDescription>
                                  This swap is active and can be claimed with the correct secret.
                                </AlertDescription>
                              </Alert>
                            )}

                            {!isExpired(selectedSwap) && (
                              <div className="space-y-3">
                                <Label htmlFor="claimSecret">Secret (to claim swap)</Label>
                                <div className="flex space-x-2">
                                  <Input
                                    id="claimSecret"
                                    placeholder="Enter secret to claim swap"
                                    value={claimSecret}
                                    onChange={(e) => setClaimSecret(e.target.value)}
                                  />
                                  <Button 
                                    onClick={() => handleClaimSwap(selectedSwap.id)}
                                    disabled={!claimSecret || isProcessing}
                                  >
                                    {isProcessing ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Key className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}

                            {isExpired(selectedSwap) && (
                              <Button 
                                variant="destructive" 
                                onClick={() => handleRefundSwap(selectedSwap.id)}
                                disabled={isProcessing}
                                className="w-full"
                              >
                                {isProcessing ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Processing Refund...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Refund Swap
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <p className="font-medium">{swap.amount} {swap.fromToken}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Direction:</span>
                <p className="font-medium capitalize">{swap.direction.replace('-', ' → ')}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Timelock:</span>
                <p className="font-medium">{formatTimelock(swap.timelock)}</p>
              </div>
            </div>

            {swap.memo && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-muted-foreground text-sm">Memo:</span>
                <p className="text-sm mt-1">{swap.memo}</p>
              </div>
            )}

            {isExpired(swap) && swap.status === 'pending' && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This swap has expired and can be refunded.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default SwapHistory

