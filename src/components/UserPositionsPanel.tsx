

// --- REUSE LOGIC FROM Positions.tsx ---
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Briefcase, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import userManagementService from '../services/userManagementService';
import marketWatchService from '../services/marketWatchService';
import orderService from '../services/orderService';
import FilterLayout from '../components/FilterLayout';
import { useOrderModal } from '../hooks/useOrderModal';
import OrderModal from '../components/modals/OrderModal';
import SearchableSelect from '../components/ui/SearchableSelect';
import ConfigManager from '../utils/configManager';

interface UserPositionsPanelProps {
  username: string;
  userId?: string | number;
  roleId?: any;
}

const UserPositionsPanel: React.FC<UserPositionsPanelProps> = ({ username, userId, roleId }) => {
  // --- State (mostly copied from Positions.tsx) ---
  const [selectedExchange, setSelectedExchange] = useState<string>('All Exchanges');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [positionData, setPositionData] = useState<any>(null);
  const [filteredPositions, setFilteredPositions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [symbols, setSymbols] = useState<any[]>([]);
  const [liveTicks, setLiveTicks] = useState<Record<number, any>>({});
  const [tab, setTab] = useState<'addOrder' | 'cfMarginSquareOff'>('addOrder');
  const displayRoleId = roleId;
  console.log('displayRoleId',displayRoleId,username)
  const isClient = displayRoleId === 'Client';
  const feedUnsubscribeRef = useRef<(() => void) | null>(null);
  const subscriptionRef = useRef({ subscribed: false, userId: null as string | null });
  const lastUpdateRef = useRef<number>(0);
  const instrumentConfigRef = useRef<Record<number, any>>({});
  const orderModal = useOrderModal(true);
  const maxAvailableQuantityRef = useRef<number>(999999);

  const handleDragSetup = (e: React.MouseEvent<Element>, type: 'BUY' | 'SELL') => {
    e.preventDefault();
    const targetModalElement = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
    const rect = targetModalElement.getBoundingClientRect();

    orderModal.setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });

    if (type === 'BUY') orderModal.setIsDraggingBuy(true);
    else orderModal.setIsDraggingSell(true);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (orderModal.isDraggingBuy) {
        orderModal.setBuyModalPosition({
          x: e.clientX - orderModal.dragOffset.x,
          y: e.clientY - orderModal.dragOffset.y
        });
      }
      if (orderModal.isDraggingSell) {
        orderModal.setSellModalPosition({
          x: e.clientX - orderModal.dragOffset.x,
          y: e.clientY - orderModal.dragOffset.y
        });
      }
    };

    const handleGlobalMouseUp = () => {
      orderModal.setIsDraggingBuy(false);
      orderModal.setIsDraggingSell(false);
    };

    if (orderModal.isDraggingBuy || orderModal.isDraggingSell) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [orderModal.isDraggingBuy, orderModal.isDraggingSell, orderModal.dragOffset]);

  useEffect(() => {
    if (orderModal.showBuyOrderModal && orderModal.selectedOrderInstrument && orderModal.buyOrderType === 'MARKET') {
      const liveData = liveTicks[orderModal.selectedOrderInstrument.token];
      if (liveData?.ask) {
        orderModal.setBuyOrderPrice(liveData.ask.toFixed(2));
      }
    }
  }, [liveTicks, orderModal.buyOrderType, orderModal.showBuyOrderModal, orderModal.selectedOrderInstrument]);

  useEffect(() => {
    if (orderModal.showSellOrderModal && orderModal.selectedOrderInstrument && orderModal.sellOrderType === 'MARKET') {
      const liveData = liveTicks[orderModal.selectedOrderInstrument.token];
      if (liveData?.bid) {
        orderModal.setSellOrderPrice(liveData.bid.toFixed(2));
      }
    }
  }, [liveTicks, orderModal.sellOrderType, orderModal.showSellOrderModal, orderModal.selectedOrderInstrument]);

  // --- Fetch users, exchanges, and initial positions; stop polling/socket on tab change or unmount ---
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const usersResponse = await userManagementService.fetchUserClientsForTrade();
        const exchangesResponse = await userManagementService.fetchExchanges();
        if (!isMounted) return;
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setUsers([{ id: 0, name: 'All Users' }, ...usersResponse.data]);
        }
        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse);
          setSelectedExchange(exchangesResponse[0].name);
        }

        const fullConfig = ConfigManager.getFullConfig();
        if (fullConfig && fullConfig.instruments) {
          Object.entries(fullConfig.instruments).forEach(([_, instrumentsList]: [string, any]) => {
            if (Array.isArray(instrumentsList)) {
              instrumentsList.forEach((instrument: any) => {
                if (instrument.instrumentToken) instrumentConfigRef.current[instrument.instrumentToken] = instrument;
              });
            }
          });
        }

        await handleView(exchangesResponse?.[0]?.name || 'All Exchanges', userId ? [Number(userId)] : []);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
      unsubscribeCurrentFeed();
    };
    // eslint-disable-next-line
  }, [userId, tab]);

  // --- Fetch symbols when exchange changes ---
  useEffect(() => {
    (async () => {
      try {
        const response = await userManagementService.fetchAllSymbols(selectedExchange, userId ? Number(userId) : undefined);
        if (response?.responseCode === '0' && Array.isArray(response.data)) setSymbols(response.data);
      } catch (e) { console.error(e); }
    })();
  }, [selectedExchange, userId]);

  // --- Live socket logic (copied from Positions.tsx) ---
  const unsubscribeCurrentFeed = useCallback(() => {
    marketWatchService.stopPositionsPollingLoop();
    if (feedUnsubscribeRef.current) { feedUnsubscribeRef.current(); feedUnsubscribeRef.current = null; }
    if (subscriptionRef.current.subscribed && subscriptionRef.current.userId) {
      const uid = subscriptionRef.current.userId;
      marketWatchService.unsubscribeFromInstruments(uid);
      subscriptionRef.current = { subscribed: false, userId: null };
    }
  }, []);

  const establishStompSubscription = useCallback((userIdStr: string, tokens: string[]) => {
    unsubscribeCurrentFeed();
    marketWatchService.subscribeToInstruments(userIdStr);
    subscriptionRef.current = { subscribed: true, userId: userIdStr };
    marketWatchService.startPositionsPollingLoop(userIdStr, tokens);
    feedUnsubscribeRef.current = marketWatchService.onFeedData((data) => {
      if (!data) return;
      const incomingFeedArray = Array.isArray(data) ? data : [data];
      const feedItems = incomingFeedArray.filter((item) => item && item.insToken != null);
      if (feedItems.length === 0) return;

      setLiveTicks(prev => {
        const nextTicks = { ...prev };
        feedItems.forEach(item => { nextTicks[Number(item.insToken)] = item; });
        return nextTicks;
      });
      const now = Date.now();
      if (now - lastUpdateRef.current < 100) return;
      lastUpdateRef.current = now;
      const feedMap = new Map(feedItems.map(item => [Number(item.insToken), item]));
      setFilteredPositions(prevPositions => {
        return prevPositions.map(pos => {
          const currentToken = Number(pos.token);
          if (!currentToken || !feedMap.has(currentToken)) return pos;
          const tick = feedMap.get(currentToken)!;
          const price = pos.position === 'BUY' ? tick.bid : tick.ask;
          const priceChange = pos.position === 'BUY' ? (price - pos.averagePrice) : (pos.averagePrice - price);
          const unrealisedPnl = priceChange * Math.abs(pos.netQuantity || pos.quantity);
          const amount = pos.averagePrice * Math.abs(pos.netQuantity || pos.quantity);
          const unrealisedPnlPercentage = amount !== 0 ? (unrealisedPnl * 100) / amount : 0;
          return { ...pos, ltp: price, pnl: unrealisedPnl, pnlPercentage: unrealisedPnlPercentage };
        });
      });
    });
  }, [unsubscribeCurrentFeed]);

  const setupLivePositionFeed = useCallback(async (positionsList: any[]) => {
    if (!userId) return;
    const userIdStr = String(userId);
    const tokens = positionsList.filter(p => p.token).map(p => p.token!.toString());
    if (tokens.length === 0) return;
    if (!marketWatchService.isConnected()) {
      await marketWatchService.connect(() => establishStompSubscription(userIdStr, tokens));
    } else {
      establishStompSubscription(userIdStr, tokens);
    }
  }, [establishStompSubscription, userId]);

  // --- View handler (copied from Positions.tsx, but always uses userId) ---
  const handleView = async (targetExchange?: string, targetUserIds?: number[], ignoreSelectedSymbol = false, targetToken?: number) => {
    const exchange = targetExchange || selectedExchange;
    if (!exchange) return;
    setLoading(true);
    unsubscribeCurrentFeed();
    setSelectedPositions(new Set());
    try {
      const tokenToFetch = targetToken !== undefined ? targetToken : (selectedToken || 0);
      console.log("Fetching positions for User ID:", userId, "Exchange:", exchange, "Token:", tokenToFetch);
      const response = await userManagementService.fetchUserPositionsForExchange(exchange, tokenToFetch, userId ? Number(userId) : 0);
      if (response?.responseCode === '0' && response.data) {
        setPositionData(response.data);
        let positions = response.data.positions || [];
        if (selectedSymbol && !ignoreSelectedSymbol) positions = positions.filter((p: any) => p.tradeSymbol === selectedSymbol);
        setFilteredPositions(positions);
        if (positions.length > 0) setupLivePositionFeed(positions);
      } else {
        setFilteredPositions([]);
      }
    } catch (error) {
      setFilteredPositions([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Memoized user options for SearchableSelect ---
  const userOptions = useMemo(() => users.map(u => ({ id: u.id, name: u.name })), [users]);

  // --- Stats ---
  const stats = useMemo(() => ({
    total: filteredPositions.length,
    buy: filteredPositions.filter(p => p.position === 'BUY').length,
    sell: filteredPositions.filter(p => p.position === 'SELL').length,
    totalPnL: filteredPositions.reduce((sum, p) => sum + (p.pnl || 0), 0),
  }), [filteredPositions]);

  // --- Add Order filter fields state ---
  const [buySell, setBuySell] = useState<'Buy' | 'Sell'>('Buy');
  const [orderType, setOrderType] = useState('');
  const [qty, setQty] = useState('');
  const [rateBy, setRateBy] = useState('Market Price');
  const [price, setPrice] = useState('');

  // --- Fetch current market price for selected script in filter panel ---
  useEffect(() => {
    if (!selectedToken || rateBy !== 'Market Price') return;

    const tick = liveTicks[selectedToken];
    if (!tick) return;

    if (buySell === 'Buy') {
      setPrice(tick.ask?.toFixed(2) || '');
    } else {
      setPrice(tick.bid?.toFixed(2) || '');
    }
  }, [selectedToken, buySell, liveTicks, rateBy]);

  // --- Ensure live quote feed includes the selected script token ---
  useEffect(() => {
    if (!selectedToken || !userId) return;
    const userIdStr = String(userId);
    const tokenString = String(selectedToken);
    let pollingInterval: number | null = null;

    const fetchInstrumentTick = async () => {
      if (!marketWatchService.isConnected()) {
        await marketWatchService.connect(() => {
          marketWatchService.subscribeToInstruments(userIdStr);
          marketWatchService.sendInstrumentsRequestduplicate(userIdStr, [tokenString]);
        });
      } else {
        marketWatchService.subscribeToInstruments(userIdStr);
        marketWatchService.sendInstrumentsRequestduplicate(userIdStr, [tokenString]);
      }
    };

    const startPolling = async () => {
      await fetchInstrumentTick();
      pollingInterval = setInterval(() => {
        if (marketWatchService.isConnected()) {
          marketWatchService.sendInstrumentsRequestduplicate(userIdStr, [tokenString]);
        }
      }, 1000);
    };

    startPolling().catch(console.error);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [selectedToken, userId]);

  const selectedTick = selectedToken ? liveTicks[selectedToken] : null;
  const buyPriceDisplay = selectedTick?.ask ? Number(selectedTick.ask).toFixed(2) : '--';
  const sellPriceDisplay = selectedTick?.bid ? Number(selectedTick.bid).toFixed(2) : '--';

  const updatePriceFromTick = useCallback(() => {
    if (!selectedToken || !selectedTick) return;
    const nextPrice = buySell === 'Buy' ? selectedTick.ask : selectedTick.bid;
    if (nextPrice != null) {
      setPrice(Number(nextPrice).toFixed(2));
    }
  }, [selectedToken, selectedTick, buySell]);

  useEffect(() => {
    if (!selectedToken) return;

    if (orderType === 'Market' || rateBy === 'Market Price') {
      updatePriceFromTick();
    }
  }, [selectedToken, orderType, rateBy, updatePriceFromTick]);

  const handleOrderTypeChange = (value: string) => {
    setOrderType(value);
    if (value === 'Market') {
      setRateBy('Market Price');
      updatePriceFromTick();
    }
  };

  const handleManualOrderSubmit = async () => {
    if (!isClient) {
      toast.error('Manual orders can only be placed for client users (roleId 4)');
      return;
    }

    if (!selectedToken || !selectedSymbol) {
      toast.error('Please select a script first');
      return;
    }

    const quantity = parseInt(qty, 10) || 0;
    if (quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const symbolItem = symbols.find(s => s.token === selectedToken);
    const config = instrumentConfigRef.current[selectedToken] || symbolItem || {};
    const exchange = config?.exchange || symbolItem?.exchangeName ;
    const tradeSymbol = selectedSymbol || symbolItem?.tradeSymbol || symbolItem?.instrumentName || '';

    if (!orderType) {
      toast.error('Please select an order type');
      return;
    }

    const orderTypeCode = orderType === 'Limit' ? 'LIMIT' : 'MARKET';

    if (orderTypeCode === 'LIMIT') {
      if (!price || parseFloat(price) <= 0) {
        toast.error('Please enter a valid limit price');
        return;
      }
    }

    const marketPrice = buySell === 'Buy' ? selectedTick?.ask : selectedTick?.bid;
    const finalPrice = orderTypeCode === 'MARKET'
      ? marketPrice
      : parseFloat(price);

    if (orderTypeCode === 'MARKET' && (finalPrice == null || finalPrice === 0)) {
      toast.error('Market price is not available for the selected script');
      return;
    }

    const submitToast = toast.loading('Placing manual order...');
    const loggedInUserId = Number(JSON.parse(localStorage.getItem('userData') || '{}')?.userId || 0);
    const recipientUserId = Number(userId);
    const isSpecialExchange = ['NSE', 'SGX', 'OTHERS'].includes(exchange);
    const finalQuantity = isSpecialExchange ? 1 : quantity;
    const finalLotValue = isSpecialExchange ? quantity : (config?.lotSize || 100);

    try {
      const response = buySell === 'Buy'
        ? await orderService.placeBuyOrder(
            loggedInUserId,
            recipientUserId,
            exchange,
            tradeSymbol,
            selectedToken,
            finalQuantity,
            Number(finalPrice),
            finalLotValue,
            orderTypeCode as 'MARKET' | 'LIMIT' | 'SL',
            'MANUAL_ORDER'
          )
        : await orderService.placeSellOrder(
            loggedInUserId,
            recipientUserId,
            exchange,
            tradeSymbol,
            selectedToken,
            finalQuantity,
            Number(finalPrice),
            finalLotValue,
            orderTypeCode as 'MARKET' | 'LIMIT' | 'SL',
            'MANUAL_ORDER'
          );

      if (response?.responseCode === '0') {
        toast.success(`Manual order placed successfully! Order ID: ${response.data?.orderId || 'N/A'}`, { id: submitToast });
        await handleView(selectedExchange, userId ? [Number(userId)] : [], true, 0);
        setSelectedSymbol('');
        setSelectedToken(null);
        setQty('');
        setPrice('');
        setOrderType('');
        setRateBy('Market Price');
        setBuySell('Buy');
      } else {
        toast.error(response?.responseMessage || 'Failed to place manual order', { id: submitToast });
      }
    } catch (error: any) {
      toast.error(error.message || 'Error placing manual order', { id: submitToast });
    }
  };

  // --- Add Order filter panel UI (matches screenshot) ---
  const filters = (
    <div className="space-y-4 p-4">
      <div className="flex gap-2 mb-2">
        <button
          className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${tab === 'addOrder' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
          onClick={() => setTab('addOrder')}
        >
          Add Order
        </button>
        <button
          className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${tab === 'cfMarginSquareOff' ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'}`}
          onClick={() => setTab('cfMarginSquareOff')}
        >
          CF Margin Square Off
        </button>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1">User :</label>
        <input type="text" value={username} disabled className="w-full px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200" />
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1">Script Name :</label>
        <select value={selectedSymbol} onChange={e => { setSelectedSymbol(e.target.value); const found = symbols.find(s => s.tradeSymbol === e.target.value); setSelectedToken(found?.token || null); }} className="w-full px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
          <option value="">Select Script</option>
          {symbols.map(s => <option key={s.token} value={s.tradeSymbol}>{s.tradeSymbol}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-3 py-3 text-center">
          <div className="text-xs uppercase font-semibold text-red-700 dark:text-red-300">Sell</div>
          <div className="mt-2 text-2xl font-bold text-red-800 dark:text-red-200">{sellPriceDisplay}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-3 text-center">
          <div className="text-xs uppercase font-semibold text-emerald-700 dark:text-emerald-300">Buy</div>
          <div className="mt-2 text-2xl font-bold text-emerald-800 dark:text-emerald-200">{buyPriceDisplay}</div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1">Buy/Sell :</label>
        <select value={buySell} onChange={e => setBuySell(e.target.value as 'Buy' | 'Sell')} className="w-full px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
          <option value="Buy">Buy</option>
          <option value="Sell">Sell</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1">Order Type :</label>
        <select value={orderType} onChange={e => handleOrderTypeChange(e.target.value)} className="w-full px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
          <option value="">Select Type</option>
          <option value="Market">Market</option>
          <option value="Limit">Limit</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1">Qty :</label>
        <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1">Rate By :</label>
        <select value={rateBy} onChange={e => setRateBy(e.target.value)} className="w-full px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
          <option value="Market Price">Market Price</option>
          <option value="Limit Price">Limit Price</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1">Price :</label>
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          disabled={orderType === 'Market'}
          className={`w-full px-2 py-1 rounded border border-gray-300 dark:border-slate-600 text-sm ${orderType === 'Market' ? 'bg-gray-100 dark:bg-slate-700 cursor-not-allowed' : 'bg-white dark:bg-slate-700'}`}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleManualOrderSubmit}
          disabled={loading || !isClient}
          className={`flex-1 px-4 py-2 rounded font-semibold text-sm transition shadow-md ${isClient ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
        >
          Submit
        </button>
        <button onClick={() => { setSelectedSymbol(''); setSelectedToken(null); setBuySell('Buy'); setOrderType(''); setQty(''); setRateBy('Market Price'); setPrice(''); handleView(undefined, undefined, false, 0); }} className="flex-1 px-4 py-2 bg-gray-400 dark:bg-slate-600 text-white rounded font-semibold text-sm transition">Clear</button>
      </div>
      {!isClient && (
        <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">Only for client users can place manual orders.</div>
      )}
    </div>
  );

  // --- Buy/Sell modal and close selected logic from Positions page ---
  const handleOpenModifyModal = (p: any, targetType: 'BUY' | 'SELL') => {
    // Find user profile for modal (if needed)
    const matchedProfile = users.find((u: any) => u.username === p.username);
    const targetClientId = p.userId || matchedProfile?.id || userId;
    orderModal.setSelectedClient({ userId: targetClientId, name: matchedProfile?.name || p.username, username: p.username });
    orderModal.setClientSearchTerm(`${matchedProfile?.name || p.username} (${p.username})`);
    maxAvailableQuantityRef.current = p.exchange === 'CALLPUT' ? Math.abs(p.quantity) : 999999;
    const cachedConfig = p.token ? instrumentConfigRef.current[p.token] : null;
    const mergedConfig = { exchange: p.exchange, tradeSymbol: p.tradeSymbol, instrumentName: p.tradeSymbol, script: p.tradeSymbol, lotSize: cachedConfig?.lotSize || 100 };
    if (targetType === 'BUY') {
      orderModal.setBuyOrderQuantity(p.quantity.toString());
      orderModal.setBuyOrderPrice(p.averagePrice.toString());
      orderModal.setBuyOrderType('LIMIT');
      orderModal.openBuyModal({ token: p.token || 0, config: mergedConfig });
    } else {
      orderModal.setSellOrderQuantity(p.quantity.toString());
      orderModal.setSellOrderPrice(p.averagePrice.toString());
      orderModal.setSellOrderType('LIMIT');
      orderModal.openSellModal({ token: p.token || 0, config: mergedConfig });
    }
  };

  const handleValidatedQuantityChange = (val: string, methodType: 'BUY' | 'SELL') => {
    const requestedQty = parseInt(val) || 0;
    if (methodType === 'SELL' && orderModal.selectedOrderInstrument?.config?.exchange === 'CALLPUT') {
      if (requestedQty > maxAvailableQuantityRef.current) {
        toast.error(`Sells cannot exceed your current open holding of ${maxAvailableQuantityRef.current} lots for CALLPUT positions.`);
        orderModal.setSellOrderQuantity(maxAvailableQuantityRef.current.toString());
        return;
      }
    }
    if (methodType === 'BUY') orderModal.setBuyOrderQuantity(val);
    else orderModal.setSellOrderQuantity(val);
  };

  const handleBuySubmitAction = async () => {
    const currentTick = orderModal.selectedOrderInstrument?.token ? liveTicks[orderModal.selectedOrderInstrument.token] : null;
    const isSuccess = await orderModal.submitBuyOrder(currentTick);
    if (isSuccess) orderModal.closeBuyModal();
  };

  const handleSellSubmitAction = async () => {
    const currentTick = orderModal.selectedOrderInstrument?.token ? liveTicks[orderModal.selectedOrderInstrument.token] : null;
    const isSuccess = await orderModal.submitSellOrder(currentTick);
    if (isSuccess) orderModal.closeSellModal();
  };

  const handleCloseSelectedPositions = async () => {
    if (selectedPositions.size === 0) return;
    if (!window.confirm(`Are you sure you want to close the ${selectedPositions.size} selected position(s)?`)) return;
    try {
      setLoading(true);
      const payload = {
        userId: userId,
        requestTimestamp: new Date().getTime().toString(),
        deviceId: "WEB",
        tradeOrderMethod: "WEB",
        data: Array.from(selectedPositions)
      };
      const response = await fetch('https://api-staging.rivoplus.live/oms/closeMultiplePositions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result?.responseCode === '0' || result?.status === 'success') {
        toast.success("Selected positions closed successfully");
        setSelectedPositions(new Set());
        handleView();
      } else {
        toast.error(result?.message || "Failed to close positions");
      }
    } catch (err) {
      toast.error("Error closing positions");
    } finally {
      setLoading(false);
    }
  };

  // --- Table and content (now matches Positions page) ---
  return (
    <FilterLayout
      filters={filters}
      filterWidthClass="w-[350px]"
      storageKey="userPositions:showFilters"
    >
      <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
        <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Briefcase className="w-7 h-7 text-blue-500" /> Positions</h1>
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center"><div className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total</div></div>
              <div className="text-center"><div className="text-xl font-bold text-blue-600">{stats.buy}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Buy</div></div>
              <div className="text-center"><div className="text-xl font-bold text-red-600">{stats.sell}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Sell</div></div>
              <div className="text-center"><div className={`text-xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{stats.totalPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Net P&L</div></div>
            </div>
          </div>
        </div>
        {selectedPositions.size > 0 && (
          <div className="flex-shrink-0 px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900/50 flex items-center justify-between">
            <span className="text-sm font-bold text-red-700 dark:text-red-300">{selectedPositions.size} positions selected</span>
            <button onClick={handleCloseSelectedPositions} disabled={loading} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded shadow-sm">
              Close Selected Positions
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto scrollbar-thin">
          {tab === 'addOrder' && (
            loading ? (
              <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" /></div>
            ) : (
              <table className="w-full border-collapse min-w-max">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 border-b-2 border-blue-100 dark:border-blue-900">
                  <tr>
                    <th className="px-3 py-4 text-center">
                      <input type="checkbox" checked={filteredPositions.length > 0 && selectedPositions.size === filteredPositions.length} onChange={() => setSelectedPositions(selectedPositions.size === filteredPositions.length ? new Set() : new Set(filteredPositions.map(p => p.positionId)))} className="cursor-pointer" />
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">View</th>
                    <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">Buy</th>
                    <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-red-600">Sell</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Username</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Exchange</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Position</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Avg Rate</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">CMP</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredPositions.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-8 text-gray-400">No positions found.</td></tr>
                  ) : filteredPositions.map((p) => (
                    <tr key={p.positionId} className={`hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors ${selectedPositions.has(p.positionId) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <td className="px-3 py-4 text-center">
                        <input type="checkbox" checked={selectedPositions.has(p.positionId)} onChange={() => { const next = new Set(selectedPositions); next.has(p.positionId) ? next.delete(p.positionId) : next.add(p.positionId); setSelectedPositions(next); }} className="cursor-pointer" />
                      </td>
                      <td className="px-4 py-4 text-center"><button className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg"><Eye className="w-4 h-4 text-blue-600" /></button></td>
                      <td className="px-4 py-4 text-center"><button onClick={() => handleOpenModifyModal(p, 'BUY')} className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-2.5 py-1 rounded transition-all shadow hover:scale-105">B</button></td>
                      <td className="px-4 py-4 text-center"><button onClick={() => handleOpenModifyModal(p, 'SELL')} className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-2.5 py-1 rounded transition-all shadow hover:scale-105">S</button></td>
                      <td className="px-6 py-4 text-left text-sm font-semibold text-blue-600">{p.username}</td>
                      <td className="px-6 py-4 text-left"><span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded border border-purple-200 uppercase">{p.exchange}</span></td>
                      <td className="px-6 py-4 text-left"><span className={`text-xs font-bold uppercase px-2 py-1 rounded border ${p.position === 'BUY' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-red-600 border-red-200 bg-red-50'}`}>{p.position}</span></td>
                      <td className={`px-6 py-4 text-left font-bold ${p.position === 'BUY' ? 'text-blue-600' : 'text-red-600'}`}>{p.tradeSymbol}</td>
                      <td className="px-6 py-4 text-center font-bold text-sm">{p.quantity}</td>
                      <td className="px-6 py-4 text-right font-mono text-sm">{p.averagePrice}</td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold">{p.ltp ?? '-'}</td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-bold">{p.pnl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
          {tab === 'cfMarginSquareOff' && (
            <div className="h-40 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">CF Margin Square Off</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Coming soon...</p>
              </div>
            </div>
          )}
        </div>
        {/* Order Modals */}
        <OrderModal
          isOpen={orderModal.showBuyOrderModal}
          onClose={orderModal.closeBuyModal}
          orderType="BUY"
          selectedInstrument={orderModal.selectedOrderInstrument}
          liveData={orderModal.selectedOrderInstrument?.token ? liveTicks[orderModal.selectedOrderInstrument.token] : null}
          orderQuantity={orderModal.buyOrderQuantity}
          onOrderQuantityChange={(val) => handleValidatedQuantityChange(val, 'BUY')}
          orderPrice={orderModal.buyOrderPrice}
          onOrderPriceChange={orderModal.setBuyOrderPrice}
          orderMethod={orderModal.buyOrderType}
          onOrderMethodChange={orderModal.setBuyOrderType}
          orderRemark={orderModal.buyOrderRemark}
          onOrderRemarkChange={orderModal.setBuyOrderRemark}
          isAdminUser={true}
          clientSearchTerm={orderModal.clientSearchTerm}
          onClientSearchChange={orderModal.setClientSearchTerm}
          isSubmitting={orderModal.isBuyOrderSubmitting}
          onSubmit={handleBuySubmitAction}
          onCancel={() => orderModal.resetBuyForm(true)}
          modalPosition={orderModal.buyModalPosition}
          onDragStart={(e) => handleDragSetup(e, 'BUY')}
          isDragging={orderModal.isDraggingBuy}
        />
        <OrderModal
          isOpen={orderModal.showSellOrderModal}
          onClose={orderModal.closeSellModal}
          orderType="SELL"
          selectedInstrument={orderModal.selectedOrderInstrument}
          liveData={orderModal.selectedOrderInstrument?.token ? liveTicks[orderModal.selectedOrderInstrument.token] : null}
          orderQuantity={orderModal.sellOrderQuantity}
          onOrderQuantityChange={(val) => handleValidatedQuantityChange(val, 'SELL')}
          orderPrice={orderModal.sellOrderPrice}
          onOrderPriceChange={orderModal.setSellOrderPrice}
          orderMethod={orderModal.sellOrderType}
          onOrderMethodChange={orderModal.setSellOrderType}
          orderRemark={orderModal.sellOrderRemark}
          onOrderRemarkChange={orderModal.setSellOrderRemark}
          isAdminUser={true}
          clientSearchTerm={orderModal.clientSearchTerm}
          onClientSearchChange={orderModal.setClientSearchTerm}
          isSubmitting={orderModal.isSellOrderSubmitting}
          onSubmit={handleSellSubmitAction}
          onCancel={() => orderModal.resetSellForm(true)}
          modalPosition={orderModal.sellModalPosition}
          onDragStart={(e) => handleDragSetup(e, 'SELL')}
          isDragging={orderModal.isDraggingSell}
        />
      </div>
    </FilterLayout>
  );
};

export default UserPositionsPanel;