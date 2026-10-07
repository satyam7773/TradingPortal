import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ArrowUpRight, ArrowDownLeft, Search, Clock, TrendingUp, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import userManagementService from '../../services/userManagementService'
import orderService from '../../services/orderService'
import FilterLayout from '../../components/FilterLayout'
import UserDetailsModal from '../user-management/UserDetailsModal'
import DurationDetailsModal from '../reports/DurationDetailsModal'
import DealBrkDetailsModal from '../reports/DealBrkDetailsModal'
import ConfirmAlert from '../../components/modals/ConfirmAlert'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { withTabCache, CacheContextProps } from '../../hoc/withTabCache'
import ConfigManager from '../../utils/configManager'
import DownloadReport from '../../components/DownloadReport'
import { useDownloadReport } from '../../hooks/useDownloadReport'
import { useSorting } from '../../hooks/useSorting'
import { API_ENDPOINTS } from '../../config/apiConfig'
import { selectMarketTradeRight } from '../../store/selectors/authSelectors'
import { useAppSelector } from '../../hooks/reduxHooks'

interface TradeData {
  tradeId: number
  userId?: number
  username?: string
  placedByUsername?: string
  tradeSymbol: string
  exchange: string
  side: 'BUY' | 'SELL'
  type?: string
  lotSize: number
  netQuantity: number
  lotValue: number
  actualLotSize?: number
  actualLotValue?: number
  price: number
  referencePrice: number
  pnl?: number
  realisedPnl: number
  brokerage: number
  dealAmount: number
  orderType: string
  tradeOrderMethod: string | null
  tradeOrderMethodDisplay:string | null
  orderTime: string
  executionTime?: string
  createdAt: string
  tradeDays?: number
  ip: string | null
  deviceId: string | null
  tradeStatus?: string
  ipAddress?: string
  durationSeconds?: any
}

interface UserData {
  id: string;
  username: string;
  name: string;
  type: 'Client' | 'Master' | 'Admin';
  parent: string;
  credit: number;
  balance: number;
  sharing: number | null;
  bet: boolean;
  closeOut: boolean;
  margin: boolean;
  status: boolean;
  creditLimit: boolean;
  creditBasedMargin: boolean;
  betEnabled: boolean;
  closeOutEnabled: boolean;
  marginEnabled: boolean;
  statusEnabled: boolean;
  creditLimitEnabled: boolean;
  creditBasedMarginEnabled: boolean;
  createdDate: string;
  ipAddress: string;
  deviceId: string;
  lastLogin: string;
  isActive: boolean;
  isTradeLock: boolean;
}

let lastClickTime = 0;
let lastProcessedId: number | null = null;

interface TradesPageProps {
  // Cache props (optional for modal mode)
  cacheData?: any;
  apiData?: any;
  onCacheSave?: (data: any, apiData?: any) => void;
  isRestoringCache?: boolean;
  // Modal props
  username?: string;
  userId?: string;
  roleId?: string;
  user?: any; // userDetails from modal
  symbol?: string; // Symbol to bind in modal mode
  token?: number | null; // Token to bind in modal mode
  exchange?: string; // Exchange to bind in modal mode
  hideCheckboxes?: boolean; // Hide checkboxes in modal mode
}

const TradesPage: React.FC<TradesPageProps> = ({ 
  cacheData, 
  apiData, 
  onCacheSave, 
  isRestoringCache,
  username,
  userId: propsUserId,
  roleId,
  user: userDetails,
  symbol: propsSymbol,
  token: propsToken,
  exchange: propsExchange,
  hideCheckboxes
}) => {
  // Detect if in modal mode based on presence of userDetails
  const isModalMode = !!userDetails || !!propsSymbol || !!propsExchange || propsToken !== null;
  
  // Initialize state with cache if available, otherwise defaults
  const initializeFilterState = () => {
    if (cacheData && !isModalMode) {
      return cacheData
    }
    const todayStr = new Date().toLocaleDateString('en-CA')
    return {
      selectedUserId: 0,
      selectedExchange: 'All Exchanges',
      selectedSymbol: '',
      selectedStatus: 'All',
      selectedOrderType: 'All',
      selectedSide: 'Both',
      fromDate: todayStr,
      toDate: todayStr,
      timeEnabled: false,
      fromTime: '00:00:00',
      toTime: '23:59:59',
      currentPage: 0,
      totalRecords: 0,
      totalPages: 0
    }
  }

  const initialFilters = initializeFilterState()
  const cacheLoggedRef = React.useRef(false)
  
  const getLoggedInUserId = (): number => {
    const userDataStr = localStorage.getItem('userData')
    if (userDataStr) {
      const userData = JSON.parse(userDataStr)
      return userData.userId 
    }
    return 31
  }

  const loggedInUserId = getLoggedInUserId()
  
  // In modal mode, use propsUserId; in dashboard mode, use selectedUserId from cache
  const targetUserId = isModalMode && propsUserId ? parseInt(propsUserId) : loggedInUserId;
  
  // Initialize download report hook
  const downloadReport = useDownloadReport({
    apiEndpoint: API_ENDPOINTS.OMS.TRADES_DOWNLOAD,
    filename: 'Trades'
  });
  
  const [selectedUserId, setSelectedUserId] = useState<number>(
    isModalMode ? (propsUserId ? parseInt(propsUserId) : loggedInUserId) : (initialFilters.selectedUserId || loggedInUserId)
  )
  const [selectedExchange, setSelectedExchange] = useState<string>(propsExchange || initialFilters.selectedExchange)
  const [selectedSymbol, setSelectedSymbol] = useState<string>(propsSymbol || initialFilters.selectedSymbol)
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilters.selectedStatus)
  const [selectedOrderType, setSelectedOrderType] = useState<string>(initialFilters.selectedOrderType)
  const [selectedSide, setSelectedSide] = useState<string>(initialFilters.selectedSide)
  
  const [fromDate, setFromDate] = useState<string>(initialFilters.fromDate)
  const [toDate, setToDate] = useState<string>(initialFilters.toDate)
  const [liveMode, setLiveMode] = useState(false)
  const [timeEnabled, setTimeEnabled] = useState(initialFilters.timeEnabled)
  const [fromTime, setFromTime] = useState<string>(initialFilters.fromTime)
  const [toTime, setToTime] = useState<string>(initialFilters.toTime)

  // Advanced filters
  const [ipDevFilter, setIpDevFilter] = useState<string>('Default')
  const [durationMin, setDurationMin] = useState<string>('60')
  const [pnlMin, setPnlMin] = useState<string>('10.000')

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [tradesData, setTradesData] = useState<TradeData[]>(apiData?.tradesData || [])
  const [users, setUsers] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [symbols, setSymbols] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState<number>(initialFilters.currentPage)
  const [totalPages, setTotalPages] = useState<number>(initialFilters.totalPages)
  const [totalRecords, setTotalRecords] = useState<number>(initialFilters.totalRecords)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false)
  const [isDealBrkModalOpen, setIsDealBrkModalOpen] = useState(false)
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null)
  const [selectedTradeUserId, setSelectedTradeUserId] = useState<number | null>(null)
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Alert states
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertConfig, setAlertConfig] = useState<{
    title: string
    message: string | string[]
    confirmText: string
    onConfirm: () => void | Promise<void>
  }>({
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => {},
  })
  
  const pageSize = 100

  const cacheInitializedRef = useRef(false)
  const metadataLoadedRef = useRef(false)
  const cacheTimerRef = useRef<any>(null)

  const userOptions = useMemo(() => [
    ...users.map(u => ({ id: u.userId, name: u.userName }))
  ], [users]);

  const symbolOptions = useMemo(() => [
    ...symbols.map(s => ({ id: String(s.token), name: s.tradeSymbol || s }))
  ], [symbols]);

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), [])

  // Log cache found once
  useEffect(() => {
    if (cacheData && !cacheLoggedRef.current) {
      cacheLoggedRef.current = true
    }
  }, [cacheData])

  // Mark cache as initialized but DON'T auto-fetch (wait for user selection)
  useEffect(() => {
    if (!cacheInitializedRef.current && !cacheData) {
      cacheInitializedRef.current = true
    }
  }, [cacheData]) // Watch cacheData to handle first load

  // Handle cache data changes (when switching back to this tab with cache)
  useEffect(() => {
    if (cacheData && !cacheInitializedRef.current) {
      cacheInitializedRef.current = true
      
      // Restore table data if available
      if (apiData?.tradesData) {
        setTradesData(apiData.tradesData)
      }
    }
  }, [cacheData, apiData])

  // Load metadata once per session
  useEffect(() => {
    if (metadataLoadedRef.current) return

    const loadInitialData = async () => {
      try {
        setInitialLoading(true)
        // Fetch users in both dashboard and modal modes
        const usersResponse = await userManagementService.fetchOwnUsers(loggedInUserId)
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data)
        }
        const exchangesResponse = await userManagementService.fetchExchanges()
        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse)
          
          // Fetch symbols for the default exchange on page load
          const symbolsResponse = await userManagementService.fetchSymbols(exchangesResponse[0].name)
          if (symbolsResponse?.responseCode === '0' && Array.isArray(symbolsResponse.data)) {
            setSymbols(symbolsResponse.data)
          }
        }
      } catch (error: any) {
        toast.error('Failed to load metadata')
      } finally {
        setInitialLoading(false)
      }
    }
    
    loadInitialData()
    metadataLoadedRef.current = true
  }, [isModalMode]) // Only run once per mount

  // Save filters to cache whenever they change (debounced)
  useEffect(() => {
    if (!onCacheSave || isModalMode) return // Skip caching in modal mode
    
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    
    cacheTimerRef.current = setTimeout(() => {
      const filters = {
        selectedUserId,
        selectedExchange,
        selectedSymbol,
        selectedStatus,
        selectedOrderType,
        selectedSide,
        fromDate,
        toDate,
        timeEnabled,
        fromTime,
        toTime,
        currentPage,
        totalRecords,
        totalPages
      }
      onCacheSave!(filters, { tradesData, totalRecords, totalPages })
    }, 500)
    
    return () => {
      if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    }
  }, [selectedUserId, selectedExchange, selectedSymbol, selectedStatus, selectedOrderType, selectedSide, fromDate, toDate, timeEnabled, fromTime, toTime, currentPage, totalRecords, totalPages, tradesData, onCacheSave, isModalMode])

  // Function to fetch symbols for a specific exchange
  const fetchSymbolsForExchange = async (exchangeName: string) => {
    if (!exchangeName) {
      setSymbols([])
      return
    }
    try {
      const response = await userManagementService.fetchSymbols(exchangeName)
      if (response?.responseCode === '0' && Array.isArray(response.data)) {
        setSymbols(response.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Fetch symbols when exchange changes
  useEffect(() => {
    fetchSymbolsForExchange(selectedExchange)
  }, [selectedExchange])

  const handleView = async (page: number = 0) => {
    setLoading(true)
    try {
      const requestData: any = {
        from: fromDate,
        to: toDate,
        page: page,
        time: timeEnabled,
        fromTime: timeEnabled ? fromTime : '00:00:00',
        toTime: timeEnabled ? toTime : '23:59:59',
        exchange: selectedExchange !== 'All Exchanges' ? selectedExchange : 'All Exchanges',
        status: selectedStatus !== 'All' ? selectedStatus : 'All',
        orderType: selectedOrderType !== 'All' ? selectedOrderType : 'All',
        side: selectedSide !== 'Both' ? selectedSide : 'Both'
      }

      // Pass tradeSymbol - use token if in modal mode from Positions, otherwise use selected symbol
      if (propsToken) {
        // From modal mode with token - pass token as string
        requestData.tradeSymbol = propsToken.toString()
      } else if (selectedSymbol) {
        // From dashboard mode - pass symbol name
        requestData.tradeSymbol = selectedSymbol
      }

      // Always use selectedUserId if > 0, otherwise fall back to loggedInUserId
      const userIdForRequest = selectedUserId > 0 ? selectedUserId : loggedInUserId
      const response = await userManagementService.fetchTrades(userIdForRequest, { ...requestData, userId: userIdForRequest })

      if (response?.responseCode === '0') {
        const tradesList = response.data?.trades || response.data?.content || response.data || []
        // Use 'total' for total records across all pages, fallback to 'size' for current page
        const totalSize = response.data?.total || response.data?.size || (Array.isArray(tradesList) ? tradesList.length : 0)
        setTradesData(Array.isArray(tradesList) ? tradesList : [])
        setTotalRecords(totalSize)
        setTotalPages(Math.ceil(totalSize / pageSize))
        setCurrentPage(page)
      } else {
        // Clear table on error
        setTradesData([])
        setTotalRecords(0)
        setTotalPages(0)
        toast.error(response?.responseMessage || 'Failed to fetch trades')
      }
    } catch (error: any) {
      setTradesData([])
      setTotalRecords(0)
      setTotalPages(0)
      toast.error('Error fetching trades')
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      handleView(newPage)
    }
  }

  const handleDeleteTrades = async () => {
    // Check if user has permission to delete
    const userData = localStorage.getItem('userData')
    const user = userData ? JSON.parse(userData) : null
    const roleId = user?.roleId
    const marketTradeRight = user?.marketTradeRight
    const isAdminUser = roleId === 1 || roleId === 2 || roleId === 3

    if (!isAdminUser || !marketTradeRight) {
      toast.error('You do not have permission to delete trades')
      return
    }

    if (selectedTradeIds.size === 0) {
      toast.error('Please select trades to delete')
      return
    }

    setAlertConfig({
      title: '⚠️ Delete Trades?',
      message: [
        `Are you sure you want to delete ${selectedTradeIds.size} trade${selectedTradeIds.size > 1 ? '(s)' : ''}?`,
        '',
        'This action cannot be undone.',
      ],
      confirmText: 'Yes, Delete Trades',
      onConfirm: async () => {
        try {
          setIsDeleting(true)
          const tradeIdsArray = Array.from(selectedTradeIds)
          const response = await userManagementService.deleteTrades(loggedInUserId, selectedUserId || loggedInUserId, tradeIdsArray)

          if (response?.responseCode === '0' || response?.success) {
            toast.success(`✅ ${selectedTradeIds.size} trade${selectedTradeIds.size > 1 ? '(s)' : ''} deleted successfully`)
            setSelectedTradeIds(new Set())
            // Refresh the current page
            handleView(currentPage)
          } else {
            toast.error(response?.responseMessage || response?.message || 'Failed to delete trades')
          }
        } catch (error: any) {
          console.error('Error deleting trades:', error)
          toast.error(error?.message || 'Error deleting trades')
        } finally {
          setIsDeleting(false)
          setAlertOpen(false)
        }
      },
    })
    setAlertOpen(true)
  }

  const handleSelectTrade = (tradeId: number) => {
    const newSelected = new Set(selectedTradeIds)
    if (newSelected.has(tradeId)) {
      newSelected.delete(tradeId)
    } else {
      newSelected.add(tradeId)
    }
    setSelectedTradeIds(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedTradeIds.size === tradesData.length) {
      setSelectedTradeIds(new Set())
    } else {
      const allTradeIds = new Set(tradesData.map(t => t.tradeId))
      setSelectedTradeIds(allTradeIds)
    }
  }

  // Clear all filters and cache
  const handleClearFilters = useCallback(() => {
    console.log('🗑️ [Trades] Clearing all filters')
    setSelectedUserId(loggedInUserId)
    setSelectedExchange(exchanges[0]?.name || '')
    setSelectedSymbol('')
    setFromDate(todayStr)
    setToDate(todayStr)
    setSelectedStatus('All')
    setSelectedOrderType('All')
    setSelectedSide('Both')
    setTradesData([])
    setTotalRecords(0)
    setTotalPages(0)
    setCurrentPage(0)
  }, [loggedInUserId, exchanges, todayStr])

  const handleDownloadReport = async (format: 'pdf' | 'excel') => {
    if (tradesData.length === 0) {
      toast.error('No trades to download')
      return
    }
    try {
      setIsDownloading(true)
      const userIdForRequest = isModalMode ? targetUserId : (selectedUserId || loggedInUserId)
      await downloadReport.download(format, {
        userId: loggedInUserId,
        data: {
          from: fromDate,
          to: toDate,
          exchange: selectedExchange !== 'All Exchanges' ? selectedExchange : 'All Exchanges',
          userId: userIdForRequest,
          page: currentPage,
          tradeSymbol: selectedSymbol || ''
        },
        requestTimestamp: new Date().getTime().toString()
      }, { pdf: format === 'pdf' })
    } catch (error) {
      console.error('Download error:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return '-'
    try {
      const date = new Date(dateTimeStr)
      return date.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
      })
    } catch (e) { return dateTimeStr }
  }

  const handleUserNameClick = (e: React.MouseEvent, username: string, userId: number | undefined | null) => {
    e.preventDefault();
    e.stopPropagation();

    const currentTime = Date.now();

    if (!userId || userId === 0 || (lastProcessedId === userId && currentTime - lastClickTime < 800)) {
      return;
    }

    const userDataStr = localStorage.getItem('userData');
    const loggedInUser = userDataStr ? JSON.parse(userDataStr) : null;
    if (loggedInUser?.roleId === 4) return;

    lastClickTime = currentTime;
    lastProcessedId = userId;

    const placeholderUser: any = {
      id: userId.toString(),
      username: username,
      name: username,
      type: 'Client',
      parent: '',
      credit: 0,
      balance: 0,
      sharing: null,
      bet: false,
      closeOut: false,
      margin: false,
      status: false,
      creditLimit: false,
      creditBasedMargin: false,
      betEnabled: false,
      closeOutEnabled: false,
      marginEnabled: false,
      statusEnabled: false,
      creditLimitEnabled: false,
      creditBasedMarginEnabled: false,
      createdDate: '',
      ipAddress: '',
      manualOrder: false,
      manualOrderEnabled: false,
      deviceId: '',
      lastLogin: '',
      isActive: true,
      isTradeLock: false,
      deleteTrade: false,
      deleteTradeEnabled: false
    };

    setSelectedUser(placeholderUser);
  };

  const stats = {
    totalTrades: tradesData.length,  // Current page trades count
    buyTrades: tradesData.filter(t => t.side === 'BUY').length,  // Current page only
    sellTrades: tradesData.filter(t => t.side === 'SELL').length,  // Current page only
    totalPnL: tradesData.reduce((sum, t) => sum + (t.realisedPnl || 0), 0),  // Current page P&L
  }

  // Check if user is admin
  const userData = localStorage.getItem('userData')
  const user = userData ? JSON.parse(userData) : null
  const userRoleId = user?.roleId
  const isAdminUser = userRoleId === 1 || userRoleId === 2 || userRoleId === 3


  // Sorting hook
  const { sortColumn, sortDirection, handleSort, sortedData: sortedTrades, getSortIcon } = useSorting({ data: tradesData })

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="trades:showFilters"
          filterWidthClass="lg:w-[16%]"
          filters={
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">From :</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">To :</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <SearchableSelect
                label="Username :"
                items={userOptions}
                selectedId={selectedUserId}
                onSelect={(userId) => setSelectedUserId(Number(userId))}
                placeholder="Search user..."
              />
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exchange :</label>
                <select 
                  value={selectedExchange} 
                  onChange={(e) => propsExchange ? null : setSelectedExchange(e.target.value)} 
                  disabled={!!propsExchange}
                  className={`w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500 ${propsExchange ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {exchanges.map((ex) => (<option key={ex.name} value={ex.name}>{ex.name}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                {selectedSymbol && !propsSymbol && (
                  <button
                    onClick={() => {
                      console.log('Clearing symbol...');
                      setSelectedSymbol('');
                      setTradesData([]);
                      setTotalRecords(0);
                      setTotalPages(0);
                    }}
                    className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition float-right mb-2"
                  >
                    Clear
                  </button>
                )}
                <div className={propsSymbol ? 'opacity-60 pointer-events-none' : ''}>
                  <SearchableSelect
                    label="Symbol :"
                    items={symbolOptions}
                    selectedId={selectedSymbol}
                    onSelect={(id) => propsSymbol ? null : setSelectedSymbol(String(id))}
                    placeholder="Search symbol..."
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleView(0)} disabled={loading} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition shadow-md">View</button>
                <button onClick={handleClearFilters} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded font-semibold text-sm transition">Clear</button>
              </div>

              {/* Download Section */}
              <div className="border-t border-gray-200 dark:border-slate-600 pt-4 mt-4">
                <DownloadReport
                  onDownload={handleDownloadReport}
                  isDisabled={isDownloading || tradesData.length === 0}
                  label="Download Report"
                />
              </div>
            </div>
          }
        >
          <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
            <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Trades</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    {users.find(u => u.userId === selectedUserId)?.userName || 'User'} • <span className="text-blue-600 font-semibold">{fromDate} to {toDate}</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {selectedTradeIds.size > 0 && isAdminUser  && (
                    <button
                      onClick={handleDeleteTrades}
                      disabled={isDeleting}
                      className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition inline-flex items-center gap-2 shadow-md disabled:opacity-50"
                    >
                      Delete {selectedTradeIds.size > 0 && `(${selectedTradeIds.size})`}
                    </button>
                  )}
                  <div className="grid grid-cols-4 gap-6 text-center">
                    <div><div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalTrades}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total</div></div>
                    <div><div className="text-2xl font-bold text-blue-600">{stats.buyTrades}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Buy</div></div>
                    <div><div className="text-2xl font-bold text-red-600">{stats.sellTrades}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Sell</div></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto min-h-0 scrollbar-thin">
              <table className="w-full border-collapse min-w-max">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 border-b-2 border-blue-100 dark:border-blue-900">
                  <tr>
                    {isAdminUser && !hideCheckboxes  && (
                      <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedTradeIds.size === tradesData.length && tradesData.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('executionTime')}>
                      <div className="flex items-center gap-2">Execution Time {getSortIcon('executionTime')}</div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('username')}>
                      <div className="flex items-center gap-2">Username {getSortIcon('username')}</div>
                    </th>
                    {/* <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('placedByUsername')}>
                      <div className="flex items-center gap-2">Placed By {getSortIcon('placedByUsername')}</div>
                    </th> */}
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('tradeSymbol')}>
                      <div className="flex items-center gap-2">Symbol {getSortIcon('tradeSymbol')}</div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('exchange')}>
                      <div className="flex items-center gap-2">Exchange {getSortIcon('exchange')}</div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('side')}>
                      <div className="flex items-center justify-center gap-2">Type {getSortIcon('side')}</div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('method')}>
                      <div className="flex items-center justify-center gap-2">Method {getSortIcon('tradeOrderMethodDisplay')}</div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('quantity')}>
                      <div className="flex items-center justify-center gap-2">Quantity {getSortIcon('quantity')}</div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('price')}>
                      <div className="flex items-center justify-end gap-2">Price {getSortIcon('price')}</div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('refPrice')}>
                      <div className="flex items-center justify-end gap-2">Reference Price {getSortIcon('refPrice')}</div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('brokerage')}>
                      <div className="flex items-center justify-end gap-2">Brk {getSortIcon('brokerage')}</div>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('realisedPnl')}>
                      <div className="flex items-center justify-end gap-2">Deal {getSortIcon('realisedPnl')}</div>
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('durationSeconds')}>
                      <div className="flex items-center justify-center gap-2">Duration {getSortIcon('durationSeconds')}</div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('orderTime')}>
                      <div className="flex items-center gap-2">Order Time {getSortIcon('orderTime')}</div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('ipAddress')}>
                      <div className="flex items-center gap-2">IP Address {getSortIcon('ipAddress')}</div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider min-w-[280px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('deviceId')}>
                      <div className="flex items-center gap-2">Device ID {getSortIcon('deviceId')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sortedTrades.map((trade) => {
                    const tradeColorClass = trade.side === 'BUY' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';
                    const dynamicBgClass = trade.side === 'BUY' ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-red-50 dark:bg-red-950/40';

                    return (
                      <tr key={trade.tradeId} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        {isAdminUser && !hideCheckboxes  && (
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedTradeIds.has(trade.tradeId)}
                              onChange={() => handleSelectTrade(trade.tradeId)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{trade.executionTime ? new Date(trade.executionTime).toLocaleString() : '-'}</td>
                        <td className="px-6 py-4 text-left whitespace-nowrap">
                          <span
                            className="text-sm font-semibold text-blue-600 underline cursor-pointer hover:text-blue-800 transition-colors"
                            onClick={(e) => handleUserNameClick(e, trade.username || '', trade.userId)}
                          >
                            {trade.username}
                          </span>
                        </td>
                        
                        {/* <td className="px-6 py-4 text-left text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {trade.placedByUsername || '-'}
                        </td> */}

                        <td className="px-6 py-4 text-left whitespace-nowrap">
                          <span className={`text-sm font-bold ${tradeColorClass}`}>{trade.tradeSymbol}</span>
                        </td>

                        {/* EXCHANGE - Styled with Dynamic color according to BUY/SELL */}
                        <td className="px-6 py-4 text-left whitespace-nowrap">
                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${tradeColorClass} ${dynamicBgClass}`}>
                            {trade.exchange}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs font-bold ${tradeColorClass}`}>
                            {trade.type}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {trade.tradeOrderMethodDisplay || '-'}
                        </td>

                        <td className={`px-6 py-4 text-center text-sm font-bold ${tradeColorClass}`}>
                          {trade.actualLotSize || trade.lotSize}
                        </td>

                        <td className={`px-6 py-4 text-right text-sm font-mono font-bold ${tradeColorClass}`}>
                          {trade.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* REFERENCE PRICE - Repositioned next to main price */}
                        <td className="px-6 py-4 text-right text-xs text-slate-500 font-mono">
                          {trade.referencePrice ? trade.referencePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>

                        <td 
                          className="px-6 py-4 text-right text-sm font-mono text-blue-600 dark:text-blue-400 cursor-pointer hover:underline hover:opacity-80 transition-opacity"
                          onClick={() => {
                            const tradeId = trade.tradeId;
                            if (tradeId) {
                              setSelectedTradeId(tradeId);
                              setIsDealBrkModalOpen(true);
                            } else {
                              toast.error('Trade ID not found');
                            }
                          }}
                        >
                          {trade.brokerage}
                        </td>
                        <td className={`px-6 py-4 text-right text-sm font-mono font-bold cursor-pointer hover:underline hover:opacity-80 transition-opacity ${trade.realisedPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                          onClick={() => {
                            const tradeId = trade.tradeId;
                            if (tradeId) {
                              setSelectedTradeId(tradeId);
                              setIsDealBrkModalOpen(true);
                            } else {
                              toast.error('Trade ID not found');
                            }
                          }}
                        >
                          {trade.realisedPnl?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className={`px-6 py-4 text-center ${
                          trade.tradeDuration
                            ? 'cursor-pointer'
                            : 'cursor-default'
                        }`}
                        onClick={() => {
                          if (!trade.tradeDuration) return;
                          setSelectedTradeId(trade.tradeId);
                          setSelectedTradeUserId(trade.userId || loggedInUserId);
                          setIsDurationModalOpen(true);
                        }}>
                          <span className={`text-xs ${
                            trade.tradeDuration
                              ? 'text-blue-600 dark:text-blue-400 underline decoration-blue-300 hover:opacity-80 transition-opacity'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {trade.tradeDuration || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{trade.orderTime ? new Date(trade.orderTime).toLocaleString() : '-'}</td>
                        <td className="px-6 py-4 text-left text-xs text-slate-400 font-mono">{trade.ipAddress || '127.0.0.1'}</td>
                        {/* DEVICE ID - Expanded container space */}
                        <td className="px-6 py-4 text-left text-xs text-slate-400 max-w-[320px] break-all">{trade.deviceId || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="sticky bottom-0 z-20 flex-shrink-0 px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">Showing <span className="font-semibold text-slate-900 dark:text-white">{currentPage * pageSize + 1}</span> to <span className="font-semibold text-slate-900 dark:text-white">{Math.min((currentPage + 1) * pageSize, totalRecords)}</span> of <span className="font-semibold text-slate-900 dark:text-white">{totalRecords}</span> results</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 0 || loading} className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 transition shadow-sm inline-flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Previous</button>
                  <span className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg">Page {currentPage + 1} of {totalPages}</span>
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages - 1 || loading} className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 transition shadow-sm inline-flex items-center gap-2">Next <ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        </FilterLayout>
      </div>

      {selectedUser && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-[9999]" onClick={() => setSelectedUser(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col border border-gray-200/50 overflow-hidden" style={{ width: '98vw', height: '96vh', maxWidth: '1800px' }} onClick={(e) => e.stopPropagation()}>
            <UserDetailsModal
              user={selectedUser}
              onClose={() => setSelectedUser(null)}
              onToggle={() => { }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Duration Details Modal */}
      <DurationDetailsModal
        isOpen={isDurationModalOpen}
        tradeId={selectedTradeId || 0}
        userId={selectedTradeUserId || loggedInUserId}
        onClose={() => {
          setIsDurationModalOpen(false);
          setSelectedTradeId(null);
          setSelectedTradeUserId(null);
        }}
      />

      {/* Deal Brokerage Details Modal */}
      <DealBrkDetailsModal
        isOpen={isDealBrkModalOpen}
        tradeId={selectedTradeId || 0}
        userId={loggedInUserId}
        onClose={() => {
          setIsDealBrkModalOpen(false);
          setSelectedTradeId(null);
        }}
      />

      <ConfirmAlert
        isOpen={alertOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        isLoading={isDeleting}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertOpen(false)}
      />
    </div>
  )
}


// Export plain component for modal use (like ScriptMaster)
export { TradesPage as Trades }

// Export wrapped component for dashboard use with caching
export default withTabCache(TradesPage, { title: 'Trades' })