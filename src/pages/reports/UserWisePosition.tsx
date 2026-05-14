import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { BarChart3, Search, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import userManagementService from '../../services/userManagementService';
import marketWatchService from '../../services/marketWatchService';
import toast from 'react-hot-toast';
import FilterLayout from '../../components/FilterLayout';

interface PositionData {
  positionId: number;
  positionDate: number;
  positionDays: number;
  username: string;
  parentUsername: string;
  exchange: string;
  tradeSymbol: string;
  position: 'BUY' | 'SELL';
  quantity: number;
  averagePrice: number;
  ltp: number | null;
  bid?: number;
  ask?: number;
  buyQty?: number;
  sellQty?: number;
  pnl: number;
  pnlPercentage: number;
  realisedPnl: number;
  totalPnl: number;
  marginUsed: number;
  token: number; // Instrument token from API for socket subscriptions
}

interface PriceChange {
  ltp?: 'up' | 'down'
  bid?: 'up' | 'down'
  ask?: 'up' | 'down'
  buyQty?: 'up' | 'down'
  sellQty?: 'up' | 'down'
  pnl?: 'up' | 'down'
}

interface PositionResponse {
  balance: number;
  totalBuy: number;
  totalSell: number;
  other: number;
  brokerage: number;
  positions: PositionData[];
}

const UserWisePosition: React.FC = () => {
  const [selectedUsername, setSelectedUsername] = useState<string>('All Users');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('All Symbols');
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [plPercent, setPlPercent] = useState<string>('');
  const [posiDays, setPosiDays] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [positionData, setPositionData] = useState<PositionResponse | null>(null);
  const [filteredPositions, setFilteredPositions] = useState<PositionData[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [symbols, setSymbols] = useState<any[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<any[]>([]);
  
  // Socket subscription refs
  const subscriptionRef = useRef({ subscribed: false, userId: null as string | null })
  const feedUnsubscribeRef = useRef<(() => void) | null>(null)
  const subscribedTokensRef = useRef<Set<number>>(new Set())
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  // Price change tracking for highlighting
  const [priceChanges, setPriceChanges] = useState<Record<number, PriceChange>>({})
  const previousPricesRef = useRef<Record<number, { ltp: number; bid: number; ask: number; buyQty: number; sellQty: number; pnl: number }>>({})

  // Cleanup socket subscriptions on unmount
  useEffect(() => {
    return () => {
      // Stop polling timer
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
        console.log('⏸️  Stopped instruments polling timer')
      }
      
      // Unsubscribe from STOMP queues when component unmounts
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        const userId = user.userId.toString()
        if (subscriptionRef.current.subscribed) {
          console.log(`🔕 Unsubscribing from instruments for user: ${userId}`)
          marketWatchService.unsubscribeFromInstruments(userId)
        }
      }
      
      // Cleanup feed subscription
      if (feedUnsubscribeRef.current) {
        feedUnsubscribeRef.current()
      }
      
      // Reset subscription guards
      subscriptionRef.current = { subscribed: false, userId: null }
      subscribedTokensRef.current.clear()
    }
  }, []);

  // Clear price change animations after delay
  useEffect(() => {
    if (Object.keys(priceChanges).length > 0) {
      const timeout = setTimeout(() => {
        setPriceChanges({})
      }, 300) // Clear after 300ms
      
      return () => clearTimeout(timeout)
    }
  }, [priceChanges]);

  // Load initial data (users and exchanges)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true);
        
        // Fetch users/clients for trading
        const usersResponse = await userManagementService.fetchUserClientsForTrade();
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data);
        }

        // Fetch exchanges
        const exchangesResponse = await userManagementService.fetchExchanges();
        if (Array.isArray(exchangesResponse)) {
          setExchanges(exchangesResponse);
          if (exchangesResponse.length > 0) {
            // Set the first exchange as selected
            // This will trigger the selectedExchange effect which will fetch symbols
            setSelectedExchange(exchangesResponse[0].name);
          }
        }
      } catch (error: any) {
        console.error('❌ Error loading initial data:', error);
        toast.error('Failed to load initial data');
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Fetch symbols when exchange changes 
  useEffect(() => {
    if (!selectedExchange) return;
    
    // Unsubscribe when exchange changes (only if already subscribed)
    if (subscriptionRef.current.subscribed) {
      console.log('🔕 Exchange changed, unsubscribing from instruments')
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        marketWatchService.unsubscribeFromInstruments(user.userId.toString())
      }
      
      // Stop polling
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
      }
      
      // Reset subscription state
      subscriptionRef.current = { subscribed: false, userId: null }
    }
    
    const fetchSymbolsForExchange = async () => {
      try {
        console.log('🔄 Fetching symbols for exchange:', selectedExchange);
        const symbolsResponse = await userManagementService.fetchSymbols(selectedExchange);
        if (symbolsResponse?.responseCode === '0' && Array.isArray(symbolsResponse.data)) {
          setSymbols(symbolsResponse.data);
          setFilteredSymbols(symbolsResponse.data);
          setSelectedSymbol('All Symbols');
          setSelectedToken(null);
        }
      } catch (error) {
        console.error('❌ Error fetching symbols:', error);
      }
    };
    fetchSymbolsForExchange();
  }, [selectedExchange]);

  const handleView = async () => {
    if (!selectedUsername.trim()) {
      toast.error('Please select a user or "All Users"');
      return;
    }

    setLoading(true);
    
    // Unsubscribe from previous subscriptions before loading new data
    if (subscriptionRef.current.subscribed) {
      console.log('🔕 Unsubscribing from previous instruments subscription')
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        const userId = user.userId.toString()
        marketWatchService.unsubscribeFromInstruments(userId)
      }
      
      // Stop polling timer
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current)
        pollingTimerRef.current = null
      }
      
      // Cleanup feed subscription
      if (feedUnsubscribeRef.current) {
        feedUnsubscribeRef.current()
        feedUnsubscribeRef.current = null
      }
      
      // Reset subscription guards
      subscriptionRef.current = { subscribed: false, userId: null }
      subscribedTokensRef.current.clear()
      
      // Clear price changes and previous prices
      setPriceChanges({})
      previousPricesRef.current = {}
    }
    
    try {
      let userIdsToFetch: number[] = [];

      // Handle "All Users" selection
      if (selectedUsername === 'All Users') {
        if (users.length === 0) {
          toast.error('No users available');
          return;
        }
        // Extract all user IDs
        userIdsToFetch = users.map(u => u.id);
        console.log(`📊 Fetching positions for all ${userIdsToFetch.length} users:`, userIdsToFetch);
      } else {
        // Find specific user
        const userData = users.find(u => u.name === selectedUsername);
        if (!userData) {
          toast.error('User not found');
          return;
        }
        userIdsToFetch = [userData.id];
        console.log(`📊 Fetching positions for user: ${selectedUsername} (ID: ${userData.id})`);
      }

      // Use the new positions API with exchange, token, and userIds
      // Send empty string for exchange if "All Exchanges" is selected (backend will handle it)
      // Send 0 for token if "All Symbols" is selected (backend will handle it)
      const exchangeToUse = selectedExchange === '' ? '' : selectedExchange;
      const tokenToUse = selectedToken === null ? 0 : selectedToken;
      
      const response = await userManagementService.fetchUserPositionsForExchange(
        exchangeToUse,
        tokenToUse,
        userIdsToFetch
      );
      
      if (response?.responseCode === '0') {
        // Extract positions from response.data.positions
        const posData = response.data;
        setPositionData(posData);
        setFilteredPositions(posData?.positions || []);
        
        // Initialize previous prices for change tracking
        posData?.positions?.forEach((position: PositionData) => {
          if (position.token) {
            previousPricesRef.current[position.token] = {
              ltp: position.ltp || 0,
              bid: position.bid || 0,
              ask: position.ask || 0,
              buyQty: position.buyQty || 0,
              sellQty: position.sellQty || 0,
              pnl: position.pnl
            };
          }
        });
        
        // Setup socket subscriptions for the first user (or use admin/system user)
        // For all users, we'll subscribe using the current logged-in user
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        setupSocketSubscriptions(currentUser.userId || userIdsToFetch[0], posData?.positions || []);
        
        toast.success(`Positions loaded successfully for ${userIdsToFetch.length} user(s)`);
      } else {
        toast.error(response?.responseMessage || 'Failed to fetch positions');
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      const errorMessage = error.response?.data?.responseMessage || error.message || 'Failed to fetch positions';
      toast.error(errorMessage);
      setPositionData(null);
      setFilteredPositions([]);
    } finally {
      setLoading(false);
    }
  };

  // Setup socket subscriptions for real-time position updates
  const setupSocketSubscriptions = async (userId: number, positions: PositionData[]) => {
    try {
      // If socket is not connected, try to connect it
      if (!marketWatchService.isConnected()) {
        console.log('⏳ Socket not connected, attempting to connect...')
        try {
          await marketWatchService.connect(() => {
            console.log('🔌 Socket connected from UserWisePosition page')
          })
          console.log('✅ Socket connection successful')
        } catch (error) {
          console.warn('⚠️ Failed to connect socket:', error)
          return
        }
      }

      const userIdStr = userId.toString()

      // Guard: check if already subscribed for this user
      if (subscriptionRef.current.subscribed && subscriptionRef.current.userId === userIdStr) {
        console.log('✅ Already subscribed for user:', userIdStr)
        return
      }

      console.log('✅ Setting up subscriptions for user:', userIdStr, 'with', positions.length, 'positions')

      // Mark as subscribed
      subscriptionRef.current = { subscribed: true, userId: userIdStr }

      // Subscribe to instruments queue for this user
      marketWatchService.subscribeToInstruments(userIdStr)

      // Setup feed subscription to receive real-time updates
      if (feedUnsubscribeRef.current) {
        feedUnsubscribeRef.current()
      }

      let dataReceivedCount = 0
      let lastUpdateTime = 0
      const UPDATE_THROTTLE = 100 // Update at most every 100ms
      
      feedUnsubscribeRef.current = marketWatchService.onFeedData((data) => {
        dataReceivedCount++
        if (dataReceivedCount === 1 || dataReceivedCount % 50 === 0) {
          console.log('📊 UserWisePosition Feed Response [' + dataReceivedCount + ']:', data?.length || 0, 'instruments')
          if (dataReceivedCount === 1) {
            console.log('📊 First feed data sample:', data[0])
            console.log('📊 Available fields:', data[0] ? Object.keys(data[0]) : 'none')
            console.log('📊 Position tokens:', positions.map(p => p.token))
          }
        }
        
        // Throttle updates to prevent UI hanging
        const now = Date.now()
        if (now - lastUpdateTime < UPDATE_THROTTLE) {
          return // Skip this update
        }
        lastUpdateTime = now

        // Update position data with real-time prices (ltp)
        if (Array.isArray(data)) {
          // Create a map of token to new price data for fast lookup
          const priceMap = new Map(data.map(item => [item.insToken, item]))
          
          // Track price changes for animations
          const changes: Record<number, PriceChange> = {}

          setPositionData(prevData => {
            if (!prevData) return prevData

            // Update positions with new LTP and market data
            const updatedPositions = prevData.positions.map(position => {
              const newPrice = priceMap.get(position.token)
              if (newPrice && newPrice.ltp !== undefined) {
                // Recalculate P&L with new LTP
                const pnl = (newPrice.ltp - position.averagePrice) * position.quantity
                const pnlPercentage = ((newPrice.ltp - position.averagePrice) / position.averagePrice) * 100
                
                // Track changes for animation
                const prevPrices = previousPricesRef.current[position.token]
                if (prevPrices) {
                  const change: PriceChange = {}
                  const ltpDiff = Math.abs(newPrice.ltp - prevPrices.ltp)
                  const bidDiff = Math.abs((newPrice.bid || 0) - prevPrices.bid)
                  const askDiff = Math.abs((newPrice.ask || 0) - prevPrices.ask)
                  const buyQtyDiff = Math.abs((newPrice.buyQty || 0) - prevPrices.buyQty)
                  const sellQtyDiff = Math.abs((newPrice.sellQty || 0) - prevPrices.sellQty)
                  const pnlDiff = Math.abs(pnl - prevPrices.pnl)
                  
                  if (ltpDiff > 0.01) {
                    change.ltp = newPrice.ltp > prevPrices.ltp ? 'up' : 'down'
                  }
                  if (bidDiff > 0.01) {
                    change.bid = (newPrice.bid || 0) > prevPrices.bid ? 'up' : 'down'
                  }
                  if (askDiff > 0.01) {
                    change.ask = (newPrice.ask || 0) > prevPrices.ask ? 'up' : 'down'
                  }
                  if (buyQtyDiff > 0) {
                    change.buyQty = (newPrice.buyQty || 0) > prevPrices.buyQty ? 'up' : 'down'
                  }
                  if (sellQtyDiff > 0) {
                    change.sellQty = (newPrice.sellQty || 0) > prevPrices.sellQty ? 'up' : 'down'
                  }
                  if (pnlDiff > 0.01) {
                    change.pnl = pnl > prevPrices.pnl ? 'up' : 'down'
                  }
                  if (Object.keys(change).length > 0) {
                    changes[position.token] = change
                  }
                }
                
                // Update previous prices
                previousPricesRef.current[position.token] = { 
                  ltp: newPrice.ltp, 
                  bid: newPrice.bid || 0,
                  ask: newPrice.ask || 0,
                  buyQty: newPrice.buyQty || 0,
                  sellQty: newPrice.sellQty || 0,
                  pnl 
                }
                
                return {
                  ...position,
                  ltp: newPrice.ltp,
                  bid: newPrice.bid,
                  ask: newPrice.ask,
                  buyQty: newPrice.buyQty,
                  sellQty: newPrice.sellQty,
                  pnl,
                  pnlPercentage,
                  totalPnl: pnl + position.realisedPnl
                }
              }
              return position
            })
            
            // Update price changes if any
            if (Object.keys(changes).length > 0) {
              setPriceChanges(prev => ({ ...prev, ...changes }))
            }

            return {
              ...prevData,
              positions: updatedPositions
            }
          })

          // Update filtered positions as well
          setFilteredPositions(prevFiltered => {
            return prevFiltered.map(position => {
              const newPrice = priceMap.get(position.token)
              if (newPrice && newPrice.ltp !== undefined) {
                const pnl = (newPrice.ltp - position.averagePrice) * position.quantity
                const pnlPercentage = ((newPrice.ltp - position.averagePrice) / position.averagePrice) * 100
                
                return {
                  ...position,
                  ltp: newPrice.ltp,
                  bid: newPrice.bid,
                  ask: newPrice.ask,
                  buyQty: newPrice.buyQty,
                  sellQty: newPrice.sellQty,
                  pnl,
                  pnlPercentage,
                  totalPnl: pnl + position.realisedPnl
                }
              }
              return position
            })
          })
        }
      })

      console.log('✅ Feed subscription ready for user:', userIdStr)

      // Extract instrument tokens from positions (Flutter pattern: send polling request every 1 second)
      const instrumentTokens = positions
        .map(p => p.token?.toString() || '')
        .filter(token => token !== '')
      
      if (instrumentTokens.length > 0) {
        console.log(`🔄 Starting instruments polling for ${instrumentTokens.length} tokens`)
        
        // Stop any existing polling timer
        if (pollingTimerRef.current) {
          clearInterval(pollingTimerRef.current)
        }

        // Send polling request immediately, then every 1 second (Flutter pattern)
        const sendPollingRequest = () => {
          try {
            marketWatchService.sendInstrumentsRequestduplicate(userIdStr, instrumentTokens)
          } catch (error) {
            console.warn('⚠️ Error sending instruments polling request:', error)
          }
        }

        // Send immediately on first setup
        sendPollingRequest()

        // Then send every 1 second like Flutter does
        pollingTimerRef.current = setInterval(sendPollingRequest, 1000)
        console.log(`⏱️ Instruments polling timer started (every 1000ms)`)
      } else {
        console.warn('⚠️ No instrument tokens found in positions')
      }
    } catch (error) {
      console.error('❌ Error setting up socket subscriptions:', error)
      toast.error('Failed to setup real-time updates')
    }
  };

  const handleMainFilterApply = () => {
    if (!positionData?.positions) return;

    let filtered = [...positionData.positions];

    // Filter by exchange
    if (selectedExchange && selectedExchange !== '') {
      filtered = filtered.filter(p => p.exchange === selectedExchange);
    }

    // Filter by symbol
    if (selectedSymbol && selectedSymbol !== 'All Symbols') {
      filtered = filtered.filter(p => p.tradeSymbol === selectedSymbol);
    }

    setFilteredPositions(filtered);
    toast.success('Filters applied');
  };

  const handleAdvanceFilterApply = () => {
    if (!positionData?.positions) return;

    let filtered = [...positionData.positions];

    // Filter by P/L %
    if (plPercent) {
      const plValue = parseFloat(plPercent);
      filtered = filtered.filter(p => {
        return p.pnlPercentage >= plValue;
      });
    }

    // Filter by Position Days
    if (posiDays) {
      const days = parseInt(posiDays);
      filtered = filtered.filter(p => {
        return p.positionDays <= days;
      });
    }

    setFilteredPositions(filtered);
    toast.success('Advance filters applied');
  };

  const handleClear = () => {
    setSelectedUsername('All Users');
    setSelectedExchange(exchanges[0]?.name || '');
    setSelectedSymbol('All Symbols');
    setPlPercent('');
    setPosiDays('');
    setPositionData(null);
    setFilteredPositions([]);
  };

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-lg p-2 border border-gray-200/50 dark:border-slate-600/50">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{label}</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
        </div>
        <div className={`${color} p-2 rounded`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <FilterLayout
      storageKey="userWisePosition:showFilters"
      filterWidthClass="lg:w-[25%]"
      filters={
        <div className="space-y-4 p-4">
          {/* Main Filter Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Main Filter</h3>
              <button onClick={handleClear} className="text-xs text-red-600 dark:text-red-400 hover:underline">✕</button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Username :</label>
              <select
                value={selectedUsername}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedUsername(value);
                  
                  // Only set userId if specific user is selected (not "All Users")
                  if (value === 'All Users') {
                    setSelectedUserId(null);
                  } else {
                    const userData = users.find(u => u.name === value);
                    setSelectedUserId(userData?.id || null);
                  }
                }}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="All Users">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exchange :</label>
              <select
                value={selectedExchange}
                onChange={(e) => {
                  setSelectedExchange(e.target.value);
                }}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">All Exchanges</option>
                {exchanges.map(ex => (
                  <option key={ex.name} value={ex.name}>{ex.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Symbol :</label>
              <select
                value={selectedSymbol}
                onChange={(e) => {
                  setSelectedSymbol(e.target.value);
                  if (e.target.value === '' || e.target.value === 'All') {
                    setSelectedToken(null);
                  } else {
                    const symData = filteredSymbols.find(s => s.tradeSymbol === e.target.value);
                    setSelectedToken(symData?.token || null);
                  }
                }}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">All Symbols</option>
                {filteredSymbols.map(sym => (
                  <option key={sym.token} value={sym.tradeSymbol}>{sym.tradeSymbol}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleView}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition disabled:opacity-50"
              >
                View
              </button>
              <button
                onClick={handleClear}
                className="flex-1 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded font-semibold text-sm transition"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Advance Filter Section */}
          <div className="space-y-3 pt-4 border-t border-gray-300 dark:border-slate-600">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Advance Filter</h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">P/L % :</label>
              <input
                type="number"
                value={plPercent}
                onChange={(e) => setPlPercent(e.target.value)}
                placeholder="e.g., 2.00"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Posi Days :</label>
              <input
                type="number"
                value={posiDays}
                onChange={(e) => setPosiDays(e.target.value)}
                placeholder="e.g., 10"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAdvanceFilterApply}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm transition"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setPlPercent('');
                  setPosiDays('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold text-sm transition"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      }
    >
      {/* Main Content Area */}
      <div className="p-4 flex flex-col h-full">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="inline-block">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-4">Loading positions...</p>
            </div>
          </div>
        ) : !positionData ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 text-blue-400 dark:text-blue-300 mb-4 mx-auto" />
              <p className="text-slate-600 dark:text-slate-400">Select a user and click View to see positions</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <StatCard
                label="Balance"
                value={`₹${positionData.balance?.toFixed(2) || '0'}`}
                icon={DollarSign}
                color={positionData.balance >= 0 ? 'bg-green-500' : 'bg-red-500'}
              />
              <StatCard
                label="Total Buy"
                value={`₹${positionData.totalBuy?.toFixed(2) || '0'}`}
                icon={TrendingUp}
                color="bg-green-500"
              />
              <StatCard
                label="Total Sell"
                value={`₹${positionData.totalSell?.toFixed(2) || '0'}`}
                icon={TrendingDown}
                color="bg-red-500"
              />
              <StatCard
                label="Other"
                value={`₹${positionData.other?.toFixed(2) || '0'}`}
                icon={AlertCircle}
                color="bg-blue-500"
              />
              <StatCard
                label="Brokerage"
                value={`₹${positionData.brokerage?.toFixed(2) || '0'}`}
                icon={DollarSign}
                color="bg-orange-500"
              />
              <StatCard
                label="Positions"
                value={`${positionData.positions?.length || '0'}`}
                icon={BarChart3}
                color="bg-purple-500"
              />
            </div>

            {/* Positions Table */}
            {filteredPositions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 rounded-xl border border-gray-200/50 dark:border-slate-700/50">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">No positions found</p>
                </div>
              </div>
            ) : (
              <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl border border-gray-200/50 dark:border-slate-700/50 overflow-x-auto overflow-y-auto flex-1">
                <table className="min-w-[1800px] w-full">
                  <thead className="sticky top-0 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-600 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">Username</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">PositionDate</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">PositionDays</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">Exchange</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">Symbol</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Position</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Quantity</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Avg Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Buy Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Bid</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Ask</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Sell Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">LTP</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Realised P&L</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Unrealised P&L</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">P&L %</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Margin Used</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
                    {filteredPositions.map((position) => {
                      const changes = priceChanges[position.token] || {}
                      return (
                        <tr
                          key={`${position.token}-${position.positionId}-${position.username}`}
                          className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200"
                        >
                          <td className="px-4 py-2 text-xs text-slate-700 dark:text-slate-300">{position.username}</td>
                          <td className="px-4 py-2 text-xs text-slate-700 dark:text-slate-300">{position.positionDate ? new Date(position.positionDate).toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-2 text-xs text-center text-slate-700 dark:text-slate-300">{position.positionDays || '-'}</td>
                          <td className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{position.exchange}</td>
                          <td className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{position.tradeSymbol}</td>
                          <td className="px-4 py-2 text-xs text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              position.position === 'BUY'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {position.position}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-center text-slate-700 dark:text-slate-300 font-semibold">{position.quantity}</td>
                          <td className="px-4 py-2 text-xs text-right text-slate-700 dark:text-slate-300">₹{position.averagePrice?.toFixed(2)}</td>
                          
                          {/* Buy Qty with highlighting */}
                          <td className="px-4 py-2 text-right">
                            <span 
                              className={`inline-block px-2 py-1 rounded-lg font-medium text-xs transition-all hover:scale-105 cursor-pointer ${
                                changes.buyQty 
                                  ? (changes.buyQty === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600'
                              }`}
                              onMouseEnter={(e) => { if (!changes.buyQty) e.currentTarget.style.color = 'white' }}
                              onMouseLeave={(e) => { if (!changes.buyQty) e.currentTarget.style.color = '' }}
                            >
                              {position.buyQty || '-'}
                            </span>
                          </td>
                          
                          {/* Bid with highlighting */}
                          <td className="px-4 py-2 text-right">
                            <span 
                              className={`inline-block px-2 py-1 rounded-lg font-semibold text-xs transition-all hover:scale-105 cursor-pointer ${
                                changes.bid 
                                  ? (changes.bid === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600'
                              }`}
                              onMouseEnter={(e) => { if (!changes.bid) e.currentTarget.style.color = 'white' }}
                              onMouseLeave={(e) => { if (!changes.bid) e.currentTarget.style.color = '' }}
                            >
                              {position.bid ? `₹${position.bid.toFixed(2)}` : '-'}
                            </span>
                          </td>
                          
                          {/* Ask with highlighting */}
                          <td className="px-4 py-2 text-right">
                            <span 
                              className={`inline-block px-2 py-1 rounded-lg font-semibold text-xs transition-all hover:scale-105 cursor-pointer ${
                                changes.ask 
                                  ? (changes.ask === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600'
                              }`}
                              onMouseEnter={(e) => { if (!changes.ask) e.currentTarget.style.color = 'white' }}
                              onMouseLeave={(e) => { if (!changes.ask) e.currentTarget.style.color = '' }}
                            >
                              {position.ask ? `₹${position.ask.toFixed(2)}` : '-'}
                            </span>
                          </td>
                          
                          {/* Sell Qty with highlighting */}
                          <td className="px-4 py-2 text-right">
                            <span 
                              className={`inline-block px-2 py-1 rounded-lg font-medium text-xs transition-all hover:scale-105 cursor-pointer ${
                                changes.sellQty 
                                  ? (changes.sellQty === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600'
                              }`}
                              onMouseEnter={(e) => { if (!changes.sellQty) e.currentTarget.style.color = 'white' }}
                              onMouseLeave={(e) => { if (!changes.sellQty) e.currentTarget.style.color = '' }}
                            >
                              {position.sellQty || '-'}
                            </span>
                          </td>
                          
                          {/* LTP with highlighting */}
                          <td className="px-4 py-2 text-right">
                            <span 
                              className={`inline-block px-2 py-1 rounded-lg font-bold text-xs transition-all hover:scale-105 cursor-pointer ${
                                changes.ltp 
                                  ? (changes.ltp === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-600'
                              }`}
                              onMouseEnter={(e) => { if (!changes.ltp) e.currentTarget.style.color = 'white' }}
                              onMouseLeave={(e) => { if (!changes.ltp) e.currentTarget.style.color = '' }}
                            >
                              ₹{position.ltp ? position.ltp.toFixed(2) : '-'}
                            </span>
                          </td>
                          
                          <td className={`px-4 py-2 text-xs text-right font-semibold ${
                            position.realisedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            ₹{position.realisedPnl?.toFixed(2)}
                          </td>
                          
                          {/* Unrealised P&L with highlighting */}
                          <td className="px-4 py-2 text-right">
                            <span 
                              className={`inline-block px-2 py-1 rounded-lg font-bold text-xs transition-all hover:scale-105 cursor-pointer ${
                                changes.pnl 
                                  ? (changes.pnl === 'up' ? 'bg-blue-700 text-white' : 'bg-red-700 text-white')
                                  : (position.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
                              }`}
                            >
                              ₹{position.pnl?.toFixed(2)}
                            </span>
                          </td>
                          
                          <td className={`px-4 py-2 text-xs text-right font-semibold ${
                            position.pnlPercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {position.pnlPercentage?.toFixed(2)}%
                          </td>
                          
                          <td className="px-4 py-2 text-xs text-right text-slate-700 dark:text-slate-300">₹{position.marginUsed?.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </FilterLayout>
  );
};

export default UserWisePosition;
