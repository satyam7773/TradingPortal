import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ArrowUpRight, ArrowDownLeft, Briefcase, Eye, TrendingUp, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import userManagementService from '../../services/userManagementService'
import marketWatchService from '../../services/marketWatchService'
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
  const [selectedExchange, setSelectedExchange] = useState<string>('All Exchanges')
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [selectedToken, setSelectedToken] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [positionData, setPositionData] = useState<PositionResponse | null>(null)
  const [filteredPositions, setFilteredPositions] = useState<PositionData[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [symbols, setSymbols] = useState<any[]>([])

  const feedUnsubscribeRef = useRef<(() => void) | null>(null)
  const subscriptionRef = useRef({ subscribed: false, userId: null as string | null })
  const lastUpdateRef = useRef<number>(0)

  const userDataStr = localStorage.getItem('userData')
  const userData = userDataStr ? JSON.parse(userDataStr) : null
  const loggedInUserId = userData?.userId || 31
  const isAdminUser = userData?.roleId === 1 || userData?.roleId === 2 || userData?.roleId === 3
  const orderModal = useOrderModal(isAdminUser)

  // Cache for raw live tick values to pass down directly into the OrderModals
  const [liveTicks, setLiveTicks] = useState<Record<number, any>>({})

  const stats = useMemo(() => ({
    total: filteredPositions.length,
    buy: filteredPositions.filter(p => p.position === 'BUY').length,
    sell: filteredPositions.filter(p => p.position === 'SELL').length,
    totalPnL: filteredPositions.reduce((sum, p) => sum + (p.pnl || 0), 0),
  }), [filteredPositions])

  const unsubscribeCurrentFeed = useCallback(() => {
    if (feedUnsubscribeRef.current) {
      feedUnsubscribeRef.current()
      feedUnsubscribeRef.current = null
    }
    if (subscriptionRef.current.subscribed && subscriptionRef.current.userId) {
      const uid = subscriptionRef.current.userId
      marketWatchService.unsubscribeFromInstruments(uid)
      marketWatchService.unsubscribeFromWatchlist(uid)
      subscriptionRef.current = { subscribed: false, userId: null }
    }
  }, [])

  const establishStompSubscription = useCallback((userId: string, tokens: string[]) => {
    unsubscribeCurrentFeed()
    
    marketWatchService.subscribeToInstruments(userId)
    marketWatchService.subscribeToWatchlist(userId)
    subscriptionRef.current = { subscribed: true, userId }
    marketWatchService.sendInstrumentsRequest(userId, tokens)

    feedUnsubscribeRef.current = marketWatchService.onFeedData((data) => {
      if (!data) return

      const incomingFeedArray = Array.isArray(data) ? data : [data]
      
      // Save raw feeds to state so modals have immediate access to live data objects
      setLiveTicks(prev => {
        const nextTicks = { ...prev }
        incomingFeedArray.forEach(item => {
          nextTicks[Number(item.insToken)] = item
        })
        return nextTicks
      })

      const now = Date.now()
      if (now - lastUpdateRef.current < 100) return
      lastUpdateRef.current = now

      const feedMap = new Map(incomingFeedArray.map(item => [Number(item.insToken), item]))

      setFilteredPositions(prevPositions => {
        let hasChanges = false
        const newPositions = prevPositions.map(pos => {
          const currentToken = Number(pos.token)
          if (!currentToken || !feedMap.has(currentToken)) return pos
          
          const tick = feedMap.get(currentToken)!
          if (pos.ltp === tick.ltp) return pos

          hasChanges = true
          const price = tick.ltp
          const priceChange = pos.position === 'BUY' ? (price - pos.averagePrice) : (pos.averagePrice - price)
          const unrealisedPnl = priceChange * Math.abs(pos.quantity)
          const amount = pos.averagePrice * Math.abs(pos.quantity)
          const unrealisedPnlPercentage = amount !== 0 ? (unrealisedPnl * 100) / amount : 0

          return {
            ...pos,
            ltp: price,
            pnl: unrealisedPnl,
            pnlPercentage: unrealisedPnlPercentage,
          }
        })
        return hasChanges ? newPositions : prevPositions
      })
    })
  }, [unsubscribeCurrentFeed])

  const setupLivePositionFeed = useCallback(async (positionsList: PositionData[]) => {
    if (!userData) return
    const userIdStr = userData.userId.toString()
    const tokens = positionsList.filter(p => p.token).map(p => p.token!.toString())
    if (tokens.length === 0) return

    if (!marketWatchService.isConnected()) {
      await marketWatchService.connect(() => establishStompSubscription(userIdStr, tokens))
    } else {
      establishStompSubscription(userIdStr, tokens)
    }
  }, [establishStompSubscription, userData])

  const handleView = async (targetExchange?: string, targetUserIds?: number[]) => {
    const exchange = targetExchange || selectedExchange
    if (!exchange) return
    setLoading(true)
    unsubscribeCurrentFeed()

    try {
      let uids: number[] = []
      if (targetUserIds) {
        uids = targetUserIds
      } else if (selectedUserId !== 0) {
        uids = [selectedUserId]
      } else {
        uids = users.filter(u => u.id !== 0).map(u => u.id)
        if (uids.length === 0) uids = [loggedInUserId]
      }

      const response = await userManagementService.fetchUserPositionsForExchange(exchange, selectedToken || 0, uids)
      
      if (response?.responseCode === '0' && response.data) {
        setPositionData(response.data)
        let positions = response.data.positions || []
        if (selectedSymbol) {
          positions = positions.filter((p: PositionData) => p.tradeSymbol === selectedSymbol)
        }
        setFilteredPositions(positions)
        if (positions.length > 0) setupLivePositionFeed(positions)
      } else {
        setFilteredPositions([])
      }
    } catch (error) { 
      setFilteredPositions([]) 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => {
    const loadInitialData = async () => {
      unsubscribeCurrentFeed()
      try {
        setInitialLoading(true)
        const usersResponse = await userManagementService.fetchUserClientsForTrade()
        let initialUserIds = [loggedInUserId]
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          const formattedUsers = [{ id: 0, name: 'All Users' }, ...usersResponse.data]
          setUsers(formattedUsers)
          initialUserIds = usersResponse.data.map((u: any) => u.id)
        }
        const exchangesResponse = await userManagementService.fetchExchanges()
        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse)
        }
        await handleView("All Exchanges", initialUserIds)
      } finally { 
        setInitialLoading(false) 
      }
    }
    loadInitialData()
    return () => unsubscribeCurrentFeed()
  }, [])

  const fetchSymbolsForExchange = async (exchangeName: string) => {
    if (!exchangeName || exchangeName === 'All Exchanges') { setSymbols([]); return; }
    try {
      const response = await userManagementService.fetchSymbols(exchangeName)
      if (response?.responseCode === '0' && Array.isArray(response.data)) setSymbols(response.data)
    } catch (e) { console.error(e) }
  }

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
    if (pnl < 0) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/30'
  }

  const getCMPColor = (ltp: number | null, avg: number) => {
    if (!ltp) return 'text-blue-600 dark:text-blue-400'
    return ltp >= avg ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
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
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(Number(e.target.value))} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none">
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exchange :</label>
                <select value={selectedExchange} onChange={(e) => { setSelectedExchange(e.target.value); fetchSymbolsForExchange(e.target.value); }} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none">
                  <option value="All Exchanges">All Exchanges</option>
                  {exchanges.map(ex => <option key={ex.name} value={ex.name}>{ex.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Symbol :</label>
                <select value={selectedSymbol} onChange={(e) => { setSelectedSymbol(e.target.value); const found = symbols.find(s => s.tradeSymbol === e.target.value); setSelectedToken(found?.token || null); }} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none">
                  <option value="">All Scripts</option>
                  {symbols.map(s => <option key={s.token} value={s.tradeSymbol}>{s.tradeSymbol}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleView()} disabled={loading} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition shadow-md">View</button>
                <button onClick={() => { setSelectedSymbol(''); handleView(); }} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded font-semibold text-sm transition">Clear</button>
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
                  <div className="text-center"><div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{stats.totalPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Net P&L</div></div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin">
              {loading ? (
                <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" /></div>
              ) : (
                <table className="w-full border-collapse min-w-max">
                  <colgroup>
                    <col className="w-16" /><col className="w-16" /><col className="w-16" /><col className="w-16" />
                    <col className="w-40" /><col className="w-56" /><col className="w-28" /><col className="w-24" />
                    <col className="w-32" /><col className="w-32" /><col className="w-32" /><col className="w-32" />
                  </colgroup>
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 border-b-2 border-blue-100 dark:border-blue-900">
                    <tr>
                      <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-blue-600">Buy</th>
                      <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-red-600">Sell</th>
                      <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">View</th>
                      <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">Own</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Username</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Avg Rate</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">CMP</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">P&L</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Net Change %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredPositions.map((p) => (
                      <tr key={p.positionId} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-4 text-center">
                          <button onClick={() => {
                            console.log('🟢 Clicked Buy for token:', p.token);
                            orderModal.openBuyModal({ 
                              token: p.token || 0, 
                              config: { 
                                exchange: p.exchange, 
                                tradeSymbol: p.tradeSymbol,
                                instrumentName: p.tradeSymbol,
                                script: p.tradeSymbol,
                                lotSize: 1
                              }
                            });
                          }} className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white transition-all shadow-sm"><TrendingUp className="w-4 h-4" /></button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button onClick={() => {
                            console.log('🔴 Clicked Sell for token:', p.token);
                            orderModal.openSellModal({ 
                              token: p.token || 0, 
                              config: { 
                                exchange: p.exchange, 
                                tradeSymbol: p.tradeSymbol,
                                instrumentName: p.tradeSymbol,
                                script: p.tradeSymbol,
                                lotSize: 1
                              }
                            });
                          }} className="p-2 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-all shadow-sm"><TrendingDown className="w-4 h-4" /></button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"><Eye className="w-4 h-4 text-blue-600" /></button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-lg"><Briefcase className="w-4 h-4 text-amber-600" /></button>
                        </td>
                        <td className="px-6 py-4 text-left text-sm font-semibold text-blue-600">{p.username}</td>
                        <td className="px-6 py-4 text-left">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.tradeSymbol}</span>
                            <span className="text-[10px] text-purple-600 font-bold uppercase">{p.exchange}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">{p.quantity}</td>
                        <td className="px-6 py-4 text-right font-mono text-sm">{p.averagePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className={`px-6 py-4 text-right font-mono text-sm font-bold ${getCMPColor(p.ltp, p.averagePrice)}`}>
                          {p.ltp?.toFixed(2) || '0.00'}
                        </td>
                        <td className={`px-6 py-4 text-right font-mono text-sm font-bold rounded-lg ${getPnLColor(p.pnl)}`}>
                          {p.pnl.toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 text-right font-mono text-sm font-bold ${p.pnlPercentage >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {p.pnlPercentage.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </FilterLayout>
      </div>
      
      {/* Fallback parameters explicitly handled if hooks pass down un-assigned state properties */}
     {/* Buy Order Modal Mapping */}
      <OrderModal
        isOpen={orderModal.showBuyOrderModal}
        onClose={orderModal.closeBuyModal}
        orderType="BUY"
        selectedInstrument={orderModal.selectedOrderInstrument}
        liveData={orderModal.selectedOrderInstrument?.token ? liveTicks[orderModal.selectedOrderInstrument.token] : null}
        
        // Form States
        orderQuantity={orderModal.buyOrderQuantity}
        onOrderQuantityChange={orderModal.setBuyOrderQuantity}
        orderPrice={orderModal.buyOrderPrice}
        onOrderPriceChange={orderModal.setBuyOrderPrice}
        orderMethod={orderModal.buyOrderType}
        onOrderMethodChange={orderModal.setBuyOrderType}
        orderRemark={orderModal.buyOrderRemark}
        onOrderRemarkChange={orderModal.setBuyOrderRemark}
        
        // Admin overrides & actions
        isAdminUser={isAdminUser}
        selectedClient={orderModal.selectedClient}
        onClientSelect={orderModal.setSelectedClient}
        clientSearchTerm={orderModal.clientSearchTerm}
        onClientSearchChange={orderModal.setClientSearchTerm}
        isSubmitting={orderModal.isBuyOrderSubmitting}
        onSubmit={() => orderModal.submitBuyOrder(orderModal.selectedOrderInstrument?.token ? liveTicks[orderModal.selectedOrderInstrument.token] : null)}
        onCancel={() => orderModal.resetBuyForm(isAdminUser)}

        // Drag handlers
        modalPosition={orderModal.buyModalPosition}
        isDragging={orderModal.isDraggingBuy}
      />

      {/* Sell Order Modal Mapping */}
      <OrderModal
        isOpen={orderModal.showSellOrderModal}
        onClose={orderModal.closeSellModal}
        orderType="SELL"
        selectedInstrument={orderModal.selectedOrderInstrument}
        liveData={orderModal.selectedOrderInstrument?.token ? liveTicks[orderModal.selectedOrderInstrument.token] : null}
        
        // Form States
        orderQuantity={orderModal.sellOrderQuantity}
        onOrderQuantityChange={orderModal.setSellOrderQuantity}
        orderPrice={orderModal.sellOrderPrice}
        onOrderPriceChange={orderModal.setSellOrderPrice}
        orderMethod={orderModal.sellOrderType}
        onOrderMethodChange={orderModal.setSellOrderType}
        orderRemark={orderModal.sellOrderRemark}
        onOrderRemarkChange={orderModal.setSellOrderRemark}
        
        // Admin overrides & actions
        isAdminUser={isAdminUser}
        selectedClient={orderModal.selectedClient}
        onClientSelect={orderModal.setSelectedClient}
        clientSearchTerm={orderModal.clientSearchTerm}
        onClientSearchChange={orderModal.setClientSearchTerm}
        isSubmitting={orderModal.isSellOrderSubmitting}
        onSubmit={() => orderModal.submitSellOrder(orderModal.selectedOrderInstrument?.token ? liveTicks[orderModal.selectedOrderInstrument.token] : null)}
        onCancel={() => orderModal.resetSellForm(isAdminUser)}

        // Drag handlers
        modalPosition={orderModal.sellModalPosition}
        isDragging={orderModal.isDraggingSell}
      />
    </div>
  )
}

export default Positions