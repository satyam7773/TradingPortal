import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Search, X, MoreVertical, TrendingUp, TrendingDown, Trash2, Plus } from 'lucide-react'
import { createPortal } from 'react-dom'
import marketWatchService from '../../services/marketWatchService'
import watchlistService from '../../services/watchlistService'
import watchlistTabsService, { type WatchlistTab } from '../../services/watchlistTabsService'
import userManagementService from '../../services/userManagementService'
import orderService from '../../services/orderService'
import orderUpdateService from '../../services/orderUpdateService'
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
  const isPositive = change >= 0
  const isBidPositive = isPositive

  // --- CONDITIONAL FORMATTING LOGIC ---
  const isCallPut = config?.exchange === 'CALLPUT';

  let displayName = "";

  if (isCallPut) {
    // Format specifically for CALLPUT: BANKNIFTY 53500 CE
    const name = config?.instrumentName || config?.script || '';
    const strike = config?.strikePrice ? (config.strikePrice % 1 === 0 ? config.strikePrice : config.strikePrice.toFixed(2)) : '';
    const type = config?.tradeSymbol?.toUpperCase().endsWith('CE') ? 'CE' : config?.tradeSymbol?.toUpperCase().endsWith('PE') ? 'PE' : '';
    displayName = `${name} ${strike} ${type}`.toUpperCase();
  } else {
    // Standard format for NSE, MCX, etc: NIFTY, GOLD, etc.
    displayName = config?.script || config?.instrumentName || config?.tradeSymbol || `Token ${instrument.insToken}`;
  }

  const exchangeName = config?.exchange || 'N/A'
  const expiry = formatExpiry(config?.expiry)
  const lastTradedTime = formatTimestamp(instrument.lastTradedTime)
  const isEvenRow = instrument.insToken % 2 === 0




  return (
    <tr className={`hover:bg-slate-700 transition-colors ${isEvenRow ? 'bg-slate-800' : 'bg-slate-850'}`}>
      {/* Actions */}
      <td className={`px-3 py-2 text-center sticky left-0 z-10 ${isEvenRow ? 'bg-slate-800' : 'bg-slate-850'}`}>
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

      {/* Exchange */}
      <td className="px-4 py-2 text-left">
        <div className="inline-flex items-center gap-1.5">
          {isBidPositive ? <span className="text-green-400 text-base">▲</span> : <span className="text-red-400 text-base">▼</span>}
          <span className="text-slate-300 font-semibold text-base uppercase">{exchangeName}</span>
        </div>
      </td>

      {/* Symbol Column - Formatting depends on displayName logic above */}
      <td className="px-4 py-2 text-left whitespace-nowrap">
        <div
          className={`inline-block px-3 py-1.5 rounded-lg font-bold text-base transition-all hover:scale-105 cursor-pointer text-white uppercase ${isPositive ? 'bg-blue-700 hover:bg-blue-800' : 'bg-red-700 hover:bg-red-800'
            }`}
        >
          {displayName}
        </div>
      </td>

      {/* ... rest of the columns (Expiry, Qty, LTP, etc.) remain the same ... */}
      <td className="px-4 py-2 text-right"><span className="text-slate-300 text-base font-medium">{expiry}</span></td>
      <td className="px-4 py-2 text-right"><span className={`inline-block px-3 py-1.5 rounded-lg font-medium text-base ${changes.buyQty ? (changes.buyQty === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white') : 'text-slate-200'}`}>{instrument.bids?.[0]?.qty || '-'}</span></td>
      <td className="px-4 py-2 text-right"><span className={`inline-block px-3 py-1.5 rounded-lg font-semibold text-base ${changes.bid ? (changes.bid === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white') : 'text-slate-200'}`}>{instrument.bid.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-right"><span className={`inline-block px-3 py-1.5 rounded-lg font-semibold text-base ${changes.ask ? (changes.ask === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white') : 'text-slate-200'}`}>{instrument.ask.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-right"><span className={`inline-block px-3 py-1.5 rounded-lg font-medium text-base ${changes.sellQty ? (changes.sellQty === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white') : 'text-slate-200'}`}>{instrument.asks?.[0]?.qty || '-'}</span></td>
      <td className="px-4 py-2 text-right"><span className={`inline-block px-3 py-1.5 rounded-lg font-bold text-base ${changes.ltp ? (changes.ltp === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white') : 'text-slate-200'}`}>{instrument.ltp.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-right"><span className={`inline-block px-3 py-1.5 rounded-lg font-bold text-base text-slate-200`}>{isPositive ? '+' : ''}{change.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-right"><span className="text-slate-300 text-base font-medium">{instrument.open.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-right"><span className="text-slate-300 text-base font-medium">{instrument.high.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-right"><span className="text-slate-300 text-base font-medium">{instrument.low.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-right"><span className="text-slate-300 text-base font-medium">{instrument.close.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-right"><span className="text-slate-400 text-xs font-mono whitespace-nowrap">{lastTradedTime}</span></td>
    </tr>
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
  const [clients, setClients] = useState<Array<{ userId: number; name: string; username: string; parentId: number; roleId: number }>>([])
  const [selectedClient, setSelectedClient] = useState<{ userId: number; name: string; username: string } | null>(null)
  const [showClientListModal, setShowClientListModal] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState('')

  // Order form state
  const [buyOrderQuantity, setBuyOrderQuantity] = useState('1')
  const [buyOrderPrice, setBuyOrderPrice] = useState('0')
  const [buyOrderType, setBuyOrderType] = useState('MARKET')
  const [buyOrderRemark, setBuyOrderRemark] = useState('')
  const [isBuyOrderSubmitting, setIsBuyOrderSubmitting] = useState(false)

  const [sellOrderQuantity, setSellOrderQuantity] = useState('1')
  const [sellOrderPrice, setSellOrderPrice] = useState('0')
  const [sellOrderType, setSellOrderType] = useState('MARKET')
  const [sellOrderRemark, setSellOrderRemark] = useState('')
  const [isSellOrderSubmitting, setIsSellOrderSubmitting] = useState(false)

  // Watchlist Tabs state
  const [watchlistTabs, setWatchlistTabs] = useState<WatchlistTab[]>([])
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null)
  const [isLoadingTabs, setIsLoadingTabs] = useState(false)
  const [editingTabId, setEditingTabId] = useState<number | null>(null)
  const [editingTabName, setEditingTabName] = useState('')

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
    symbol: 240,
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

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, column: string) => {
    e.preventDefault()
    setResizingColumn(column)
    setResizeStartX(e.clientX)
    setResizeStartWidth(columnWidths[column as keyof typeof columnWidths])
  }

  // --- NEW: CENTRALIZED RESET FUNCTIONS ---
  const resetBuyForm = useCallback(() => {
    setShowBuyOrderModal(false);
    setBuyOrderQuantity('1');
    setBuyOrderPrice('0');
    setBuyOrderType('MARKET');
    setBuyOrderRemark('');
    setSelectedClient(null);
    setClientSearchTerm('');
  }, []);

  const resetSellForm = useCallback(() => {
    setShowSellOrderModal(false);
    setSellOrderQuantity('1');
    setSellOrderPrice('0');
    setSellOrderType('MARKET');
    setSellOrderRemark('');
    setSelectedClient(null);
    setClientSearchTerm('');
  }, []);


  useEffect(() => {
    if (!showBuyOrderModal) resetBuyForm();
  }, [showBuyOrderModal, resetBuyForm]);

  useEffect(() => {
    if (!showSellOrderModal) resetSellForm();
  }, [showSellOrderModal, resetSellForm]);

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

  // Get tokens from selected tab's watchlist
  const selectedTabTokens = useMemo(() => {
    const selectedTab = watchlistTabs.find(tab => tab.tabId === selectedTabId)
    if (!selectedTab || !Array.isArray(selectedTab.watchList)) {
      console.log('⚠️ No selected tab or watchList, returning empty Set')
      return new Set<number>()
    }
    const tokens = new Set(selectedTab.watchList.map(item => {
      const token = typeof item.token === 'string' ? parseInt(item.token) : item.token
      console.log('📌 Tab token:', token, 'from item:', item)
      return token
    }))
    console.log('✅ Selected tab tokens:', Array.from(tokens))
    return tokens
  }, [watchlistTabs, selectedTabId])

  // Memoize filtered feed data - show only tokens from selected tab
  const filteredFeedData = useMemo(() => {
    // Filter by selected tab's tokens AND exclude deleting token
    const filtered: FeedInstrument[] = []
    for (const instrument of feedData) {
      if (selectedTabTokens.has(instrument.insToken) && instrument.insToken !== deletingToken) {
        filtered.push(instrument)
      }
    }
    console.log('🔍 Filtered feed data:', filtered.length, 'instruments from', feedData.length, 'total feed items for tab', selectedTabId)
    return filtered
  }, [feedData, selectedTabTokens, deletingToken, selectedTabId])

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

  // Fetch watchlist tabs
  const fetchWatchlistTabs = async () => {
    try {
      setIsLoadingTabs(true)
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        const userId = user.userId
        console.log('🔄 Fetching watchlist tabs for userId:', userId)
        const tabsData = await watchlistTabsService.getWatchlistTabs(userId)
        console.log('📑 Received tabs:', tabsData)
        setWatchlistTabs(tabsData)

        // Auto-select first tab if not selected
        if (tabsData.length > 0 && !selectedTabId) {
          setSelectedTabId(tabsData[0].tabId)
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch watchlist tabs:', error)
      toast.error('Failed to load watchlist tabs')
    } finally {
      setIsLoadingTabs(false)
    }
  }

  // Sync watchlist state with selected tab's watchList
  useEffect(() => {
    const selectedTab = watchlistTabs.find(tab => tab.tabId === selectedTabId)
    if (selectedTab && Array.isArray(selectedTab.watchList)) {
      console.log('🔄 Syncing watchlist with selected tab:', selectedTabId, 'items:', selectedTab.watchList.length)
      setWatchlist(selectedTab.watchList)
    } else {
      console.log('⚠️ No selected tab or empty watchList, clearing watchlist state')
      setWatchlist([])
    }
  }, [watchlistTabs, selectedTabId])

  // Update tab name
  const handleUpdateTabName = async (tabId: number) => {
    if (!editingTabName.trim()) {
      toast.error('Tab name cannot be empty')
      return
    }

    try {
      await watchlistTabsService.updateTabName(tabId, editingTabName)
      setEditingTabId(null)
      setEditingTabName('')
      toast.success('Tab updated successfully')

      // Refresh all tabs
      await fetchWatchlistTabs()
    } catch (error: any) {
      console.error('❌ Failed to update tab:', error)
      toast.error(error.message || 'Failed to update tab')
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

    // Fetch clients list (only for admin/master users, not for clients)
    const userData = localStorage.getItem('userData')
    const user = userData ? JSON.parse(userData) : null
    const roleId = user?.roleId
    const isAdminUser = roleId === 1 || roleId === 2 || roleId === 3

    if (isAdminUser) {
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
    }

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

    // Fetch watchlist tabs on mount
    fetchWatchlistTabs()
  }, [])

  // Add to watchlist function
  const handleAddToWatchlist = async (token: number) => {
    try {
      setIsAddingToWatchlist(true)
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        const userId = user.userId

        // Check if no tab selected
        if (!selectedTabId) {
          toast.error('Please select a watchlist tab first')
          return
        }

        // Allow same token across different tabs, but prevent duplicate in selected tab
        if (selectedTabTokens.has(token)) {
          toast.error('Token already exists in selected tab')
          return
        }

        await watchlistTabsService.addToWatchlist(userId, token, selectedTabId)
        toast.success('Added to watchlist')

        // Refresh watchlist tabs
        await fetchWatchlistTabs()
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

  // Create refs for subscription guards
  const subscriptionRef = useRef({ subscribed: false, userId: null as string | null })
  const watchlistHashRef = useRef('')
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Monitor socket connection status and subscribe when ready
  // 1. Corrected Connection Effect
  useEffect(() => {
    const checkAndSubscribe = async () => {
      const usrData = localStorage.getItem('userData');
      if (!usrData) return;
      const userr = JSON.parse(usrData);
      const userIdd = userr.userId.toString();

      if (!marketWatchService.isConnected()) {
        try {
          await marketWatchService.connect(() => {
            console.log('🔌 Socket connected from MarketWatch page');
            // FIX: Must update local state so the other effects trigger
            setIsConnected(true);
            forceResubscribe(userIdd);
          });
        } catch (error) {
          setTimeout(checkAndSubscribe, 500);
          return;
        }
      } else {
        // If already connected, ensure state is true
        setIsConnected(true);
        if (!subscriptionRef.current.subscribed || subscriptionRef.current.userId !== userIdd) {
          forceResubscribe(userIdd);
        }
      }

      const userData = localStorage.getItem('userData');
      if (!userData) return;

      const user = JSON.parse(userData);
      const userId = user.userId.toString();

      if (subscriptionRef.current.subscribed && subscriptionRef.current.userId === userId) {
        return;
      }

      subscriptionRef.current = { subscribed: true, userId };
      marketWatchService.subscribeToWatchlist(userId);
      marketWatchService.subscribeToInstruments(userId);
    };

    const forceResubscribe = (userId: string) => {
      console.log('🔄 Triggering explicit re-subscription for user:', userId);

      // 1. Unsubscribe first to clear any ghost subscriptions
      marketWatchService.unsubscribeFromWatchlist(userId);
      marketWatchService.unsubscribeFromInstruments(userId);

      // 2. Fresh Subscriptions
      subscriptionRef.current = { subscribed: true, userId };
      marketWatchService.subscribeToWatchlist(userId);
      marketWatchService.subscribeToInstruments(userId);

      // 3. IMPORTANT: Re-request current instruments to kickstart the feed
      if (watchlist.length > 0) {
        const tokens = watchlist.map(item => item.token.toString());
        marketWatchService.sendInstrumentsRequest(userId, tokens);
      }
    };

    checkAndSubscribe();
  }, [watchlist.length]);

  // 2. Corrected Request Effect
  useEffect(() => {
    // Now isConnected will actually be true
    if (!isConnected || watchlist.length === 0) {
      console.log('⏳ Skipping request: isConnected:', isConnected, 'Watchlist Size:', watchlist.length);
      return;
    }

    const userData = localStorage.getItem('userData');
    if (!userData) return;

    const user = JSON.parse(userData);
    const userId = user.userId.toString();

    const currentHash = watchlist.map(item => item.token.toString()).join(',');
    if (currentHash === watchlistHashRef.current) return;

    watchlistHashRef.current = currentHash;

    // FIX: Ensure tokens are explicitly mapped to strings and filtered
    const tokens = watchlist
      .filter(item => item.token !== undefined && item.token !== null)
      .map(item => item.token.toString());

    if (tokens.length > 0) {
      console.log('📤 Sending instruments request for:', tokens);
      marketWatchService.sendInstrumentsRequest(userId, tokens);
    }
  }, [isConnected, watchlist]); // This will now fire correctly when isConnected becomes true

  // Setup feed subscription - Keep subscription logic only
  useEffect(() => {
    const setupFeedSubscription = (attempt = 1) => {
      // Unsubscribe from previous subscription if exists
      if (feedUnsubscribeRef.current) {
        console.log('🔌 Unsubscribing from previous feed...')
        feedUnsubscribeRef.current()
      }

      // Retry logic - wait for socket connection with exponential backoff
      if (!marketWatchService.isConnected()) {
        if (attempt < 6) {
          const waitTime = Math.min(1000 * Math.pow(1.5, attempt - 1), 5000)
          console.log(`⏳ Socket not connected yet (attempt ${attempt}/6), retrying in ${waitTime}ms...`)
          retryTimeoutRef.current = setTimeout(() => setupFeedSubscription(attempt + 1), waitTime)
          return
        } else {
          console.warn('❌ Socket connection timeout after 6 attempts')
          return
        }
      }

      console.log('🔌 Setting up new feed subscription...')
      let lastUpdate = 0
      const UPDATE_THROTTLE = 75 // Update at most every 50ms (~20 times per second)
      let dataReceivedCount = 0

      // ... your existing retry logic ...

      console.log('🔌 Setting up new feed subscription...');

      // Every time the feed starts, we ensure the STOMP destination is active
      const userData = localStorage.getItem('userData');
      if (userData) {
        const userId = JSON.parse(userData).userId.toString();
        // This ensures that if the 'market' call happens 2-3 times, 
        // we are always listening to the latest channel
        marketWatchService.subscribeToInstruments(userId);
      }

      feedUnsubscribeRef.current = marketWatchService.onFeedData((data) => {
        console.log('data received', data)
        dataReceivedCount++
        if (dataReceivedCount === 1 || dataReceivedCount % 50 === 0) {
          console.log('📊 Market Watch Response [' + dataReceivedCount + ']:', data?.length || 0, 'instruments')
        }

        // IMPORTANT: Continue processing even if tab is hidden (but throttle more)
        // This keeps the data current in background
        const now = Date.now()
        if (now - lastUpdate < UPDATE_THROTTLE) {
          return // Skip this update
        }
        lastUpdate = now

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

    setupFeedSubscription()

    // Handle tab/window close - unsubscribe only
    const handlePageClose = () => {
      if (feedUnsubscribeRef.current) {
        feedUnsubscribeRef.current()
      }
      // Don't disconnect socket - it's managed globally from login
    }

    // Handle tab visibility change - re-subscribe when tab becomes visible
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('⏸️  Tab is hidden')
      } else {
        console.log('▶️  Tab is visible - re-establishing subscription')

        // When tab becomes visible, reset subscription guards to force re-subscription
        subscriptionRef.current = { subscribed: false, userId: null }
        watchlistHashRef.current = ''

        // Re-setup feed subscription if socket is still connected
        if (marketWatchService.isConnected()) {
          setupFeedSubscription()
        } else {
          console.log('⚠️  Socket not connected, waiting for reconnection')
        }
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handlePageClose)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      // Cleanup on unmount
      window.removeEventListener('beforeunload', handlePageClose)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // Clear any pending retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }

      if (feedUnsubscribeRef.current) {
        feedUnsubscribeRef.current()
      }

      // Unsubscribe from STOMP queues when component unmounts
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        const userId = user.userId.toString()
        if (subscriptionRef.current.subscribed) {
          console.log(`🔕 Unsubscribing from watchlist and instruments for user: ${userId}`)
          marketWatchService.unsubscribeFromWatchlist(userId)
          marketWatchService.unsubscribeFromInstruments(userId)
        }
      }

      // Reset subscription guards on unmount
      subscriptionRef.current = { subscribed: false, userId: null }
      watchlistHashRef.current = ''

      // Don't disconnect socket on unmount - it's managed globally from login
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

  // Updated Effect for Buy Modal
  useEffect(() => {
    // Only track live price if the order type is MARKET
    if (showBuyOrderModal && selectedOrderInstrument && buyOrderType === 'MARKET') {
      const liveData = feedData.find(item => item.insToken === selectedOrderInstrument.token);
      if (liveData) {
        setBuyOrderPrice(liveData.ask.toFixed(2));
      }
    }
    // When switching AWAY from MARKET to LIMIT, we don't clear the price, 
    // we just stop updating it, so it "freezes" at the last known price.
  }, [feedData, buyOrderType, showBuyOrderModal, selectedOrderInstrument]);

  // Updated Effect for Sell Modal
  // Auto-patch live market prices for Sell Modal
  useEffect(() => {
    // Logic: Only update the state if the modal is open AND the type is MARKET
    if (showSellOrderModal && selectedOrderInstrument && sellOrderType === 'MARKET') {
      const liveData = feedData.find(item => item.insToken === selectedOrderInstrument.token);
      if (liveData) {
        // For Sell orders, we usually track the BID price (what buyers are offering)
        setSellOrderPrice(liveData.bid.toFixed(2));
      }
    }
    // If type is LIMIT or SL, this effect does nothing, 
    // so the user's manual changes stay in the input.
  }, [showSellOrderModal, selectedOrderInstrument, feedData, sellOrderType]);

  const extractTokens = (input: string): string[] => {
    // Matches Flutter: normalize and split into words/numbers
    return input.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(' ').filter(t => t.length > 0);
  };

  const getExpirySearchFormat = (timestamp: any): string => {
    if (!timestamp || timestamp === 0) return "";
    const date = new Date(parseInt(timestamp));
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-GB', { month: 'short' }); // "May"
    const year = date.getFullYear();
    // Returns "26May2026"
    return `${day}${month}${year}`.toLowerCase();
  };

  const formatStrike = (value: any): string => {
    if (value === null || value === undefined) return "";
    return value % 1 === 0 ? value.toString() : value.toFixed(2);
  };


  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-primary">
      <div className="w-full flex-shrink-0">
        {/* Watchlist Tabs Section */}
        <div className="flex-shrink-0 px-4 pt-2 border-b border-border-primary">
          <div className="flex items-center gap-2 overflow-x-auto tabs-scrollbar mb-1">
            {/* Tab Buttons */}
            {watchlistTabs.map((tab) => (
              <div key={tab.tabId} className="flex items-center gap-1">
                {editingTabId === tab.tabId ? (
                  <input
                    type="text"
                    value={editingTabName}
                    onChange={(e) => setEditingTabName(e.target.value)}
                    onBlur={() => handleUpdateTabName(tab.tabId)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateTabName(tab.tabId)
                      }
                    }}
                    autoFocus
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm font-semibold focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setSelectedTabId(tab.tabId)}
                    onDoubleClick={() => {
                      setEditingTabId(tab.tabId)
                      setEditingTabName(tab.tabName)
                    }}
                    className={`px-4 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${selectedTabId === tab.tabId
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }`}
                    title="Double-click to edit tab name"
                  >
                    {tab.tabName}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Search Filters */}
        <div className="flex-shrink-0 mb-4 px-4 pt-2">
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
                        className={`w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors ${selectedExchange === exchange.key
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

            {/* Script/Instrument Dropdown (filtered by Selected Exchange) */}
            <div className="relative script-dropdown-container">
              <label className="block text-sm font-semibold text-text-primary mb-2">Select Script</label>
              <button
                onClick={() => setShowScriptDropdown(!showScriptDropdown)}
                disabled={!selectedExchange}
                className="w-full px-4 py-3 bg-surface-primary border border-border-primary rounded-lg text-text-primary flex items-center justify-between hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  {/* IMPROVED BUTTON LABEL */}
                  {selectedScript ? (
                    `${selectedScript.instrumentName} ${formatStrike(selectedScript.strikePrice)} ${selectedScript.tradeSymbol?.endsWith('CE') ? 'CALL' : selectedScript.tradeSymbol?.endsWith('PE') ? 'PUT' : ''}`
                  ) : (
                    selectedExchange ? 'Choose a script...' : 'Select exchange first'
                  )}
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
                      placeholder="Search within exchange (e.g. 1240 put)..."
                      value={scriptSearchTerm}
                      onChange={(e) => setScriptSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded text-text-primary placeholder-text-secondary focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {(() => {
                      const queryTokens = extractTokens(scriptSearchTerm);

                      const filtered = scripts.filter((script) => {
                        const query = (allScriptsSearchTerm || scriptSearchTerm).toLowerCase().trim();
                        if (!query) return true;

                        // 1. Prepare data pieces
                        const name = (script.instrumentName || '').toLowerCase();
                        const strike = (script.strikePrice || '').toString().toLowerCase();
                        const tradeSymbol = (script.tradeSymbol || '').toLowerCase();
                        const expiry = getExpirySearchFormat(script.expiry);
                        const opType = tradeSymbol.endsWith('ce') ? 'call' : tradeSymbol.endsWith('pe') ? 'put' : '';

                        // 2. Construct strings
                        // Normal string with spaces for "banknifty 55000"
                        const dataString = `${name} ${strike} ${opType} ${expiry} ${tradeSymbol}`;

                        // Collapsed string with NO spaces for "banknifty55000"
                        // We explicitly join without spaces to ensure direct adjacency
                        const collapsedData = `${name}${strike}${opType}${expiry}${tradeSymbol}`.replace(/\s+/g, '');
                        const collapsedQuery = query.replace(/\s+/g, '');

                        // 3. Token Match (Order independent: "55000 banknifty")
                        const searchTokens = query.split(' ').filter(t => t.length > 0);
                        const isTokenMatch = searchTokens.every(token => dataString.includes(token));

                        // 4. Collapsed Match (Continuous string: "banknifty55000")
                        const isCollapsedMatch = collapsedData.includes(collapsedQuery);

                        return isTokenMatch || isCollapsedMatch;
                      });

                      if (filtered.length === 0) {
                        return <div className="p-4 text-center text-text-secondary">No matching scripts</div>;
                      }

                      return filtered.slice(0, 100).map((script) => {
                        // Construct readable label matching the image
                        const name = script.instrumentName || script.script || '';
                        const strike = formatStrike(script.strikePrice);
                        const type = script.tradeSymbol?.endsWith('CE') ? 'CALL' : script.tradeSymbol?.endsWith('PE') ? 'PUT' : '';
                        const expiryDate = script.expiry ? new Date(parseInt(script.expiry)).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : '';

                        return (
                          <button
                            key={script.instrumentToken}
                            onClick={async () => {
                              setSelectedScript(script);
                              setShowScriptDropdown(false);
                              setScriptSearchTerm('');
                              await handleAddToWatchlist(script.instrumentToken);
                            }}
                            disabled={isAddingToWatchlist}
                            className={`w-full text-left px-4 py-3 hover:bg-surface-hover border-b border-border-primary last:border-0 transition-colors ${selectedScript?.instrumentToken === script.instrumentToken ? 'bg-blue-500/20 text-blue-500' : 'text-text-primary'
                              }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">
                                {name} {strike} {type} {expiryDate}
                              </span>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] text-text-secondary uppercase font-semibold">{script.exchange}</span>
                                <span className="text-[10px] text-text-secondary font-mono">#{script.instrumentToken}</span>
                              </div>
                            </div>
                          </button>
                        );
                      });
                    })()}
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
                      placeholder="Search all (e.g. adaniports1260)..."
                      value={allScriptsSearchTerm}
                      onChange={(e) => setAllScriptsSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded text-text-primary placeholder-text-secondary focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {(() => {
                      const fullConfig = ConfigManager.getFullConfig();
                      const allScripts: InstrumentConfig[] = [];

                      // Collect all scripts from every exchange
                      if (fullConfig?.instruments) {
                        Object.values(fullConfig.instruments).forEach((list: any) => {
                          if (Array.isArray(list)) allScripts.push(...list);
                        });
                      }

                      const query = allScriptsSearchTerm.toLowerCase().trim();
                      const collapsedQuery = query.replace(/\s+/g, '');

                      const filtered = allScripts.filter((script) => {
                        if (!query) return true;

                        const name = (script.instrumentName || '').toLowerCase();
                        const strike = (script.strikePrice || '').toString().toLowerCase();
                        const tradeSymbol = (script.tradeSymbol || '').toLowerCase();
                        const expiry = getExpirySearchFormat(script.expiry);
                        const opType = tradeSymbol.endsWith('ce') ? 'call' : tradeSymbol.endsWith('pe') ? 'put' : '';

                        // Construct searchable strings
                        const dataString = `${name} ${strike} ${opType} ${expiry} ${tradeSymbol}`;
                        const collapsedData = dataString.replace(/\s+/g, '');

                        // Check A: Token Match (adaniports 1260)
                        const searchTokens = query.split(' ').filter(t => t.length > 0);
                        const isTokenMatch = searchTokens.every(token => dataString.includes(token));

                        // Check B: Collapsed Match (adaniports1260)
                        const isCollapsedMatch = collapsedData.includes(collapsedQuery);

                        return isTokenMatch || isCollapsedMatch;
                      });

                      if (filtered.length === 0) {
                        return <div className="p-4 text-center text-text-secondary text-sm">No matching scripts</div>;
                      }

                      // Slice to 50 for performance as All Scripts is a huge list
                      return filtered.slice(0, 50).map((script) => {
                        const name = script.instrumentName || script.script || '';
                        const strike = script.strikePrice ? (script.strikePrice % 1 === 0 ? script.strikePrice : script.strikePrice.toFixed(2)) : '';
                        const type = script.tradeSymbol?.endsWith('CE') ? 'CALL' : script.tradeSymbol?.endsWith('PE') ? 'PUT' : '';
                        const expiryDate = script.expiry ? new Date(parseInt(script.expiry)).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : '';

                        return (
                          <button
                            key={script.instrumentToken}
                            onClick={async () => {
                              setSelectedScript(script);
                              setShowAllScriptsDropdown(false);
                              setAllScriptsSearchTerm('');
                              await handleAddToWatchlist(script.instrumentToken);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-surface-hover border-b border-border-primary last:border-0 transition-colors ${selectedScript?.instrumentToken === script.instrumentToken ? 'bg-blue-500/10' : ''
                              }`}
                          >
                            <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">
  {name} {strike} {type} {expiryDate}
</span>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] text-text-secondary uppercase font-semibold">{script.exchange}</span>
                                <span className="text-[10px] text-text-secondary font-mono">#{script.instrumentToken}</span>
                              </div>
                            </div>
                          </button>
                        );
                      });
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
              className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg hidden"
            >
              <p className="text-sm text-text-primary">
                <span className="font-semibold">Selected:</span> {selectedScript.tradeSymbol || selectedScript.instrumentName || selectedScript.script}
                <span className="text-text-secondary ml-2">({selectedScript.exchange} • Token: {selectedScript.instrumentToken})</span>
              </p>
            </motion.div>
          )}
        </div>






        {/* Live Feed Data Section */}
        {feedData.length > 0 && selectedTabId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 bg-surface-primary border border-border-primary rounded-xl overflow-hidden shadow-lg mx-4 mb-4 flex flex-col min-h-0"
          >
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-violet-600 p-4 flex items-center justify-between relative overflow-hidden flex-shrink-0">
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
            {/* Single Scrollable Table Container with Sticky Header */}
            <div className="flex-1 overflow-auto min-h-0" style={{ maxHeight: 'calc(100vh - 350px)' }}>
              {/* Fixed Table Header */}
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: `${columnWidths.actions}px` }} />
                  <col style={{ width: `${columnWidths.exchange}px` }} />
                  <col style={{ width: `${columnWidths.symbol}px` }} />
                  <col style={{ width: `${columnWidths.expiry}px` }} />
                  <col style={{ width: `${columnWidths.buyQty}px` }} />
                  <col style={{ width: `${columnWidths.buyPrice}px` }} />
                  <col style={{ width: `${columnWidths.sellPrice}px` }} />
                  <col style={{ width: `${columnWidths.sellQty}px` }} />
                  <col style={{ width: `${columnWidths.ltp}px` }} />
                  <col style={{ width: `${columnWidths.netChange}px` }} />
                  <col style={{ width: `${columnWidths.open}px` }} />
                  <col style={{ width: `${columnWidths.high}px` }} />
                  <col style={{ width: `${columnWidths.low}px` }} />
                  <col style={{ width: `${columnWidths.close}px` }} />
                  <col style={{ width: `${columnWidths.ltt}px` }} />
                </colgroup>
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-700 border-b-2 border-slate-600 sticky top-0 z-10">
                    <th className="px-3 py-3 text-center text-xs font-bold text-white uppercase tracking-wider sticky left-0 bg-slate-800 z-10 relative">
                      Actions
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'actions')}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider relative">
                      Exchange
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'exchange')}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider relative">
                      Symbol
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'symbol')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
                      Expiry
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'expiry')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
                      Buy Qty
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'buyQty')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
                      Buy Price
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'buyPrice')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
                      Sell Price
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'sellPrice')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
                      Sell Qty
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'sellQty')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
                      LTP
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'ltp')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
                      Net Change
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'netChange')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
                      Open
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'open')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
                      High
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'high')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
                      Low
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'low')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
                      Close
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                        onMouseDown={(e) => handleResizeStart(e, 'close')}
                      />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider relative">
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
              top: actionMenuPosition.y + 250 > window.innerHeight ? `${actionMenuPosition.y - 200}px` : `${actionMenuPosition.y + 8}px`,
              bottom: actionMenuPosition.y + 250 > window.innerHeight ? 'auto' : undefined,
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
            {/* Sell Button - HIDE FOR CALLPUT */}
            {instrumentConfigRef.current[actionMenuToken]?.exchange !== 'CALLPUT' && (
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
                <TrendingDown className="w-4 h-4" /> Sell
              </button>
            )}
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
                  if (userData && tokenToDelete && selectedTabId) {
                    const user = JSON.parse(userData)
                    await watchlistTabsService.removeFromWatchlist(user.userId, tokenToDelete, selectedTabId)
                    toast.success('Removed from watchlist', { id: deleteToast })
                    await fetchWatchlistTabs()
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
            className="fixed inset-0 bg-black/40 z-[100000] p-4"
            // onClick={() => setShowBuyOrderModal(false)}
            onClick={resetBuyForm}
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
                cursor: isDraggingBuy ? 'grabbing' : 'auto',
                zIndex: 100001
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
                  // onClick={() => setShowBuyOrderModal(false)}
                  onClick={resetBuyForm}
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
                      {(() => {
                        const userData = localStorage.getItem('userData')
                        const user = userData ? JSON.parse(userData) : null
                        const roleId = user?.roleId
                        const isAdminUser = roleId === 1 || roleId === 2 || roleId === 3

                        return (
                          <>
                            {/* Row 1: Client Name (if admin) | Order Type | Quantity | Price */}
                            <div className="grid gap-4" style={{ gridTemplateColumns: isAdminUser ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr' }}>
                              {isAdminUser && (
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
                              )}
                              <div>
                                <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Order Type</label>
                                <select
                                  value={buyOrderType}
                                  onChange={(e) => setBuyOrderType(e.target.value)}
                                  className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500">
                                  <option value="MARKET">Market</option>
                                  <option value="LIMIT">Limit</option>
                                  <option value="SL">Stop Loss</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Quantity</label>
                                <input
                                  type="number"
                                  value={buyOrderQuantity}
                                  onChange={(e) => setBuyOrderQuantity(e.target.value)}
                                  className="w-full px-3 py-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-600 rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Sell Price (ASK) </label>
                                <input
                                  type="number"
                                  value={buyOrderPrice}
                                  onChange={(e) => setBuyOrderPrice(e.target.value)}
                                  // Disable ONLY if it's market
                                  disabled={buyOrderType === 'MARKET'}
                                  className={`w-full px-3 py-3 border-2 rounded-lg font-semibold transition-all ${buyOrderType === 'MARKET'
                                    ? 'bg-slate-100 dark:bg-slate-700 cursor-not-allowed opacity-70' // Market style
                                    : 'bg-white dark:bg-slate-800 border-blue-500' // Limit/SL style (User in control)
                                    }`}
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
                                  defaultValue={config?.lotSize || '100'}
                                  disabled
                                  className="w-full px-3 py-3 bg-gray-200 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none cursor-not-allowed"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Remark</label>
                                <input
                                  type="text"
                                  value={buyOrderRemark}
                                  onChange={(e) => setBuyOrderRemark(e.target.value)}
                                  placeholder="Optional note..."
                                  className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-4">
                              <button
                                onClick={async () => {
                                  try {
                                    setIsBuyOrderSubmitting(true)

                                    const userData = localStorage.getItem('userData')
                                    const user = userData ? JSON.parse(userData) : null
                                    const roleId = user?.roleId
                                    const isAdminUser = roleId === 1 || roleId === 2 || roleId === 3

                                    if (isAdminUser && !selectedClient) {
                                      toast.error('Please select a client')
                                      return
                                    }

                                    if (!buyOrderQuantity || parseFloat(buyOrderQuantity) <= 0) {
                                      toast.error('Please enter a valid quantity')
                                      return
                                    }

                                    if (buyOrderType === 'LIMIT' && (!buyOrderPrice || parseFloat(buyOrderPrice) <= 0)) {
                                      toast.error('Please enter a valid price for limit order')
                                      return
                                    }

                                    const submitToast = toast.loading('Placing buy order...')

                                    const loggedInUserId = userData ? JSON.parse(userData).userId : null
                                    const recipientUserId = isAdminUser ? (selectedClient?.userId || loggedInUserId) : loggedInUserId

                                    const isSpecialExchange = ['NSE', 'SGX', 'OTHERS'].includes(config?.exchange ?? '');

                                    // 1. User Inputs
                                    const userTypedQuantity = parseInt(buyOrderQuantity); // From "Quantity" box (e.g., 3)
                                    const contractMultiplier = config?.lotSize || 1; // From "LotSize" box (e.g., 10)

                                    // 2. Determine Price
                                    // const finalPrice = isSpecialExchange
                                    //   ? 1
                                    //   : parseFloat(buyOrderPrice || liveData?.ask.toString() || '0');



                                    // // 3. Determine JSON lotSize (quantity parameter in service)
                                    // // NSE -> Forced to 1 | Others -> User Input (e.g., 3)
                                    // const finalQuantity = isSpecialExchange ? 1 : userTypedQuantity;

                                    // // 4. Determine JSON lotValue (lotValue parameter in service)
                                    // // NSE -> User Input (e.g., 7) | Others -> Contract Multiplier (e.g., 10)
                                    // const finalLotValue = isSpecialExchange ? userTypedQuantity : contractMultiplier;

                                    const finalPrice = parseFloat(buyOrderPrice);

                                    // Determine JSON lotSize (quantity)
                                    const finalQuantity = isSpecialExchange ? 1 : parseInt(buyOrderQuantity);

                                    // Determine JSON lotValue
                                    const finalLotValue = isSpecialExchange ? parseInt(buyOrderQuantity) : (config?.lotSize || 1);

                                    // 5. Fire the service call
                                    const response = await orderService.placeBuyOrder(
                                      loggedInUserId,
                                      recipientUserId,
                                      config?.exchange || 'MCX',
                                      config?.tradeSymbol || config?.instrumentName || config?.script || '',
                                      selectedOrderInstrument?.token || 0,
                                      finalQuantity,   // Becomes JSON "lotSize"
                                      finalPrice,      // Becomes JSON "price"
                                      finalLotValue,   // Becomes JSON "lotValue"
                                      buyOrderType as 'MARKET' | 'LIMIT' | 'SL'
                                    );
                                    if (response?.responseCode === '0') {
                                      toast.success(`Buy order placed successfully! Order ID: ${response.data?.orderId || 'N/A'}`, { id: submitToast })

                                      // Reset form
                                      setBuyOrderQuantity('1')
                                      setBuyOrderPrice('0')
                                      setBuyOrderType('MARKET')
                                      setBuyOrderRemark('')
                                      if (isAdminUser) {
                                        setSelectedClient(null)
                                        setClientSearchTerm('')
                                      }

                                      setShowBuyOrderModal(false)
                                    } else {
                                      toast.error(response?.responseMessage || 'Failed to place order', { id: submitToast })
                                    }
                                  } catch (error: any) {
                                    toast.error(error.message || 'Error placing buy order')
                                  } finally {
                                    setIsBuyOrderSubmitting(false)
                                  }
                                }}
                                disabled={isBuyOrderSubmitting}
                                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isBuyOrderSubmitting ? 'Submitting...' : 'Submit'}
                              </button>
                              <button
                                // onClick={() => {
                                //   const userData = localStorage.getItem('userData')
                                //   const user = userData ? JSON.parse(userData) : null
                                //   const roleId = user?.roleId
                                //   const isAdminUser = roleId === 1 || roleId === 2 || roleId === 3

                                //   setShowBuyOrderModal(false)
                                //   setBuyOrderQuantity('1')
                                //   setBuyOrderPrice('0')
                                //   setBuyOrderType('MARKET')
                                //   setBuyOrderRemark('')
                                //   if (isAdminUser) {
                                //     setSelectedClient(null)
                                //     setClientSearchTerm('')
                                //   }
                                // }}
                                disabled={isBuyOrderSubmitting}
                                onClick={resetBuyForm}
                                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        )
                      })()}
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
            className="fixed inset-0 bg-black/40 z-[100000] p-4"
            // onClick={() => setShowSellOrderModal(false)}
            onClick={resetSellForm}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
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
                cursor: isDraggingSell ? 'grabbing' : 'auto',
                zIndex: 100001
              }}
            // onClick={(e) => e.stopPropagation()}
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
                  // onClick={() => setShowSellOrderModal(false)}
                  onClick={resetSellForm}
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
                      {(() => {
                        const userData = localStorage.getItem('userData')
                        const user = userData ? JSON.parse(userData) : null
                        const roleId = user?.roleId
                        const isAdminUser = roleId === 1 || roleId === 2 || roleId === 3

                        return (
                          <>
                            {/* Row 1: Client Name (if admin) | Order Type | Quantity | Price */}
                            <div className="grid gap-4" style={{ gridTemplateColumns: isAdminUser ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr' }}>
                              {isAdminUser && (
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
                              )}
                              <div>
                                <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">Order Type</label>
                                <select
                                  value={sellOrderType}
                                  onChange={(e) => setSellOrderType(e.target.value)}
                                  className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-red-500">
                                  <option value="MARKET">Market</option>
                                  <option value="LIMIT">Limit</option>
                                  <option value="SL">Stop Loss</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">Quantity</label>
                                <input
                                  type="number"
                                  value={sellOrderQuantity}
                                  onChange={(e) => setSellOrderQuantity(e.target.value)}
                                  className="w-full px-3 py-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-600 rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-red-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">
                                  Buy Price (BID)
                                </label>
                                <input
                                  type="number"
                                  value={sellOrderPrice}
                                  onChange={(e) => setSellOrderPrice(e.target.value)}
                                  disabled={sellOrderType === 'MARKET'} // Disables input during Market mode
                                  className={`w-full px-3 py-3 border-2 rounded-lg font-semibold transition-all duration-200 ${sellOrderType === 'MARKET'
                                    ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-500 cursor-not-allowed opacity-80'
                                    : 'bg-white dark:bg-slate-800 border-red-500 text-gray-900 dark:text-white'
                                    }`}
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
                                  defaultValue={config?.lotSize || '100'}
                                  disabled
                                  className="w-full px-3 py-3 bg-gray-200 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none cursor-not-allowed"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">Remark</label>
                                <input
                                  type="text"
                                  value={sellOrderRemark}
                                  onChange={(e) => setSellOrderRemark(e.target.value)}
                                  placeholder="Optional note..."
                                  className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-red-500"
                                />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-4">
                              <button
                                onClick={async () => {
                                  try {
                                    setIsSellOrderSubmitting(true)

                                    const userData = localStorage.getItem('userData')
                                    const user = userData ? JSON.parse(userData) : null
                                    const roleId = user?.roleId
                                    const isAdminUser = roleId === 1 || roleId === 2 || roleId === 3

                                    if (isAdminUser && !selectedClient) {
                                      toast.error('Please select a client')
                                      return
                                    }

                                    if (!sellOrderQuantity || parseFloat(sellOrderQuantity) <= 0) {
                                      toast.error('Please enter a valid quantity')
                                      return
                                    }

                                    if (sellOrderType === 'LIMIT' && (!sellOrderPrice || parseFloat(sellOrderPrice) <= 0)) {
                                      toast.error('Please enter a valid price for limit order')
                                      return
                                    }

                                    const submitToast = toast.loading('Placing sell order...')

                                    const loggedInUserId = userData ? JSON.parse(userData).userId : null
                                    const recipientUserId = isAdminUser ? (selectedClient?.userId || loggedInUserId) : loggedInUserId

                                    const isSpecialExchange = ['NSE', 'SGX', 'OTHERS'].includes(config?.exchange ?? '');

                                    // User Inputs
                                    // const userTypedQuantity = parseInt(sellOrderQuantity) || 0;
                                    const contractMultiplier = config?.lotSize || 1;

                                    const finalPrice = parseFloat(sellOrderPrice);

                                    // 2. Quantity Logic for Special Exchanges
                                    const userTypedQuantity = parseInt(sellOrderQuantity) || 0;
                                    const finalQuantity = isSpecialExchange ? 1 : userTypedQuantity;

                                    // 3. LotValue Logic (Contract Multiplier)
                                    const finalLotValue = isSpecialExchange ? userTypedQuantity : (config?.lotSize || 1);

                                    const response = await orderService.placeSellOrder(
                                      loggedInUserId,
                                      recipientUserId,
                                      config?.exchange || 'MCX',
                                      config?.tradeSymbol || config?.instrumentName || config?.script || '',
                                      selectedOrderInstrument?.token || 0,
                                      finalQuantity,   // Maps to JSON "lotSize"
                                      finalPrice,      // Maps to JSON "price"
                                      finalLotValue,   // Maps to JSON "lotValue"
                                      sellOrderType as 'MARKET' | 'LIMIT' | 'SL'
                                    )

                                    if (response?.responseCode === '0') {
                                      toast.success(`Sell order placed successfully! Order ID: ${response.data?.orderId || 'N/A'}`, { id: submitToast })

                                      // Reset form
                                      setSellOrderQuantity('1')
                                      setSellOrderPrice('0')
                                      setSellOrderType('MARKET')
                                      setSellOrderRemark('')
                                      if (isAdminUser) {
                                        setSelectedClient(null)
                                        setClientSearchTerm('')
                                      }


                                      setShowSellOrderModal(false)
                                    } else {
                                      toast.error(response?.responseMessage || 'Failed to place order', { id: submitToast })
                                    }
                                  } catch (error: any) {
                                    toast.error(error.message || 'Error placing sell order')
                                  } finally {
                                    setIsSellOrderSubmitting(false)
                                  }
                                }}
                                disabled={isSellOrderSubmitting}
                                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSellOrderSubmitting ? 'Submitting...' : 'Submit'}
                              </button>
                              <button
                                // onClick={() => {
                                //   const userData = localStorage.getItem('userData')
                                //   const user = userData ? JSON.parse(userData) : null
                                //   const roleId = user?.roleId
                                //   const isAdminUser = roleId === 1 || roleId === 2 || roleId === 3

                                //   setShowSellOrderModal(false)
                                //   setSellOrderQuantity('1')
                                //   setSellOrderPrice('0')
                                //   setSellOrderType('MARKET')
                                //   setSellOrderRemark('')
                                //   if (isAdminUser) {
                                //     setSelectedClient(null)
                                //     setClientSearchTerm('')
                                //   }
                                // }}
                                onClick={resetSellForm}
                                disabled={isSellOrderSubmitting}
                                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        )
                      })()}
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
            className="fixed inset-0 bg-black/60 z-[100000] p-4"
            onClick={() => setShowScripInfoModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 100001 }}
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
