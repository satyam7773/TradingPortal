import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, BarChart3, ChevronLeft, ChevronRight, Trash2, CheckCircle } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import userManagementService from '../../services/userManagementService'
import FilterLayout from '../../components/FilterLayout'
import UserDetailsModal from '../user-management/UserDetailsModal'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { withTabCache, CacheContextProps } from '../../hoc/withTabCache'

// --- Interfaces ---
interface OrderData {
  brk: number; deviceId: string | null; exchange: string; ipAddress: string;
  orderId: number; orderLimitType: string; orderMethod: string; orderTime: string;
  side?: any; price: number; quantity: number; referencePrice: number;
  tradeSymbol: string; userId: number; userName: string;
  placedByUsername: string;
}

interface OrdersResponse { limit: number; offset: number; side?: any; orders: OrderData[]; size: number; }

interface UserData {
  id: string; username: string; name: string; type: string; parent: string;
  credit: number; balance: number; sharing: number | null; status: boolean;
  ipAddress: string; deviceId: string; lastLogin: string; createdDate: string;
}

interface OrdersPageProps extends CacheContextProps {}

const OrdersPage: React.FC<OrdersPageProps> = ({ cacheData, apiData, onCacheSave, isRestoringCache }) => {
  const loggedInUserId = useMemo(() => {
    const userDataStr = localStorage.getItem('userData')
    return userDataStr ? JSON.parse(userDataStr).userId : 31
  }, [])

  // Initialize state with cache if available
  const initializeFilterState = () => {
    if (cacheData) {
      return cacheData
    }
    const todayStr = new Date().toLocaleDateString('en-CA')
    return {
      fromDate: todayStr,
      toDate: todayStr,
      selectedUserId: 0,
      selectedExchange: '',
      selectedSymbol: '',
      currentPage: 0
    }
  }

  const initialFilters = initializeFilterState()
  const cacheLoggedRef = React.useRef(false)
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), [])
  
  // Log cache found once
  useEffect(() => {
    if (cacheData && !cacheLoggedRef.current) {
      console.log('✅ [Orders] Initializing from cache:', cacheData)
      cacheLoggedRef.current = true
    }
  }, [cacheData])
  const [fromDate, setFromDate] = useState<string>(initialFilters.fromDate);
  const [toDate, setToDate] = useState<string>(initialFilters.toDate);

  const [selectedUserId, setSelectedUserId] = useState<number | string>(initialFilters.selectedUserId)
  const [selectedExchange, setSelectedExchange] = useState<string>(initialFilters.selectedExchange)
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialFilters.selectedSymbol)

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const [ordersData, setOrdersData] = useState<OrdersResponse | null>(apiData?.ordersData || null)
  const [users, setUsers] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [symbols, setSymbols] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(initialFilters.currentPage)
  const [pageSize, setPageSize] = useState(10)
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

  const userDataStr = localStorage.getItem('userData');
  const loggedInUser = userDataStr ? JSON.parse(userDataStr) : null;

  // --- Adapt users array to match DropdownItem interface [{ id, name }] ---
  const selectableUsers = useMemo(() => {
    return users.map(u => ({
      id: u.userId,
      name: u.userName
    }));
  }, [users]);

  // --- Adapt symbols array for SearchableSelect ---
  const selectableSymbols = useMemo(() => {
    return symbols.map(s => ({
      id: String(s.token),
      name: s.tradeSymbol || s
    }));
  }, [symbols]);

  const cacheTimerRef = React.useRef<any>(null)
  const cacheInitializedRef = React.useRef(false)
  const metadataLoadedRef = React.useRef(false)

  // Fetch initial data only if cache doesn't exist
  useEffect(() => {
    if (!cacheInitializedRef.current && !cacheData) {
      console.log('📡 [Orders] No cache found, fetching initial data...')
      handleFetchOrders()
      cacheInitializedRef.current = true
    }
  }, [cacheData]) // Watch cacheData to handle first load

  // Handle cache data changes (when switching back to this tab with cache)
  useEffect(() => {
    if (cacheData && !cacheInitializedRef.current) {
      console.log('🔄 [Orders] Cache found, initializing from cache')
      cacheInitializedRef.current = true
      
      // Restore cached data if available
      if (apiData?.ordersData) {
        console.log('📊 [Orders] Restoring cached table data')
        setOrdersData(apiData.ordersData)
      }
    }
  }, [cacheData, apiData])

  // --- Core Fetch Logic ---
  const handleFetchOrders = async (pageOverride?: number, customId?: number | string, customEx?: string) => {
    const userIdToUse = customId !== undefined ? customId : selectedUserId;
    const exchangeToUse = customEx !== undefined ? customEx : selectedExchange;

    setLoading(true)
    const targetPage = pageOverride !== undefined ? pageOverride : currentPage;

    console.log('🔍 SelectedSymbol value:', selectedSymbol, 'Type:', typeof selectedSymbol);

    try {
      const response = await userManagementService.fetchOrders(
        loggedInUserId,
        {
          limit: pageSize,
          offset: targetPage * pageSize,
          fromDate,
          toDate,
          tradeSymbol: selectedSymbol,
          exchange: exchangeToUse === 'All Exchanges' ? '' : exchangeToUse,
          userId: Number(userIdToUse)
        }
      )

      if (response?.responseCode === '0' && response?.data) {
        setOrdersData(response.data)
      } else {
        setOrdersData(null)
      }
    } catch (error: any) {
      setOrdersData(null)
    } finally {
      setLoading(false)
    }
  }

  // --- Lifecycle: Initial Metadata Load & Auto-Fetch ---
  useEffect(() => {
    // Only load metadata once per session, not on every tab switch
    if (metadataLoadedRef.current) return

    const loadInitialData = async () => {
      try {
        setInitialLoading(true)
        const [usersResponse, exchangesResponse] = await Promise.all([
          userManagementService.fetchOwnUsers(loggedInUserId),
          userManagementService.fetchExchanges()
        ]);

        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data)
          // Only set default user if no cache exists
          if (!cacheData && usersResponse.data.length > 0) {
            const defaultUserId = usersResponse.data[0].userId;
            setSelectedUserId(defaultUserId)
          }
        }

        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse)
          // Only set default exchange if no cache exists
          if (!cacheData) {
            const defaultExchange = exchangesResponse[0].name;
            setSelectedExchange(defaultExchange)

            const symbolsResponse = await userManagementService.fetchSymbols(defaultExchange)
            if (symbolsResponse?.responseCode === '0' && Array.isArray(symbolsResponse.data)) {
              setSymbols(symbolsResponse.data)
            }
          }
        }
      } catch (error: any) {
        toast.error('Failed to initialize filters')
      } finally {
        setInitialLoading(false)
      }
    }
    
    loadInitialData()
    metadataLoadedRef.current = true // Mark as loaded so it doesn't run again
  }, [cacheData, loggedInUserId]) // Added cacheData as dependency

  // Save filters to cache whenever they change (debounced)
  useEffect(() => {
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    
    cacheTimerRef.current = setTimeout(() => {
      const filters = {
        fromDate,
        toDate,
        selectedUserId,
        selectedExchange,
        selectedSymbol,
        currentPage
      }
      console.log('💾 [Orders] Saving filters to cache')
      onCacheSave(filters, { ordersData })
    }, 500)
    
    return () => {
      if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    }
  }, [fromDate, toDate, selectedUserId, selectedExchange, selectedSymbol, currentPage, ordersData, onCacheSave])

  const handleExchangeChange = async (name: string) => {
    setSelectedExchange(name);
    setSelectedSymbol('');
    if (name === 'All Exchanges') {
      setSymbols([]);
      return;
    }
    try {
      const res = await userManagementService.fetchSymbols(name);
      if (res?.responseCode === '0') setSymbols(res.data);
    } catch (e) { setSymbols([]); }
  }

  const handleUserClick = (order: OrderData) => {
    const userDataStr = localStorage.getItem('userData');
    const loggedInUser = userDataStr ? JSON.parse(userDataStr) : null;

    if (loggedInUser?.roleId === 4) {
      return;
    }

    setSelectedUser({
      id: order.userId.toString(),
      username: order.userName,
      name: order.userName,
      isActive: true
    });
  };

  // --- Cancel/Delete Handler ---
  const handleDeleteSelected = async () => {
    if (!ordersData || selectedOrders.size === 0) return;
    if (!window.confirm(`Are you sure you want to cancel the ${selectedOrders.size} selected order(s)?`)) return;

    try {
      setLoading(true);
      const res = await userManagementService.cancelMultipleOrders(loggedInUserId, Array.from(selectedOrders));
      
      if (res?.responseCode === '0' || res?.status === 'success') {
        toast.success("Selected orders cancelled successfully");
        setSelectedOrders(new Set());
        handleFetchOrders(currentPage);
      } else {
        toast.error(res?.message || "Failed to cancel orders");
      }
    } catch (err) {
      console.error("❌ Order cancellation failure:", err);
      toast.error("An error occurred while deleting orders");
    } finally {
      setLoading(false);
    }
  };

  // --- Proceed to Success API Handler ---
  const handleProceedToSuccess = async () => {
    if (!ordersData || selectedOrders.size === 0) return;
    if (!window.confirm(`Are you sure you want to proceed ${selectedOrders.size} order(s) to success?`)) return;

    try {
      setLoading(true);
      const payload = {
        userId: loggedInUserId,
        requestTimestamp: new Date().toISOString(),
        data: Array.from(selectedOrders)
      };

      const response = await fetch('https://api-staging.rivoplus.live/oms/proceedToSuccess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && (result?.responseCode === '0' || result?.status === 'success')) {
        toast.success("Orders processed to success layout!");
        setSelectedOrders(new Set());
        handleFetchOrders(currentPage);
      } else {
        toast.error(result?.message || "Failed to process orders to success");
      }
    } catch (err) {
      console.error("❌ Proceed to Success API failure:", err);
      toast.error("An error occurred while upgrading order states");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalOrders: ordersData?.size || 0,
    totalQuantity: ordersData?.orders.reduce((sum, o) => sum + o.quantity, 0) || 0,
    totalValue: ordersData?.orders.reduce((sum, o) => sum + (o.price * o.quantity), 0) || 0,
  }

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    console.log('🗑️ [Orders] Clearing all filters')
    setFromDate(todayStr)
    setToDate(todayStr)
    setSelectedUserId(0)
    setSelectedExchange('')
    setSelectedSymbol('')
    setOrdersData(null)
    setCurrentPage(0)
  }, [todayStr])

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="orders:showFilters"
          filterWidthClass="lg:w-[16%]"
          filters={
            <div className="space-y-4 p-4">
              <div className="space-y-3 pb-4 border-b border-gray-300 dark:border-slate-600">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">From Date :</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} max={todayStr} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">To Date :</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} max={todayStr} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="space-y-3">
                
                {/* CLEAN REUSABLE SEARCHABLE SELECT EXECUTED HERE */}
                <SearchableSelect 
                  label="User :"
                  placeholder="Search User..."
                  items={selectableUsers}
                  selectedId={selectedUserId}
                  onSelect={(id) => setSelectedUserId(id)}
                />

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exchange :</label>
                  <select value={selectedExchange} onChange={(e) => handleExchangeChange(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500">
                    {exchanges.map(ex => <option key={ex.name} value={ex.name}>{ex.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <SearchableSelect
                    label="Trade Symbol :"
                    items={selectableSymbols}
                    selectedId={selectedSymbol}
                    onSelect={(id) => setSelectedSymbol(String(id))}
                    placeholder="Search symbol..."
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleFetchOrders()} disabled={loading || initialLoading} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded font-semibold text-sm transition shadow-md">
                    {loading ? 'Loading...' : 'View'}
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded font-semibold text-sm transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          }
        >
          <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
            <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Orders</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">{fromDate} to {toDate}</p>
                </div>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalOrders}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Total Orders</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalQuantity}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Total Quantity</div>
                  </div>
              
                </div>
              </div>
            </div>

            {/* Selection Bulk Actions Menu */}
            {selectedOrders.size > 0 && (
              <div className="flex-shrink-0 px-6 py-3 bg-orange-50 dark:bg-orange-950/40 border-b border-orange-200 dark:border-orange-900/50 flex items-center justify-between transition-all duration-200 animate-in fade-in slide-in-from-top-1">
                <div className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                  {selectedOrders.size} row{selectedOrders.size > 1 ? 's' : ''} selected
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleDeleteSelected} 
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded font-semibold text-sm transition shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" /> Cancel Selected
                  </button>
                  <button 
                    onClick={handleProceedToSuccess}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded font-semibold text-sm transition shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" /> Proceed to Success
                  </button>
                </div>
              </div>
            )}

            {initialLoading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-500 border-t-blue-500 dark:border-t-blue-300 mx-auto"></div>
              </div>
            ) : !ordersData || ordersData.orders.length === 0 ? (
              <div className="flex items-center justify-center flex-1 text-center">
                <BarChart3 className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-3 opacity-50" />
                <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">No orders found</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600">
                  <table className="w-full border-collapse min-w-[2150px]">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 sticky top-0 z-10 border-b-2 border-blue-200 dark:border-blue-500/30">
                        <th className="px-3 py-3.5 w-12">
                          <input 
                            type="checkbox" 
                            checked={ordersData.orders.length > 0 && selectedOrders.size === ordersData.orders.length} 
                            onChange={() => setSelectedOrders(selectedOrders.size === ordersData.orders.length ? new Set() : new Set(ordersData.orders.map(o => o.orderId)))} 
                            className="w-4 h-4 cursor-pointer" 
                          />
                        </th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Username</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Placed By</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider max-w-[110px]">Symbol</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider max-w-[10px]">Quantity</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Brk</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Order Time</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">IPAddress</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">DeviceId</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Reference Price</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Order Method</th>
                      </tr>
                    </thead>

                    <tbody>
                      {ordersData.orders.map((order) => {
                        const isBuy = order.side === 'BUY';
                        const sideColorClass = isBuy
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-red-600 dark:text-red-400';

                        return (
                          <tr
                            key={order.orderId}
                            className={`border-b border-slate-200/70 dark:border-slate-700/70 transition-colors group ${selectedOrders.has(order.orderId)
                                ? 'bg-blue-100/50 dark:bg-blue-900/30'
                                : 'hover:bg-blue-50/80 dark:hover:bg-slate-700/50'
                              }`}
                          >
                            <td className="px-3 py-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={selectedOrders.has(order.orderId)}
                                onChange={() => {
                                  const next = new Set(selectedOrders);
                                  next.has(order.orderId) ? next.delete(order.orderId) : next.add(order.orderId);
                                  setSelectedOrders(next);
                                }}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3.5 text-left text-sm font-semibold">
                              <span
                                className={`${loggedInUser?.roleId === 4
                                  ? 'text-slate-700 dark:text-slate-300 cursor-default'
                                  : 'text-blue-600 dark:text-blue-400 cursor-pointer hover:underline'
                                  }`}
                                onClick={() => handleUserClick(order)}
                              >
                                {order.userName}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-left text-sm text-slate-800 dark:text-slate-200 font-medium">
                              {order.placedByUsername || '-'}
                            </td>

                            <td className={`px-4 py-3.5 text-left text-sm font-bold uppercase ${sideColorClass} max-w-[110px] truncate`}>
                              {order.exchange} {order.tradeSymbol}
                            </td>

                            <td className={`px-4 py-3.5 text-left text-sm font-bold ${sideColorClass}`}>
                              {isBuy ? 'Buy' : 'Sell'} {order.orderLimitType === 'LIMIT' ? 'Limit' : order.orderLimitType}
                            </td>

                            <td className={`px-4 py-3.5 text-left text-sm font-bold ${sideColorClass} max-w-[10px] text-center`}>
                              {order.quantity}
                            </td>

                            <td className={`px-4 py-3.5 text-right text-sm font-mono font-bold ${sideColorClass}`}>
                              {order.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            <td className="px-4 py-3.5 text-right text-sm font-mono text-slate-800 dark:text-slate-200">
                              {order.brk}
                            </td>
                            <td className="px-4 py-3.5 text-left text-sm text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {new Date(order.orderTime).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') + ' ' + new Date(order.orderTime).toLocaleTimeString('en-GB')}
                            </td>
                            <td className="px-4 py-3.5 text-left text-sm text-slate-800 dark:text-slate-200 font-mono tracking-tighter">
                              {order.ipAddress}
                            </td>
                            <td className="px-4 py-3.5 text-left text-sm text-slate-800 dark:text-slate-200 truncate max-w-[150px]" title={order.deviceId || 'N/A'}>
                              {order.deviceId || '-'}
                            </td>
                            <td className="px-4 py-3.5 text-right text-sm font-mono text-slate-800 dark:text-slate-200">
                              {order.referencePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3.5 text-left text-sm text-slate-800 dark:text-slate-200 uppercase font-semibold">
                              {order.orderMethod}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white/50 dark:bg-slate-800/50">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, ordersData.size)} of {ordersData.size} orders
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { const p = Math.max(0, currentPage - 1); setCurrentPage(p); handleFetchOrders(p); }} disabled={currentPage === 0 || loading} className="p-2 disabled:opacity-30 text-slate-600 dark:text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Page {currentPage + 1} of {Math.ceil(ordersData.size / pageSize)}</span>
                    <button onClick={() => { const p = currentPage + 1; setCurrentPage(p); handleFetchOrders(p); }} disabled={currentPage >= Math.ceil(ordersData.size / pageSize) - 1 || loading} className="p-2 disabled:opacity-30 text-slate-600 dark:text-slate-400"><ChevronRight className="w-5 h-5" /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        </FilterLayout>
      </div>

      {selectedUser && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-[9999]" onClick={() => setSelectedUser(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col border border-gray-200/50 overflow-hidden" style={{ width: '98vw', height: '96vh', maxWidth: '1800px' }} onClick={(e) => e.stopPropagation()}>
            <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} onToggle={() => { }} />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default withTabCache(OrdersPage, { title: 'Orders' })
