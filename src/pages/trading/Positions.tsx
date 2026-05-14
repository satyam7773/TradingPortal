import React, { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownLeft, BarChart3, X, Eye, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import userManagementService from '../../services/userManagementService'
import FilterLayout from '../../components/FilterLayout'
import { useOrderModal } from '../../hooks/useOrderModal'
import OrderModal from '../../components/modals/OrderModal'

interface PositionData {
  positionId: number
  positionDate: number
  positionDays: number
  username: string
  parentUsername: string
  exchange: string
  tradeSymbol: string
  position: 'BUY' | 'SELL'
  quantity: number
  averagePrice: number
  ltp: number | null
  pnl: number
  pnlPercentage: number
  totalPnl: number
  token?: number
}

interface PositionResponse {
  balance: number
  totalBuy: number
  totalSell: number
  other: number
  brokerage: number
  positions: PositionData[]
}

const Positions: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<number>(0)
  const [selectedExchange, setSelectedExchange] = useState<string>('')
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [selectedToken, setSelectedToken] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [positionData, setPositionData] = useState<PositionResponse | null>(null)
  const [filteredPositions, setFilteredPositions] = useState<PositionData[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [symbols, setSymbols] = useState<any[]>([])
  const [filteredSymbols, setFilteredSymbols] = useState<any[]>([])

  const userDataStr = localStorage.getItem('userData')
  const userData = userDataStr ? JSON.parse(userDataStr) : null
  const loggedInUserId = userData?.userId || 31
  const isAdminUser = userData?.roleId === 1 || userData?.roleId === 2 || userData?.roleId === 3
  const orderModal = useOrderModal(isAdminUser)

  // Function to fetch symbols (extracted to be callable from multiple places)
  const fetchSymbolsForExchange = async (exchangeName: string) => {
    try {
      console.log('🔄 Fetching symbols for exchange:', exchangeName)
      const symbolsResponse = await userManagementService.fetchSymbols(exchangeName)
      if (symbolsResponse?.responseCode === '0' && Array.isArray(symbolsResponse.data)) {
        setSymbols(symbolsResponse.data)
        setFilteredSymbols(symbolsResponse.data)
        setSelectedSymbol('')
        setSelectedToken(null)
      }
    } catch (error) {
      console.error('❌ Error fetching symbols:', error)
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)
        
        // 1. Fetch Users
        const usersResponse = await userManagementService.fetchUserClientsForTrade()
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          const formattedUsers = [{ id: 0, name: 'All Users' }, ...usersResponse.data]
          setUsers(formattedUsers)
          setSelectedUserId(0)
        }

        // 2. Fetch Exchanges
        const exchangesResponse = await userManagementService.fetchExchanges()
        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse)
          const firstExchange = exchangesResponse[0].name
          setSelectedExchange(firstExchange)
          
          // FIX: Manually trigger symbol fetch for the first load to bypass React state lag
          await fetchSymbolsForExchange(firstExchange)
        }
      } catch (error) {
        toast.error('Failed to load initial data')
      } finally {
        setInitialLoading(false)
      }
    }
    loadInitialData()
  }, [])

  // Auto-fetch data (portal api) when metadata is ready
  useEffect(() => {
    if (!initialLoading && exchanges.length > 0 && selectedExchange) {
      handleView()
    }
  }, [initialLoading, exchanges, selectedExchange])

  // Watch for manual exchange changes after first load
  useEffect(() => {
    if (!initialLoading && selectedExchange && selectedExchange !== 'All Exchanges') {
      fetchSymbolsForExchange(selectedExchange)
    }
  }, [selectedExchange])

  const handleView = async () => {
    if (!selectedExchange) {
      toast.error('Please select an exchange');
      return;
    }

    setLoading(true);
    try {
      let userIdsToFetch: number[] = [];
      if (selectedUserId !== 0) {
        userIdsToFetch = [selectedUserId];
      } else if (users.length > 1) { 
        userIdsToFetch = users.filter(u => u.id !== 0).map(u => u.id);
      } else {
        userIdsToFetch = [loggedInUserId];
      }

      const response = await userManagementService.fetchUserPositionsForExchange(
        selectedExchange,
        selectedToken || 0,
        userIdsToFetch
      );

      if (response?.responseCode === '0' && response.data) {
        setPositionData(response.data);
        let positions = response.data.positions || [];
        if (selectedSymbol) {
          positions = positions.filter((p: PositionData) => p.tradeSymbol === selectedSymbol);
        }
        setFilteredPositions(positions);
      } else {
        setFilteredPositions([]);
      }
    } catch (error: any) {
      setFilteredPositions([]);
    } finally {
      setLoading(false)
    }
  };

  const handleClear = () => {
    setSelectedUserId(0)
    setSelectedExchange(exchanges.length > 0 ? exchanges[0].name : '')
    setSelectedSymbol('')
    setFilteredPositions([])
  }

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
    if (pnl < 0) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/30'
  }

  const stats = {
    total: filteredPositions.length,
    buy: filteredPositions.filter(p => p.position === 'BUY').length,
    sell: filteredPositions.filter(p => p.position === 'SELL').length,
    totalPnL: filteredPositions.reduce((sum, p) => sum + (p.totalPnl || 0), 0),
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="positions:showFilters"
          filterWidthClass="lg:w-[22%]"
          filters={
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Username :</label>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(Number(e.target.value))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500">
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exchange :</label>
                <select value={selectedExchange} onChange={(e) => setSelectedExchange(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500">
                  {exchanges.map(ex => <option key={ex.name} value={ex.name}>{ex.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Symbol :</label>
                <select value={selectedSymbol} onChange={(e) => { setSelectedSymbol(e.target.value); const found = symbols.find(s => s.tradeSymbol === e.target.value); setSelectedToken(found?.token || null); }} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500">
                  <option value="">All Scripts</option>
                  {symbols.map(s => <option key={s.token} value={s.tradeSymbol}>{s.tradeSymbol}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleView} disabled={loading} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition">View</button>
                <button onClick={handleClear} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded font-semibold text-sm transition">Clear</button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
            <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Briefcase className="w-8 h-8 text-blue-500" /> Positions</h1>
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center"><div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-blue-600">{stats.buy}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Buy</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-red-600">{stats.sell}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Sell</div></div>
                  <div className="text-center"><div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{stats.totalPnL.toFixed(0)}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Net P&L</div></div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin">
              {loading ? (
                <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" /></div>
              ) : (
                <table className="w-full border-collapse min-w-max">
                  <colgroup>
                    <col className="w-16" /><col className="w-16" /><col className="w-40" /><col className="w-56" />
                    <col className="w-28" /><col className="w-24" /><col className="w-32" /><col className="w-32" />
                    <col className="w-32" /><col className="w-32" />
                  </colgroup>
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 border-b-2 border-blue-100 dark:border-blue-900">
                    <tr>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">View</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Own</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Username</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Position</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Avg Rate</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">CMP</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">P&L</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Net Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredPositions.map((p) => (
                      <tr key={p.positionId} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 text-center">
                          <button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"><Eye className="w-4 h-4 text-blue-600" /></button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-lg"><Briefcase className="w-4 h-4 text-amber-600" /></button>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-blue-600 underline cursor-pointer">{p.username}</span>
                            {/* <span className="text-[10px] text-slate-400 font-medium uppercase">{p.parentUsername}</span> */}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.tradeSymbol}</span>
                            <span className="text-[10px] text-purple-600 font-bold uppercase">{p.exchange}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                             {p.position === 'BUY' ? <ArrowUpRight className="w-4 h-4 text-blue-600" /> : <ArrowDownLeft className="w-4 h-4 text-red-600" />}
                            <span className={`text-xs font-bold ${p.position === 'BUY' ? 'text-blue-600' : 'text-red-600'}`}>{p.position}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">{p.quantity}</td>
                        <td className="px-6 py-4 text-right font-mono text-sm">{p.averagePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{p.ltp?.toFixed(2) || '-'}</td>
                        <td className={`px-6 py-4 text-right font-mono text-sm font-bold rounded-lg ${getPnLColor(p.pnl)}`}>{p.pnl.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-mono text-sm text-slate-600 dark:text-slate-400">0.00</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </FilterLayout>
      </div>
      <OrderModal isOpen={orderModal.showBuyOrderModal} onClose={orderModal.closeBuyModal} orderType="BUY" {...orderModal} isAdminUser={isAdminUser} />
      <OrderModal isOpen={orderModal.showSellOrderModal} onClose={orderModal.closeSellModal} orderType="SELL" {...orderModal} isAdminUser={isAdminUser} />
    </div>
  )
}

export default Positions