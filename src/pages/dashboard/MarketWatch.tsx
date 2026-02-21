import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Search, X, MoreVertical, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import marketWatchService from '../../services/marketWatchService'
import watchlistService from '../../services/watchlistService'
import userManagementService from '../../services/userManagementService'
import ConfigManager from '../../utils/configManager'
import toast from 'react-hot-toast'

interface FeedInstrument {
  insToken: number
  ltp: number
  bid: number
  ask: number
  open: number
  high: number
  low: number
  close: number
  lastQty?: number
  avgPrice?: number
  lastTradedTime?: number
  buyQty?: number
  sellQty?: number
  volume?: number
  bids?: Array<{ qty: number; price: number }>
  asks?: Array<{ qty: number; price: number }>
}

interface ExchangeConfig {
  key: string
  name: string
  symbol: string
  status: boolean
  turnover: boolean
  turnoverValue: number
}

interface InstrumentConfig {
  instrumentName: string
  instrumentToken: number
  expiry?: string
  exchange?: string
  script?: string
  tradeSymbol?: string
  [key: string]: any
}

interface WatchlistItem {
  id: number
  token: number
  sortOrder: number
}

interface PriceChange {
  ltp?: 'up' | 'down'
  bid?: 'up' | 'down'
  ask?: 'up' | 'down'
  buyQty?: 'up' | 'down'
  sellQty?: 'up' | 'down'
}

// Date formatter cache to avoid repeated parsing
const dateFormatterCache = new Map<number, string>()

const formatTimestamp = (timestamp: number | undefined): string => {
  if (!timestamp) return '-'
  
  if (dateFormatterCache.has(timestamp)) {
    return dateFormatterCache.get(timestamp)!
  }
  
  const formatted = new Date(timestamp).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\//g, '-')
  
  dateFormatterCache.set(timestamp, formatted)
  return formatted
}

const formatExpiry = (expiry: string | undefined): string => {
  if (!expiry) return '-'
  const numExpiry = parseInt(expiry)
  if (dateFormatterCache.has(numExpiry)) {
    return dateFormatterCache.get(numExpiry)!
  }
  const formatted = new Date(numExpiry).toLocaleDateString('en-GB').replace(/\//g, '-')
  dateFormatterCache.set(numExpiry, formatted)
  return formatted
}

// Memoized Table Row Component
const TableRow = memo(({ 
  instrument, 
  index, 
  config,
  changes,
  onActionMenuOpen,
  deletingToken
}: { 
  instrument: FeedInstrument
  index: number
  config: InstrumentConfig | undefined
  changes: PriceChange
  onActionMenuOpen: (token: number, position: { x: number, y: number }) => void
  deletingToken: number | null
}) => {
  const change = instrument.ltp - instrument.close
  const isPositive = change > 0
  
  // Check if bid price is going up or down (for Exchange triangle)
  const isBidPositive = changes.bid === 'up' || (!changes.bid && isPositive)
  
  const instrumentName = config?.tradeSymbol || config?.instrumentName || config?.script || `Token ${instrument.insToken}`
  const exchangeName = config?.exchange || ''
  const instrumentScript = config?.script || config?.instrumentName || ''
  const expiry = formatExpiry(config?.expiry)
  const lastTradedTime = formatTimestamp(instrument.lastTradedTime)
  
  return (
    <tr
      className={`hover:bg-slate-700 transition-colors ${
        index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-850'
      }`}
    >
      {/* Actions */}
      <td className={`px-3 py-2 text-center sticky left-0 ${
        index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-850'
      }`}>
        <button
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            onActionMenuOpen(instrument.insToken, { x: rect.right, y: rect.bottom })
          }}
          className="action-menu-trigger text-slate-300 hover:text-slate-100 transition-colors p-1 rounded hover:bg-slate-700"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </td>

      {/* Exchange with Triangle */}
      <td className="px-4 py-2 text-left">
        <div className="inline-flex items-center gap-1.5">
          {isBidPositive ? (
            <span className="text-green-400 text-base">▲</span>
          ) : (
            <span className="text-red-400 text-base">▼</span>
          )}
          <span className="text-slate-300 font-semibold text-base">
            {exchangeName || 'N/A'}
          </span>
        </div>
      </td>

      {/* Symbol */}
      <td className="px-4 py-2 text-left">
        <div 
          className={`inline-block px-3 py-1.5 rounded-lg font-bold text-base transition-all hover:scale-105 cursor-pointer text-white ${
            isPositive
              ? 'bg-blue-700 hover:bg-blue-800'
              : 'bg-red-700 hover:bg-red-800'
          }`}
        >
          {instrumentScript || instrumentName}
        </div>
      </td>

      {/* Expiry */}
      <td className="px-4 py-2 text-right">
        <span className="text-slate-300 text-base font-medium">{expiry}</span>
      </td>

      {/* Buy Qty */}
      <td className="px-4 py-2 text-right">
        <span 
          className={`inline-block px-3 py-1.5 rounded-lg font-medium text-base transition-all hover:scale-105 cursor-pointer ${
            changes.buyQty 
              ? (changes.buyQty === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
              : 'text-slate-200 hover:bg-slate-700'
          }`}
          onMouseEnter={(e) => { if (!changes.buyQty) e.currentTarget.style.color = 'white' }}
          onMouseLeave={(e) => { if (!changes.buyQty) e.currentTarget.style.color = '' }}
        >
          {instrument.bids?.[0]?.qty || '-'}
        </span>
      </td>

      {/* Buy Price (Bid) */}
      <td className="px-4 py-2 text-right">
        <span 
          className={`inline-block px-3 py-1.5 rounded-lg font-semibold text-base transition-all hover:scale-105 cursor-pointer ${
            changes.bid 
              ? (changes.bid === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
              : 'text-slate-200 hover:bg-slate-700'
          }`}
          onMouseEnter={(e) => { if (!changes.bid) e.currentTarget.style.color = 'white' }}
          onMouseLeave={(e) => { if (!changes.bid) e.currentTarget.style.color = '' }}
        >
          {instrument.bid.toFixed(2)}
        </span>
      </td>

      {/* Sell Price (Ask) */}
      <td className="px-4 py-2 text-right">
        <span 
          className={`inline-block px-3 py-1.5 rounded-lg font-semibold text-base transition-all hover:scale-105 cursor-pointer ${
            changes.ask 
              ? (changes.ask === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
              : 'text-slate-200 hover:bg-slate-700'
          }`}
          onMouseEnter={(e) => { if (!changes.ask) e.currentTarget.style.color = 'white' }}
          onMouseLeave={(e) => { if (!changes.ask) e.currentTarget.style.color = '' }}
        >
          {instrument.ask.toFixed(2)}
        </span>
      </td>

      {/* Sell Qty */}
      <td className="px-4 py-2 text-right">
        <span 
          className={`inline-block px-3 py-1.5 rounded-lg font-medium text-base transition-all hover:scale-105 cursor-pointer ${
            changes.sellQty 
              ? (changes.sellQty === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
              : 'text-slate-200 hover:bg-slate-700'
          }`}
          onMouseEnter={(e) => { if (!changes.sellQty) e.currentTarget.style.color = 'white' }}
          onMouseLeave={(e) => { if (!changes.sellQty) e.currentTarget.style.color = '' }}
        >
          {instrument.asks?.[0]?.qty || '-'}
        </span>
      </td>

      {/* LTP */}
      <td className="px-4 py-2 text-right">
        <span 
          className={`inline-block px-3 py-1.5 rounded-lg font-bold text-base transition-all hover:scale-105 cursor-pointer ${
            changes.ltp 
              ? (changes.ltp === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
              : 'text-slate-200 hover:bg-slate-700'
          }`}
          onMouseEnter={(e) => { if (!changes.ltp) e.currentTarget.style.color = 'white' }}
          onMouseLeave={(e) => { if (!changes.ltp) e.currentTarget.style.color = '' }}
        >
          {instrument.ltp.toFixed(2)}
        </span>
      </td>

      {/* Net Change */}
      <td className="px-4 py-2 text-right">
        <span 
          className={`inline-block px-3 py-1.5 rounded-lg font-bold text-base transition-all hover:scale-105 cursor-pointer ${
            changes.ltp
              ? (changes.ltp === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
              : (isPositive ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-200 hover:bg-slate-700')
          }`}
          onMouseEnter={(e) => { if (!changes.ltp) e.currentTarget.style.color = 'white' }}
          onMouseLeave={(e) => { if (!changes.ltp) e.currentTarget.style.color = '' }}
        >
          {isPositive ? '+' : ''}{change.toFixed(2)}
        </span>
      </td>

      {/* Open */}
      <td className="px-4 py-2 text-right">
        <span className="inline-block px-3 py-1.5 rounded-lg font-medium text-base text-slate-300 hover:bg-slate-700 hover:!text-white cursor-pointer transition-all">
          {instrument.open.toFixed(2)}
        </span>
      </td>

      {/* High */}
      <td className="px-4 py-2 text-right">
        <span className="inline-block px-3 py-1.5 rounded-lg font-medium text-base text-slate-300 hover:bg-slate-700 hover:!text-white cursor-pointer transition-all">
          {instrument.high.toFixed(2)}
        </span>
      </td>

      {/* Low */}
      <td className="px-4 py-2 text-right">
        <span className="inline-block px-3 py-1.5 rounded-lg font-medium text-base text-slate-300 hover:bg-slate-700 hover:!text-white cursor-pointer transition-all">
          {instrument.low.toFixed(2)}
        </span>
      </td>

      {/* Close */}
      <td className="px-4 py-2 text-right">
        <span className="inline-block px-3 py-1.5 rounded-lg font-medium text-base transition-all hover:scale-105 cursor-pointer text-slate-300 hover:bg-slate-700 hover:!text-white">
          {instrument.close.toFixed(2)}
        </span>
      </td>

      {/* LTT - Last Traded Time */}
      <td className="px-4 py-2 text-right">
        <span className="text-slate-400 text-xs font-mono whitespace-nowrap">
          {lastTradedTime}
        </span>
      </td>
    </tr>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.instrument.insToken === nextProps.instrument.insToken &&
    prevProps.instrument.ltp === nextProps.instrument.ltp &&
    prevProps.instrument.bid === nextProps.instrument.bid &&
    prevProps.instrument.ask === nextProps.instrument.ask &&
    prevProps.instrument.buyQty === nextProps.instrument.buyQty &&
    prevProps.instrument.sellQty === nextProps.instrument.sellQty &&
    prevProps.deletingToken === nextProps.deletingToken &&
    JSON.stringify(prevProps.changes) === JSON.stringify(nextProps.changes)
  )
})

const MarketWatch: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [feedData, setFeedData] = useState<FeedInstrument[]>([])
  const [exchanges, setExchanges] = useState<ExchangeConfig[]>([])
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null)
  const [selectedExchangeName, setSelectedExchangeName] = useState<string | null>(null)
  const [scripts, setScripts] = useState<InstrumentConfig[]>([])
  const [selectedScript, setSelectedScript] = useState<InstrumentConfig | null>(null)
  const [scriptSearchTerm, setScriptSearchTerm] = useState('')
  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false)
  const [showScriptDropdown, setShowScriptDropdown] = useState(false)
  const [showAllScriptsDropdown, setShowAllScriptsDropdown] = useState(false)
  const [allScriptsSearchTerm, setAllScriptsSearchTerm] = useState('')
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [isAddingToWatchlist, setIsAddingToWatchlist] = useState(false)
  const [actionMenuToken, setActionMenuToken] = useState<number | null>(null)
  const [actionMenuPosition, setActionMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [deletingToken, setDeletingToken] = useState<number | null>(null)
  const [priceChanges, setPriceChanges] = useState<Record<number, PriceChange>>({})
  const [showScripInfoModal, setShowScripInfoModal] = useState(false)
  const [selectedScripInfo, setSelectedScripInfo] = useState<{ token: number; config: InstrumentConfig | undefined } | null>(null)
  const [showBuyOrderModal, setShowBuyOrderModal] = useState(false)
  const [showSellOrderModal, setShowSellOrderModal] = useState(false)
  const [selectedOrderInstrument, setSelectedOrderInstrument] = useState<{ token: number; config: InstrumentConfig | undefined } | null>(null)
  const [clients, setClients] = useState<Array<{userId: number; name: string; username: string; parentId: number; roleId: number}>>([])
  const [selectedClient, setSelectedClient] = useState<{userId: number; name: string; username: string} | null>(null)
  const [showClientListModal, setShowClientListModal] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  
  // Draggable modal state
  const [buyModalPosition, setBuyModalPosition] = useState({ x: 0, y: 0 })
  const [sellModalPosition, setSellModalPosition] = useState({ x: 0, y: 0 })
  const [isDraggingBuy, setIsDraggingBuy] = useState(false)
  const [isDraggingSell, setIsDraggingSell] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // Column resize state
  const [columnWidths, setColumnWidths] = useState({
    actions: 100,
    exchange: 120,
    symbol: 180,
    expiry: 130,
    buyQty: 110,
    buyPrice: 120,
    sellPrice: 120,
    sellQty: 110,
    ltp: 120,
    netChange: 130,
    open: 100,
    high: 100,
    low: 100,
    close: 100,
    ltt: 180
  })
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartWidth, setResizeStartWidth] = useState(0)
  
  const feedUnsubscribeRef = useRef<(() => void) | null>(null)
  const instrumentConfigRef = useRef<Record<number, any>>({})
  const previousPricesRef = useRef<Record<number, FeedInstrument>>({})
  const subscriptionRef = useRef<{ subscribed: boolean; userId: string | null }>({ subscribed: false, userId: null })
  const watchlistHashRef = useRef<string>('')

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, column: string) => {
    e.preventDefault()
    setResizingColumn(column)
    setResizeStartX(e.clientX)
    setResizeStartWidth(columnWidths[column as keyof typeof columnWidths])
  }

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (resizingColumn) {
        const delta = e.clientX - resizeStartX
        const newWidth = Math.max(50, resizeStartWidth + delta)
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn]: newWidth
        }))
      }
    }

    const handleResizeEnd = () => {
      if (resizingColumn) {
        setResizingColumn(null)
      }
    }

    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth])

  // Memoize watchlist token Set for O(1) lookup
  const watchlistTokens = useMemo(() => 
    new Set(watchlist.map(item => item.token)),
    [watchlist]
  )

  // Memoize filtered feed data using Map for O(1) lookup
  const filteredFeedData = useMemo(() => {
    // Only keep instruments in watchlist
    const filtered: FeedInstrument[] = []
    for (const instrument of feedData) {
      if (watchlistTokens.has(instrument.insToken) && instrument.insToken !== deletingToken) {
        filtered.push(instrument)
      }
    }
    return filtered
  }, [feedData, watchlistTokens, deletingToken])
  
  // Throttle price change updates
  const [throttledPriceChanges, setThrottledPriceChanges] = useState<Record<number, PriceChange>>({})
  const priceChangeTimeoutRef = useRef<number | null>(null)
  
  useEffect(() => {
    if (Object.keys(priceChanges).length > 0) {
      setThrottledPriceChanges(priceChanges)
      
      if (priceChangeTimeoutRef.current) {
        clearTimeout(priceChangeTimeoutRef.current)
      }
      
      priceChangeTimeoutRef.current = setTimeout(() => {
        setPriceChanges({})
        setThrottledPriceChanges({})
      }, 300)
    }
  }, [priceChanges])

  // Close client dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showClientListModal) {
        const target = event.target as HTMLElement
        if (!target.closest('.client-dropdown-container')) {
          setShowClientListModal(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showClientListModal])

  // Fetch watchlist
  const fetchWatchlist = async () => {
    try {
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        const userId = user.userId
        const watchlistData = await watchlistService.getWatchlist(userId)
        setWatchlist(watchlistData)
        
        // Send watchlist request (will be sent after WebSocket connects)
        // No need to subscribe to tokens separately anymore
      }
    } catch (error) {
      console.error('❌ Failed to fetch watchlist:', error)
    }
  }

  // Load exchanges on mount
  useEffect(() => {
    const fetchExchanges = async () => {
      try {
        const exchangesData = await userManagementService.fetchExchanges()
        
        if (exchangesData && Array.isArray(exchangesData)) {
          // Convert API response to ExchangeConfig format
          const exchangeList = exchangesData.map((exchange) => ({
            key: exchange.name,
            name: exchange.name,
            symbol: exchange.name,
            status: true,
            turnover: exchange.turnover,
            turnoverValue: 0
          }))
          setExchanges(exchangeList)
        } else {
          console.error('❌ Invalid exchanges data from API')
        }
      } catch (error) {
        console.error('❌ Failed to fetch exchanges from API:', error)
        // Fallback to config if API fails
        let configIndex = ConfigManager.getConfigIndex()
        let exchangesData = configIndex?.exchanges
        
        if (!exchangesData) {
          const fullConfig = ConfigManager.getFullConfig()
          exchangesData = fullConfig?.exchanges
        }
        
        if (exchangesData) {
          const exchangeList = Object.entries(exchangesData).map(([key, value]: any) => ({
            key: key,
            ...value
          }))
          setExchanges(exchangeList)
        } else {
          console.error('❌ No exchanges found in config')
        }
      }
    }

    fetchExchanges()

    // Fetch clients list
    const fetchClients = async () => {
      try {
        const clientsData = await userManagementService.fetchClients()
        if (clientsData && Array.isArray(clientsData)) {
          setClients(clientsData)
        }
      } catch (error) {
        console.error('❌ Failed to fetch clients:', error)
      }
    }

    fetchClients()

    // Build instrument config cache
    const fullConfig = ConfigManager.getFullConfig()
    const configIndex = ConfigManager.getConfigIndex()
    
    if (fullConfig && fullConfig.instruments) {
      // Iterate through all exchanges and their instruments
      Object.entries(fullConfig.instruments).forEach(([exchangeKey, instrumentsList]: [string, any]) => {
        if (Array.isArray(instrumentsList)) {
          instrumentsList.forEach((instrument: any) => {
            if (instrument.instrumentToken) {
              instrumentConfigRef.current[instrument.instrumentToken] = instrument
            }
          })
        }
      })
    } else if (configIndex && configIndex.instrumentsById) {
      // Fallback to old structure if available
      Object.values(configIndex.instrumentsById).forEach((cfg: any) => {
        if (cfg.instrumentToken) {
          instrumentConfigRef.current[cfg.instrumentToken] = cfg
        }
      })
    } else {
      console.warn('⚠️ No instruments found in config')
    }

    // Fetch watchlist on mount
    fetchWatchlist()
  }, [])

  // Add to watchlist function
  const handleAddToWatchlist = async (token: number) => {
    try {
      setIsAddingToWatchlist(true)
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        const userId = user.userId
        
        // Check if already in watchlist
        const isAlreadyInWatchlist = watchlist.some(item => item.token === token)
        if (isAlreadyInWatchlist) {
          toast.error('Already in watchlist')
          return
        }
        
        await watchlistService.addToWatchlist(userId, token)
        toast.success('Added to watchlist')
        
        // Refresh watchlist
        await fetchWatchlist()
      }
    } catch (error: any) {
      console.error('❌ Failed to add to watchlist:', error)
      toast.error(error.message || 'Failed to add to watchlist')
    } finally {
      setIsAddingToWatchlist(false)
    }
  }

  // Update scripts when exchange is selected
  useEffect(() => {
    if (selectedExchange) {
      const fullConfig = ConfigManager.getFullConfig()
      if (fullConfig && fullConfig.instruments) {
        // Use the exchange key (NSE, MCX, CALLPUT, etc.) to get instruments
        const instrumentList = fullConfig.instruments[selectedExchange] || []
        setScripts(instrumentList)
        setSelectedScript(null)
        setScriptSearchTerm('')
      } else {
        // Fallback to configIndex
        const configIndex = ConfigManager.getConfigIndex()
        if (configIndex && configIndex.instrumentsByExchange) {
          const instrumentList = configIndex.instrumentsByExchange[selectedExchange] || []
          setScripts(instrumentList)
          setSelectedScript(null)
          setScriptSearchTerm('')
        }
      }
    } else {
      setScripts([])
      setSelectedScript(null)
    }
  }, [selectedExchange])

  // Subscribe to watchlist when connected (ONCE per user, not on watchlist changes)
  useEffect(() => {
    if (!isConnected) return
    
    const userData = localStorage.getItem('userData')
    if (!userData) return
    
    const user = JSON.parse(userData)
    const userId = user.userId.toString()
    
    // Guard: prevent duplicate subscriptions for same user
    if (subscriptionRef.current.subscribed && subscriptionRef.current.userId === userId) {
      return // Already subscribed
    }
    
    console.log('📌 Subscribing to watchlist for user:', userId)
    subscriptionRef.current = { subscribed: true, userId }
    
    // Subscribe to watchlist queue (once)
    marketWatchService.subscribeToWatchlist(userId)
    // Send watchlist data request (once)
    marketWatchService.sendWatchlistRequest(userId)
    // Subscribe to instruments queue (once)
    marketWatchService.subscribeToInstruments(userId)
  }, [isConnected]) // Only depends on connection, NOT watchlist

  // Send instruments request only when watchlist tokens change
  useEffect(() => {
    if (!isConnected || watchlist.length === 0) return
    
    const userData = localStorage.getItem('userData')
    if (!userData) return
    
    const user = JSON.parse(userData)
    const userId = user.userId.toString()
    
    // Guard: only send if watchlist tokens actually changed
    const watchlistHash = watchlist.map(item => item.token.toString()).join(',')
    if (watchlistHash === watchlistHashRef.current) {
      return // Same watchlist, don't re-send
    }
    
    console.log('📌 Sending instruments request with', watchlist.length, 'tokens')
    watchlistHashRef.current = watchlistHash
    
    const instrumentTokens = watchlist.map(item => item.token.toString())
    marketWatchService.sendInstrumentsRequest(userId, instrumentTokens)
  }, [isConnected, watchlist])

  // Initialize WebSocket connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        setIsLoading(true)
        await marketWatchService.connect(
          () => {
            setIsConnected(true)
          },
          () => {
            console.log('❌ WebSocket DISCONNECTED - resetting subscription guards')
            setIsConnected(false)
            subscriptionRef.current = { subscribed: false, userId: null }
            watchlistHashRef.current = ''
          }
        )
        
        // Setup feed subscription (will be called here and after reconnection)
        setupFeedSubscription()
      } catch (error) {
        console.error('Failed to connect to market watch:', error)
        toast.error('Failed to connect to market watch')
      } finally {
        setIsLoading(false)
      }
    }

    initializeConnection()

    // Handle tab/window close - disconnect socket
    const handlePageClose = () => {
      if (feedUnsubscribeRef.current) {
        feedUnsubscribeRef.current()
      }
      marketWatchService.disconnect()
    }

    // Debounce reconnection attempts to prevent rapid duplicate calls


    // Setup feed data subscription
    const setupFeedSubscription = () => {
      // Unsubscribe from previous subscription if exists
      if (feedUnsubscribeRef.current) {
        console.log('🔌 Unsubscribing from previous feed...')
        feedUnsubscribeRef.current()
      }

      console.log('🔌 Setting up new feed subscription...')
      let dataReceivedCount = 0
      
      feedUnsubscribeRef.current = marketWatchService.onFeedData((data) => {
        dataReceivedCount++
        if (dataReceivedCount === 1 || dataReceivedCount % 20 === 0) {
          console.log('📊 Market Watch Response [' + dataReceivedCount + ']:', data?.length || 0, 'instruments')
        }
        
        // Handle both array of instruments and single instrument
        if (Array.isArray(data)) {
          // Optimize: Only update changed instruments
          setFeedData(prevData => {
            // Create a map for fast lookup
            const dataMap = new Map(data.map(item => [item.insToken, item]))
            
            // Track price changes for animations
            const changes: Record<number, PriceChange> = {}
            
            // Update existing instruments or add new ones
            const updated = prevData.map(prevItem => {
              const newItem = dataMap.get(prevItem.insToken)
              if (newItem) {
                dataMap.delete(prevItem.insToken)
                
                // Track changes for animation (only for significant changes)
                const change: PriceChange = {}
                const ltpDiff = Math.abs(newItem.ltp - prevItem.ltp)
                const bidDiff = Math.abs(newItem.bid - prevItem.bid)
                const askDiff = Math.abs(newItem.ask - prevItem.ask)
                const buyQtyDiff = Math.abs((newItem.buyQty || 0) - (prevItem.buyQty || 0))
                const sellQtyDiff = Math.abs((newItem.sellQty || 0) - (prevItem.sellQty || 0))
                
                if (ltpDiff > 0.01) {
                  change.ltp = newItem.ltp > prevItem.ltp ? 'up' : 'down'
                }
                if (bidDiff > 0.01) {
                  change.bid = newItem.bid > prevItem.bid ? 'up' : 'down'
                }
                if (askDiff > 0.01) {
                  change.ask = newItem.ask > prevItem.ask ? 'up' : 'down'
                }
                if (buyQtyDiff > 0) {
                  change.buyQty = (newItem.buyQty || 0) > (prevItem.buyQty || 0) ? 'up' : 'down'
                }
                if (sellQtyDiff > 0) {
                  change.sellQty = (newItem.sellQty || 0) > (prevItem.sellQty || 0) ? 'up' : 'down'
                }
                if (Object.keys(change).length > 0) {
                  changes[newItem.insToken] = change
                }
                
                previousPricesRef.current[newItem.insToken] = newItem
                return newItem
              }
              return prevItem
            })
            
            // Add any new instruments not in previous data
            const newInstruments = Array.from(dataMap.values())
            newInstruments.forEach(item => {
              previousPricesRef.current[item.insToken] = item
            })
            
            // Update price changes if any
            if (Object.keys(changes).length > 0) {
              setPriceChanges(prev => ({ ...prev, ...changes }))
            }
            
            return [...updated, ...newInstruments]
          })
          
          return
        }
        
        // Fallback: Handle other data formats
        if (data && typeof data === 'object') {
          if (Array.isArray(data.raw)) {
            setFeedData(data.raw)
          } else if (data.raw && typeof data.raw === 'string') {
            try {
              const parsed = JSON.parse(data.raw)
              if (Array.isArray(parsed)) {
                setFeedData(parsed)
              }
            } catch (error) {
              console.error('Error parsing raw data:', error)
            }
          }
        }
      })
      console.log('✅ Feed subscription ready - socket will stay connected')
    }



    // Socket stays connected during tab switches - no reconnection needed
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('⏸️  Tab is hidden')
      } else {
        console.log('▶️  Tab is visible')
      }
    }



    // Add event listeners
    window.addEventListener('beforeunload', handlePageClose)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      // Cleanup on unmount
      window.removeEventListener('beforeunload', handlePageClose)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      if (feedUnsubscribeRef.current) {
        feedUnsubscribeRef.current()
      }
      marketWatchService.disconnect()
    }
  }, [])

  // Close action menu when clicking outside or scrolling
  useEffect(() => {
    if (!actionMenuToken) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Don't close if clicking the menu itself or the trigger button
      if (target.closest('.action-menu-popup') || target.closest('.action-menu-trigger')) {
        return
      }
      setActionMenuToken(null)
      setActionMenuPosition(null)
    }

    const handleScroll = () => {
      setActionMenuPosition(null)
      setActionMenuToken(null)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('scroll', handleScroll, true) // Use capture phase to catch all scroll events
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [actionMenuToken])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Close exchange dropdown
      if (showExchangeDropdown && !target.closest('.exchange-dropdown-container')) {
        setShowExchangeDropdown(false)
      }
      
      // Close script dropdown
      if (showScriptDropdown && !target.closest('.script-dropdown-container')) {
        setShowScriptDropdown(false)
      }
      
      // Close all scripts dropdown
      if (showAllScriptsDropdown && !target.closest('.all-scripts-dropdown-container')) {
        setShowAllScriptsDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExchangeDropdown, showScriptDropdown, showAllScriptsDropdown])

  // Draggable modal handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingBuy) {
        setBuyModalPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        })
      }
      if (isDraggingSell) {
        setSellModalPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsDraggingBuy(false)
      setIsDraggingSell(false)
    }

    if (isDraggingBuy || isDraggingSell) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingBuy, isDraggingSell, dragOffset])



  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="w-full">
        {/* Search Filters */}
        <div className="mb-4 px-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Exchange Dropdown */}
            <div className="relative exchange-dropdown-container">
              <label className="block text-sm font-semibold text-text-primary mb-2">Select Exchange</label>
              <button
                onClick={() => {
                  setShowExchangeDropdown(!showExchangeDropdown)
                }}
                className="w-full px-4 py-3 bg-surface-primary border border-border-primary rounded-lg text-text-primary flex items-center justify-between hover:bg-surface-hover transition-colors"
              >
                <span className="flex items-center gap-2">
                  {selectedExchangeName || 'Choose an exchange...'}
                </span>
                <span className={`transform transition-transform ${showExchangeDropdown ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {/* Exchange List Dropdown */}
              {showExchangeDropdown && exchanges.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-primary border border-border-primary rounded-lg shadow-lg z-50">
                  <div className="max-h-48 overflow-y-auto">
                    {exchanges.map((exchange) => (
                        <button
                          key={exchange.key}
                          onClick={() => {
                            setSelectedExchange(exchange.key)
                            setSelectedExchangeName(exchange.name)
                            setShowExchangeDropdown(false)
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors ${
                            selectedExchange === exchange.key
                              ? 'bg-blue-500/20 text-blue-500'
                              : 'text-text-primary'
                          }`}
                        >
                          {exchange.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Show message if no exchanges */}
              {showExchangeDropdown && exchanges.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-primary border border-border-primary rounded-lg shadow-lg z-50 p-4">
                  <p className="text-text-secondary text-sm">No exchanges available. Please login to load exchanges.</p>
                </div>
              )}
            </div>

            {/* Script/Instrument Dropdown */}
            <div className="relative script-dropdown-container">
              <label className="block text-sm font-semibold text-text-primary mb-2">Select Script</label>
              <button
                onClick={() => setShowScriptDropdown(!showScriptDropdown)}
                disabled={!selectedExchange}
                className="w-full px-4 py-3 bg-surface-primary border border-border-primary rounded-lg text-text-primary flex items-center justify-between hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  {selectedScript?.instrumentName || (selectedExchange ? 'Choose a script...' : 'Select exchange first')}
                </span>
                <span className={`transform transition-transform ${showScriptDropdown ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {/* Script Search Dropdown */}
              {showScriptDropdown && selectedExchange && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-primary border border-border-primary rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-border-primary">
                    <input
                      type="text"
                      placeholder="Search scripts..."
                      value={scriptSearchTerm}
                      onChange={(e) => setScriptSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded text-text-primary placeholder-text-secondary focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {scripts
                      .filter((script) =>
                        (script.tradeSymbol?.toLowerCase().includes(scriptSearchTerm.toLowerCase()) ||
                         script.instrumentName?.toLowerCase().includes(scriptSearchTerm.toLowerCase()) ||
                         script.script?.toLowerCase().includes(scriptSearchTerm.toLowerCase()))
                      )
                      .map((script) => (
                        <button
                          key={script.instrumentToken}
                          onClick={async () => {
                            setSelectedScript(script)
                            setShowScriptDropdown(false)
                            setScriptSearchTerm('')
                            // Add to watchlist
                            await handleAddToWatchlist(script.instrumentToken)
                          }}
                          disabled={isAddingToWatchlist}
                          className={`w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors disabled:opacity-50 ${
                            selectedScript?.instrumentToken === script.instrumentToken
                              ? 'bg-blue-500/20 text-blue-500'
                              : 'text-text-primary'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-medium">{script.tradeSymbol || script.instrumentName || script.script}</span>
                              {script.exchange && (
                                <span className="text-xs text-text-secondary">{script.exchange}</span>
                              )}
                            </div>
                            <span className="text-xs text-text-secondary">#{script.instrumentToken}</span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
            {/* All Scripts Dropdown */}
            <div className="relative all-scripts-dropdown-container">
              <label className="block text-sm font-semibold text-text-primary mb-2">All Scripts</label>
              <button
                onClick={() => setShowAllScriptsDropdown(!showAllScriptsDropdown)}
                className="w-full px-4 py-3 bg-surface-primary border border-border-primary rounded-lg text-text-primary flex items-center justify-between hover:bg-surface-hover transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search all scripts...
                </span>
                <span className={`transform transition-transform ${showAllScriptsDropdown ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {/* All Scripts Search Dropdown */}
              {showAllScriptsDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-primary border border-border-primary rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-border-primary">
                    <input
                      type="text"
                      placeholder="Search all scripts..."
                      value={allScriptsSearchTerm}
                      onChange={(e) => setAllScriptsSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded text-text-primary placeholder-text-secondary focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {(() => {
                      const fullConfig = ConfigManager.getFullConfig()
                      const allScripts: InstrumentConfig[] = []
                      
                      // Collect all scripts from all exchanges
                      if (fullConfig && fullConfig.instruments) {
                        Object.values(fullConfig.instruments).forEach((instrumentsList: any) => {
                          if (Array.isArray(instrumentsList)) {
                            allScripts.push(...instrumentsList)
                          }
                        })
                      }
                      
                      return allScripts
                        .filter((script) =>
                          allScriptsSearchTerm === '' ||
                          (script.tradeSymbol?.toLowerCase().includes(allScriptsSearchTerm.toLowerCase()) ||
                           script.instrumentName?.toLowerCase().includes(allScriptsSearchTerm.toLowerCase()) ||
                           script.script?.toLowerCase().includes(allScriptsSearchTerm.toLowerCase()))
                        )
                        .map((script) => (
                          <button
                            key={script.instrumentToken}
                            onClick={async () => {
                              setSelectedScript(script)
                              setShowAllScriptsDropdown(false)
                              setAllScriptsSearchTerm('')
                              // Add to watchlist
                              await handleAddToWatchlist(script.instrumentToken)
                            }}
                            disabled={isAddingToWatchlist}
                            className={`w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors disabled:opacity-50 ${
                              selectedScript?.instrumentToken === script.instrumentToken
                                ? 'bg-blue-500/20 text-blue-500'
                                : 'text-text-primary'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="font-medium">{script.tradeSymbol || script.instrumentName || script.script}</span>
                                {script.exchange && (
                                  <span className="text-xs text-text-secondary">{script.exchange}</span>
                                )}
                              </div>
                              <span className="text-xs text-text-secondary">#{script.instrumentToken}</span>
                            </div>
                          </button>
                        ))
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Info */}
          {selectedScript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
            >
              <p className="text-sm text-text-primary">
                <span className="font-semibold">Selected:</span> {selectedScript.tradeSymbol || selectedScript.instrumentName || selectedScript.script} 
                <span className="text-text-secondary ml-2">({selectedScript.exchange} • Token: {selectedScript.instrumentToken})</span>
              </p>
            </motion.div>
          )}
        </div>






        {/* Live Feed Data Section */}
        {feedData.length > 0 && watchlist.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-primary border border-border-primary rounded-xl overflow-hidden shadow-lg mx-4"
          >
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-violet-600 p-4 flex items-center justify-between relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    Live Market Feed
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500 rounded-full text-xs font-medium">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                      LIVE
                    </span>
                  </h2>
                  <p className="text-sm text-blue-50 mt-0.5">Real-time price updates • {new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-max table-fixed">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-700 border-b-2 border-slate-600">
                    <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-wider sticky left-0 bg-slate-800 z-10 relative" style={{width: `${columnWidths.actions}px`}}>
                      Actions
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'actions')}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.exchange}px`}}>
                      Exchange
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'exchange')}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.symbol}px`}}>
                      Symbol
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'symbol')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.expiry}px`}}>
                      Expiry
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'expiry')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.buyQty}px`}}>
                      Buy Qty
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'buyQty')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.buyPrice}px`}}>
                      Buy Price
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'buyPrice')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.sellPrice}px`}}>
                      Sell Price
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'sellPrice')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.sellQty}px`}}>
                      Sell Qty
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'sellQty')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.ltp}px`}}>
                      LTP
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'ltp')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.netChange}px`}}>
                      Net Change
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'netChange')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.open}px`}}>
                      Open
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'open')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.high}px`}}>
                      High
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'high')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.low}px`}}>
                      Low
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'low')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.close}px`}}>
                      Close
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'close')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative" style={{width: `${columnWidths.ltt}px`}}>
                      LTT
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'ltt')}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-900">
                    {filteredFeedData.map((instrument, index) => (
                      <TableRow
                        key={instrument.insToken}
                        instrument={instrument}
                        index={index}
                        config={instrumentConfigRef.current[instrument.insToken]}
                        changes={throttledPriceChanges[instrument.insToken] || {}}
                        onActionMenuOpen={(token, position) => {
                          setActionMenuToken(token)
                          setActionMenuPosition(position)
                        }}
                        deletingToken={deletingToken}
                      />
                    ))}
                </tbody>
              </table>
            </div>

           
          </motion.div>
        )}

        {/* Action Menu Popup */}
        {actionMenuPosition && actionMenuToken && createPortal(
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="action-menu-popup fixed bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-[99999] overflow-hidden min-w-[200px]"
            style={{
              left: `${actionMenuPosition.x}px`,
              top: `${actionMenuPosition.y + 8}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                const config = instrumentConfigRef.current[actionMenuToken]
                setSelectedOrderInstrument({ token: actionMenuToken, config })
                setShowBuyOrderModal(true)
                setActionMenuPosition(null)
                setActionMenuToken(null)
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all flex items-center gap-3"
            >
              <TrendingUp className="w-4 h-4" />
              Buy
            </button>
            <button 
              onClick={() => {
                const config = instrumentConfigRef.current[actionMenuToken]
                setSelectedOrderInstrument({ token: actionMenuToken, config })
                setShowSellOrderModal(true)
                setActionMenuPosition(null)
                setActionMenuToken(null)
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-3 border-t border-gray-200 dark:border-slate-700"
            >
              <TrendingDown className="w-4 h-4" />
              Sell
            </button>
            <button 
              onClick={() => {
                toast.success('View Chart clicked')
                setActionMenuPosition(null)
                setActionMenuToken(null)
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center gap-3 border-t border-gray-200 dark:border-slate-700"
            >
              📈 View Chart
            </button>
            <button 
              onClick={() => {
                const config = instrumentConfigRef.current[actionMenuToken]
                setSelectedScripInfo({ token: actionMenuToken, config })
                setShowScripInfoModal(true)
                setActionMenuPosition(null)
                setActionMenuToken(null)
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all flex items-center gap-3 border-t border-gray-200 dark:border-slate-700"
            >
              ℹ️ Scrip Info <span className="ml-auto text-xs text-gray-500">Ctrl+I</span>
            </button>
            
            {/* Delete with Trash Animation */}
            <button 
              onClick={async () => {
                try {
                  // Capture token before clearing state
                  const tokenToDelete = actionMenuToken
                  
                  // Start delete animation
                  setDeletingToken(tokenToDelete)
                  setActionMenuPosition(null)
                  setActionMenuToken(null)
                  
                  // Show deleting toast
                  const deleteToast = toast.loading('Removing from watchlist...')
                  
                  // Wait for animation to complete
                  await new Promise(resolve => setTimeout(resolve, 500))
                  
                  const userData = localStorage.getItem('userData')
                  if (userData && tokenToDelete) {
                    const user = JSON.parse(userData)
                    await watchlistService.removeFromWatchlist(user.userId, tokenToDelete)
                    toast.success('Removed from watchlist', { id: deleteToast })
                    await fetchWatchlist()
                  }
                } catch (error) {
                  toast.error('Failed to remove from watchlist')
                } finally {
                  setDeletingToken(null)
                }
              }}
              className="w-full px-4 py-3 text-left text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all flex items-center gap-3 border-t-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
            >
              <Trash2 className="w-4 h-4" />
              Delete <span className="ml-auto text-xs text-gray-500">Del</span>
            </button>
          </motion.div>,
          document.body
        )}

        {/* Buy Order Modal */}
        {showBuyOrderModal && selectedOrderInstrument && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100000] flex items-center justify-center p-4"
            onClick={() => setShowBuyOrderModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
              style={{
                position: 'fixed',
                left: buyModalPosition.x !== 0 ? `${buyModalPosition.x}px` : '50%',
                top: buyModalPosition.y !== 0 ? `${buyModalPosition.y}px` : '50%',
                transform: buyModalPosition.x !== 0 ? 'none' : 'translate(-50%, -50%)',
                cursor: isDraggingBuy ? 'grabbing' : 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div 
                className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => {
                  const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
                  setDragOffset({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  })
                  setIsDraggingBuy(true)
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Buy Order</h2>
                </div>
                <button
                  onClick={() => setShowBuyOrderModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {(() => {
                  const liveData = feedData.find(item => item.insToken === selectedOrderInstrument.token)
                  const config = selectedOrderInstrument.config
                  const userData = localStorage.getItem('userData')
                  const user = userData ? JSON.parse(userData) : null

                  return (
                    <div className="space-y-4">
                      {/* Row 1: Client Name | Order Type | Quantity | Sell Price */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="relative client-dropdown-container">
                          <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Client Name</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={clientSearchTerm}
                              onChange={(e) => setClientSearchTerm(e.target.value)}
                              onFocus={() => setShowClientListModal(true)}
                              placeholder="Search client..."
                              className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                            />
                            {showClientListModal && (
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {clients
                                  .filter(client => 
                                    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                                    client.username.toLowerCase().includes(clientSearchTerm.toLowerCase())
                                  )
                                  .map((client) => (
                                    <button
                                      key={client.userId}
                                      type="button"
                                      onClick={() => {
                                        setSelectedClient({
                                          userId: client.userId,
                                          name: client.name,
                                          username: client.username
                                        })
                                        setClientSearchTerm(`${client.name} (${client.username})`)
                                        setShowClientListModal(false)
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-200 dark:border-slate-700 last:border-b-0"
                                    >
                                      <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                        {client.name}
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {client.username}
                                      </div>
                                    </button>
                                  ))}
                                {clients.filter(client => 
                                  client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                                  client.username.toLowerCase().includes(clientSearchTerm.toLowerCase())
                                ).length === 0 && (
                                  <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                                    No clients found
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Order Type</label>
                          <select className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500">
                            <option>Market</option>
                            <option>Limit</option>
                            <option>Stop Loss</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Quantity</label>
                          <input
                            type="number"
                            defaultValue="1"
                            className="w-full px-3 py-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-600 rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Sell Price</label>
                          <input
                            type="number"
                            defaultValue={liveData?.ask.toFixed(2) || '0'}
                            className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Row 2: Exchange | Symbol | LotSize | Remark */}
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Exchange</label>
                          <select className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500">
                            <option>{config?.exchange || 'MCX'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Symbol</label>
                          <select className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500">
                            <option>{config?.tradeSymbol || config?.instrumentName || config?.script || 'GOLD 05 Feb 2026'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">LotSize</label>
                          <input
                            type="number"
                            defaultValue="100.000"
                            className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Remark</label>
                          <input
                            type="text"
                            placeholder="Optional note..."
                            className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={() => {
                            toast.success('Buy order submitted')
                            setShowBuyOrderModal(false)
                          }}
                          className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors shadow-lg"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => setShowBuyOrderModal(false)}
                          className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}

        {/* Sell Order Modal */}
        {showSellOrderModal && selectedOrderInstrument && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100000] flex items-center justify-center p-4"
            onClick={() => setShowSellOrderModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
              style={{
                position: 'fixed',
                left: sellModalPosition.x !== 0 ? `${sellModalPosition.x}px` : '50%',
                top: sellModalPosition.y !== 0 ? `${sellModalPosition.y}px` : '50%',
                transform: sellModalPosition.x !== 0 ? 'none' : 'translate(-50%, -50%)',
                cursor: isDraggingSell ? 'grabbing' : 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div 
                className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => {
                  const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
                  setDragOffset({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                  })
                  setIsDraggingSell(true)
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Sell Order</h2>
                </div>
                <button
                  onClick={() => setShowSellOrderModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {(() => {
                  const liveData = feedData.find(item => item.insToken === selectedOrderInstrument.token)
                  const config = selectedOrderInstrument.config
                  const userData = localStorage.getItem('userData')
                  const user = userData ? JSON.parse(userData) : null

                  return (
                    <div className="space-y-4">
                      {/* Row 1: Client Name | Order Type | Quantity | Buy Price */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="relative client-dropdown-container">
                          <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">Client Name</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={clientSearchTerm}
                              onChange={(e) => setClientSearchTerm(e.target.value)}
                              onFocus={() => setShowClientListModal(true)}
                              placeholder="Search client..."
                              className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-red-500"
                            />
                            {showClientListModal && (
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {clients
                                  .filter(client => 
                                    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                                    client.username.toLowerCase().includes(clientSearchTerm.toLowerCase())
                                  )
                                  .map((client) => (
                                    <button
                                      key={client.userId}
                                      type="button"
                                      onClick={() => {
                                        setSelectedClient({
                                          userId: client.userId,
                                          name: client.name,
                                          username: client.username
                                        })
                                        setClientSearchTerm(`${client.name} (${client.username})`)
                                        setShowClientListModal(false)
                                      }}
                                      className="w-full px-3 py-2 text-left hover:bg-green-50 dark:hover:bg-green-900/20 border-b border-gray-200 dark:border-slate-700 last:border-b-0"
                                    >
                                      <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                        {client.name}
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {client.username}
                                      </div>
                                    </button>
                                  ))}
                                {clients.filter(client => 
                                  client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                                  client.username.toLowerCase().includes(clientSearchTerm.toLowerCase())
                                ).length === 0 && (
                                  <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                                    No clients found
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">Order Type</label>
                          <select className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-red-500">
                            <option>Market</option>
                            <option>Limit</option>
                            <option>Stop Loss</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">Quantity</label>
                          <input
                            type="number"
                            defaultValue="1"
                            className="w-full px-3 py-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-600 rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">Buy Price</label>
                          <input
                            type="number"
                            defaultValue={liveData?.bid.toFixed(2) || '0'}
                            className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>

                      {/* Row 2: Exchange | Symbol | LotSize | Remark */}
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">Exchange</label>
                          <select className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-red-500">
                            <option>{config?.exchange || 'MCX'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">Symbol</label>
                          <select className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-red-500">
                            <option>{config?.tradeSymbol || config?.instrumentName || config?.script || 'GOLD 05 Feb 2026'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">LotSize</label>
                          <input
                            type="number"
                            defaultValue="100.000"
                            className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">Remark</label>
                          <input
                            type="text"
                            placeholder="Optional note..."
                            className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={() => {
                            toast.success('Sell order submitted')
                            setShowSellOrderModal(false)
                          }}
                          className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors shadow-lg"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => setShowSellOrderModal(false)}
                          className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}

        {/* Scrip Info Modal */}
        {showScripInfoModal && selectedScripInfo && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4"
            onClick={() => setShowScripInfoModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Market Picture For ( {selectedScripInfo.config?.exchange || 'N/A'} - {selectedScripInfo.config?.tradeSymbol || selectedScripInfo.config?.instrumentName || selectedScripInfo.config?.script || 'Unknown'} )
                  </h2>
                </div>
                <button
                  onClick={() => setShowScripInfoModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {(() => {
                  const liveData = feedData.find(item => item.insToken === selectedScripInfo.token)
                  const config = selectedScripInfo.config
                  
                  if (!liveData) {
                    return (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No live data available for this instrument</p>
                      </div>
                    )
                  }

                  const change = liveData.ltp - liveData.close
                  const changePercent = ((change / liveData.close) * 100).toFixed(2)

                  return (
                    <>
                      {/* Exchange and Symbol Selectors */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Exchange</label>
                          <div className="relative">
                            <select 
                              value={config?.exchange || ''}
                              onChange={(e) => {
                                // Find instruments in the selected exchange
                                const newExchange = e.target.value
                                const fullConfig = ConfigManager.getFullConfig()
                                if (fullConfig?.instruments?.[newExchange]?.[0]) {
                                  const firstInstrument = fullConfig.instruments[newExchange][0]
                                  setSelectedScripInfo({
                                    token: firstInstrument.instrumentToken,
                                    config: firstInstrument
                                  })
                                }
                              }}
                              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              {exchanges.map((exchange) => (
                                <option key={exchange.key} value={exchange.key}>
                                  {exchange.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Symbol</label>
                          <div className="relative">
                            <select
                              value={selectedScripInfo.token}
                              onChange={(e) => {
                                const newToken = parseInt(e.target.value)
                                const newConfig = instrumentConfigRef.current[newToken]
                                setSelectedScripInfo({ token: newToken, config: newConfig })
                              }}
                              className="w-full px-4 py-3 bg-blue-600 text-white border-2 border-blue-700 rounded-lg font-bold focus:outline-none focus:border-blue-400 cursor-pointer"
                            >
                              {(() => {
                                const fullConfig = ConfigManager.getFullConfig()
                                const exchangeInstruments = fullConfig?.instruments?.[config?.exchange || ''] || []
                                return exchangeInstruments.map((instrument: any) => (
                                  <option key={instrument.instrumentToken} value={instrument.instrumentToken}>
                                    {instrument.tradeSymbol || instrument.instrumentName || instrument.script}
                                  </option>
                                ))
                              })()}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Market Depth Table */}
                      <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Buy Side */}
                          <div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div className="text-center font-bold text-blue-600 dark:text-blue-400 text-sm">BID QTY</div>
                              <div className="text-center font-bold text-blue-600 dark:text-blue-400 text-sm">BID PRICE</div>
                            </div>
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className="grid grid-cols-2 gap-2 mb-1">
                                <div className="text-center py-2 bg-white dark:bg-slate-700 rounded text-blue-600 dark:text-blue-400 font-semibold">
                                  {i === 0 ? (liveData.buyQty || 0) : 0}
                                </div>
                                <div className="text-center py-2 bg-white dark:bg-slate-700 rounded text-blue-600 dark:text-blue-400 font-semibold">
                                  {i === 0 ? liveData.bid.toFixed(2) : liveData.bid.toFixed(2)}
                                </div>
                              </div>
                            ))}
                            <div className="text-center mt-2 py-2 bg-blue-100 dark:bg-blue-900/30 rounded font-bold text-blue-700 dark:text-blue-300">
                              {liveData.buyQty || 0}
                            </div>
                          </div>

                          {/* Sell Side */}
                          <div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div className="text-center font-bold text-red-600 dark:text-red-400 text-sm">ASK PRICE</div>
                              <div className="text-center font-bold text-red-600 dark:text-red-400 text-sm">ASK QTY</div>
                            </div>
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className="grid grid-cols-2 gap-2 mb-1">
                                <div className="text-center py-2 bg-white dark:bg-slate-700 rounded text-red-600 dark:text-red-400 font-semibold">
                                  {i === 0 ? liveData.ask.toFixed(2) : liveData.ask.toFixed(2)}
                                </div>
                                <div className="text-center py-2 bg-white dark:bg-slate-700 rounded text-red-600 dark:text-red-400 font-semibold">
                                  {i === 0 ? (liveData.sellQty || 0) : 0}
                                </div>
                              </div>
                            ))}
                            <div className="text-center mt-2 py-2 bg-red-100 dark:bg-red-900/30 rounded font-bold text-red-700 dark:text-red-300">
                              {liveData.sellQty || 0}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Market Stats */}
                      <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">LTP :</span>
                            <span className={`font-bold text-lg ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {liveData.ltp.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">LTQ :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {liveData.lastQty?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">Net Change :</span>
                            <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {change.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">% Change :</span>
                            <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {changePercent}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">LTT :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatTimestamp(liveData.lastTradedTime)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">Volume :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {liveData.volume || 0}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">ATP :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {liveData.avgPrice?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-700 dark:text-gray-300">INDICATOR :</span>
                            <span className="text-2xl">{change >= 0 ? '📈' : '📉'}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">OPEN :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {liveData.open.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">CLOSE :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {liveData.close.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">HIGH :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {liveData.high.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">LOW :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {liveData.low.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">L. CRKT :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {(liveData.low * 0.95).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">U. CRKT :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {(liveData.high * 1.05).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">OI :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              0.00
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-700 dark:text-gray-300">LUT :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              00:00:00
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </div>
    </div>
  )
}

export default MarketWatch
