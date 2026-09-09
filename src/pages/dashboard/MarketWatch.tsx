import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Search, X, MoreVertical, TrendingUp, TrendingDown, Trash2, Plus, Maximize2, Minimize2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { createChart, ColorType } from 'lightweight-charts'
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
  lcl:number
  ucl:number
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
// Memoized Table Row Component
const TableRow = memo(({
  instrument,
  index,
  config,
  changes,
  onActionMenuOpen,
  onBuyClick,
  onSellClick,
  deletingToken
}: {
  instrument: FeedInstrument
  index: number
  config: InstrumentConfig | undefined
  changes: PriceChange
  onActionMenuOpen: (token: number, position: { x: number, y: number }) => void
  onBuyClick: (token: number, config: InstrumentConfig | undefined) => void
  onSellClick: (token: number, config: InstrumentConfig | undefined) => void
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
    <Draggable draggableId={instrument.insToken.toString()} index={index}>
      {(provided, snapshot) => (
        <tr
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`hover:bg-slate-700 transition-colors ${snapshot.isDragging ? 'bg-blue-700' : ''} ${isEvenRow ? 'bg-slate-800' : 'bg-slate-850'}`}
        >
          <td className={`px-3 py-2 text-center sticky left-0 z-10 ${isEvenRow ? 'bg-slate-800' : 'bg-slate-850'}`} {...provided.dragHandleProps}>
            <button
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                onActionMenuOpen(instrument.insToken, { x: rect.right, y: rect.bottom })
              }}
              className="action-menu-trigger text-slate-300 hover:text-slate-100 transition-colors p-1 rounded hover:bg-slate-700 cursor-grab active:cursor-grabbing"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </td>

      {/* Buy Button Column */}
      <td className="px-2 py-2 text-center">
        <button
          onClick={() => onBuyClick(instrument.insToken, config)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-2.5 py-1 rounded transition-all shadow hover:scale-105"
        >
          B
        </button>
      </td>

      {/* Sell Button Column (Grayed out if CALLPUT) */}
      <td className="px-2 py-2 text-center">
        {/* {config?.exchange !== 'CALLPUT' ? ( */}
        <button
          onClick={() => onSellClick(instrument.insToken, config)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-2.5 py-1 rounded transition-all shadow hover:scale-105"
        >
          S
        </button>
        {/* ) : (
          <button
            disabled
            className="bg-slate-600 text-slate-400 font-bold text-xs px-2.5 py-1 rounded cursor-not-allowed opacity-50"
          >
            S
          </button>
        )} */}
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

      <td className="px-4 py-2 text-center"><span className="text-slate-300 text-base font-medium">{expiry}</span></td>
      <td className="px-4 py-2 text-center"><span className={`inline-block px-3 py-1.5 rounded-lg font-medium text-base ${changes.buyQty ? (changes.buyQty === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white') : 'text-slate-200'}`}>{instrument.bids?.[0]?.qty || '-'}</span></td>
      <td className="px-4 py-2 text-center"><span className={`inline-block px-3 py-1.5 rounded-lg font-semibold text-base ${changes.bid ? (changes.bid === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white') : 'text-slate-200'}`}>{instrument.bid.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-center"><span className={`inline-block px-3 py-1.5 rounded-lg font-semibold text-base ${changes.ask ? (changes.ask === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white') : 'text-slate-200'}`}>{instrument.ask.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-center"><span className={`inline-block px-3 py-1.5 rounded-lg font-medium text-base ${changes.sellQty ? (changes.sellQty === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white') : 'text-slate-200'}`}>{instrument.asks?.[0]?.qty || '-'}</span></td>
      <td className="px-4 py-2 text-center"><span className={`inline-block px-3 py-1.5 rounded-lg font-bold text-base ${changes.ltp ? (changes.ltp === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white') : 'text-slate-200'}`}>{instrument.ltp.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-center"><span className={`inline-block px-3 py-1.5 rounded-lg font-bold text-base text-slate-200`}>{isPositive ? '+' : ''}{change.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-center"><span className="text-slate-300 text-base font-medium">{instrument.open.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-center"><span className="text-slate-300 text-base font-medium">{instrument.high.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-center"><span className="text-slate-300 text-base font-medium">{instrument.low.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-center"><span className="text-slate-300 text-base font-medium">{instrument.close.toFixed(2)}</span></td>
      <td className="px-4 py-2 text-center"><span className="text-slate-400 text-xs font-mono whitespace-nowrap">{lastTradedTime}</span></td>
        </tr>
      )}
    </Draggable>
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

  // Set position to null initially to let native CSS center it on open
  const [scripInfoModalPosition, setScripInfoModalPosition] = useState<{ x: number; y: number } | null>(null)
  const [isDraggingScripInfo, setIsDraggingScripInfo] = useState(false)


  // Guard flag to strictly prevent socket traffic unless the Scrip Info modal is active
  const isScripModalActiveRef = useRef(false)

  // Chart Modal state
  const [showChartModal, setShowChartModal] = useState(false)
  const [selectedChartInstrument, setSelectedChartInstrument] = useState<{ token: number; config: InstrumentConfig | undefined } | null>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [scripInfoLiveData, setScripInfoLiveData] = useState<FeedInstrument | null>(null)
  const reorderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Column resize state
  const [columnWidths, setColumnWidths] = useState({
    actions: 100,
    buyBtn: 60,
    sellBtn: 60,
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
  const [isMarketWatchFullscreen, setIsMarketWatchFullscreen] = useState(false)

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

  useEffect(() => {
    if (!showScripInfoModal) {
      setScripInfoModalPosition(null)
    }
  }, [showScripInfoModal])

  const onDirectBuyClick = useCallback((token: number, config: InstrumentConfig | undefined) => {
    setSelectedOrderInstrument({ token, config })
    setShowBuyOrderModal(true)
  }, [])

  const onDirectSellClick = useCallback((token: number, config: InstrumentConfig | undefined) => {
    setSelectedOrderInstrument({ token, config })
    setShowSellOrderModal(true)
  }, [])

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
 // Memoize filtered feed data - guaranteed to follow the database sort structure sequence on return
  const filteredFeedData = useMemo(() => {
    const filtered: FeedInstrument[] = []
    
    // 1. Extract and clean matching instruments
    for (const instrument of feedData) {
      if (selectedTabTokens.has(instrument.insToken) && instrument.insToken !== deletingToken) {
        filtered.push(instrument)
      }
    }

    // 2. SORT THE LIST dynamically based on the exact index order in our database watchlist mapping
    if (watchlist && watchlist.length > 0) {
      const orderMap = new Map(watchlist.map((item, index) => [item.token, index]));
      
      return filtered.sort((a, b) => {
        const indexA = orderMap.has(a.insToken) ? orderMap.get(a.insToken)! : 999;
        const indexB = orderMap.has(b.insToken) ? orderMap.get(b.insToken)! : 999;
        return indexA - indexB;
      });
    }

    return filtered;
  }, [feedData, selectedTabTokens, deletingToken, watchlist]);

  const handleReorderSave = (result: DropResult) => {
    const { source, destination, draggableId } = result
    
    // If dropped outside a droppable zone
    if (!destination) return
    
    // If dropped in same position
    if (source.index === destination.index) return

    // Reorder the local state
    const newList = Array.from(filteredFeedData)
    const draggedItem = newList[source.index]
    newList.splice(source.index, 1)
    newList.splice(destination.index, 0, draggedItem)

    // Update UI immediately so drag animations remain fluid
    setFeedData(newList)

    // Clear any pending API execution timers (Debounce)
    if (reorderTimeoutRef.current) {
      clearTimeout(reorderTimeoutRef.current)
    }

    // Set a 500ms timer. The API will fire ONLY after the user stops moving the row.
    reorderTimeoutRef.current = setTimeout(async () => {
      try {
        const userData = localStorage.getItem('userData')
        if (!userData || !selectedTabId) return
        const user = JSON.parse(userData)
        const userId = user.userId

        const selectedTab = watchlistTabs.find(tab => tab.tabId === selectedTabId)
        if (!selectedTab || !Array.isArray(selectedTab.watchList)) return

        const reorderedIds = newList
          .map(feedItem => {
            const match = selectedTab.watchList.find(w => w.token === feedItem.insToken)
            return match ? match.id : null
          })
          .filter((id): id is number => id !== null)

        if (reorderedIds.length === 0) return

        const response = await fetch('https://api-staging.rivoplus.live/user/watchlist/reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            watchListTabId: selectedTabId,
            requestTimestamp: Date.now().toString(),
            data: {
              watchListIds: reorderedIds,
              watchListTabId: selectedTabId
            }
          }),
        })

        const result = await response.json()
        if (result.responseCode === '0') {
          toast.success('Watchlist order updated')
          await fetchWatchlistTabs()
        } else {
          toast.error(result.responseMessage || 'Failed to save order')
        }
      } catch (error) {
        console.error('Error updating watchlist order:', error)
        toast.error('Failed to update watchlist')
        setFeedData(filteredFeedData)
      }
    }, 500)
  }

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

  // Handshakes subscription and 1-second polling lifecycle strictly with modal visibility
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;
    let unsubscribeFeed: (() => void) | null = null;
    let dynamicUserId: string | null = null;

    if (showScripInfoModal && selectedScripInfo) {
      isScripModalActiveRef.current = true;

      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        dynamicUserId = user.userId.toString()
        const tokenStr = selectedScripInfo.token.toString()

        // 1. LIVE SUBSCRIBE: Listen to instruments queue only now
        console.log(`📡 Modal Opened: Subscribing to instruments for user ${dynamicUserId}`)
        marketWatchService.subscribeToInstruments(dynamicUserId)

        // 2. Stream Message Callback Listener
        unsubscribeFeed = marketWatchService.onFeedData((data) => {
          if (!isScripModalActiveRef.current) return;

          if (Array.isArray(data)) {
            const targetInstrument = data.find(item => item.insToken === selectedScripInfo.token)
            if (targetInstrument) setScripInfoLiveData(targetInstrument)
          } else if (data && data.insToken === selectedScripInfo.token) {
            setScripInfoLiveData(data)
          }
        })

        // 3. Isolated Polling Engine Block targeting /app/instruments
        const executePollPacket = () => {
          if (isScripModalActiveRef.current && marketWatchService.isConnected()) {
            marketWatchService.sendInstrumentsRequestduplicate(dynamicUserId!, [tokenStr])
          }
        }

        // 4. Initial trigger, then cycle at 1-second ticks
        executePollPacket()
        pollingInterval = setInterval(executePollPacket, 1000)
      }
    } else {
      isScripModalActiveRef.current = false;
      setScripInfoLiveData(null)
    }

    // Teardown Hook: Clears intervals, feed listeners, and forcefully unsubscribes from the socket channel
    return () => {
      isScripModalActiveRef.current = false;

      if (pollingInterval) clearInterval(pollingInterval)
      if (unsubscribeFeed) unsubscribeFeed()

      // If we recorded a userId during this lifecycle, explicitly cut the server stream now
      if (dynamicUserId) {
        console.log(`🔕 Modal Closed: Unsubscribing from instruments for user ${dynamicUserId}`)
        marketWatchService.unsubscribeFromInstruments(dynamicUserId)
      }
    }
  }, [showScripInfoModal, selectedScripInfo])
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
      // marketWatchService.subscribeToInstruments(userId);
    };

    const forceResubscribe = (userId: string) => {
      console.log('🔄 Triggering explicit re-subscription for user:', userId);

      // 1. Unsubscribe first to clear any ghost subscriptions
      marketWatchService.unsubscribeFromWatchlist(userId);
      marketWatchService.unsubscribeFromInstruments(userId);

      // 2. Fresh Subscriptions
      subscriptionRef.current = { subscribed: true, userId };
      marketWatchService.subscribeToWatchlist(userId);
      // marketWatchService.subscribeToInstruments(userId);

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
            // Filter out null/undefined items and create a map for fast lookup
            const validData = data.filter(item => item && item.insToken !== null && item.insToken !== undefined)
            const dataMap = new Map(validData.map(item => [item.insToken, item]))

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
            const newInstruments = Array.from(dataMap.values()).filter(item => item && item.insToken !== null)
            newInstruments.forEach(item => {
              if (item) {
                previousPricesRef.current[item.insToken] = item
              }
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
      if (isDraggingScripInfo) {
        setScripInfoModalPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsDraggingBuy(false)
      setIsDraggingSell(false)
      setIsDraggingScripInfo(false)
    }

    if (isDraggingBuy || isDraggingSell || isDraggingScripInfo) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingBuy, isDraggingSell, isDraggingScripInfo, dragOffset])

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
                    `${selectedScript.instrumentName} ${selectedScript.strikePrice && selectedScript.strikePrice > 0 ? formatStrike(selectedScript.strikePrice) : ''} ${selectedScript.tradeSymbol?.endsWith('CE') ? 'CALL' : selectedScript.tradeSymbol?.endsWith('PE') ? 'PUT' : ''}`
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
                        const strike = script.strikePrice && script.strikePrice > 0 ? formatStrike(script.strikePrice) : '';
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
                                {name} {strike && `${strike} `}{type} {expiryDate}
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
                        const strike = script.strikePrice && script.strikePrice > 0 ? (script.strikePrice % 1 === 0 ? script.strikePrice : script.strikePrice.toFixed(2)) : '';
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
                                {name} {strike && `${strike} `}{type} {expiryDate}
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






        {/* Market Watch Table Header - Shared */}
        {feedData.length > 0 && selectedTabId && (
          <>
            {/* Shared Table Content */}
            {(() => {
              const tableContent = (
                <DragDropContext onDragEnd={handleReorderSave}>
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      {['actions', 'buyBtn', 'sellBtn', 'exchange', 'symbol', 'expiry', 'buyQty', 'buyPrice', 'sellPrice', 'sellQty', 'ltp', 'netChange', 'open', 'high', 'low', 'close', 'ltt'].map(col => (
                        <col key={col} style={{ width: `${columnWidths[col as keyof typeof columnWidths]}px` }} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-800 to-slate-700 border-b-2 border-slate-600 sticky top-0 z-10">
                        {[
                          { name: 'Actions', key: 'actions', align: 'center', sticky: true },
                          { name: 'Buy', key: 'buyBtn', align: 'center' },
                          { name: 'Sell', key: 'sellBtn', align: 'center' },
                          { name: 'Exchange', key: 'exchange', align: 'left' },
                          { name: 'Symbol', key: 'symbol', align: 'left' },
                          { name: 'Expiry', key: 'expiry', align: 'center' },
                          { name: 'Buy Qty', key: 'buyQty', align: 'center' },
                          { name: 'Buy Price', key: 'buyPrice', align: 'center' },
                          { name: 'Sell Price', key: 'sellPrice', align: 'center' },
                          { name: 'Sell Qty', key: 'sellQty', align: 'center' },
                          { name: 'LTP', key: 'ltp', align: 'center' },
                          { name: 'Net Change', key: 'netChange', align: 'center' },
                          { name: 'Open', key: 'open', align: 'center' },
                          { name: 'High', key: 'high', align: 'center' },
                          { name: 'Low', key: 'low', align: 'center' },
                          { name: 'Close', key: 'close', align: 'center' },
                          { name: 'LTT', key: 'ltt', align: 'center' },
                        ].map(col => (
                          <th
                            key={col.key}
                            className={`px-${col.sticky ? '3' : '4'} py-3 text-${col.align} text-xs font-bold text-white uppercase tracking-wider ${col.sticky ? 'sticky left-0 bg-slate-800 z-10' : ''} relative`}
                          >
                            {col.name}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 bg-slate-600 hover:bg-blue-400 hover:w-1.5 cursor-col-resize transition-all"
                              onMouseDown={(e) => handleResizeStart(e, col.key)}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <Droppable droppableId="watchlist" type="ITEM">
                      {(provided) => (
                        <tbody
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="divide-y divide-slate-700 bg-slate-900"
                        >
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
                              onBuyClick={onDirectBuyClick}
                              onSellClick={onDirectSellClick}
                              deletingToken={deletingToken}
                            />
                          ))}
                          {provided.placeholder}
                        </tbody>
                      )}
                    </Droppable>
                  </table>
                </DragDropContext>
              )

              return (
                <>
                  {/* Fullscreen Portal */}
                  {isMarketWatchFullscreen && createPortal(
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-surface-primary flex flex-col z-[99999]"
                    >
                      <div className="absolute inset-0 z-0" onClick={() => setIsMarketWatchFullscreen(false)} />
                      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-violet-600 p-4 flex items-center justify-between relative overflow-hidden flex-shrink-0 z-10">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                        <div className="flex items-center gap-4 relative z-10">
                          <span className="text-2xl">📊</span>
                          <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                              Live Market Feed
                              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500 rounded-full text-xs font-medium">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>LIVE
                              </span>
                            </h2>
                            <p className="text-sm text-blue-50 mt-0.5">Real-time price updates • {new Date().toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsMarketWatchFullscreen(false)}
                          className="relative z-10 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 text-white group"
                        >
                          <Minimize2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600 z-10">
                        {tableContent}
                      </div>
                    </motion.div>,
                    document.body
                  )}

                  {/* Normal View */}
                  {!isMarketWatchFullscreen && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex-1 bg-surface-primary border border-border-primary rounded-xl overflow-hidden shadow-lg mx-4 mb-4 flex flex-col min-h-0"
                    >
                      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-violet-600 p-4 flex items-center justify-between relative overflow-hidden flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                        <div className="flex items-center gap-4 relative z-10">
                          <span className="text-2xl">📊</span>
                          <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                              Live Market Feed
                              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500 rounded-full text-xs font-medium">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>LIVE
                              </span>
                            </h2>
                            <p className="text-sm text-blue-50 mt-0.5">Real-time price updates • {new Date().toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsMarketWatchFullscreen(true)}
                          className="relative z-10 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 text-white group"
                        >
                          <Maximize2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                        {tableContent}
                      </div>
                    </motion.div>
                  )}
                </>
              )
            })()}
          </>
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
                if (actionMenuToken !== null) {
                  const config = instrumentConfigRef.current[actionMenuToken]
                  setSelectedChartInstrument({ token: actionMenuToken, config })
                  setShowChartModal(true)
                }
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
                                      // toast.success(`Buy order placed successfully! Order ID: ${response.data?.orderId || 'N/A'}`, { id: submitToast })

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
                                      // toast.success(`Sell order placed successfully! Order ID: ${response.data?.orderId || 'N/A'}`, { id: submitToast })

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
            className="fixed inset-0 bg-black/60 z-[100000] p-4 flex items-center justify-center backdrop-blur-sm"
            onClick={() => setShowScripInfoModal(false)}
          >
            <motion.div
              drag
              dragMomentum={false}
              dragElastic={0}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header (Acts as drag handle) */}
              <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-4 flex items-center justify-between cursor-grab active:cursor-grabbing select-none flex-shrink-0">
                <div className="flex items-center gap-3 pointer-events-none">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <span className="text-xl">📊</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Market Picture For ( {selectedScripInfo.config?.exchange || 'N/A'} - {selectedScripInfo.config?.tradeSymbol || selectedScripInfo.config?.instrumentName || selectedScripInfo.config?.script || 'Unknown'} )
                  </h2>
                </div>
                <button
                  onClick={() => setShowScripInfoModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar">
                {(() => {
                  // FIX: Switch resource mapping path from 'feedData.find()' directly to standalone state
                  const liveData = scripInfoLiveData
                  const config = selectedScripInfo.config

                  if (!liveData) {
                    return (
                      <div className="text-center py-12">
                        {/* Visual loading spin/indicator state waiting for first 1s socket packet */}
                        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                        <p className="text-gray-500 dark:text-gray-400">Fetching streaming quote info...</p>
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
                                  {liveData.bid.toFixed(2)}
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
                                  {liveData.ask.toFixed(2)}
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
                              {(liveData.lcl).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-2">
                            <span className="font-bold text-gray-700 dark:text-gray-300">U. CRKT :</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {(liveData.ucl).toFixed(2)}
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

      {/* Chart Modal */}
      {showChartModal && selectedChartInstrument && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[99999] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl w-[98%] h-[95%] flex flex-col border border-slate-700/50"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 px-8 py-5 rounded-t-2xl flex items-center justify-between border-b border-slate-700/30">
              <div className="flex items-center gap-4">
                <TrendingUp className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white">
                  {selectedChartInstrument.config?.instrumentName || selectedChartInstrument.config?.script || `Token ${selectedChartInstrument.token}`}
                </h2>
              </div>
              <button
                onClick={() => setShowChartModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Chart Container */}
            <div className="flex-1 overflow-hidden p-4">
              <ChartComponent
                token={selectedChartInstrument.token}
                config={selectedChartInstrument.config}
                containerRef={chartContainerRef}
                feedData={feedData}
              />
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      </div>
    </div>
  )
}

// Chart Component using TradingView Lightweight Charts
interface ChartComponentProps {
  token: number
  config: InstrumentConfig | undefined
  containerRef: React.RefObject<HTMLDivElement | null>
  feedData: FeedInstrument[]
}

interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface TechnicalIndicators {
  sma20: number[]
  sma50: number[]
  bbUpper: number[]
  bbLower: number[]
  bbMiddle: number[]
  rsi: number[]
}

const ChartComponent: React.FC<ChartComponentProps> = ({ token, config, containerRef, feedData }) => {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'candle'>('candle')
  const [showIndicators, setShowIndicators] = useState(true)
  const [showVolume, setShowVolume] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1)  // 1 = 100%, 0.5 = 50%, 2 = 200%
  const candleDataRef = useRef<CandleData[]>([])
  const priceHistoryRef = useRef<number[]>([])
  const indicatorsRef = useRef<TechnicalIndicators>({ sma20: [], sma50: [], bbUpper: [], bbLower: [], bbMiddle: [], rsi: [] })
  const maxDataPointsRef = useRef(200)

  // Time-based candle tracking (30 seconds for testing, 60000 for 1 minute production)
  const candleIntervalMs = 30000 // 30 seconds for testing
  const currentCandleStartTimeRef = useRef<number>(Date.now())
  const currentCandleOpenRef = useRef<number>(0)
  const candleCountRef = useRef<number>(0)
  const historicalDataLoadedRef = useRef<boolean>(false)  // Track if we've loaded historical data

  // Fetch historical candles from API - MOVED OUTSIDE EFFECT FOR ACCESSIBILITY
  const loadHistoricalCandles = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const url = `https://api-staging.rivoplus.live/quotes/kite/history?instrumentToken=${token}&interval=minute&from=${today}&to=${today}`
      
      console.log('📊 Fetching chart data from:', url)
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('📊 API Response:', data)

      if (data.candles && Array.isArray(data.candles)) {
        console.log(`📊 Received ${data.candles.length} candles from API`)
        
        // Skip first 300 candles, keep only last 50 for cleaner chart
        const maxRecords = 50
        const startIndex = Math.max(0, data.candles.length - maxRecords)
        const lastCandles = data.candles.slice(startIndex)
        
        console.log(`📊 Using last ${lastCandles.length} candles (starting from index ${startIndex})`)

        const historicalCandles: CandleData[] = lastCandles.map((candle: any, index: number) => ({
          time: index,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume || 0
        }))

        candleDataRef.current = historicalCandles
        // Update candle count to continue from historical data
        candleCountRef.current = historicalCandles.length
        // Set start time to now for next live candle
        currentCandleStartTimeRef.current = Date.now()
        // Use last close as open for next live candle
        currentCandleOpenRef.current = historicalCandles[historicalCandles.length - 1].close

        console.log(`📊 Chart data loaded! Candles: ${historicalCandles.length}, First: ${historicalCandles[0]?.close}, Last: ${historicalCandles[historicalCandles.length - 1]?.close}`)
        return true
      } else {
        console.warn('⚠️ No candles found in API response')
      }
    } catch (error) {
      console.error('❌ Error loading historical candles:', error)
    }
    return false
  }

  // Calculate technical indicators
  const calculateIndicators = () => {
    const prices = candleDataRef.current.map(c => c.close)
    if (prices.length < 50) return

    // SMA 20 and 50
    const sma20 = prices.map((_, i) => {
      if (i < 19) return NaN
      return prices.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20
    })

    const sma50 = prices.map((_, i) => {
      if (i < 49) return NaN
      return prices.slice(i - 49, i + 1).reduce((a, b) => a + b, 0) / 50
    })

    // Bollinger Bands (20-period)
    const bbMiddle = sma20
    const bbUpper = prices.map((_, i) => {
      if (i < 19) return NaN
      const slice = prices.slice(i - 19, i + 1)
      const avg = slice.reduce((a, b) => a + b, 0) / 20
      const variance = slice.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / 20
      return avg + 2 * Math.sqrt(variance)
    })

    const bbLower = prices.map((_, i) => {
      if (i < 19) return NaN
      const slice = prices.slice(i - 19, i + 1)
      const avg = slice.reduce((a, b) => a + b, 0) / 20
      const variance = slice.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / 20
      return avg - 2 * Math.sqrt(variance)
    })

    // RSI (14-period)
    const rsi = prices.map((_, i) => {
      if (i < 14) return NaN
      const slice = prices.slice(i - 13, i + 1)
      const deltas = slice.slice(1).map((p, idx) => p - slice[idx])
      const gains = deltas.map(d => d > 0 ? d : 0).reduce((a, b) => a + b, 0) / 14
      const losses = deltas.map(d => d < 0 ? -d : 0).reduce((a, b) => a + b, 0) / 14
      return 100 - (100 / (1 + gains / (losses || 0.001)))
    })

    indicatorsRef.current = { sma20, sma50, bbUpper, bbLower, bbMiddle, rsi }
  }

  // EFFECT 1: Load historical data ONLY ONCE per token
  useEffect(() => {
    // Skip if already loaded
    if (historicalDataLoadedRef.current) return
    
    // Create async wrapper to properly await the API call
    const loadData = async () => {
      console.log('📊 Effect 1: Starting historical data load for token:', token)
      const success = await loadHistoricalCandles()
      // Only mark as loaded if data was actually retrieved
      if (success) {
        historicalDataLoadedRef.current = true
        console.log('📊 Effect 1: Historical data loaded successfully!')
      } else {
        console.warn('⚠️ Effect 1: Failed to load historical data, will use live data only')
        // Still mark as attempted to avoid infinite retries
        historicalDataLoadedRef.current = true
      }
    }
    
    loadData()
  }, [token])  // Only depends on token!

  // EFFECT 2: Setup canvas and live updates
  useEffect(() => {
    if (!containerRef.current) return

    const canvas = document.createElement('canvas')
    containerRef.current.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      if (!containerRef.current) return
      canvas.width = containerRef.current.clientWidth
      canvas.height = containerRef.current.clientHeight
      drawChart()
    }

    const drawChart = () => {
      if (!ctx || !containerRef.current) return

      const width = canvas.width
      const height = canvas.height

      // Enterprise-grade optimized layout - maximize chart area
      const topPadding = 65
      const leftPadding = 65
      const rightPadding = 30
      const bottomPadding = 40
      const rsiPanelHeight = 75
      const volumePanelHeight = 55
      const separatorHeight = 12

      const chartWidth = width - leftPadding - rightPadding
      const chartHeight = height - topPadding - bottomPadding - (showVolume ? volumePanelHeight + separatorHeight : 0) - (showIndicators ? rsiPanelHeight + separatorHeight : 0)

      // ===== BACKGROUND =====
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, width, height)

      const candles = candleDataRef.current
      if (candles.length === 0) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Loading chart data...', width / 2, height / 2 - 20)
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        ctx.fillStyle = '#64748b'
        ctx.fillText(`${priceHistoryRef.current.length} ticks received`, width / 2, height / 2 + 20)
        return
      }

      calculateIndicators()

      // Get price range
      const highs = candles.map(c => c.high)
      const lows = candles.map(c => c.low)
      const maxVal = Math.max(...highs)
      const minVal = Math.min(...lows)
      const range = maxVal - minVal || 1
      const padding_val = range * 0.08

      // ===== COMPACT HEADER WITH PRICE INFO =====
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
      ctx.fillRect(0, 0, width, topPadding)

      const lastCandle = candles[candles.length - 1]
      const change = lastCandle.close - candles[0].open
      const changePercent = (change / candles[0].open) * 100
      const isPositive = change >= 0

      // Price (large, bold)
      ctx.fillStyle = '#f8fafc'
      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`₹${lastCandle.close.toFixed(2)}`, leftPadding, topPadding - 28)

      // Change (compact)
      ctx.fillStyle = isPositive ? '#10b981' : '#ef4444'
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.fillText(
        `${isPositive ? '▲' : '▼'} ${Math.abs(change).toFixed(2)} (${changePercent.toFixed(2)}%)`,
        leftPadding,
        topPadding - 8
      )

      // OHLC Info - right side (single line, compact)
      ctx.fillStyle = '#cbd5e1'
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(
        `O: ${lastCandle.open.toFixed(2)} | H: ${lastCandle.high.toFixed(2)} | L: ${lastCandle.low.toFixed(2)} | C: ${lastCandle.close.toFixed(2)}`,
        width - rightPadding,
        topPadding - 32
      )

      // Stats
      ctx.fillStyle = '#64748b'
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.fillText(
        `Candles: ${candles.length} | Ticks: ${priceHistoryRef.current.length} | Range: ${range.toFixed(2)}`,
        width - rightPadding,
        topPadding - 10
      )

      // ===== MAIN CHART AREA =====
      const chartStartY = topPadding

      // Draw professional grid with better contrast
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 0.8

      // Horizontal grid lines (10 lines for better subdivision)
      for (let i = 0; i <= 10; i++) {
        const y = chartStartY + (i / 10) * chartHeight
        ctx.beginPath()
        ctx.moveTo(leftPadding, y)
        ctx.lineTo(width - rightPadding, y)
        ctx.stroke()
      }

      // Vertical grid lines (12 lines for better time division)
      const verticalGridLines = 12
      for (let i = 0; i <= verticalGridLines; i++) {
        const x = leftPadding + (i / verticalGridLines) * chartWidth
        ctx.beginPath()
        ctx.moveTo(x, chartStartY)
        ctx.lineTo(x, chartStartY + chartHeight)
        ctx.stroke()
      }

      // Calculate candlestick dimensions - optimize spacing
      const baseCandleWidth = Math.max(1.5, chartWidth / candles.length / 1.6)
      const candleWidth = baseCandleWidth * zoomLevel  // Apply zoom level
      const spaceBetweenCandles = (chartWidth - candleWidth * candles.length) / Math.max(candles.length, 1)

      // ===== DRAW VOLUME BARS =====
      if (showVolume) {
        const volumeStartY = chartStartY + chartHeight + separatorHeight
        const volumes = candles.map(c => c.volume)
        const maxVolume = Math.max(...volumes)

        // Volume background with gradient
        const gradient = ctx.createLinearGradient(0, volumeStartY, 0, volumeStartY + volumePanelHeight)
        gradient.addColorStop(0, 'rgba(30, 41, 59, 0.6)')
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.8)')
        ctx.fillStyle = gradient
        ctx.fillRect(leftPadding, volumeStartY, chartWidth, volumePanelHeight)

        // Volume gridlines
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 0.5
        for (let i = 1; i < 3; i++) {
          const y = volumeStartY + (i / 3) * volumePanelHeight
          ctx.beginPath()
          ctx.moveTo(leftPadding, y)
          ctx.lineTo(width - rightPadding, y)
          ctx.stroke()
        }

        // Volume bars
        for (let i = 0; i < candles.length; i++) {
          const candle = candles[i]
          const x = leftPadding + i * (candleWidth + spaceBetweenCandles)
          const volumeHeight = (candle.volume / maxVolume) * (volumePanelHeight - 8)
          const isUp = candle.close >= candle.open

          ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
          ctx.fillRect(x, volumeStartY + volumePanelHeight - volumeHeight, candleWidth, volumeHeight)
        }

        // Volume label
        ctx.fillStyle = '#64748b'
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('VOL', 10, volumeStartY + 14)
      }

      // ===== DRAW CANDLESTICKS =====
      for (let i = 0; i < candles.length; i++) {
        const candle = candles[i]
        const x = leftPadding + i * (candleWidth + spaceBetweenCandles)

        const yHigh = chartStartY + (1 - (candle.high - (minVal - padding_val)) / (range + 2 * padding_val)) * chartHeight
        const yLow = chartStartY + (1 - (candle.low - (minVal - padding_val)) / (range + 2 * padding_val)) * chartHeight
        const yOpen = chartStartY + (1 - (candle.open - (minVal - padding_val)) / (range + 2 * padding_val)) * chartHeight
        const yClose = chartStartY + (1 - (candle.close - (minVal - padding_val)) / (range + 2 * padding_val)) * chartHeight

        const isUp = candle.close >= candle.open
        const bodyColor = isUp ? '#10b981' : '#ef4444'

        if (chartType === 'candle') {
          // Wick line - thinner and more elegant
          ctx.strokeStyle = isUp ? '#6ee7b7' : '#fca5a5'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x + candleWidth / 2, yHigh)
          ctx.lineTo(x + candleWidth / 2, yLow)
          ctx.stroke()

          // Body rectangle - smooth rendering
          ctx.fillStyle = bodyColor
          ctx.globalAlpha = 0.95
          const bodyHeight = Math.abs(yClose - yOpen)
          const minBodyHeight = 1
          ctx.fillRect(x, Math.min(yOpen, yClose), candleWidth, Math.max(bodyHeight, minBodyHeight))
          ctx.globalAlpha = 1

          ctx.strokeStyle = bodyColor
          ctx.lineWidth = 1
          ctx.strokeRect(x, Math.min(yOpen, yClose), candleWidth, Math.max(bodyHeight, minBodyHeight))
        } else if (chartType === 'bar') {
          ctx.fillStyle = bodyColor
          ctx.globalAlpha = 0.9
          ctx.fillRect(x, yClose, candleWidth, yLow - yClose)
          ctx.globalAlpha = 1
        }
      }

      // Line chart overlay
      if (chartType === 'line') {
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        for (let i = 0; i < candles.length; i++) {
          const candle = candles[i]
          const x = leftPadding + i * (candleWidth + spaceBetweenCandles) + candleWidth / 2
          const y = chartStartY + (1 - (candle.close - (minVal - padding_val)) / (range + 2 * padding_val)) * chartHeight
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // ===== TECHNICAL INDICATORS =====
      if (showIndicators && indicatorsRef.current.sma20.length > 0) {
        // SMA 20 (Orange) - more visible
        ctx.strokeStyle = '#f97316'
        ctx.lineWidth = 2.2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.globalAlpha = 0.95
        ctx.beginPath()
        for (let i = 0; i < candles.length; i++) {
          const sma = indicatorsRef.current.sma20[i]
          if (isNaN(sma)) continue
          const x = leftPadding + i * (candleWidth + spaceBetweenCandles) + candleWidth / 2
          const y = chartStartY + (1 - (sma - (minVal - padding_val)) / (range + 2 * padding_val)) * chartHeight
          if (i === 19) ctx.moveTo(x, y)
          else if (i > 19) ctx.lineTo(x, y)
        }
        ctx.stroke()

        // SMA 50 (Indigo) - secondary indicator
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 2.2
        ctx.beginPath()
        for (let i = 0; i < candles.length; i++) {
          const sma = indicatorsRef.current.sma50[i]
          if (isNaN(sma)) continue
          const x = leftPadding + i * (candleWidth + spaceBetweenCandles) + candleWidth / 2
          const y = chartStartY + (1 - (sma - (minVal - padding_val)) / (range + 2 * padding_val)) * chartHeight
          if (i === 49) ctx.moveTo(x, y)
          else if (i > 49) ctx.lineTo(x, y)
        }
        ctx.stroke()

        // Bollinger Bands - smooth shading
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
        ctx.beginPath()
        for (let i = 0; i < candles.length; i++) {
          const upper = indicatorsRef.current.bbUpper[i]
          if (isNaN(upper)) continue
          const x = leftPadding + i * (candleWidth + spaceBetweenCandles) + candleWidth / 2
          const y = chartStartY + (1 - (upper - (minVal - padding_val)) / (range + 2 * padding_val)) * chartHeight
          if (i === 19) ctx.moveTo(x, y)
          else if (i > 19) ctx.lineTo(x, y)
        }
        for (let i = candles.length - 1; i >= 0; i--) {
          const lower = indicatorsRef.current.bbLower[i]
          if (isNaN(lower)) continue
          const x = leftPadding + i * (candleWidth + spaceBetweenCandles) + candleWidth / 2
          const y = chartStartY + (1 - (lower - (minVal - padding_val)) / (range + 2 * padding_val)) * chartHeight
          ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()

        ctx.globalAlpha = 1
      }

      // ===== RSI INDICATOR PANEL =====
      if (showIndicators && indicatorsRef.current.rsi.length > 0) {
        const rsiStartY = chartStartY + chartHeight + separatorHeight + (showVolume ? volumePanelHeight + separatorHeight : 0)

        // Background with gradient
        const rsiGradient = ctx.createLinearGradient(0, rsiStartY, 0, rsiStartY + rsiPanelHeight)
        rsiGradient.addColorStop(0, 'rgba(30, 41, 59, 0.5)')
        rsiGradient.addColorStop(1, 'rgba(15, 23, 42, 0.8)')
        ctx.fillStyle = rsiGradient
        ctx.fillRect(leftPadding, rsiStartY, chartWidth, rsiPanelHeight)

        // Grid
        ctx.strokeStyle = '#1e293b'
        ctx.lineWidth = 0.5
        for (let i = 1; i < 4; i++) {
          const y = rsiStartY + (i / 4) * rsiPanelHeight
          ctx.beginPath()
          ctx.moveTo(leftPadding, y)
          ctx.lineTo(width - rightPadding, y)
          ctx.stroke()
        }

        // Overbought/Oversold levels
        ctx.strokeStyle = '#475569'
        ctx.setLineDash([3, 3])
        ctx.lineWidth = 1
        const overbought = rsiStartY + (1 - 0.7) * rsiPanelHeight
        const oversold = rsiStartY + (1 - 0.3) * rsiPanelHeight
        ctx.beginPath()
        ctx.moveTo(leftPadding, overbought)
        ctx.lineTo(width - rightPadding, overbought)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(leftPadding, oversold)
        ctx.lineTo(width - rightPadding, oversold)
        ctx.stroke()
        ctx.setLineDash([])

        // RSI line - smooth and visible
        ctx.strokeStyle = '#a78bfa'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        for (let i = 0; i < candles.length; i++) {
          const rsi = indicatorsRef.current.rsi[i]
          if (isNaN(rsi)) continue
          const x = leftPadding + i * (candleWidth + spaceBetweenCandles) + candleWidth / 2
          const y = rsiStartY + (1 - rsi / 100) * rsiPanelHeight
          if (i === 14) ctx.moveTo(x, y)
          else if (i > 14) ctx.lineTo(x, y)
        }
        ctx.stroke()

        // RSI labels
        ctx.fillStyle = '#64748b'
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('RSI', 10, rsiStartY + 13)

        ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        ctx.fillText('70', 10, overbought + 4)
        ctx.fillText('30', 10, oversold + 4)
      }

      // ===== Y-AXIS LABELS (PRICES) - Better positioning =====
      ctx.fillStyle = '#64748b'
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'right'
      for (let i = 0; i <= 10; i++) {
        const price = minVal + (i / 10) * range
        const y = chartStartY + (i / 10) * chartHeight
        ctx.fillText(price.toFixed(2), leftPadding - 12, y + 3)
      }

      // ===== AXES - Clean and subtle =====
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(leftPadding, chartStartY)
      ctx.lineTo(leftPadding, chartStartY + chartHeight)
      ctx.lineTo(width - rightPadding, chartStartY + chartHeight)
      ctx.stroke()

      // ===== LEGEND - Compact and informative =====
      if (showIndicators) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        ctx.textAlign = 'left'

        let legendX = leftPadding + 5
        const legendY = chartStartY + chartHeight - 8

        // SMA20 indicator
        ctx.fillStyle = '#f97316'
        ctx.fillRect(legendX, legendY - 5, 10, 2)
        ctx.fillStyle = '#cbd5e1'
        ctx.fillText('SMA20', legendX + 14, legendY)
        legendX += 75

        // SMA50 indicator
        ctx.fillStyle = '#6366f1'
        ctx.fillRect(legendX, legendY - 5, 10, 2)
        ctx.fillStyle = '#cbd5e1'
        ctx.fillText('SMA50', legendX + 14, legendY)
        legendX += 75

        // Bollinger Bands indicator
        ctx.fillStyle = '#3b82f6'
        ctx.fillRect(legendX, legendY - 5, 10, 2)
        ctx.fillStyle = '#cbd5e1'
        ctx.fillText('BB', legendX + 14, legendY)
      }
    }

    // Time-based candle generation (new candle every 30 seconds)
    const updateTimeBasedCandles = (price: number) => {
      const now = Date.now()
      const timeSinceLastCandle = now - currentCandleStartTimeRef.current

      // Initialize first candle when no historical data loaded yet
      if (candleDataRef.current.length === 0 && currentCandleOpenRef.current === 0) {
        currentCandleOpenRef.current = price
      }

      // Check if we should create a new candle (30 seconds passed)
      if (timeSinceLastCandle >= candleIntervalMs && candleDataRef.current.length > 0) {
        // Finalize previous candle
        const lastCandle = candleDataRef.current[candleDataRef.current.length - 1]
        lastCandle.close = price

        // Create new candle
        const newCandle: CandleData = {
          time: candleCountRef.current++,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 1
        }

        candleDataRef.current.push(newCandle)

        // Keep only last 50 candles for display
        if (candleDataRef.current.length > 50) {
          candleDataRef.current.shift()
        }

        // Reset timer for next candle
        currentCandleStartTimeRef.current = now
        currentCandleOpenRef.current = price
      } else if (candleDataRef.current.length === 0) {
        // Create first candle if no historical data
        const firstCandle: CandleData = {
          time: candleCountRef.current++,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 1
        }
        candleDataRef.current.push(firstCandle)
        currentCandleStartTimeRef.current = now
        currentCandleOpenRef.current = price
      } else {
        // Update current candle
        const currentCandle = candleDataRef.current[candleDataRef.current.length - 1]
        currentCandle.high = Math.max(currentCandle.high, price)
        currentCandle.low = Math.min(currentCandle.low, price)
        currentCandle.close = price
        currentCandle.volume++
      }
    }

    // Update chart
    const updateChart = () => {
      const instrument = feedData.find(item => item.insToken === token)
      if (instrument && instrument.ltp) {
        priceHistoryRef.current.push(instrument.ltp)
        if (priceHistoryRef.current.length > maxDataPointsRef.current) {
          priceHistoryRef.current.shift()
        }
        // Update time-based candles
        updateTimeBasedCandles(instrument.ltp)
        drawChart()
      }
    }

    // Setup canvas immediately
    resizeCanvas()
    
    // Only start live updates if historical data already loaded
    let interval: NodeJS.Timeout | null = null
    let waitForHistoricalData: NodeJS.Timeout | null = null
    
    const startChart = () => {
      console.log('📊 Effect 2: Starting chart with', candleDataRef.current.length, 'candles')
      drawChart()
      interval = setInterval(updateChart, 200)
    }
    
    if (historicalDataLoadedRef.current && candleDataRef.current.length > 0) {
      console.log('📊 Effect 2: Historical data ready, starting chart immediately')
      startChart()
    } else {
      console.log('📊 Effect 2: Waiting for historical data...')
      // Wait for historical data to load
      waitForHistoricalData = setInterval(() => {
        console.log('📊 Effect 2: Checking... loaded:', historicalDataLoadedRef.current, 'candles:', candleDataRef.current.length)
        if (historicalDataLoadedRef.current && candleDataRef.current.length > 0) {
          console.log('📊 Effect 2: Historical data ready now, starting chart')
          clearInterval(waitForHistoricalData!)
          waitForHistoricalData = null
          startChart()
        }
      }, 100)
    }

    window.addEventListener('resize', resizeCanvas)

    return () => {
      console.log('📊 Effect 2: Cleanup')
      if (interval) clearInterval(interval)
      if (waitForHistoricalData) clearInterval(waitForHistoricalData)
      window.removeEventListener('resize', resizeCanvas)
      if (containerRef.current && canvas.parentNode === containerRef.current) {
        containerRef.current.removeChild(canvas)
      }
    }
  }, [containerRef, feedData, chartType, showIndicators, showVolume, zoomLevel])


  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a' }}>
      {/* Professional Control Bar */}
      <div style={{ 
        padding: '14px 20px', 
        borderBottom: '1px solid #334155', 
        display: 'flex', 
        gap: '16px', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)'
      }}>
        {/* Chart Type Selector */}
        <div style={{ display: 'flex', gap: '8px', borderRight: '1px solid #334155', paddingRight: '16px' }}>
          {(['line', 'bar', 'candle'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: chartType === type ? '#3b82f6' : '#1e293b',
                color: chartType === type ? '#fff' : '#94a3b8',
                transition: 'all 0.25s',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Indicator Toggles */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowVolume(!showVolume)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1.5px solid ' + (showVolume ? '#10b981' : '#334155'),
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: showVolume ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
              color: showVolume ? '#10b981' : '#64748b',
              transition: 'all 0.25s',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            📊 Volume
          </button>

          <button
            onClick={() => setShowIndicators(!showIndicators)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1.5px solid ' + (showIndicators ? '#a78bfa' : '#334155'),
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              backgroundColor: showIndicators ? 'rgba(167, 139, 250, 0.1)' : 'transparent',
              color: showIndicators ? '#a78bfa' : '#64748b',
              transition: 'all 0.25s',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            📈 Tech Indicators
          </button>

          {/* Zoom Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '10px', paddingLeft: '10px', borderLeft: '1px solid #334155' }}>
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #64748b',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                transition: 'all 0.25s',
              }}
              title="Zoom Out (minimum 50%)"
            >
              🔍−
            </button>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', minWidth: '45px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #64748b',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                transition: 'all 0.25s',
              }}
              title="Zoom In (maximum 200%)"
            >
              🔍+
            </button>
          </div>
        </div>

        {/* Info Display */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '20px', fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
          <span>Candles: <span style={{ color: '#e2e8f0', fontWeight: '700' }}>{candleDataRef.current.length}</span></span>
          <span>Ticks: <span style={{ color: '#e2e8f0', fontWeight: '700' }}>{priceHistoryRef.current.length}</span></span>
          {showIndicators && (
            <span>
              <span style={{ color: '#f97316', fontWeight: '700' }}>SMA20</span>
              <span> | </span>
              <span style={{ color: '#6366f1', fontWeight: '700' }}>SMA50</span>
              <span> | </span>
              <span style={{ color: '#a78bfa', fontWeight: '700' }}>RSI</span>
            </span>
          )}
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#0f172a',
          overflow: 'hidden'
        }}
      />
    </div>
  )
}

export default MarketWatch
