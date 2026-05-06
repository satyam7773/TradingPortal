import React, { useState, useEffect } from 'react'
import { BarChart3, FileWarning, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import userManagementService from '../../services/userManagementService'
import FilterLayout from '../../components/FilterLayout'

interface RejectionLogData {
  createdAt: string
  rejectedReason: string
  username: string
  tradeBy: string
  tradeSymbol: string
  orderType: string
  quantity: number
  price: number
  ipAddress: string
  deviceId: string
  userId: number
}

interface RejectionResponse {
  rejectedOrders: RejectionLogData[]
  currentPage: number
  totalRecords: number
  totalPages: number
}

interface ExchangeGroup {
  exchange: string;
  symbols: {
    token: number;
    tradeSymbol: string;
  }[];
}

const RejectionLog: React.FC = () => {
  const getLoggedInUserId = (): number => {
    const userDataStr = localStorage.getItem('userData')
    if (userDataStr) {
      const userData = JSON.parse(userDataStr)
      return userData.userId || 31
    }
    return 31
  }

  const loggedInUserId = getLoggedInUserId()
  const today = new Date().toISOString().split('T')[0]

  // Filter States
  const [fromDate, setFromDate] = useState<string>(today)
  const [toDate, setToDate] = useState<string>(today)
  const [selectedUserId, setSelectedUserId] = useState<number>(0)
  const [selectedExchange, setSelectedExchange] = useState<string>('')
  const [selectedToken, setSelectedToken] = useState<string>('')

  // Pagination & Loading States
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [logResponse, setLogResponse] = useState<RejectionResponse | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [symbols, setSymbols] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Load initial data (users and exchanges)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)
        const [usersResponse, exchangesResponse] = await Promise.all([
          userManagementService.fetchOwnUsers(loggedInUserId),
          userManagementService.fetchExchanges()
        ])

        if (usersResponse?.responseCode === '0') setUsers(usersResponse.data)
        if (Array.isArray(exchangesResponse)) setExchanges(exchangesResponse)
      } catch (error) {
        toast.error('Failed to load initial data')
      } finally {
        setInitialLoading(false)
      }
    }
    loadInitialData()
  }, [loggedInUserId])

  useEffect(() => {
  const loadSymbols = async () => {
    try {
      // Determine type based on whether exchange is selected
      const type = selectedExchange ? 'SINGLE' : 'ALL';
      
      const res = await userManagementService.fetchTradeSymbolsReport(type, selectedExchange);
      
      if (res?.responseCode === '0' && Array.isArray(res.data)) {
        // Since the response is grouped by exchange:
        if (selectedExchange) {
          // 1. Find the group that matches the selected exchange
          const exchangeData = res.data.find((item: ExchangeGroup) => item.exchange === selectedExchange);
          // 2. Bind the nested symbols array
          setSymbols(exchangeData ? exchangeData.symbols : []);
        } else {
          // If ALL is selected, flatten all symbols from all exchanges into one list
          const allSymbols = res.data.flatMap((item: ExchangeGroup) => item.symbols);
          setSymbols(allSymbols);
        }
      }
    } catch (error) {
      console.error("Error loading symbols:", error);
      setSymbols([]);
    }
  };

  loadSymbols();
}, [selectedExchange]);

  const handleView = async (page: number = 1) => {
    setLoading(true)
    try {
      const payload = {
        "userId": loggedInUserId,
        data: {
          userId: selectedUserId || 0,
          exchange: selectedExchange || "",
          fromDate,
          toDate,
          token: selectedToken || "",
          limit: pageSize,
          offset: (page - 1) * pageSize
        }
      }

      const response = await userManagementService.fetchRejectionLogs(payload)

      if (response?.responseCode === '0' && response.data) {
        setLogResponse(response.data)
        setCurrentPage(page)
        toast.success(`Found ${response.data.rejectedOrders.length} records`)
      } else {
        setLogResponse(null)
        toast.error(response?.responseMessage || 'No logs found')
      }
    } catch (error) {
      toast.error('Failed to fetch rejection logs')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFromDate(today)
    setToDate(today)
    setSelectedUserId(0)
    setSelectedExchange('')
    setSelectedToken('')
    setLogResponse(null)
    setCurrentPage(1)
  }

  const formatDateTime = (dateStr: string) => {
    return dateStr.replace('T', ' ')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="rejection:showFilters"
          filterWidthClass="lg:w-[22%]"
          filters={
            <div className="space-y-4 p-4">
              {/* Date Range Section - EXACTLY like Orders Page */}
              <div className="space-y-3 pb-4 border-b border-gray-300 dark:border-slate-600">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">From Date :</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">To Date :</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Main Filter Section - EXACTLY like Orders Page */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">User :</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="0">All Users</option>
                    {users.map(user => (
                      <option key={user.userId} value={user.userId}>{user.userName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exchange :</label>
                  <select
                    value={selectedExchange}
                    onChange={(e) => setSelectedExchange(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Exchange</option>
                    {exchanges.map(ex => <option key={ex.name} value={ex.name}>{ex.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Symbol :</label>
                  <select
                    value={selectedToken}
                    onChange={(e) => setSelectedToken(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Symbol</option>
                    {symbols.map(s => <option key={s.token} value={s.token}>{s.tradeSymbol}</option>)}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleView(1)}
                    disabled={loading || initialLoading}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition"
                  >
                    {loading ? '...' : 'View'}
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded font-semibold text-sm transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          }
        >
          {/* Table Container - Style matches Orders page */}
          <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 dark:via-slate-800/80 dark:to-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Rejection Log</h1>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{logResponse?.totalRecords || 0}</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Rejected</div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            ) : !logResponse || logResponse.rejectedOrders.length === 0 ? (
              <div className="flex items-center justify-center flex-1 text-center">
                <FileWarning className="w-16 h-16 mx-auto text-slate-400 mb-3 opacity-30" />
                <p className="text-slate-500 font-medium text-lg">No records found</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 sticky top-0 z-10 border-b-2 border-blue-200 dark:border-blue-500/30">
                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Date & Time</th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Message</th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Username</th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Symbol</th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Qty</th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Device/IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logResponse.rejectedOrders.map((log, index) => (
                        <tr key={index} className="border-b border-slate-200/70 dark:border-slate-700/70 hover:bg-blue-50/80 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-4 py-3.5 text-xs text-slate-500 font-mono tracking-tighter">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-red-600 dark:text-red-400 max-w-xs truncate" title={log.rejectedReason}>
                            {log.rejectedReason}
                          </td>
                          <td className="px-4 py-3.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                            {log.tradeBy}
                            {/* <span className="text-[10px] text-slate-400 block font-normal mt-0.5 tracking-tight">Admin: {log.username}</span> */}
                          </td>
                          <td className="px-4 py-3.5 text-sm font-bold text-blue-600 dark:text-blue-400">{log.tradeSymbol}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${log.orderType.includes('BUY') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {log.orderType}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm font-mono">{log.quantity}</td>
                          <td className="px-4 py-3.5 text-right text-sm font-mono font-bold">₹{log.price.toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-[10px] text-slate-500 leading-tight">
                            {log.deviceId} <br /> {log.ipAddress}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination - Matching LoginHistory logic style */}
                {logResponse.totalPages > 1 && (
                  <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/50 via-blue-50/50 to-white/50 flex items-center justify-between">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                      <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, logResponse.totalRecords)}</span> of {logResponse.totalRecords} records
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 text-sm font-semibold bg-slate-100 rounded-lg">
                        Page {currentPage} of {logResponse.totalPages}
                      </span>
                      <button
                        onClick={() => handleView(currentPage + 1)}
                        disabled={currentPage === logResponse.totalPages}
                        className="p-2 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </FilterLayout>
      </div>
    </div>
  )
}

export default RejectionLog