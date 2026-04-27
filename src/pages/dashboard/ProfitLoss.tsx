import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { TrendingUp, ArrowUpRight, ArrowDownLeft, RotateCcw } from 'lucide-react'
import FilterLayout from '../../components/FilterLayout'
import userManagementService from '../../services/userManagementService'

interface PnLData {
  userId: number
  username: string
  realisedPnl?: number
  m2m?: number
  total?: number
}

interface PnLResponse {
  responseCode: string
  responseMessage: string
  data: PnLData[]
}

const ProfitLoss: React.FC = () => {
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

  const [userFilterType, setUserFilterType] = useState<'ALL' | 'SINGLE'>('ALL')
  const [selectedUserId, setSelectedUserId] = useState<number | string>('')
  const [pnlData, setPnlData] = useState<PnLData[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const autoRefreshIntervalRef = React.useRef<NodeJS.Timeout | null>(null)

  // Load initial data (users)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)
        
        // Fetch own users for dropdown
        const usersResponse = await userManagementService.fetchOwnUsers(loggedInUserId)
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data)
        }
      } catch (error: any) {
        console.error('❌ Error loading initial data:', error)
        toast.error('Failed to load users')
      } finally {
        setInitialLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // Handle auto refresh
  useEffect(() => {
    if (autoRefresh && pnlData.length > 0) {
      // Set up interval for auto-refresh
      autoRefreshIntervalRef.current = setInterval(() => {
        handleView()
      }, 5000) // Refresh every 5 seconds
    } else {
      // Clear interval if auto refresh is disabled
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [autoRefresh, pnlData.length])

  const handleView = async () => {
    setLoading(true)
    
    try {
      let userIdToFetch = loggedInUserId
      let filterType = userFilterType

      // If SINGLE filter is selected and a specific user is chosen
      if (userFilterType === 'SINGLE' && selectedUserId) {
        userIdToFetch = Number(selectedUserId)
      }

      console.log(`📊 Fetching P&L data:`, { userId: userIdToFetch, filterType })

      const response = await userManagementService.fetchProfitAndLoss(userIdToFetch, filterType)

      if (response?.responseCode === '0' && Array.isArray(response.data)) {
        setPnlData(response.data)
        toast.success('P&L data loaded successfully')
      } else if (Array.isArray(response?.data)) {
        // Some endpoints return data directly
        setPnlData(response.data)
        toast.success('P&L data loaded successfully')
      } else {
        toast.error(response?.responseMessage || 'Failed to fetch P&L data')
        setPnlData([])
      }
    } catch (error: any) {
      console.error('❌ Error:', error)
      const errorMessage = error.response?.data?.responseMessage || error.message || 'Failed to fetch P&L data'
      toast.error(errorMessage)
      setPnlData([])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setPnlData([])
    setSelectedUserId('')
    setUserFilterType('ALL')
    setAutoRefresh(false)
  }

  const getPnLColor = (value: number | undefined | null) => {
    const numValue = value ?? 0
    if (numValue > 0) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
    if (numValue < 0) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/30'
  }

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '0.00'
    return Number(value).toFixed(2)
  }

  // Calculate totals
  const totals = {
    totalRealisedPnl: pnlData.reduce((sum, item) => sum + (item.realisedPnl || 0), 0),
    totalM2m: pnlData.reduce((sum, item) => sum + (item.m2m || 0), 0),
    totalPnl: pnlData.reduce((sum, item) => sum + (item.total || 0), 0),
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="profitloss:showFilters"
          filterWidthClass="lg:w-[22%]"
          filters={
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-300 block font-semibold">Filter Type :</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUserFilterType('ALL')}
                    className={`flex-1 px-3 py-2 rounded-lg font-medium text-xs transition-all ${
                      userFilterType === 'ALL'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    ALL
                  </button>
                  <button
                    onClick={() => setUserFilterType('SINGLE')}
                    className={`flex-1 px-3 py-2 rounded-lg font-medium text-xs transition-all ${
                      userFilterType === 'SINGLE'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    SINGLE
                  </button>
                </div>
              </div>

              {userFilterType === 'SINGLE' && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-600 dark:text-slate-300 block font-semibold">Select User :</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300/50 dark:border-slate-600/50 text-sm bg-white/80 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all backdrop-blur-sm font-medium shadow-sm"
                  >
                    <option value="">Select a user...</option>
                    {users
                      .filter(user => user.userId !== 0) // Exclude "All" option for SINGLE filter
                      .map((user) => (
                        <option key={user.userId} value={user.userId}>
                          {user.userName || user.username || 'User'}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* <div className="space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-300 block font-semibold">Auto Refresh :</label>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`w-full px-3 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    autoRefresh
                      ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  {autoRefresh ? 'Enabled (5s)' : 'Disabled'}
                </button>
              </div> */}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleView}
                  disabled={loading || (userFilterType === 'SINGLE' && !selectedUserId)}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-orange-400 disabled:to-orange-400 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wide"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Apply'
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
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    Profit & Loss Report
                  </h2>
                  {pnlData.length > 0 && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Showing {pnlData.length} user{pnlData.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Total Realised P&L</p>
                    <p className={`text-lg font-bold ${getPnLColor(totals.totalRealisedPnl).split(' ')[0]}`}>
                      ₹{formatCurrency(totals.totalRealisedPnl)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Total M2M P&L</p>
                    <p className={`text-lg font-bold ${getPnLColor(totals.totalM2m).split(' ')[0]}`}>
                      ₹{formatCurrency(totals.totalM2m)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 dark:text-slate-400">Total P&L</p>
                    <p className={`text-lg font-bold ${getPnLColor(totals.totalPnl).split(' ')[0]}`}>
                      ₹{formatCurrency(totals.totalPnl)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {initialLoading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">Loading...</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">Fetching P&L data...</p>
                </div>
              </div>
            ) : pnlData.length === 0 ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <TrendingUp className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-3 opacity-50" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">No P&L data available</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Apply filters to view data</p>
                </div>
              </div>
            ) : (
              <>
                {/* Table Container */}
                <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600 scrollbar-track-slate-200 dark:scrollbar-track-slate-800">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-700/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-600">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">
                          Username
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">
                          Realised P&L
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">
                          M2M P&L
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 text-xs uppercase tracking-wider">
                          Total P&L
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                      {pnlData.map((item, index) => (
                        <tr
                          key={index}
                          className="hover:bg-blue-50/50 dark:hover:bg-slate-700/30 transition-colors duration-150 even:bg-slate-50/30 dark:even:bg-slate-800/20"
                        >
                          <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                            {item.username}
                          </td>
                          <td className={`px-6 py-4 text-right font-semibold rounded-lg ${getPnLColor(item.realisedPnl)}`}>
                            ₹{formatCurrency(item.realisedPnl)}
                          </td>
                          <td className={`px-6 py-4 text-right font-semibold rounded-lg ${getPnLColor(item.m2m)}`}>
                            ₹{formatCurrency(item.m2m)}
                          </td>
                          <td className={`px-6 py-4 text-right font-semibold rounded-lg ${getPnLColor(item.total)}`}>
                            ₹{formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                      
                      {/* Totals Row */}
                      <tr className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-bold">
                        <td className="px-6 py-4 text-slate-900 dark:text-white">TOTAL</td>
                        <td className={`px-6 py-4 text-right rounded-lg ${getPnLColor(totals.totalRealisedPnl)}`}>
                          ₹{formatCurrency(totals.totalRealisedPnl)}
                        </td>
                        <td className={`px-6 py-4 text-right rounded-lg ${getPnLColor(totals.totalM2m)}`}>
                          ₹{formatCurrency(totals.totalM2m)}
                        </td>
                        <td className={`px-6 py-4 text-right rounded-lg ${getPnLColor(totals.totalPnl)}`}>
                          ₹{formatCurrency(totals.totalPnl)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </FilterLayout>
      </div>
    </div>
  )
}

export default ProfitLoss
