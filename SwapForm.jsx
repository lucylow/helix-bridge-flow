import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { ArrowUpDown, Clock, Hash, Wallet, AlertTriangle, CheckCircle } from 'lucide-react'

const SwapForm = ({ walletConnected, ethAddress, cosmosAddress, onSwapCreated, apiKey }) => {
  const [formData, setFormData] = useState({
    direction: 'eth-to-cosmos',
    fromToken: 'ETH',
    toToken: 'ATOM',
    amount: '',
    recipient: '',
    timelock: '3600', // 1 hour default
    hashlock: '',
    memo: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const tokens = {
    ethereum: ['ETH', 'USDC', 'USDT', 'DAI'],
    cosmos: ['ATOM', 'OSMO', 'JUNO', 'STARS']
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const generateHashlock = () => {
    // Generate a random 32-byte secret and its hash
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Simple SHA-256 simulation (in real implementation, use proper crypto)
    const hashlock = 'hash_' + secret.slice(0, 32)
    
    setFormData(prev => ({ ...prev, hashlock }))
    
    // Store secret for later use (in real implementation, handle securely)
    localStorage.setItem(`secret_${hashlock}`, secret)
  }

  const swapDirection = () => {
    const newDirection = formData.direction === 'eth-to-cosmos' ? 'cosmos-to-eth' : 'eth-to-cosmos'
    setFormData(prev => ({
      ...prev,
      direction: newDirection,
      fromToken: newDirection === 'eth-to-cosmos' ? 'ETH' : 'ATOM',
      toToken: newDirection === 'eth-to-cosmos' ? 'ATOM' : 'ETH',
      recipient: ''
    }))
  }

  const validateForm = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return 'Please enter a valid amount'
    }
    if (!formData.recipient) {
      return 'Please enter recipient address'
    }
    if (!formData.hashlock) {
      return 'Please generate a hashlock'
    }
    if (!formData.timelock || parseInt(formData.timelock) < 3600) {
      return 'Timelock must be at least 1 hour (3600 seconds)'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!walletConnected) {
      setError('Please connect your wallets first')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsCreating(true)
    setError('')

    try {
      // Simulate swap creation (in real implementation, interact with smart contracts)
      await new Promise(resolve => setTimeout(resolve, 2000))

      const swap = {
        direction: formData.direction,
        fromToken: formData.fromToken,
        toToken: formData.toToken,
        amount: formData.amount,
        recipient: formData.recipient,
        sender: formData.direction === 'eth-to-cosmos' ? ethAddress : cosmosAddress,
        timelock: parseInt(formData.timelock),
        hashlock: formData.hashlock,
        memo: formData.memo,
        status: 'pending',
        network: formData.direction === 'eth-to-cosmos' ? 'ethereum' : 'cosmos'
      }

      onSwapCreated(swap)
      setSuccess('Atomic swap created successfully!')
      
      // Reset form
      setFormData({
        direction: 'eth-to-cosmos',
        fromToken: 'ETH',
        toToken: 'ATOM',
        amount: '',
        recipient: '',
        timelock: '3600',
        hashlock: '',
        memo: ''
      })

    } catch (err) {
      setError('Failed to create swap: ' + err.message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Direction Selector */}
      <div className="flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
                  <span className="text-lg font-bold text-blue-600">ETH</span>
                </div>
                <p className="text-sm text-muted-foreground">Ethereum</p>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={swapDirection}
                className="mx-4"
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-2">
                  <span className="text-lg font-bold text-purple-600">ATOM</span>
                </div>
                <p className="text-sm text-muted-foreground">Cosmos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fromToken">From Token</Label>
          <Select value={formData.fromToken} onValueChange={(value) => handleInputChange('fromToken', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select token" />
            </SelectTrigger>
            <SelectContent>
              {(formData.direction === 'eth-to-cosmos' ? tokens.ethereum : tokens.cosmos).map(token => (
                <SelectItem key={token} value={token}>{token}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="toToken">To Token</Label>
          <Select value={formData.toToken} onValueChange={(value) => handleInputChange('toToken', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select token" />
            </SelectTrigger>
            <SelectContent>
              {(formData.direction === 'eth-to-cosmos' ? tokens.cosmos : tokens.ethereum).map(token => (
                <SelectItem key={token} value={token}>{token}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.000001"
          placeholder="0.0"
          value={formData.amount}
          onChange={(e) => handleInputChange('amount', e.target.value)}
          className="text-lg"
        />
      </div>

      {/* Recipient Address */}
      <div className="space-y-2">
        <Label htmlFor="recipient">
          Recipient Address ({formData.direction === 'eth-to-cosmos' ? 'Cosmos' : 'Ethereum'})
        </Label>
        <Input
          id="recipient"
          placeholder={formData.direction === 'eth-to-cosmos' ? 'cosmos1...' : '0x...'}
          value={formData.recipient}
          onChange={(e) => handleInputChange('recipient', e.target.value)}
        />
      </div>

      {/* Hashlock */}
      <div className="space-y-2">
        <Label htmlFor="hashlock">Hashlock</Label>
        <div className="flex space-x-2">
          <Input
            id="hashlock"
            placeholder="Generated hashlock will appear here"
            value={formData.hashlock}
            onChange={(e) => handleInputChange('hashlock', e.target.value)}
            readOnly
          />
          <Button type="button" onClick={generateHashlock} variant="outline">
            <Hash className="w-4 h-4 mr-2" />
            Generate
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          A unique hashlock is required for atomic swap security
        </p>
      </div>

      {/* Timelock */}
      <div className="space-y-2">
        <Label htmlFor="timelock">Timelock (seconds)</Label>
        <Select value={formData.timelock} onValueChange={(value) => handleInputChange('timelock', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select timelock duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3600">1 hour (3600s)</SelectItem>
            <SelectItem value="7200">2 hours (7200s)</SelectItem>
            <SelectItem value="21600">6 hours (21600s)</SelectItem>
            <SelectItem value="86400">24 hours (86400s)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Time limit for the swap to be completed before refund is possible
        </p>
      </div>

      {/* Memo (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="memo">Memo (Optional)</Label>
        <Textarea
          id="memo"
          placeholder="Add a note for this swap..."
          value={formData.memo}
          onChange={(e) => handleInputChange('memo', e.target.value)}
          rows={3}
        />
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Wallet Status */}
      {!walletConnected && (
        <Alert>
          <Wallet className="h-4 w-4" />
          <AlertDescription>
            Connect your wallets to create atomic swaps
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!walletConnected || isCreating}
        size="lg"
      >
        {isCreating ? (
          <>
            <Clock className="w-4 h-4 mr-2 animate-spin" />
            Creating Swap...
          </>
        ) : (
          <>
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Create Atomic Swap
          </>
        )}
      </Button>

      {/* API Key Display */}
      <div className="text-center text-xs text-muted-foreground">
        Using 1inch API: {apiKey.slice(0, 8)}...{apiKey.slice(-4)}
      </div>
    </form>
  )
}

export default SwapForm

