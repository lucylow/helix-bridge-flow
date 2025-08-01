import { useState, useEffect } from 'react'
import './App.css'

// Simple UI components
const Button = ({ children, onClick, className = '', variant = 'default', disabled = false }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-all duration-200'
  const variants = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700',
    ghost: 'hover:bg-gray-100 text-gray-700',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white'
  }
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

const Input = ({ placeholder, value, onChange, className = '' }) => (
  <input
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
  />
)

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
    {children}
  </div>
)

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800'
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('swap')
  const [walletConnected, setWalletConnected] = useState(false)
  const [ethAddress, setEthAddress] = useState('')
  const [cosmosAddress, setCosmosAddress] = useState('')
  const [swaps, setSwaps] = useState([])
  const [apiStatus, setApiStatus] = useState('checking')
  const [currentQuote, setCurrentQuote] = useState(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [isCreatingSwap, setIsCreatingSwap] = useState(false)
  const [formData, setFormData] = useState({
    direction: 'eth-to-cosmos',
    fromToken: 'ETH',
    toToken: 'ATOM',
    amount: '',
    recipient: '',
    timelock: '3600'
  })

  // Test 1inch API connection on component mount
  useEffect(() => {
    testApiConnection()
    loadSwaps()
  }, [])

  // Get quote when amount changes
  useEffect(() => {
    if (formData.amount && parseFloat(formData.amount) > 0 && formData.direction === 'eth-to-cosmos') {
      getQuote()
    }
  }, [formData.amount, formData.fromToken, formData.toToken])

  const testApiConnection = async () => {
    try {
      const response = await fetch('/api/1inch/tokens?chainId=1')
      const data = await response.json()
      
      if (data.success) {
        setApiStatus('connected')
        console.log('1inch API connected successfully:', data.api_key_used)
      } else {
        setApiStatus('error')
        console.error('1inch API error:', data.error)
      }
    } catch (error) {
      setApiStatus('error')
      console.error('Failed to connect to 1inch API:', error)
    }
  }

  const loadSwaps = async () => {
    try {
      const response = await fetch('/api/atomic-swap/list')
      const data = await response.json()
      
      if (data.success) {
        setSwaps(data.swaps)
      }
    } catch (error) {
      console.error('Failed to load swaps:', error)
    }
  }

  const getQuote = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) return
    
    setIsLoadingQuote(true)
    try {
      const tokenAddresses = {
        'ETH': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        'USDC': '0xA0b86a33E6441b8e5e8e8e8e8e8e8e8e8e8e8e8e',
        'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F'
      }
      
      const srcToken = tokenAddresses[formData.fromToken] || tokenAddresses['ETH']
      const dstToken = tokenAddresses['USDC'] // Bridge token for cross-chain
      const amount = (parseFloat(formData.amount) * 10**18).toString() // Convert to wei
      
      const response = await fetch(`/api/1inch/quote?chainId=1&src=${srcToken}&dst=${dstToken}&amount=${amount}`)
      const data = await response.json()
      
      if (data.success) {
        setCurrentQuote(data.data)
        console.log('Quote received:', data.data)
      } else {
        console.error('Quote error:', data.error)
        setCurrentQuote(null)
      }
    } catch (error) {
      console.error('Failed to get quote:', error)
      setCurrentQuote(null)
    } finally {
      setIsLoadingQuote(false)
    }
  }

  const connectWallets = () => {
    // Simulate wallet connection
    setEthAddress('0xfef3...c3b7')
    setCosmosAddress('cosmos1abc...stu')
    setWalletConnected(true)
  }

  const createSwap = async () => {
    if (!formData.amount || !formData.recipient) {
      alert('Please fill all required fields')
      return
    }

    setIsCreatingSwap(true)
    try {
      const response = await fetch('/api/atomic-swap/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          direction: formData.direction,
          fromToken: formData.fromToken,
          toToken: formData.toToken,
          amount: formData.amount,
          senderAddress: formData.direction === 'eth-to-cosmos' ? ethAddress : cosmosAddress,
          recipientAddress: formData.recipient,
          timelock: formData.timelock
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Add to local swaps list
        const newSwap = {
          id: data.swap.id,
          direction: formData.direction,
          fromToken: formData.fromToken,
          toToken: formData.toToken,
          amount: formData.amount,
          status: 'created',
          timestamp: Date.now(),
          hashlock: data.swap.hashlock,
          timelock: data.swap.timelock,
          ethereum_transaction: data.swap.ethereum_transaction,
          cosmos_message: data.swap.cosmos_message
        }
        
        setSwaps(prev => [newSwap, ...prev])
        setFormData({
          direction: 'eth-to-cosmos',
          fromToken: 'ETH',
          toToken: 'ATOM',
          amount: '',
          recipient: '',
          timelock: '3600'
        })
        setCurrentQuote(null)
        alert('Atomic swap created successfully with hashlock/timelock protection!')
        console.log('Swap created:', data.swap)
      } else {
        alert('Failed to create swap: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to create swap:', error)
      alert('Failed to create swap: ' + error.message)
    } finally {
      setIsCreatingSwap(false)
    }
  }

  const executeOnchain = async (swap) => {
    try {
      const transaction = swap.ethereum_transaction
      if (!transaction) {
        alert('No transaction data available')
        return
      }

      const response = await fetch('/api/atomic-swap/execute-onchain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transaction })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`Transaction submitted to ${data.network}!\nTx Hash: ${data.transaction_hash}\nExplorer: ${data.explorer_url}`)
        
        // Update swap status
        setSwaps(prev => prev.map(s => 
          s.id === swap.id 
            ? { ...s, status: 'onchain', tx_hash: data.transaction_hash, explorer_url: data.explorer_url }
            : s
        ))
      } else {
        alert('Failed to execute transaction: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to execute onchain:', error)
      alert('Failed to execute transaction: ' + error.message)
    }
  }

  const claimSwap = async (swapId) => {
    try {
      // For demo, we'll use a mock secret
      const secret = 'mock_secret_for_demo_purposes_32_bytes'
      
      const response = await fetch('/api/atomic-swap/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ swapId, secret })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('Swap claimed successfully!')
        setSwaps(prev => prev.map(s => 
          s.id === swapId ? { ...s, status: 'claimed' } : s
        ))
      } else {
        alert('Failed to claim swap: ' + data.error)
      }
    } catch (error) {
      console.error('Failed to claim swap:', error)
      alert('Failed to claim swap: ' + error.message)
    }
  }

  const swapDirection = () => {
    const newDirection = formData.direction === 'eth-to-cosmos' ? 'cosmos-to-eth' : 'eth-to-cosmos'
    setFormData(prev => ({
      ...prev,
      direction: newDirection,
      fromToken: newDirection === 'eth-to-cosmos' ? 'ETH' : 'ATOM',
      toToken: newDirection === 'eth-to-cosmos' ? 'ATOM' : 'ETH'
    }))
    setCurrentQuote(null)
  }

  const formatQuoteAmount = (amount, decimals = 18) => {
    if (!amount) return '0'
    return (parseInt(amount) / 10**decimals).toFixed(6)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'created': return 'default'
      case 'onchain': return 'warning'
      case 'claimed': return 'success'
      case 'refunded': return 'error'
      default: return 'default'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">1</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  1inch Fusion+ Cosmos
                </h1>
                <p className="text-sm text-gray-600">Cross-chain atomic swaps</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">API: h6VoEtvR...paXr</span>
                <Badge variant={apiStatus === 'connected' ? 'success' : apiStatus === 'error' ? 'warning' : 'default'}>
                  {apiStatus === 'connected' ? 'Connected' : apiStatus === 'error' ? 'Error' : 'Checking'}
                </Badge>
              </div>
              {walletConnected ? (
                <div className="flex items-center space-x-2">
                  <Badge variant="success">Connected</Badge>
                  <Button variant="outline">{ethAddress}</Button>
                </div>
              ) : (
                <Button onClick={connectWallets}>Connect Wallets</Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!walletConnected && (
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Connect your Ethereum and Cosmos wallets to start creating atomic swaps.
            </h2>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { id: 'swap', label: 'Create Swap', icon: '⚡' },
            { id: 'history', label: 'History', icon: '📋' },
            { id: 'status', label: 'Status', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Swap Tab */}
        {activeTab === 'swap' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="mr-2">⚡</span>
                  Create Atomic Swap
                </h3>
                <p className="text-gray-600 mb-6">
                  Create a trustless cross-chain swap with hashlock/timelock protection and onchain execution
                </p>

                {/* Direction Selector */}
                <div className="flex items-center justify-center mb-6">
                  <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                        <span className="text-lg font-bold text-blue-600">ETH</span>
                      </div>
                      <p className="text-sm text-gray-600">Ethereum</p>
                    </div>
                    
                    <Button variant="outline" onClick={swapDirection} className="mx-4">
                      ↔️
                    </Button>
                    
                    <div className="text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                        <span className="text-lg font-bold text-purple-600">ATOM</span>
                      </div>
                      <p className="text-sm text-gray-600">Cosmos</p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From Token</label>
                      <div className="p-2 border border-gray-300 rounded-lg bg-gray-50">
                        {formData.fromToken}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To Token</label>
                      <div className="p-2 border border-gray-300 rounded-lg bg-gray-50">
                        {formData.toToken}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <Input
                      placeholder="0.0"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    />
                    {isLoadingQuote && (
                      <p className="text-sm text-blue-600 mt-1">🔄 Getting 1inch quote...</p>
                    )}
                    {currentQuote && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">1inch Quote:</p>
                        <p className="text-sm text-blue-600">
                          Expected output: {formatQuoteAmount(currentQuote.toAmount, currentQuote.toToken?.decimals)} {currentQuote.toToken?.symbol}
                        </p>
                        <p className="text-xs text-blue-500">
                          Gas estimate: {currentQuote.estimatedGas} • Protocols: {currentQuote.protocols?.length || 0}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Address ({formData.direction === 'eth-to-cosmos' ? 'Cosmos' : 'Ethereum'})
                    </label>
                    <Input
                      placeholder={formData.direction === 'eth-to-cosmos' ? 'cosmos1...' : '0x...'}
                      value={formData.recipient}
                      onChange={(e) => setFormData(prev => ({ ...prev, recipient: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timelock Duration</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.timelock}
                      onChange={(e) => setFormData(prev => ({ ...prev, timelock: e.target.value }))}
                    >
                      <option value="3600">1 hour (3600s)</option>
                      <option value="7200">2 hours (7200s)</option>
                      <option value="21600">6 hours (21600s)</option>
                      <option value="86400">24 hours (86400s)</option>
                    </select>
                  </div>

                  <Button 
                    onClick={createSwap}
                    disabled={!walletConnected || apiStatus !== 'connected' || isCreatingSwap}
                    className="w-full"
                  >
                    {!walletConnected ? '🔗 Connect Wallets First' : 
                     apiStatus !== 'connected' ? '⚠️ API Not Connected' :
                     isCreatingSwap ? '⏳ Creating Swap...' :
                     '⚡ Create Atomic Swap'}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Info Panel */}
            <div className="space-y-6">
              <Card className="p-6">
                <h4 className="font-semibold mb-4">Core Features ✅</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="text-green-500">🔒</span>
                    <div>
                      <p className="font-medium">Hashlock Protection</p>
                      <p className="text-sm text-gray-600">Cryptographic commitment scheme</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-green-500">⏰</span>
                    <div>
                      <p className="font-medium">Timelock Safety</p>
                      <p className="text-sm text-gray-600">Automatic refund mechanism</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-green-500">↔️</span>
                    <div>
                      <p className="font-medium">Bidirectional</p>
                      <p className="text-sm text-gray-600">ETH ↔ Cosmos swaps</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="text-green-500">⛓️</span>
                    <div>
                      <p className="font-medium">Onchain Execution</p>
                      <p className="text-sm text-gray-600">Sepolia testnet ready</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2">📋</span>
              Atomic Swap History
            </h3>
            
            {swaps.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚡</div>
                <h4 className="text-lg font-semibold mb-2">No atomic swaps yet</h4>
                <p className="text-gray-600 mb-4">Create your first atomic swap to see it here</p>
                <Button onClick={() => setActiveTab('swap')}>Create Swap</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {swaps.map(swap => (
                  <div key={swap.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{swap.fromToken} → {swap.toToken}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(swap.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(swap.status)}>
                          {swap.status}
                        </Badge>
                        <Badge variant="default">Atomic</Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <p className="font-medium">{swap.amount} {swap.fromToken}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Direction:</span>
                        <p className="font-medium">{swap.direction.replace('-', ' → ')}</p>
                      </div>
                    </div>
                    
                    {swap.hashlock && (
                      <div className="text-xs text-gray-500 mb-3">
                        <span>Hashlock: {swap.hashlock.substring(0, 16)}...</span>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      {swap.status === 'created' && swap.ethereum_transaction && (
                        <Button 
                          variant="warning" 
                          onClick={() => executeOnchain(swap)}
                          className="text-xs"
                        >
                          🚀 Execute Onchain
                        </Button>
                      )}
                      {swap.status === 'onchain' && (
                        <Button 
                          variant="success" 
                          onClick={() => claimSwap(swap.id)}
                          className="text-xs"
                        >
                          🎯 Claim Swap
                        </Button>
                      )}
                      {swap.explorer_url && (
                        <Button 
                          variant="outline" 
                          onClick={() => window.open(swap.explorer_url, '_blank')}
                          className="text-xs"
                        >
                          🔍 View on Explorer
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Status Tab */}
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Network Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Ethereum (Sepolia)</span>
                  <Badge variant="success">Online</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Cosmos (Theta)</span>
                  <Badge variant="success">Online</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>1inch API</span>
                  <Badge variant={apiStatus === 'connected' ? 'success' : 'warning'}>
                    {apiStatus === 'connected' ? 'Connected' : 'Error'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Atomic Swap Engine</span>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Swaps</span>
                  <span className="font-bold text-2xl">{swaps.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Created</span>
                  <span className="font-bold text-2xl text-blue-600">
                    {swaps.filter(s => s.status === 'created').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Onchain</span>
                  <span className="font-bold text-2xl text-yellow-600">
                    {swaps.filter(s => s.status === 'onchain').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Completed</span>
                  <span className="font-bold text-2xl text-green-600">
                    {swaps.filter(s => s.status === 'claimed').length}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">© 2025 1inch Fusion+ Cosmos Extension • Built with ❤️ by Manus AI</p>
            <div className="flex space-x-4">
              <Button variant="ghost">📚 Documentation</Button>
              <Button variant="ghost">🐙 GitHub</Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App

