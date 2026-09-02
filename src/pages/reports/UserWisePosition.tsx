
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, AlertCircle, IndianRupee } from 'lucide-react';
import userManagementService from '../../services/userManagementService';
import marketWatchService from '../../services/marketWatchService';
import toast from 'react-hot-toast';
import FilterLayout from '../../components/FilterLayout';
import SearchableSelect from '../../components/ui/SearchableSelect';
import UserDetailsModal from '../user-management/UserDetailsModal';
import DownloadReport from '../../components/DownloadReport';
import { useDownloadReport } from '../../hooks/useDownloadReport';

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
  netQuantity:number;
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
  token: number;
}

interface PriceChange {
  ltp?: 'up' | 'down';
  bid?: 'up' | 'down';
  ask?: 'up' | 'down';
  buyQty?: 'up' | 'down';
  sellQty?: 'up' | 'down';
  pnl?: 'up' | 'down';
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
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [positionData, setPositionData] = useState<PositionResponse | null>(null);
  const [filteredPositions, setFilteredPositions] = useState<PositionData[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [filteredSymbols, setFilteredSymbols] = useState<any[]>([]);

  const subscriptionRef = useRef({ subscribed: false, userId: null as string | null });
  const feedUnsubscribeRef = useRef<(() => void) | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [priceChanges, setPriceChanges] = useState<Record<number, PriceChange>>({});
  const previousPricesRef = useRef<Record<number, any>>({});

  const [plPercent, setPlPercent] = useState<string>('');
  const [posiDays, setPosiDays] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const userDataStr = localStorage.getItem('userData');
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  const loggedInUserId = userData?.userId || 31;

  // Initialize download hook
  const downloadReport = useDownloadReport({
    apiEndpoint: 'https://api-staging.rivoplus.live/oms/positions/download',
    filename: 'userwise-positions',
    onBeforeDownload: () => setIsDownloading(true),
    onAfterDownload: () => setIsDownloading(false)
  });

  // Handle download with current filters
  const handleDownloadReport = async (format: 'pdf' | 'excel') => {
    if (!positionData) {
      toast.error('No positions data to download');
      return;
    }

    try {
      await downloadReport.download(format, {
        userId: loggedInUserId,
        requestTimestamp: Date.now().toString(),
        data: {
          userId: selectedUserId || loggedInUserId,
          exchange: selectedExchange || 'All Exchanges',
          tradeSymbol: selectedSymbol || ''
        }
      }, {
        pdf: format === 'pdf'
      });
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const userOptions = useMemo(() => [
    ...users.map(u => ({ id: u.userId, name: u.userName }))
  ], [users]);

  const symbolOptions = useMemo(() => [
    ...filteredSymbols.map(s => ({ id: s.tradeSymbol || s.token, name: s.tradeSymbol || s }))
  ], [filteredSymbols]);

  const handleAdvanceFilterApply = () => {
    if (!positionData?.positions) return;
    let filtered = [...positionData.positions];

    if (plPercent) {
      const plValue = parseFloat(plPercent);
      filtered = filtered.filter(p => p.pnlPercentage >= plValue);
    }
    if (posiDays) {
      const days = parseInt(posiDays);
      filtered = filtered.filter(p => p.positionDays <= days);
    }

    setFilteredPositions(filtered);
    toast.success('Advance filters applied');
  };

  const unsubscribeCurrentFeed = useCallback(() => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    if (feedUnsubscribeRef.current) feedUnsubscribeRef.current();
    if (subscriptionRef.current.subscribed && subscriptionRef.current.userId) {
      marketWatchService.unsubscribeFromInstruments(subscriptionRef.current.userId);
      subscriptionRef.current = { subscribed: false, userId: null };
    }
  }, []);

  useEffect(() => {
    return () => unsubscribeCurrentFeed();
  }, [unsubscribeCurrentFeed]);

  const handleView = async (targetExchange?: string, targetUserIds?: number[]) => {
    setLoading(true);
    unsubscribeCurrentFeed();
    setPriceChanges({});

    try {
      // const uids = targetUserIds || (selectedUserId === 0 ? users.map(u => u.id) : [selectedUserId]);
      const exchangeToUse = targetExchange || selectedExchange;
      const tokenToUse = selectedToken || 0;

      const response = await userManagementService.fetchUserPositionsForExchange(
        exchangeToUse,
        tokenToUse,
        selectedUserId
      );

      if (response?.responseCode === '0') {
        const posData = response.data;
        
        // Initialize bid/ask from ltp for all positions (will be overridden by market data)
        if (posData?.positions) {
          posData.positions = posData.positions.map((pos: PositionData) => ({
            ...pos,
            bid: pos.bid || pos.ltp || 0,
            ask: pos.ask || pos.ltp || 0
          }));
        }
        
        setPositionData(posData);
        setFilteredPositions(posData?.positions || []);

        if (posData?.positions?.length > 0) {
          const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
          setupSocketSubscriptions(currentUser.userId, posData.positions);
        }
      } else {
        setFilteredPositions([]);
        setPositionData(null);
      }
    } catch (error) {
      toast.error('Failed to fetch positions');
      setFilteredPositions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // const usersResponse = await userManagementService.fetchUserClientsForTrade();

        const userData = localStorage.getItem("userData");
        const user = userData ? JSON.parse(userData) : null;
        const loggedInUserId = user?.userId;
        const usersResponse =
          await userManagementService.fetchOwnUsersForUserwisePosition(loggedInUserId);


        const exchangesResponse = await userManagementService.fetchExchanges();

        let initialUserIds: number[] = [];
        if (usersResponse?.responseCode === '0') {
          setUsers(usersResponse.data);
          initialUserIds = usersResponse.data.map((u: any) => u.userId);
        }

        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse);
          const defaultExchange = exchangesResponse[0].name;
          setSelectedExchange(defaultExchange);
          
          // Fetch symbols for the default exchange on page load
          const symbolsResponse = await userManagementService.fetchSymbols(defaultExchange);
          if (symbolsResponse) {
            let symbolsData = symbolsResponse;
            // Handle both auto-unwrapped (array) and non-unwrapped (object with data) responses
            if (symbolsResponse?.responseCode === '0' && symbolsResponse.data) {
              symbolsData = symbolsResponse.data;
            }
            if (Array.isArray(symbolsData) && symbolsData.length > 0) {
              setFilteredSymbols(symbolsData);
            }
          }
        }

        await handleView(exchangesResponse?.[0]?.name, initialUserIds);
      } catch (err) {
        console.error(err);
      }
    };
    loadInitialData();
  }, []);


  const getRoleType = (roleId: number): 'Client' | 'Master' | 'Admin' => {
    switch (roleId) {
      case 1: return 'Admin';
      case 2: return 'Admin';
      case 3: return 'Master';
      case 4: return 'Client';
      default: return 'Client';
    }
  };

  const handleOpenUserDetails = async (username: string) => {
    try {
      const user = users.find(u => u.userName === username);
      if (!user) return;

      const apiResponse = await userManagementService.fetchUserDetails(Number(user.userId));

      if (apiResponse?.data) {
        const apiData = apiResponse.data;
        const apiUser = apiData.userProfile;
        const userInfo = apiData.userInfo;
        const userSettings = apiData.userSettings;

        // Extract toggle values from userSettingsToggles array
        const getToggleValue = (toggleName: string): boolean => {
          const toggle = userSettings?.togglingSettingsToggles?.find((t: any) => t.toggle === toggleName);
          return toggle?.value ?? false;
        };

        // Extract toggleEnabled values
        const getToggleEnabled = (toggleName: string): boolean => {
          const toggle = userSettings?.togglingSettingsToggles?.find((t: any) => t.toggle === toggleName);
          return toggle?.toggleEnabled ?? false;
        };

        // Format dates
        const formatDate = (timestamp: number | string | null): string => {
          if (!timestamp) return 'N/A';
          const numTimestamp = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
          return new Date(numTimestamp).toLocaleString();
        };

        const formattedData = {
          id: apiUser?.userId?.toString() || '',
          username: apiUser?.username || '',
          name: userInfo?.name || '',
          type: getRoleType(apiUser?.roleId || 4),
          parent: userInfo?.parentUsername || `Parent-${userInfo?.parentId}`,
          parentName: userInfo?.parentName || userInfo?.parentUsername || 'N/A',
          credit: apiUser?.credits || 0,
          balance: apiUser?.balance || 0,
          parentCredits: userInfo?.parentCredits || 0,
          sharing: userInfo?.pnlSharing || null,
          bet: getToggleValue('bet'),
          closeOut: getToggleValue('closeOnly'),
          margin: getToggleValue('marginSquareOff'),
          status: getToggleValue('status'),
          creditLimit: !apiUser?.isBlocked,
          creditBasedMargin: getToggleValue('creditBasedMargin'),
          betEnabled: getToggleEnabled('bet'),
          closeOutEnabled: getToggleEnabled('closeOnly'),
          marginEnabled: getToggleEnabled('marginSquareOff'),
          statusEnabled: getToggleEnabled('status'),
          freshStopLoss: getToggleValue('freshStopLoss'),
          freshStopLossEnabled: getToggleEnabled('freshStopLoss'),
          creditLimitEnabled: true,
          creditBasedMarginEnabled: getToggleEnabled('creditBasedMargin'),
          manualOrder: getToggleValue('manualOrder'),
          manualOrderEnabled: getToggleEnabled('manualOrder'),
          createdDate: formatDate(userInfo?.createdAt),
          ipAddress: userInfo?.ipAddress || 'N/A',
          deviceId: userInfo?.deviceId || 'N/A',
          lastLogin: formatDate(userInfo?.lastLoginDate),
          isActive: apiUser?.isActive ?? true,
          isTradeLock: apiUser?.isTradeLock ?? false,
          roleId: apiUser?.roleId,
        };

        setSelectedUser(formattedData);
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      toast.error('Failed to fetch user details');
    }
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
              if (newPrice && (newPrice.bid !== undefined || newPrice.ask !== undefined)) {
                // Use directional pricing: bid for BUY, ask for SELL (actual exit price)
                const price = position.position === 'BUY' ? newPrice.bid : newPrice.ask
                // Recalculate P&L with price (handle SELL positions correctly)
                const pnlValue = position.position === 'SELL'
                  ? (position.averagePrice - price) * position.netQuantity
                  : (price - position.averagePrice) * position.netQuantity
                const pnlPercentage = ((pnlValue / (position.averagePrice * position.netQuantity)) * 100)

                // Track changes for animation
                const prevPrices = previousPricesRef.current[position.token]
                if (prevPrices) {
                  const change: PriceChange = {}
                  const ltpDiff = Math.abs(newPrice.ltp - prevPrices.ltp)
                  const bidDiff = Math.abs((newPrice.bid || 0) - prevPrices.bid)
                  const askDiff = Math.abs((newPrice.ask || 0) - prevPrices.ask)
                  const buyQtyDiff = Math.abs((newPrice.buyQty || 0) - prevPrices.buyQty)
                  const sellQtyDiff = Math.abs((newPrice.sellQty || 0) - prevPrices.sellQty)
                  const pnlDiff = Math.abs(pnlValue - prevPrices.pnl)

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
                    change.pnl = pnlValue > prevPrices.pnl ? 'up' : 'down'
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
                  pnl: pnlValue
                }

                return {
                  ...position,
                  ltp: newPrice.ltp,
                  bid: newPrice.bid,
                  ask: newPrice.ask,
                  buyQty: newPrice.buyQty,
                  sellQty: newPrice.sellQty,
                  pnl: pnlValue,
                  pnlPercentage,
                  totalPnl: pnlValue + position.realisedPnl
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
              if (newPrice && (newPrice.bid !== undefined || newPrice.ask !== undefined)) {
                // Use directional pricing: bid for BUY, ask for SELL (actual exit price)
                const price = position.position === 'BUY' ? newPrice.bid : newPrice.ask
                const pnlValue = position.position === 'SELL'
                  ? (position.averagePrice - price) * position.netQuantity
                  : (price - position.averagePrice) * position.netQuantity
                const pnlPercentage = ((pnlValue / (position.averagePrice * position.netQuantity)) * 100)

                return {
                  ...position,
                  ltp: newPrice.ltp,
                  bid: newPrice.bid,
                  ask: newPrice.ask,
                  buyQty: newPrice.buyQty,
                  sellQty: newPrice.sellQty,
                  pnl: pnlValue,
                  pnlPercentage,
                  totalPnl: pnlValue + position.realisedPnl
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

  const handleToggle = useCallback(async (userId: string, field: 'bet' | 'closeOut' | 'margin' | 'status' | 'creditLimit' | 'creditBasedMargin') => {
    try {
      // Map field names to API type values
      const fieldToApiType: Record<string, string> = {
        'bet': 'bet',
        'closeOut': 'closeOnly',
        'freshStopLoss': 'freshStopLoss',
        'margin': 'marginSquareOff',
        'status': 'status',
        'creditLimit': 'creditLimit',
        'creditBasedMargin': 'creditBasedMargin',
        'manualOrder': 'manualOrder'
      };

      // Map field names to display names
      const fieldToDisplayName: Record<string, string> = {
        'bet': 'Bet',
        'closeOut': 'Close',
        'margin': 'Margin',
        'status': 'Status',
        'freshStopLoss': 'Fresh Stop Loss',
        'creditLimit': 'Credit Limit',
        'creditBasedMargin': 'CBM',
        'manualOrder': 'Manual Order'
      };

      const apiType = fieldToApiType[field];
      const displayName = fieldToDisplayName[field];
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const currentValue = user[field];
      const newValue = !currentValue;

      // Get logged-in user ID from localStorage
      const userDataStr = localStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const loggedInUserId = userData?.userId || 2;

      const response = await userManagementService.toggleUserSettings({
        userId: loggedInUserId,
        requestTimestamp: Date.now().toString(),
        data: {
          userId: Number(userId),
          type: apiType,
          value: newValue,
        },
      });

      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        const statusText = newValue ? 'enabled' : 'disabled';
        const successMsg = `${user.username}: ${displayName} has been successfully ${statusText}`;
        toast.success(successMsg);

        // Update local state
        setUsers(prevUsers =>
          prevUsers.map(u =>
            u.id === userId
              ? { ...u, [field]: newValue }
              : u
          )
        );

        // Refetch user list to get updated data
      } else {
        const errorMsg = response?.responseMessage || 'Failed to update setting';
        toast.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.responseMessage || error.message || 'Failed to update setting';
      toast.error(errorMsg);
    }
  }, [users]);

  return (
    <FilterLayout
      storageKey="userWisePosition:showFilters"
      filterWidthClass="lg:w-[16%]"
      filters={
        <div className="space-y-4 p-4">
          <SearchableSelect
            label="Username :"
            items={userOptions}
            selectedId={selectedUserId}
            onSelect={(userId) => setSelectedUserId(Number(userId))}
            placeholder="Search user..."
          />

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exchange :</label>
            <select
              value={selectedExchange}
              onChange={(e) => {
                const newExchange = e.target.value;
                setSelectedExchange(newExchange);
                setSelectedSymbol('');
                setSelectedToken(null);
                
                // Fetch symbols for the selected exchange
                userManagementService.fetchSymbols(newExchange).then(res => {
                  let symbolsData = res;
                  // Handle both auto-unwrapped (array) and non-unwrapped (object with data) responses
                  if (res?.responseCode === '0' && res.data) {
                    symbolsData = res.data;
                  }
                  if (Array.isArray(symbolsData) && symbolsData.length > 0) {
                    setFilteredSymbols(symbolsData);
                  } else {
                    setFilteredSymbols([]);
                  }
                }).catch(() => {
                  setFilteredSymbols([]);
                });
              }}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            >
              {exchanges.map(ex => <option key={ex.name} value={ex.name}>{ex.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <SearchableSelect
              label="Symbol :"
              items={symbolOptions}
              selectedId={selectedSymbol}
              onSelect={(id) => {
                setSelectedSymbol(String(id));
                const sym = filteredSymbols.find(s => (s.tradeSymbol || s.token) === id);
                setSelectedToken(sym?.token || null);
              }}
              placeholder="Search symbol..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleView()}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition"
            >
              View
            </button>
            <button
              onClick={() => {
                setSelectedUserId(0);
                const allExchangesValue = 'All Exchanges';
                setSelectedExchange(allExchangesValue);
                setSelectedSymbol('');
                setSelectedToken(null);
                
                // Fetch symbols for All Exchanges
                userManagementService.fetchSymbols(allExchangesValue).then(res => {
                  let symbolsData = res;
                  // Handle both auto-unwrapped (array) and non-unwrapped (object with data) responses
                  if (res?.responseCode === '0' && res.data) {
                    symbolsData = res.data;
                  }
                  if (Array.isArray(symbolsData) && symbolsData.length > 0) {
                    setFilteredSymbols(symbolsData);
                  } else {
                    setFilteredSymbols([]);
                  }
                }).catch(() => {
                  setFilteredSymbols([]);
                });
              }}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded font-semibold text-sm transition"
            >
              Clear
            </button>
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
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Posi Days :</label>
              <input
                type="number"
                value={posiDays}
                onChange={(e) => setPosiDays(e.target.value)}
                placeholder="e.g., 10"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAdvanceFilterApply}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm"
              >
                Apply
              </button>
              <button
                onClick={() => { setPlPercent(''); setPosiDays(''); handleView(); }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold text-sm"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Download Report Section */}
          <div className="border-t border-gray-300 dark:border-slate-600 pt-4 mt-4">
            <DownloadReport
              onDownload={handleDownloadReport}
              isDisabled={isDownloading || !positionData}
              label="Download Report :"
            />
          </div>


        </div>


      }
    >
      <UserDetailsModal
        user={selectedUser}
        onToggle={handleToggle}
        onClose={() => setSelectedUser(null)}
      />


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
                label="M2M P&L"
                value={`${positionData.balance?.toFixed(2) || '0'}`}
                icon={AlertCircle}
                color={positionData.balance >= 0 ? 'bg-green-500' : 'bg-red-500'}
              />
              <StatCard
                label="Total Buy"
                value={`${positionData.totalBuy?.toFixed(2) || '0'}`}
                icon={TrendingUp}
                color="bg-green-500"
              />
              <StatCard
                label="Total Sell"
                value={`${positionData.totalSell?.toFixed(2) || '0'}`}
                icon={TrendingDown}
                color="bg-red-500"
              />
              {/* <StatCard
                label="Other"
                value={`${positionData.other?.toFixed(2) || '0'}`}
                icon={AlertCircle}
                color="bg-blue-500"
              /> */}
              {/* <StatCard
                label="Brokerage"
                value={`${positionData.brokerage?.toFixed(2) || '0'}`}
                icon={AlertCircle}
                color="bg-orange-500"
              /> */}
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
              <div className="flex-1 overflow-hidden bg-white/50 dark:bg-slate-800/50 rounded-xl border border-gray-200/50 dark:border-slate-700/50 flex flex-col min-h-0">
                {/* Scrollable Table Container */}
                <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '140px' }} />
                      <col style={{ width: '65px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '65px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '90px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '110px' }} />
                      <col style={{ width: '110px' }} />
                    </colgroup>
                    <thead className="sticky top-0 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-600 z-10">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">PositionDate</th>
                        <th className="px-1.5 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">PositionDays</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">Username</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">ParentUserName</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">Exchange</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">Symbol</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Position</th>
                        <th className="px-1.5 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Quantity</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Average Rate</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">CMP</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Profit / Loss</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">% P&L</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Realized P&L</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Total P&L</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Margin Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
                      {filteredPositions.map((position) => {
                        const changes = priceChanges[position.token] || {};

                        const getHighlightClass = (key: keyof PriceChange) => {
                          if (!changes[key]) return 'text-slate-900 dark:text-slate-100';
                          return changes[key] === 'up'
                            ? 'text-blue-600 dark:text-blue-400 transition-all duration-500'
                            : 'text-red-600 dark:text-red-400 transition-all duration-500';
                        };

                        const posColorClass = position.position === 'BUY'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

                        return (
                          <tr key={`${position.token}-${position.positionId}`}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors h-8">
                            <td className="px-3 py-1.5 text-xs truncate">{position.positionDate ? new Date(position.positionDate).toLocaleString() : '-'}</td>
                            <td className="px-1.5 py-1.5 text-xs text-center font-bold\">{position.positionDays}</td>
                            <td className="px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:underline truncate"
                              onClick={() => handleOpenUserDetails(position.username)}>
                              {position.username}
                            </td>
                            <td className="px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:underline truncate"
                              onClick={() => handleOpenUserDetails(position.parentUsername)}>
                              {position.parentUsername}
                            </td>
                            <td className="px-3 py-1.5 text-xs">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] inline-block ${posColorClass}`}>
                                {position.exchange}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-xs font-bold truncate">{position.tradeSymbol}</td>
                            <td className="px-3 py-1.5 text-xs text-center">
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] inline-block ${posColorClass}`}>
                                {position.position}
                              </span>
                            </td>
                            <td className="px-1.5 py-1.5 text-xs text-right font-bold\">{position.quantity}</td>
                            <td className="px-3 py-1.5 text-xs text-right">{position.averagePrice?.toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-xs text-right font-bold">
                              {(() => {
                                const cmpPrice = position.position === 'BUY' ? position.bid : position.ask;
                                return <span className={getHighlightClass('ltp' as keyof PriceChange)}>{cmpPrice?.toFixed(2) || '0.00'}</span>;
                              })()}
                            </td>
                            <td className="px-3 py-1.5 text-xs text-right font-bold">
                              <span className={position.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{position.pnl?.toFixed(0)}</span>
                            </td>
                            <td className="px-3 py-1.5 text-xs text-right font-bold">
                              <span className={position.pnlPercentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{position.pnlPercentage?.toFixed(2)}%</span>
                            </td>
                            <td className="px-3 py-1.5 text-xs text-right font-bold">
                              <span className={position.realisedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{position.realisedPnl?.toFixed(0)}</span>
                            </td>
                            <td className="px-3 py-1.5 text-xs text-right font-bold">
                              <span className={position.totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{position.totalPnl?.toFixed(0)}</span>
                            </td>
                            <td className="px-3 py-1.5 text-xs text-right">{position.marginUsed?.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </FilterLayout>
  );
};

export default UserWisePosition;
