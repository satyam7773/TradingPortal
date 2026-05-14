import React, { useState, useEffect, useMemo } from 'react'
import { Search, BarChart3, ChevronLeft, ChevronRight, Trash2, CheckCircle } from 'lucide-react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import userManagementService from '../../services/userManagementService'
import FilterLayout from '../../components/FilterLayout'
import UserDetailsModal from '../user-management/UserDetailsModal'

// --- Interfaces ---
interface OrderData {
  brk: number; deviceId: string | null; exchange: string; ipAddress: string;
  orderId: number; orderLimitType: string; orderMethod: string; orderTime: string;
  side?: any; price: number; quantity: number; referencePrice: number;
  tradeSymbol: string; userId: number; userName: string;
}

interface OrdersResponse { limit: number; offset: number; side?: any; orders: OrderData[]; size: number; }

interface UserData {
  id: string; username: string; name: string; type: string; parent: string;
  credit: number; balance: number; sharing: number | null; status: boolean;
  ipAddress: string; deviceId: string; lastLogin: string; createdDate: string;
}

const Orders: React.FC = () => {
  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);

  const [selectedUserId, setSelectedUserId] = useState<number>(0)
  const [selectedExchange, setSelectedExchange] = useState<string>('')
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  
  const [ordersData, setOrdersData] = useState<OrdersResponse | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [symbols, setSymbols] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

  const loggedInUserId = useMemo(() => {
    const userDataStr = localStorage.getItem('userData')
    return userDataStr ? JSON.parse(userDataStr).userId : 31
  }, [])

  const userDataStr = localStorage.getItem('userData');
  const loggedInUser = userDataStr ? JSON.parse(userDataStr) : null;

  // --- Core Fetch Logic ---
  const handleFetchOrders = async (pageOverride?: number, customId?: number, customEx?: string) => {
    // Logic: Use custom params if provided (initial load), otherwise use state (manual click)
    const userIdToUse = customId !== undefined ? customId : selectedUserId;
    const exchangeToUse = customEx !== undefined ? customEx : selectedExchange;

    setLoading(true)
    const targetPage = pageOverride !== undefined ? pageOverride : currentPage;

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
          userId: userIdToUse
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
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)
        const [usersResponse, exchangesResponse] = await Promise.all([
            userManagementService.fetchOwnUsers(loggedInUserId),
            userManagementService.fetchExchanges()
        ]);

        let defaultUserId = loggedInUserId; 
        let defaultExchange = '';

        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data)
          if (usersResponse.data.length > 0) {
            // We set the actual ID from the first object, even if it is 0
            defaultUserId = usersResponse.data[0].userId;
            setSelectedUserId(defaultUserId)
          }
        }

        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse)
          defaultExchange = exchangesResponse[0].name;
          setSelectedExchange(defaultExchange)
          
          // Fetch symbols for first exchange
          const symbolsResponse = await userManagementService.fetchSymbols(defaultExchange)
          if (symbolsResponse?.responseCode === '0' && Array.isArray(symbolsResponse.data)) {
            setSymbols(symbolsResponse.data)
          }
        }

        // AUTO-FETCH: Trigger fetch with whatever we got
        handleFetchOrders(0, defaultUserId, defaultExchange);

      } catch (error: any) {
        toast.error('Failed to initialize filters')
      } finally {
        setInitialLoading(false)
      }
    }
    loadInitialData()
  }, [loggedInUserId])

  const handleExchangeChange = async (name: string) => {
    setSelectedExchange(name);
    setSelectedSymbol('');
    try {
      const res = await userManagementService.fetchSymbols(name);
      if (res?.responseCode === '0') setSymbols(res.data);
    } catch (e) { setSymbols([]); }
  }

 


  const handleUserClick = (order: OrderData) => {
  // 1. Get the logged-in user's data from local storage
  const userDataStr = localStorage.getItem('userData');
  const loggedInUser = userDataStr ? JSON.parse(userDataStr) : null;

  // 2. Role Check: If roleId is 4 (Client), exit the function early
  // This prevents the setSelectedUser state from updating, so the modal never opens.
  if (loggedInUser?.roleId === 4) {
    // Optional: add a toast notice so the client knows why nothing happened
    // toast.error("You do not have permission to view user details.");
    return;
  }

  // 3. Otherwise, proceed to open the modal
  setSelectedUser({ 
    id: order.userId.toString(), 
    username: order.userName, 
    name: order.userName, 
    isActive: true 
  });
};


  const stats = {
    totalOrders: ordersData?.size || 0,
    totalQuantity: ordersData?.orders.reduce((sum, o) => sum + o.quantity, 0) || 0,
    totalValue: ordersData?.orders.reduce((sum, o) => sum + (o.price * o.quantity), 0) || 0,
  }

return (
  <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
    <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
      <FilterLayout
        storageKey="orders:showFilters"
        filterWidthClass="lg:w-[22%]"
        filters={
          <div className="space-y-4 p-4">
            <div className="space-y-3 pb-4 border-b border-gray-300 dark:border-slate-600">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">From Date :</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} max={today} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">To Date :</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} max={today} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">User :</label>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(Number(e.target.value))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500">
                  {users.map(u => <option key={u.userId} value={u.userId}>{u.userName}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exchange :</label>
                <select value={selectedExchange} onChange={(e) => handleExchangeChange(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500">
                  {exchanges.map(ex => <option key={ex.name} value={ex.name}>{ex.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Trade Symbol :</label>
                <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="">All Symbols</option>
                  {symbols.map(s => <option key={s.token} value={s.tradeSymbol}>{s.tradeSymbol}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleFetchOrders()} disabled={loading || initialLoading} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded font-semibold text-sm transition shadow-md">
                  {loading ? 'Loading...' : 'View'}
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
              <div className="grid grid-cols-3 gap-6 text-right">
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalOrders}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Total Orders</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalQuantity}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Total Quantity</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{(stats.totalValue / 100000).toFixed(1)}L</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">Total Value</div>
                </div>
              </div>
            </div>
          </div>

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
                <table className="w-full border-collapse min-w-[2000px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 sticky top-0 z-10 border-b-2 border-blue-200 dark:border-blue-500/30">
                      <th className="px-3 py-3.5 w-12"><input type="checkbox" checked={selectedOrders.size === ordersData.orders.length} onChange={() => setSelectedOrders(selectedOrders.size === ordersData.orders.length ? new Set() : new Set(ordersData.orders.map(o => o.orderId)))} className="w-4 h-4 cursor-pointer" /></th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Username</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Symbol</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Quantity</th>
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
    // Determine the color class based on the order side
    const isBuy = order.side === 'BUY';
    const sideColorClass = isBuy 
      ? 'text-blue-600 dark:text-blue-400' 
      : 'text-red-600 dark:text-red-400';

    return (
      <tr 
        key={order.orderId} 
        className={`border-b border-slate-200/70 dark:border-slate-700/70 transition-colors group ${
          selectedOrders.has(order.orderId) 
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

        {/* SYMBOL - Dynamic Color */}
        <td className={`px-4 py-3.5 text-left text-sm font-bold uppercase ${sideColorClass}`}>
          {order.exchange} {order.tradeSymbol}
        </td>

        {/* TYPE - Dynamic Color */}
        <td className={`px-4 py-3.5 text-left text-sm font-bold ${sideColorClass}`}>
          {isBuy ? 'Buy' : 'Sell'} {order.orderLimitType === 'LIMIT' ? 'Limit' : order.orderLimitType}
        </td>

        {/* QUANTITY - Dynamic Color */}
        <td className={`px-4 py-3.5 text-right text-sm font-bold ${sideColorClass}`}>
          {order.quantity}
        </td>

        {/* PRICE - Dynamic Color */}
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
                  <button onClick={() => { const p = Math.max(0, currentPage - 1); setCurrentPage(p); handleFetchOrders(p); }} disabled={currentPage === 0 || loading} className="p-2 disabled:opacity-30 text-slate-600 dark:text-slate-400"><ChevronLeft className="w-5 h-5"/></button>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Page {currentPage + 1} of {Math.ceil(ordersData.size / pageSize)}</span>
                  <button onClick={() => { const p = currentPage + 1; setCurrentPage(p); handleFetchOrders(p); }} disabled={currentPage >= Math.ceil(ordersData.size / pageSize) - 1 || loading} className="p-2 disabled:opacity-30 text-slate-600 dark:text-slate-400"><ChevronRight className="w-5 h-5"/></button>
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

export default Orders;