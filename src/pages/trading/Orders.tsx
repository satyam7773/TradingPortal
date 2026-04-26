import React, { useState, useEffect } from 'react'
import { Search, BarChart3, ChevronLeft, ChevronRight, Trash2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import userManagementService from '../../services/userManagementService'
import FilterLayout from '../../components/FilterLayout'
import UserDetailsModal from '../user-management/UserDetailsModal'

interface OrderData {
  brk: number
  deviceId: string | null
  exchange: string
  ipAddress: string
  orderId: number
  orderLimitType: string
  orderMethod: string
  orderTime: string 
  price: number
  quantity: number
  referencePrice: number
  tradeSymbol: string
  userId: number
  userName: string
}

interface OrdersResponse {
  limit: number
  offset: number
  orders: OrderData[]
  size: number
}

interface UserData {
  id: string
  username: string
  name: string
  type: 'Client' | 'Master' | 'Admin'
  parent: string
  credit: number
  balance: number
  sharing: number | null
  parentCredits?: number
  bet: boolean
  closeOut: boolean
  margin: boolean
  status: boolean
  creditLimit: boolean
  creditBasedMargin: boolean
  betEnabled: boolean
  closeOutEnabled: boolean
  marginEnabled: boolean
  statusEnabled: boolean
  creditLimitEnabled: boolean
  creditBasedMarginEnabled: boolean
  createdDate: string
  ipAddress: string
  deviceId: string
  lastLogin: string
}

const Orders: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<number>(0)
  const [selectedExchange, setSelectedExchange] = useState<string>('')
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0])
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [ordersData, setOrdersData] = useState<OrdersResponse | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [symbols, setSymbols] = useState<any[]>([])
  const [filteredSymbols, setFilteredSymbols] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)

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

  // Load initial data (users and exchanges)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)

        // Fetch own users for dropdown
        const usersResponse = await userManagementService.fetchOwnUsers(loggedInUserId)
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data)
          // Set default to first user
          if (usersResponse.data.length > 0) {
            setSelectedUserId(usersResponse.data[0].userId)
          }
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

  const handleFetchOrders = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please select both from and to dates')
      return
    }

    setLoading(true)

    try {
      const response = await userManagementService.fetchOrders(
        loggedInUserId,
        {
          limit: pageSize,
          offset: currentPage * pageSize,
          fromDate,
          toDate,
          tradeSymbol: selectedSymbol,
          exchange: selectedExchange,
          userId: selectedUserId
        }
      )

      if (response?.responseCode === '0' && response?.data) {
        setOrdersData(response.data)
        toast.success(`Orders loaded successfully (Total: ${response.data.size})`)
      } else {
        toast.error(response?.responseMessage || 'Failed to fetch orders')
        setOrdersData(null)
      }
    } catch (error: any) {
      console.error('❌ Error:', error)
      const errorMessage = error.response?.data?.responseMessage || error.message || 'Failed to fetch orders'
      toast.error(errorMessage)
      setOrdersData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setSelectedUserId(users.length > 0 ? users[0].userId : 0)
    setSelectedExchange(exchanges.length > 0 ? exchanges[0].name : '')
    setSelectedSymbol('')
    setFromDate(new Date().toISOString().split('T')[0])
    setToDate(new Date().toISOString().split('T')[0])
    setCurrentPage(0)
    setOrdersData(null)
    setSelectedOrders(new Set())
  }

  const handleSelectOrder = (orderId: number) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const handleSelectAll = () => {
    if (!ordersData) return
    if (selectedOrders.size === ordersData.orders.length) {
      setSelectedOrders(new Set())
    } else {
      const allOrderIds = new Set(ordersData.orders.map(order => order.orderId))
      setSelectedOrders(allOrderIds)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedOrders.size === 0) return
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedOrders.size} selected order(s)?`)
    if (!confirmed) return

    try {
      setLoading(true)
      const orderIdsToDelete = Array.from(selectedOrders)
      console.log('🗑️ Deleting orders:', orderIdsToDelete)
      
      // Call API to cancel multiple orders
      const response = await userManagementService.cancelMultipleOrders(loggedInUserId, orderIdsToDelete)
      
      if (response?.responseCode === '0' || response?.status === 'success') {
        // Update local state after successful API call
        if (ordersData) {
          const updatedOrders = ordersData.orders.filter(o => !selectedOrders.has(o.orderId))
          setOrdersData({
            ...ordersData,
            orders: updatedOrders,
            size: updatedOrders.length
          })
        }
        
        setSelectedOrders(new Set())
        toast.success(`Successfully deleted ${orderIdsToDelete.length} order(s)`)
      } else {
        toast.error(response?.responseMessage || 'Failed to delete orders')
      }
    } catch (error: any) {
      console.error('❌ Error deleting orders:', error)
      const errorMessage = error.response?.data?.responseMessage || error.message || 'Failed to delete selected orders'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleProceedToSuccess = async () => {
    if (selectedOrders.size === 0) return
    
    const confirmed = window.confirm(`Are you sure you want to mark ${selectedOrders.size} selected order(s) as success?`)
    if (!confirmed) return

    try {
      setLoading(true)
      const orderIdsToProcess = Array.from(selectedOrders)
      console.log('✅ Proceeding to success:', orderIdsToProcess)
      
      setSelectedOrders(new Set())
      toast.success(`Successfully processed ${orderIdsToProcess.length} order(s)`)
    } catch (error: any) {
      console.error('❌ Error processing orders:', error)
      toast.error('Failed to process selected orders')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    // Placeholder for toggle functionality if needed
  }

  const handleUserClick = (order: OrderData) => {
    // Create a minimal user object from order data to pass to modal
    const userData: UserData = {
      id: order.userId.toString(),
      username: order.userName,
      name: order.userName,
      type: 'Client',
      parent: '',
      credit: 0,
      balance: 0,
      sharing: null,
      bet: false,
      closeOut: false,
      margin: false,
      status: true,
      creditLimit: false,
      creditBasedMargin: false,
      betEnabled: false,
      closeOutEnabled: false,
      marginEnabled: false,
      statusEnabled: false,
      creditLimitEnabled: false,
      creditBasedMarginEnabled: false,
      createdDate: '',
      ipAddress: order.ipAddress || '',
      deviceId: order.deviceId || '',
      lastLogin: order.orderTime || ''
    }
    setSelectedUser(userData)
  }

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    } catch {
      return dateStr
    }
  }

  const stats = {
    totalOrders: ordersData?.size || 0,
    totalQuantity: ordersData?.orders.reduce((sum, o) => sum + o.quantity, 0) || 0,
    totalValue: ordersData?.orders.reduce((sum, o) => sum + (o.price * o.quantity), 0) || 0,
  }

  const totalPages = ordersData ? Math.ceil(ordersData.size / pageSize) : 0

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="orders:showFilters"
          filterWidthClass="lg:w-[22%]"
          filters={
            <div className="space-y-4 p-4">
              {/* Date Range Section */}
              <div className="space-y-3 pb-4 border-b border-gray-300 dark:border-slate-600">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">From Date :</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    max={new Date().toLocaleDateString('en-CA')}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">To Date :</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    max={new Date().toLocaleDateString('en-CA')}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Main Filter Section */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">User :</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {users.map(user => (
                      <option key={user.userId} value={user.userId}>
                        {user.userName}
                      </option>
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
                    <option value="">All Exchanges</option>
                    {exchanges.map(ex => (
                      <option key={ex.name} value={ex.name}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Trade Symbol :</label>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Symbols</option>
                    {filteredSymbols.map(sym => (
                      <option key={sym.token} value={sym.tradeSymbol}>
                        {sym.tradeSymbol}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleFetchOrders}
                    disabled={loading || initialLoading}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded font-semibold text-sm transition"
                  >
                    {loading ? 'Loading...' : 'View'}
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 text-white rounded font-semibold text-sm transition"
                  >
                    Clear
                  </button>
                </div>
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
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Orders</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    {fromDate && toDate ? `${fromDate} to ${toDate}` : 'Select date range'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalOrders}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Total Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalQuantity}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Total Quantity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{(stats.totalValue / 100000).toFixed(1)}L</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Total Value</div>
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
                  <p className="mt-4 text-slate-700 dark:text-slate-300 font-medium">Fetching orders...</p>
                </div>
              </div>
            ) : !ordersData || ordersData.orders.length === 0 ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-3 opacity-50" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">No orders found</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Select filters and click "View" to load data</p>
                </div>
              </div>
            ) : (
              <>
                {/* Action Buttons */}
                {selectedOrders.size > 0 && (
                  <div className="flex-shrink-0 px-6 py-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-700/30 flex items-center justify-between">
                    <div className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                      {selectedOrders.size} row{selectedOrders.size !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteSelected}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded font-semibold text-sm transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected ({selectedOrders.size})
                      </button>
                      <button
                        onClick={handleProceedToSuccess}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded font-semibold text-sm transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Proceed to Success ({selectedOrders.size})
                      </button>
                    </div>
                  </div>
                )}

                {/* Table Container */}
                <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600 scrollbar-track-slate-200 dark:scrollbar-track-slate-800">
                  <table className="w-full border-collapse">
                    <colgroup>
                      <col style={{ width: '50px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '50px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '130px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '150px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 sticky top-0 z-10 border-b-2 border-blue-200 dark:border-blue-500/30">
                        <th className="px-3 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300">
                          <input
                            type="checkbox"
                            checked={ordersData ? selectedOrders.size === ordersData.orders.length && ordersData.orders.length > 0 : false}
                            onChange={handleSelectAll}
                            className="w-4 h-4 rounded cursor-pointer"
                            title="Select all orders"
                          />
                        </th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Username</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">S.No</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Trade Symbol</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Exchange</th>

                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Ref. Price</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Order Type</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Method</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Brokerage</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Order Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersData.orders.map((order, index) => (
                        <tr 
                          key={order.orderId} 
                          className={`border-b border-slate-200/70 dark:border-slate-700/70 transition-colors duration-150 group ${
                            selectedOrders.has(order.orderId)
                              ? 'bg-blue-100/50 dark:bg-blue-900/30 hover:bg-blue-100/70 dark:hover:bg-blue-900/50'
                              : 'hover:bg-blue-50/80 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <td className="px-3 py-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order.orderId)}
                              onChange={() => handleSelectOrder(order.orderId)}
                              className="w-4 h-4 rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3.5 text-left text-sm font-semibold cursor-pointer">
                            <span 
                              onClick={() => handleUserClick(order)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                            >
                              {order.userName}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm text-slate-700 dark:text-slate-300 font-semibold">
                            {currentPage * pageSize + index + 1}
                          </td>
                          <td className="px-4 py-3.5 text-left text-sm font-bold text-slate-900 dark:text-slate-100">
                            {order.tradeSymbol}
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm">
                            <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                              {order.exchange}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right text-sm text-slate-800 dark:text-slate-200 font-semibold">
                            {order.quantity}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm text-slate-800 dark:text-slate-200 font-semibold">
                            ₹{order.price ? order.price.toFixed(2) : '0.00'}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm text-slate-700 dark:text-slate-300 font-medium">
                            ₹{order.referencePrice ? order.referencePrice.toFixed(2) : '0.00'}
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm">
                            <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold">
                              {order.orderLimitType}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm text-slate-700 dark:text-slate-300">
                            {order.orderMethod}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm text-slate-800 dark:text-slate-200 font-semibold">
                            ₹{order.brk ? order.brk.toFixed(2) : '0.00'}
                          </td>
                          <td className="px-4 py-3.5 text-left text-xs text-slate-600 dark:text-slate-400">
                            {formatDateTime(order.orderTime)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/50 via-blue-50/50 to-white/50 dark:from-slate-800/50 dark:via-slate-800/50 dark:to-slate-800/50 flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, ordersData.size)} of {ordersData.size} orders
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      className="p-2 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[60px] text-center">
                      Page {currentPage + 1} of {totalPages || 1}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage >= totalPages - 1}
                      className="p-2 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </FilterLayout>

      <UserDetailsModal 
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onToggle={handleToggle}
      />
      </div>
    </div>
  )
}

export default Orders
