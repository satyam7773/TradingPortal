import React, { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownLeft, Search, Clock, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import userManagementService from '../../services/userManagementService'
import FilterLayout from '../../components/FilterLayout'
import UserDetailsModal from '../user-management/UserDetailsModal'

interface TradeData {
  tradeId: number
  userId?: number
  username?: string
  tradeSymbol: string
  exchange: string
  side: 'BUY' | 'SELL'
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
  orderType: string
  tradeOrderMethod: string | null
  orderTime: string
  createdAt: string
  tradeDays?: number
  ip: string | null
  deviceId: string | null
  tradeStatus?: string
}

interface TradesResponse {
  responseCode: string
  responseMessage: string
  data: TradeData[]
}

interface UserData {
  id: string
  username: string
  name: string
  type?: 'Client' | 'Master' | 'Admin'
  parent?: string
  credit?: number
  balance?: number
  sharing?: number | null
  parentCredits?: number
  bet?: boolean
  closeOut?: boolean
  margin?: boolean
  status?: boolean
  creditLimit?: boolean
  creditBasedMargin?: boolean
  betEnabled?: boolean
  closeOutEnabled?: boolean
  marginEnabled?: boolean
  statusEnabled?: boolean
  creditLimitEnabled?: boolean
  creditBasedMarginEnabled?: boolean
  createdDate?: string
  ipAddress?: string
  deviceId?: string
  lastLogin?: string
  isActive?: boolean
  isTradeLock?: boolean
}

const Trades: React.FC = () => {
  // Get logged-in user ID from localStorage
  const getLoggedInUserId = (): number => {
    const userDataStr = localStorage.getItem('userData')
    if (userDataStr) {
      const userData = JSON.parse(userDataStr)
      return userData.userId || 31
    }
    return 31
  }

  const loggedInUserId = getLoggedInUserId()

  const [selectedUserId, setSelectedUserId] = useState<number>(loggedInUserId)
  const [selectedExchange, setSelectedExchange] = useState<string>('')
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0])
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [tradesData, setTradesData] = useState<TradeData[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [symbols, setSymbols] = useState<any[]>([])
  const [filteredSymbols, setFilteredSymbols] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const pageSize = 10

  // Load initial data (users and exchanges)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)

        // Fetch own users for dropdown
        const usersResponse = await userManagementService.fetchOwnUsers(loggedInUserId)
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data)
        }

        // Fetch exchanges
        const exchangesResponse = await userManagementService.fetchExchanges()
        if (Array.isArray(exchangesResponse)) {
          setExchanges(exchangesResponse)
          if (exchangesResponse.length > 0) {
            setSelectedExchange(exchangesResponse[0].name)
          }
        }
      } catch (error: any) {
        console.error('❌ Error loading initial data:', error)
        toast.error('Failed to load users and exchanges')
      } finally {
        setInitialLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // Fetch symbols when exchange changes
  useEffect(() => {
    if (!selectedExchange) return

    const fetchSymbolsForExchange = async () => {
      try {
        console.log('🔄 Fetching symbols for exchange:', selectedExchange)
        const symbolsResponse = await userManagementService.fetchSymbols(selectedExchange)
        if (symbolsResponse?.responseCode === '0' && Array.isArray(symbolsResponse.data)) {
          setSymbols(symbolsResponse.data)
          setFilteredSymbols(symbolsResponse.data)
          setSelectedSymbol('')
        }
      } catch (error) {
        console.error('❌ Error fetching symbols:', error)
      }
    }

    fetchSymbolsForExchange()
  }, [selectedExchange])

  const handleView = async () => {
    setLoading(true)
    setCurrentPage(0)

    try {
      // Use selectedUserId if available, otherwise use loggedInUserId
      const userIdToFetch = selectedUserId || loggedInUserId
      console.log(`📊 Fetching trades for user ID: ${userIdToFetch}`)

      // Build request object with only non-empty values
      const requestData: any = {
        from: fromDate,
        to: toDate,
        page: currentPage
      }

      // Only add exchange if it has a value
      if (selectedExchange) {
        requestData.exchange = selectedExchange
      }

      // Only add tradeSymbol if it has a value
      if (selectedSymbol) {
        requestData.tradeSymbol = selectedSymbol
      }

      const response = await userManagementService.fetchTrades(userIdToFetch, requestData)

      if (response?.responseCode === '0') {
        setTradesData(response.data?.content || response.data || [])
        // Extract pagination info from response
        setCurrentPage(response.data?.currentPage || 0)
        setTotalPages(response.data?.totalPages || 1)
        setTotalRecords(response.data?.totalRecords || tradesData.length)
        toast.success('Trades loaded successfully')
      } else {
        toast.error(response?.responseMessage || 'Failed to fetch trades')
        setTradesData([])
        setTotalPages(0)
        setTotalRecords(0)
      }
    } catch (error: any) {
      console.error('❌ Error:', error)
      const errorMessage = error.response?.data?.responseMessage || error.message || 'Failed to fetch trades'
      toast.error(errorMessage)
      setTradesData([])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFromDate(new Date().toISOString().split('T')[0])
    setToDate(new Date().toISOString().split('T')[0])
    setSelectedExchange(exchanges.length > 0 ? exchanges[0].name : '')
    setSelectedSymbol('')
    setTradesData([])
    setCurrentPage(0)
    setTotalPages(0)
    setTotalRecords(0)
  }

  const handlePageChange = async (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage)
      
      try {
        const userIdToFetch = selectedUserId || loggedInUserId
        
        const requestData: any = {
          from: fromDate,
          to: toDate,
          page: newPage
        }

        if (selectedExchange) {
          requestData.exchange = selectedExchange
        }

        if (selectedSymbol) {
          requestData.tradeSymbol = selectedSymbol
        }

        setLoading(true)
        const response = await userManagementService.fetchTrades(userIdToFetch, requestData)

        if (response?.responseCode === '0') {
          setTradesData(response.data?.content || response.data || [])
          setCurrentPage(response.data?.currentPage || newPage)
          setTotalPages(response.data?.totalPages || totalPages)
          setTotalRecords(response.data?.totalRecords || totalRecords)
        } else {
          toast.error('Failed to fetch trades for this page')
        }
      } catch (error: any) {
        console.error('Error fetching trades:', error)
        toast.error('Error loading trades')
      } finally {
        setLoading(false)
      }
    }
  }

  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return '-'
    try {
      // Parse ISO string - API returns times without Z, so we assume IST
      const date = new Date(dateTimeStr + 'Z') // Add Z to indicate UTC, then formatter will convert to IST
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      })
    } catch (e) {
      return dateTimeStr
    }
  }

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
    if (pnl < 0) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/30'
  }

  const getSideIcon = (side: string) => {
    if (side === 'BUY') {
      return <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    }
    return <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
  }

  const handleToggle = async (userId: string, field: 'bet' | 'closeOut' | 'margin' | 'status' | 'creditLimit' | 'creditBasedMargin') => {
    // This handler is for UserDetailsModal's toggle functionality
    console.log(`Toggle ${field} for user ${userId}`)
  }

  const handleUserNameClick = async (username: string, userId?: number) => {
    if (!userId) return
    
    try {
      // Fetch full user details using userId
      const response = await userManagementService.fetchUserDetails(userId)
      if (response?.responseCode === '0' && response.data) {
        const userData = response.data
        setSelectedUser({
          id: userData.id || userId.toString(),
          username: userData.username || username,
          name: userData.name || userData.username || username || 'Unknown',
          type: userData.type,
          parent: userData.parent,
          credit: userData.credit,
          balance: userData.balance,
          sharing: userData.sharing,
          parentCredits: userData.parentCredits,
          bet: userData.bet,
          closeOut: userData.closeOut,
          margin: userData.margin,
          status: userData.status,
          creditLimit: userData.creditLimit,
          creditBasedMargin: userData.creditBasedMargin,
          betEnabled: userData.betEnabled,
          closeOutEnabled: userData.closeOutEnabled,
          marginEnabled: userData.marginEnabled,
          statusEnabled: userData.statusEnabled,
          creditLimitEnabled: userData.creditLimitEnabled,
          creditBasedMarginEnabled: userData.creditBasedMarginEnabled,
          createdDate: userData.createdDate,
          ipAddress: userData.ipAddress,
          deviceId: userData.deviceId,
          lastLogin: userData.lastLogin,
          isActive: userData.isActive,
          isTradeLock: userData.isTradeLock
        })
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
      toast.error('Failed to fetch user details')
    }
  }

  const stats = {
    totalTrades: tradesData.length,
    buyTrades: tradesData.filter(t => t.side === 'BUY').length,
    sellTrades: tradesData.filter(t => t.side === 'SELL').length,
    totalPnL: tradesData.reduce((sum, t) => sum + (t.realisedPnl || 0), 0),
  }

  const getUserDisplay = () => {
    if (!selectedUserId) return 'All Users'
    const user = users.find(u => u.userId === selectedUserId)
    return user?.username || user?.name || 'Unknown'
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="trades:showFilters"
          filterWidthClass="lg:w-[22%]"
          filters={
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-300 block font-semibold">From :</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300/50 dark:border-slate-600/50 text-sm bg-white/80 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all backdrop-blur-sm font-medium shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-300 block font-semibold">To :</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300/50 dark:border-slate-600/50 text-sm bg-white/80 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all backdrop-blur-sm font-medium shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-300 block font-semibold">Username :</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    if (e.target.value === '' || e.target.value === 'all') {
                      setSelectedUserId(loggedInUserId)
                    } else {
                      setSelectedUserId(parseInt(e.target.value))
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300/50 dark:border-slate-600/50 text-sm bg-white/80 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all backdrop-blur-sm font-medium shadow-sm"
                >
                  <option value="all">All Users</option>
                  {users.map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {user.userName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-300 block font-semibold">Exchange :</label>
                <select
                  value={selectedExchange}
                  onChange={(e) => setSelectedExchange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300/50 dark:border-slate-600/50 text-sm bg-white/80 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all backdrop-blur-sm font-medium shadow-sm"
                >
                  <option value="">All Exchanges</option>
                  {exchanges.map((exchange) => (
                    <option key={exchange.name} value={exchange.name}>
                      {exchange.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-300 block font-semibold">Symbols :</label>
                <input
                  type="text"
                  placeholder="Search symbols..."
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300/50 dark:border-slate-600/50 text-sm bg-white/80 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all backdrop-blur-sm font-medium shadow-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleView}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-orange-400 disabled:to-orange-400 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wide"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      View
                    </>
                  )}
                </button>

                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wide"
                >
                  Clear
                </button>
              </div>
            </div>
          }
        >
          {/* Table Container */}
          <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 dark:via-slate-800/80 dark:to-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Trades</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    {getUserDisplay()} • <span className="text-blue-600 dark:text-blue-400 font-semibold">{fromDate} to {toDate}</span>
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalTrades}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Total Trades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.buyTrades}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Buy Trades</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.sellTrades}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Sell Trades</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {Math.abs(stats.totalPnL).toFixed(0)}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Total P&L</div>
                  </div>
                </div>
              </div>
            </div>

            {initialLoading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-500 border-t-blue-500 dark:border-t-blue-300 mx-auto"></div>
                  <p className="mt-4 text-slate-700 dark:text-slate-300 font-medium">Loading users...</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-500 border-t-blue-500 dark:border-t-blue-300 mx-auto"></div>
                  <p className="mt-4 text-slate-700 dark:text-slate-300 font-medium">Fetching trades...</p>
                </div>
              </div>
            ) : tradesData.length === 0 ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-3 opacity-50" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">No trades found</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Click "View Trades" to load data</p>
                </div>
              </div>
            ) : (
              <>
                {/* Table Container */}
                <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600 scrollbar-track-slate-200 dark:scrollbar-track-slate-800">
                  <table className="w-full border-collapse">
                    <colgroup>
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '140px' }} />
                      <col style={{ width: '70px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '160px' }} />
                      <col style={{ width: '80px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 sticky top-0 z-10 border-b-2 border-blue-200 dark:border-blue-500/30">
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">S.No</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Username</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Symbol</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Exchange</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Side</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Net Qty</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Lot Value</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Ref Price</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">P&L</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Brokerage</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Method</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Exec Time</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradesData.map((trade, index) => (
                        <tr 
                          key={trade.tradeId} 
                          className="border-b border-slate-200/70 dark:border-slate-700/70 hover:bg-blue-50/80 dark:hover:bg-slate-700/50 transition-colors duration-150 group"
                        >
                            <td className="px-4 py-3.5 text-center text-sm text-slate-700 dark:text-slate-300 font-semibold">
                            {index + 1}
                          </td>
                          <td 
                            className="px-4 py-3.5 text-left text-sm font-semibold text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer transition-colors"
                            onClick={() => handleUserNameClick(trade.username || '', trade.userId)}
                          >
                            {trade.username || '-'}
                          </td>
                        
                          <td className="px-4 py-3.5 text-left text-sm font-bold text-slate-900 dark:text-slate-100">
                            {trade.tradeSymbol}
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm">
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-500/50 text-purple-700 dark:text-purple-200 rounded text-xs font-bold uppercase tracking-wide">
                              {trade.exchange || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm">
                            <div className="flex items-center justify-center gap-2">
                              {getSideIcon(trade.side)}
                              <span className={`font-bold ${trade.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {trade.side}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm text-slate-700 dark:text-slate-300 font-medium">
                            {trade.actualLotSize || trade.netQuantity || trade.lotSize || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm text-slate-800 dark:text-slate-200 font-semibold">
                            {trade.actualLotValue && trade.actualLotValue > 0 ? trade.actualLotValue.toFixed(0) : (trade.lotValue && trade.lotValue > 0 ? trade.lotValue.toFixed(0) : '-')}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm text-slate-800 dark:text-slate-200 font-semibold">
                            {trade.price && trade.price > 0 ? `${trade.price.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm text-slate-700 dark:text-slate-300 font-medium">
                            {trade.referencePrice && trade.referencePrice > 0 ? `${trade.referencePrice.toFixed(2)}` : '-'}
                          </td>
                          <td className={`px-4 py-3.5 text-right text-sm font-bold rounded-lg ${trade.realisedPnl !== undefined && trade.realisedPnl !== 0 ? getPnLColor(trade.realisedPnl) : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/30'}`}>
                            {trade.realisedPnl !== undefined ? (trade.realisedPnl !== 0 ? `${trade.realisedPnl >= 0 ? '+' : ''}${trade.realisedPnl.toFixed(2)}` : '₹0.00') : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm text-slate-700 dark:text-slate-300 font-medium">
                            {trade.brokerage && trade.brokerage > 0 ? `${trade.brokerage.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm">
                            <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-500/50 text-blue-700 dark:text-blue-200 rounded-md text-xs font-bold uppercase tracking-wide">
                              {trade.orderType || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                              !trade.tradeOrderMethod
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                : trade.tradeOrderMethod === 'ANDROID' 
                                ? 'bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-500/50 text-green-700 dark:text-green-200' 
                                : trade.tradeOrderMethod === 'WEB'
                                ? 'bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-500/50 text-orange-700 dark:text-orange-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {trade.tradeOrderMethod || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-left text-sm text-slate-600 dark:text-slate-400">
                            <div className="whitespace-nowrap">{formatDateTime(trade.orderTime)}</div>
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm text-slate-700 dark:text-slate-300 font-medium">
                            {trade.tradeDays}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </FilterLayout>
      </div>
      
      {/* User Details Modal */}
      {selectedUser && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-50 animate-fadeIn"
          style={{ zIndex: 9999 }}
          onClick={() => setSelectedUser(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col border border-gray-200/50 dark:border-slate-700/50 overflow-hidden transform transition-all duration-300"
            style={{ width: '98vw', height: '96vh', maxWidth: '900px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <UserDetailsModal 
              user={selectedUser}
              onClose={() => setSelectedUser(null)}
              onToggle={handleToggle}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Trades
