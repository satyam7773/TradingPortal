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
  realisedPnl: number
  totalPnl: number
  marginUsed: number
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
  // Around line 38
  const [selectedUserId, setSelectedUserId] = useState<number>(0)
  const [selectedUsername, setSelectedUsername] = useState<string>('All Users')
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

  // Order modal hook
  const userData = localStorage.getItem('userData')
  const user = userData ? JSON.parse(userData) : null
  const isAdminUser = user?.roleId === 1 || user?.roleId === 2 || user?.roleId === 3
  const orderModal = useOrderModal(isAdminUser)

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

        // Fetch users/clients for trading
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
        toast.error('Failed to load initial data')
      } finally {
        setInitialLoading(false)
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    if (!initialLoading && exchanges.length > 0 && selectedExchange) {
      handleView();
    }
  }, [initialLoading, exchanges]);

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
          setSelectedToken(null)
        }
      } catch (error) {
        console.error('❌ Error fetching symbols:', error)
      }
    }

    fetchSymbolsForExchange()
  }, [selectedExchange])

  const handleView = async () => {
    if (!selectedExchange) {
      toast.error('Please select an exchange')
      return
    }

    try {
      setLoading(true)

      let userIdsToFetch: number[] = []

      if (selectedUserId === 0) {
        // If "All" is selected, send all user IDs except the 0 itself
        userIdsToFetch = users.filter(u => u.userId !== 0).map(u => u.userId)
      } else {
        userIdsToFetch = [selectedUserId]
      }

      console.log('📊 Fetching positions:', {
        exchange: selectedExchange,
        token: selectedToken,
        userIds: userIdsToFetch
      })

      const response = await userManagementService.fetchUserPositionsForExchange(
        selectedExchange,
        selectedToken || 0,
        userIdsToFetch
      )

      console.log('✅ Positions response:', response)

      if (response?.responseCode === '0' && response.data) {
        setPositionData(response.data)

        // Apply symbol filter if selected
        let positions = response.data.positions || []
        if (selectedSymbol) {
          positions = positions.filter((p: PositionData) => p.tradeSymbol === selectedSymbol)
        }

        console.log('✅ Positions loaded:', positions)
        setFilteredPositions(positions)
        toast.success(`Loaded ${positions.length} positions`)
      } else {
        toast.error(response?.responseMessage || 'Failed to fetch positions')
      }
    } catch (error: any) {
      console.error('❌ Error:', error)
      const errorMessage = error.response?.data?.responseMessage || error.message || 'Failed to fetch positions'
      toast.error(errorMessage)
      setPositionData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setSelectedUsername('All Users')
    setSelectedUserId(null)
    setSelectedExchange(exchanges.length > 0 ? exchanges[0].name : '')
    setSelectedSymbol('')
    setSelectedToken(null)
    setPositionData(null)
    setFilteredPositions([])
  }

  // Handle drag for order modals
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (orderModal.isDraggingBuy) {
        orderModal.setBuyModalPosition({
          x: e.clientX - orderModal.dragOffset.x,
          y: e.clientY - orderModal.dragOffset.y
        })
      }
      if (orderModal.isDraggingSell) {
        orderModal.setSellModalPosition({
          x: e.clientX - orderModal.dragOffset.x,
          y: e.clientY - orderModal.dragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      orderModal.setIsDraggingBuy(false)
      orderModal.setIsDraggingSell(false)
    }

    if (orderModal.isDraggingBuy || orderModal.isDraggingSell) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [orderModal.isDraggingBuy, orderModal.isDraggingSell, orderModal.dragOffset.x, orderModal.dragOffset.y])

  const formatDateTime = (timestampMs: number) => {
    if (!timestampMs) return '-'
    const date = new Date(timestampMs)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
    if (pnl < 0) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/30'
  }

  const getPositionIcon = (position: string) => {
    if (position === 'BUY') {
      return <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    }
    return <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
  }

  const stats = {
    totalPositions: filteredPositions.length,
    buyPositions: filteredPositions.filter(p => p.position === 'BUY').length,
    sellPositions: filteredPositions.filter(p => p.position === 'SELL').length,
    totalPnL: filteredPositions.reduce((sum, p) => sum + p.totalPnl, 0),
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="positions:showFilters"
          filterWidthClass="lg:w-[25%]"
          filters={
            <div className="space-y-4 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Filter</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Username :</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
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
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Symbol :</label>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => {
                      setSelectedSymbol(e.target.value)
                      if (e.target.value === '') {
                        setSelectedToken(null)
                      } else {
                        const symData = filteredSymbols.find(s => s.tradeSymbol === e.target.value)
                        setSelectedToken(symData?.token || null)
                      }
                    }}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">All Scripts</option>
                    {filteredSymbols.map(sym => (
                      <option key={sym.token} value={sym.tradeSymbol}>
                        {sym.tradeSymbol}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleView}
                    disabled={loading || initialLoading}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded font-semibold text-sm transition"
                  >
                    {loading ? 'Loading...' : 'Apply'}
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
          <div className="flex flex-col h-full gap-4 p-4">
            {/* Stats Header */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Positions</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalPositions}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Buy</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.buyPositions}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Sell</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.sellPositions}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Total P&L</p>
                <p className={`text-2xl font-bold mt-1 ${stats.totalPnL > 0 ? 'text-emerald-600 dark:text-emerald-400' : stats.totalPnL < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  ₹{stats.totalPnL.toFixed(0)}
                </p>
              </div>
            </div>

            {/* Table Container */}
            {initialLoading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-500 border-t-blue-500 dark:border-t-blue-300 mx-auto"></div>
                  <p className="mt-4 text-slate-700 dark:text-slate-300 font-medium">Loading initial data...</p>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-500 border-t-blue-500 dark:border-t-blue-300 mx-auto"></div>
                  <p className="mt-4 text-slate-700 dark:text-slate-300 font-medium">Fetching positions...</p>
                </div>
              </div>
            ) : !filteredPositions || filteredPositions.length === 0 ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-3 opacity-50" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">No positions found</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Select filters and click "Apply" to load data</p>
                </div>
              </div>
            ) : (
              <>
                {/* Table Container */}
                <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600 scrollbar-track-slate-200 dark:scrollbar-track-slate-800">
                  <table className="w-full border-collapse">
                    <colgroup>
                      <col style={{ width: '50px' }} />
                      <col style={{ width: '60px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '80px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '150px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 sticky top-0 z-10 border-b-2 border-blue-200 dark:border-blue-500/30">
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">View</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Own</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Exchange</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Symbol</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Position</th>
                        <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Average Rate</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">CMP</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-blue-300 uppercase tracking-wider">Profit / Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPositions.map((position) => (
                        <tr
                          key={position.positionId}
                          className="border-b border-slate-200/70 dark:border-slate-700/70 hover:bg-blue-50/80 dark:hover:bg-slate-700/50 transition-colors duration-150 group"
                        >
                          <td className="px-4 py-3.5 text-center text-sm">
                            <button
                              onClick={() => {
                                // Will open position details modal later
                                console.log('View position:', position.positionId)
                              }}
                              className="p-2 hover:bg-blue-200 dark:hover:bg-blue-700 rounded transition"
                              title="View position details"
                            >
                              <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm">
                            <button
                              onClick={() => {
                                // Will handle own position action later
                                console.log('Own position:', position.positionId)
                              }}
                              className="p-2 hover:bg-amber-200 dark:hover:bg-amber-700 rounded transition"
                              title="Your position"
                            >
                              <Briefcase className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm font-bold text-slate-900 dark:text-slate-100">
                            {position.exchange}
                          </td>
                          <td className="px-4 py-3.5 text-left text-sm font-bold text-slate-900 dark:text-slate-100">
                            {position.tradeSymbol}
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm">
                            <div className="flex items-center justify-center gap-2">
                              {getPositionIcon(position.position)}
                              <span className={`font-bold ${position.position === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {position.position}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center text-sm text-slate-700 dark:text-slate-300 font-medium">
                            {position.quantity}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm text-slate-800 dark:text-slate-200 font-semibold">
                            {position.averagePrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm text-slate-800 dark:text-slate-200 font-semibold">
                            {position.ltp ? position.ltp.toFixed(2) : '-'}
                          </td>
                          <td className={`px-4 py-3.5 text-right text-sm font-bold rounded-lg ${getPnLColor(position.totalPnl)}`}>
                            {position.totalPnl >= 0 ? '+' : ''}₹{position.totalPnl.toFixed(2)}
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

      {/* BUY Order Modal */}
      <OrderModal
        isOpen={orderModal.showBuyOrderModal}
        onClose={() => {
          orderModal.closeBuyModal()
          orderModal.resetBuyForm(isAdminUser)
        }}
        orderType="BUY"
        selectedInstrument={orderModal.selectedOrderInstrument}
        liveData={{}}
        orderQuantity={orderModal.buyOrderQuantity}
        onOrderQuantityChange={orderModal.setBuyOrderQuantity}
        orderPrice={orderModal.buyOrderPrice}
        onOrderPriceChange={orderModal.setBuyOrderPrice}
        orderMethod={orderModal.buyOrderType}
        onOrderMethodChange={orderModal.setBuyOrderType}
        orderRemark={orderModal.buyOrderRemark}
        onOrderRemarkChange={orderModal.setBuyOrderRemark}
        isAdminUser={isAdminUser}
        clients={[]}
        selectedClient={orderModal.selectedClient}
        onClientSelect={orderModal.setSelectedClient}
        clientSearchTerm={orderModal.clientSearchTerm}
        onClientSearchChange={orderModal.setClientSearchTerm}
        isSubmitting={orderModal.isBuyOrderSubmitting}
        onSubmit={async () => {
          const success = await orderModal.submitBuyOrder({})
          if (success) {
            orderModal.closeBuyModal()
          }
        }}
        onCancel={() => orderModal.resetBuyForm(isAdminUser)}
        modalPosition={orderModal.buyModalPosition}
        isDragging={orderModal.isDraggingBuy}
        onDragStart={(e) => {
          const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
          orderModal.setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          })
          orderModal.setIsDraggingBuy(true)
        }}
      />

      {/* SELL Order Modal */}
      <OrderModal
        isOpen={orderModal.showSellOrderModal}
        onClose={() => {
          orderModal.closeSellModal()
          orderModal.resetSellForm(isAdminUser)
        }}
        orderType="SELL"
        selectedInstrument={orderModal.selectedOrderInstrument}
        liveData={{}}
        orderQuantity={orderModal.sellOrderQuantity}
        onOrderQuantityChange={orderModal.setSellOrderQuantity}
        orderPrice={orderModal.sellOrderPrice}
        onOrderPriceChange={orderModal.setSellOrderPrice}
        orderMethod={orderModal.sellOrderType}
        onOrderMethodChange={orderModal.setSellOrderType}
        orderRemark={orderModal.sellOrderRemark}
        onOrderRemarkChange={orderModal.setSellOrderRemark}
        isAdminUser={isAdminUser}
        clients={[]}
        selectedClient={orderModal.selectedClient}
        onClientSelect={orderModal.setSelectedClient}
        clientSearchTerm={orderModal.clientSearchTerm}
        onClientSearchChange={orderModal.setClientSearchTerm}
        isSubmitting={orderModal.isSellOrderSubmitting}
        onSubmit={async () => {
          const success = await orderModal.submitSellOrder({})
          if (success) {
            orderModal.closeSellModal()
          }
        }}
        onCancel={() => orderModal.resetSellForm(isAdminUser)}
        modalPosition={orderModal.sellModalPosition}
        isDragging={orderModal.isDraggingSell}
        onDragStart={(e) => {
          const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
          orderModal.setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          })
          orderModal.setIsDraggingSell(true)
        }}
      />
    </div>
  )
}

export default Positions
