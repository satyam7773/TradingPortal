import React, { useState, useEffect, useMemo } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import userManagementService from '../../services/userManagementService'
import FilterLayout from '../../components/FilterLayout'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { useSorting } from '../../hooks/useSorting'

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
  exchange: string
  symbols: {
    token: number
    tradeSymbol: string
  }[]
}

interface RejectionLogProps {
  username?: string
  userId?: string | number
  roleId?: string
  user?: any
}

const RejectionLog: React.FC<RejectionLogProps> = ({
  username,
  userId: propsUserId,
  roleId,
  user: userDetails
}) => {
  // Detect if in modal mode based on presence of userDetails
  const isModalMode = !!userDetails

  // Get logged in user info
  const userDataStr = localStorage.getItem('userData')
  const userData = userDataStr ? JSON.parse(userDataStr) : null
  const loggedInUserId = userData?.userId || 31
  const today = new Date().toLocaleDateString('en-CA')

  // Filter States
  const [filters, setFilters] = useState({
    fromDate: today,
    toDate: today,
    selectedUserId: isModalMode ? propsUserId || 0 : 0,
    selectedExchange: '',
    selectedToken: ''
  })

  const [rejectionLogs, setRejectionLogs] = useState<RejectionLogData[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [logResponse, setLogResponse] = useState<RejectionResponse | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [symbols, setSymbols] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Sorting
  const { sortColumn, sortDirection, handleSort, sortedData, getSortIcon } = useSorting({ data: rejectionLogs })

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const userOptions = useMemo(() => [
    ...users.map(u => ({ id: u.userId, name: u.userName }))
  ], [users])

  const exchangeOptions = useMemo(() => [
    ...exchanges.map(e => ({ id: e.name, name: e.name }))
  ], [exchanges])

  const symbolOptions = useMemo(() => [
    ...symbols.map(s => ({ id: s.token, name: s.tradeSymbol || s }))
  ], [symbols])

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)

        const [usersResponse, exchangesResponse] = await Promise.all([
          userManagementService.fetchOwnUsersforOrders(loggedInUserId),
          userManagementService.fetchExchanges()
        ])

        if (usersResponse?.responseCode === '0') setUsers(usersResponse.data)

        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse)
          const defaultExchange = exchangesResponse[0].name
          setFilters((prev) => ({ ...prev, selectedExchange: defaultExchange }))

          // Fetch symbols for default exchange
          const symbolsResponse = await userManagementService.fetchTradeSymbolsReport('SINGLE', defaultExchange)
          if (symbolsResponse?.responseCode === '0' && Array.isArray(symbolsResponse.data)) {
            const exchangeData = symbolsResponse.data.find(
              (item: ExchangeGroup) => item.exchange === defaultExchange
            )
            setSymbols(exchangeData ? exchangeData.symbols : [])
          }
        }
      } catch (error) {
        console.error('Error loading initial data:', error)
        toast.error('Failed to load initial data')
      } finally {
        setInitialLoading(false)
      }
    }

    loadInitialData()
  }, [loggedInUserId])

  // Load symbols when exchange changes
  useEffect(() => {
    const loadSymbols = async () => {
      if (!filters.selectedExchange) return

      try {
        const res = await userManagementService.fetchTradeSymbolsReport('SINGLE', filters.selectedExchange)

        if (res?.responseCode === '0' && Array.isArray(res.data)) {
          const exchangeData = res.data.find((item: ExchangeGroup) => item.exchange === filters.selectedExchange)
          setSymbols(exchangeData ? exchangeData.symbols : [])
        }
      } catch (error) {
        console.error('Error loading symbols:', error)
        setSymbols([])
      }
    }

    loadSymbols()
  }, [filters.selectedExchange])

  // Auto-load for modal mode
  useEffect(() => {
    if (isModalMode && !initialLoading && filters.selectedExchange) {
      handleFetchLogs(1)
    }
  }, [isModalMode, initialLoading, filters.selectedExchange])

  // Fetch rejection logs
  const handleFetchLogs = async (page: number = 1) => {
    if (!loggedInUserId) return

    setLoading(true)
    try {
      const targetUserId = isModalMode ? propsUserId : filters.selectedUserId || loggedInUserId

      const response = await userManagementService.fetchRejectionLogs({
        userId: loggedInUserId,
        data: {
          userId: targetUserId,
          exchange: filters.selectedExchange || '',
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          token: filters.selectedToken || '',
          limit: pageSize,
          offset: (page - 1) * pageSize
        }
      })

      if (response?.responseCode === '0' && response.data) {
        setRejectionLogs(response.data.rejectedOrders || [])
        setLogResponse(response.data)
        setCurrentPage(page)
      } else {
        setRejectionLogs([])
        setLogResponse(null)
        toast.error(response?.responseMessage || 'No logs found')
      }
    } catch (error) {
      console.error('Error fetching rejection logs:', error)
      toast.error('Error fetching rejection logs')
      setRejectionLogs([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleClearFilters = () => {
    const defaultExchange = exchanges.length > 0 ? exchanges[0].name : ''
    setFilters({
      fromDate: today,
      toDate: today,
      selectedUserId: isModalMode ? propsUserId || 0 : 0,
      selectedExchange: defaultExchange,
      selectedToken: ''
    })
    setRejectionLogs([])
    setLogResponse(null)
    setCurrentPage(1)
  }

  return (
    <FilterLayout
      filterWidthClass="lg:w-[16%]"
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Rejection Logs
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {logResponse?.totalRecords || 0} rejections found
              </p>
            </div>
          </div>
        </div>
      }
      filters={
        <>
          <div className="space-y-4">
            {/* From Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                From
              </label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                To
              </label>
              <input
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Username - Only in standalone mode */}
            {!isModalMode && (
              <SearchableSelect
                label="Username :"
                items={userOptions}
                selectedId={filters.selectedUserId}
                onSelect={(userId) => handleFilterChange('selectedUserId', Number(userId))}
                placeholder="Search user..."
              />
            )}

            {/* Exchange */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Exchange
              </label>
              <select
                value={filters.selectedExchange}
                onChange={(e) => handleFilterChange('selectedExchange', e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {exchanges.map((ex) => (
                  <option key={ex.name} value={ex.name}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Symbol */}
            <SearchableSelect
              label="Symbol :"
              items={symbolOptions}
              selectedId={filters.selectedToken}
              onSelect={(id) => handleFilterChange('selectedToken', String(id))}
              placeholder="Search symbol..."
            />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleFetchLogs(1)}
                disabled={loading || initialLoading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-200 text-sm font-semibold shadow-lg disabled:opacity-60"
              >
                {loading ? 'Loading...' : 'View'}
              </button>
              <button
                onClick={handleClearFilters}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-all duration-200 text-sm font-semibold"
              >
                Clear
              </button>
            </div>
          </div>
        </>
      }
    >
      <div className="flex-1 overflow-auto flex flex-col">
        <div className="flex-1 flex flex-col bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg overflow-hidden">
          <div className="flex-1 overflow-auto min-h-0 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <AlertCircle className="w-16 h-16 mx-auto text-slate-400 mb-3 opacity-30" />
                  <p className="text-slate-500 font-medium text-lg">No rejection logs found</p>
                </div>
              </div>
            ) : (
              <table className="w-full border-collapse min-w-max">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 to-amber-100 dark:from-slate-700 dark:to-slate-600 border-b border-gray-200/50 dark:border-slate-600/50">
                    <th
                      className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-2">Date & Time {getSortIcon('createdAt')}</div>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                      onClick={() => handleSort('rejectedReason')}
                    >
                      <div className="flex items-center gap-2">Reason {getSortIcon('rejectedReason')}</div>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                      onClick={() => handleSort('tradeBy')}
                    >
                      <div className="flex items-center gap-2">Username {getSortIcon('tradeBy')}</div>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                      onClick={() => handleSort('tradeSymbol')}
                    >
                      <div className="flex items-center gap-2">Symbol {getSortIcon('tradeSymbol')}</div>
                    </th>
                    <th
                      className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[100px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                      onClick={() => handleSort('orderType')}
                    >
                      <div className="flex items-center justify-center gap-2">Type {getSortIcon('orderType')}</div>
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                      onClick={() => handleSort('quantity')}
                    >
                      <div className="flex items-center justify-end gap-2">Quantity {getSortIcon('quantity')}</div>
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center justify-end gap-2">Price {getSortIcon('price')}</div>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      Device/IP
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((log, idx) => {
                    const isBuy = log.orderType.includes('BUY')
                    const sideColorClass = isBuy
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'

                    return (
                      <tr
                        key={idx}
                        className="border-b border-gray-200/50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-500 max-w-xs truncate" title={log.rejectedReason}>
                          {log.rejectedReason}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                          {log.tradeBy}
                        </td>
                        <td className={`px-4 py-3 text-sm font-bold ${sideColorClass}`}>
                          {log.tradeSymbol}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block py-1 px-2 rounded text-[10px] font-bold ${
                              isBuy
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            }`}
                          >
                            {log.orderType}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${sideColorClass}`}>
                          {log.quantity}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${sideColorClass}`}>
                          ₹{log.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-[10px] text-slate-700 dark:text-slate-300 leading-tight">
                          {log.deviceId}
                          <br />
                          {log.ipAddress}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {(currentPage - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {Math.min(currentPage * pageSize, sortedData.length)}
                </span>{' '}
                of {sortedData.length} records
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFetchLogs(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handleFetchLogs(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </FilterLayout>
  )
}

export default RejectionLog