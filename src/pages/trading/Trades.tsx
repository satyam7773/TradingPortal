import React, { useState, useEffect, useRef } from 'react'
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
  dealAmount: number
  orderType: string
  tradeOrderMethod: string | null
  orderTime: string
  createdAt: string
  tradeDays?: number
  ip: string | null
  deviceId: string | null
  tradeStatus?: string
  ipAddress?: string
  durationSeconds?: any
}

// Fixed UserData interface to match Modal expectations
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

// Trackers to stop double-firing and race conditions
let lastClickTime = 0;
let lastProcessedId: number | null = null;

const Trades: React.FC = () => {
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

  const today = new Date();
  const [fromDate, setFromDate] = useState<string>(today.toLocaleDateString('en-CA'));
  const [toDate, setToDate] = useState<string>(today.toLocaleDateString('en-CA'));

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [tradesData, setTradesData] = useState<TradeData[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const pageSize = 10

  const isFetchingRef = useRef(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)
        const usersResponse = await userManagementService.fetchOwnUsers(loggedInUserId)
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data)
        }
        const exchangesResponse = await userManagementService.fetchExchanges()
        if (Array.isArray(exchangesResponse)) {
          setExchanges(exchangesResponse)
          if (exchangesResponse.length > 0) {
            setSelectedExchange(exchangesResponse[0].name)
          }
        }
      } catch (error: any) {
        toast.error('Failed to load metadata')
      } finally {
        setInitialLoading(false)
      }
    }
    loadInitialData()
  }, [])

  useEffect(() => {
    if (!initialLoading && exchanges.length > 0 && selectedExchange) {
      handleView(0);
    }
  }, [initialLoading, exchanges]);

  const handleView = async (page: number = 0) => {
    setLoading(true)
    try {
      const requestData: any = {
        from: fromDate,
        to: toDate,
        page: page,
        size: pageSize,
        userId: selectedUserId
      }
      if (selectedExchange && selectedExchange !== 'All Exchanges') requestData.exchange = selectedExchange
      if (selectedSymbol) requestData.tradeSymbol = selectedSymbol

      const response = await userManagementService.fetchTrades(loggedInUserId, requestData)

      if (response?.responseCode === '0') {
        const tradesList = response.data?.trades || response.data?.content || []
        setTradesData(tradesList)
        setTotalRecords(response.data?.size || 0)
        setTotalPages(Math.ceil((response.data?.size || 0) / pageSize))
        setCurrentPage(page)
      }
    } catch (error: any) {
      setTradesData([])
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      handleView(newPage)
    }
  }

  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return '-'
    try {
      const date = new Date(dateTimeStr + 'Z')
      return date.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
      })
    } catch (e) { return dateTimeStr }
  }

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
    if (pnl < 0) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/30'
  }

  const getSideIcon = (side: string) => {
    if (side === 'BUY') return <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    return <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
  }

  /**
   * FIXED: This function now passes a simple placeholder object to the Modal.
   * The Modal will see the 'id' and trigger its internal fetch automatically.
   */
  const handleUserNameClick = (e: React.MouseEvent, username: string, userId: number | undefined | null) => {
    e.preventDefault();
    e.stopPropagation();

    const currentTime = Date.now();

    // 1. Guard against null ID or rapid double-click
    if (!userId || userId === 0 || (lastProcessedId === userId && currentTime - lastClickTime < 800)) {
      return;
    }

    const userDataStr = localStorage.getItem('userData');
    const loggedInUser = userDataStr ? JSON.parse(userDataStr) : null;
    if (loggedInUser?.roleId === 4) return;

    lastClickTime = currentTime;
    lastProcessedId = userId;

    // 2. We do NOT fetch details here. We just set the user object with the ID.
    // The Modal component's own useEffect will handle the fetching using this ID.
    const placeholderUser: any = {
      id: userId.toString(),
      username: username,
      name: username,
      isActive: true
    };

    setSelectedUser(placeholderUser);
  };

  const stats = {
    totalTrades: totalRecords,
    buyTrades: tradesData.filter(t => t.side === 'BUY').length,
    sellTrades: tradesData.filter(t => t.side === 'SELL').length,
    totalPnL: tradesData.reduce((sum, t) => sum + (t.realisedPnl || 0), 0),
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="trades:showFilters"
          filterWidthClass="lg:w-[22%]"
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
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Username :</label>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(parseInt(e.target.value))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500">
                  {users.map((user) => (<option key={user.userId} value={user.userId}>{user.userName}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exchange :</label>
                <select value={selectedExchange} onChange={(e) => setSelectedExchange(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500">
                  {exchanges.map((ex) => (<option key={ex.name} value={ex.name}>{ex.name}</option>))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleView(0)} disabled={loading} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition shadow-md">View</button>
                <button onClick={() => { }} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded font-semibold text-sm transition">Clear</button>
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
                <div className="grid grid-cols-4 gap-6 text-center">
                  <div><div className="text-2xl font-bold text-slate-900 dark:text-white">{totalRecords}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total</div></div>
                  <div><div className="text-2xl font-bold text-blue-600">{stats.buyTrades}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Buy</div></div>
                  <div><div className="text-2xl font-bold text-red-600">{stats.sellTrades}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Sell</div></div>
                  {/* <div><div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{stats.totalPnL.toFixed(0)}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">P&L</div></div> */}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto min-h-0 scrollbar-thin">
              <table className="w-full border-collapse min-w-max">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 border-b-2 border-blue-100 dark:border-blue-900">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Execution Time</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Username</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Brk</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Others</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Deal</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Order Time</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">IP Address</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Device ID</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Reference Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {tradesData.map((trade) => {
                    // Define the theme color based on the side (BUY vs SELL)
                    const tradeColorClass = trade.side === 'BUY' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';

                    return (
                      <tr key={trade.tradeId} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 text-left text-xs text-slate-500 whitespace-nowrap">{formatDateTime(trade.orderTime)}</td>
                        <td className="px-6 py-4 text-left whitespace-nowrap">
                          <span
                            className="text-sm font-semibold text-blue-600 underline cursor-pointer hover:text-blue-800 transition-colors"
                            onClick={(e) => handleUserNameClick(e, trade.username || '', trade.userId)}
                          >
                            {trade.username}
                          </span>
                        </td>

                        {/* SYMBOL - Now using tradeColorClass */}
                        <td className="px-6 py-4 text-left">
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold ${tradeColorClass}`}>{trade.tradeSymbol}</span>
                            <span className="text-[10px] text-purple-600 font-bold uppercase">{trade.exchange}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs font-bold ${tradeColorClass}`}>
                            {trade.side === 'BUY' ? 'Buy' : 'Sell'}
                          </span>
                        </td>

                        {/* QUANTITY - Now using tradeColorClass */}
                        <td className={`px-6 py-4 text-center text-sm font-bold ${tradeColorClass}`}>
                          {trade.actualLotSize || trade.lotSize}
                        </td>

                        {/* PRICE - Now using tradeColorClass */}
                        <td className={`px-6 py-4 text-right text-sm font-mono font-bold ${tradeColorClass}`}>
                          {trade.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-6 py-4 text-right text-sm font-mono text-slate-600 dark:text-slate-400">
                          {trade.brokerage}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-mono text-slate-600 dark:text-slate-400">0</td>

                        {/* DEAL (PnL) - Kept as Emerald/Red based on Profit/Loss */}
                        <td className={`px-6 py-4 text-right text-sm font-mono font-bold ${trade.realisedPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {trade.realisedPnl?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="text-xs text-slate-500 underline decoration-slate-300">
                            {trade.durationSeconds && trade.durationSeconds > 0
                              ? trade.durationSeconds >= 3600
                                ? `${Math.floor(trade.durationSeconds / 3600)}h ${Math.floor((trade.durationSeconds % 3600) / 60)}m`
                                : `${Math.floor(trade.durationSeconds / 60)} minutes`
                              : 'Less than a minute'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left text-xs text-slate-500 whitespace-nowrap">{formatDateTime(trade.orderTime)}</td>
                        <td className="px-6 py-4 text-left text-xs text-slate-400 font-mono">{trade.ipAddress || '127.0.0.1'}</td>
                        <td className="px-6 py-4 text-left text-xs text-slate-400 truncate max-w-[120px]">{trade.deviceId || '-'}</td>
                        <td className="px-6 py-4 text-right text-xs text-slate-500 font-mono">{trade.referencePrice || '-'}</td>
                      </tr>
                    );
                  })}


                </tbody>
              </table>
            </div>

            <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700">
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
    </div>
  )
}

export default Trades