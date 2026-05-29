

// --- REUSE LOGIC FROM Positions.tsx ---
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Briefcase, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import userManagementService from '../services/userManagementService';
import marketWatchService from '../services/marketWatchService';
import FilterLayout from '../components/FilterLayout';
import { useOrderModal } from '../hooks/useOrderModal';
import OrderModal from '../components/modals/OrderModal';
import SearchableSelect from '../components/ui/SearchableSelect';

interface UserPositionsPanelProps {
  username: string;
  userId?: string | number;
}

const UserPositionsPanel: React.FC<UserPositionsPanelProps> = ({ username, userId }) => {
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
  const feedUnsubscribeRef = useRef<(() => void) | null>(null);
  const subscriptionRef = useRef({ subscribed: false, userId: null as string | null });
  const lastUpdateRef = useRef<number>(0);
  const instrumentConfigRef = useRef<Record<number, any>>({});
  const orderModal = useOrderModal(true);
  const maxAvailableQuantityRef = useRef<number>(999999);

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
    if (!selectedExchange || selectedExchange === 'All Exchanges') { setSymbols([]); return; }
    (async () => {
      try {
        const response = await userManagementService.fetchSymbols(selectedExchange);
        if (response?.responseCode === '0' && Array.isArray(response.data)) setSymbols(response.data);
      } catch (e) { console.error(e); }
    })();
  }, [selectedExchange]);

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
      setLiveTicks(prev => {
        const nextTicks = { ...prev };
        incomingFeedArray.forEach(item => { nextTicks[Number(item.insToken)] = item; });
        return nextTicks;
      });
      const now = Date.now();
      if (now - lastUpdateRef.current < 100) return;
      lastUpdateRef.current = now;
      const feedMap = new Map(incomingFeedArray.map(item => [Number(item.insToken), item]));
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
  const handleView = async (targetExchange?: string, targetUserIds?: number[]) => {
    const exchange = targetExchange || selectedExchange;
    if (!exchange) return;
    setLoading(true);
    unsubscribeCurrentFeed();
    setSelectedPositions(new Set());
    try {
      let uids: number[] = targetUserIds && targetUserIds.length > 0 ? targetUserIds : userId ? [Number(userId)] : [];
      const response = await userManagementService.fetchUserPositionsForExchange(exchange, selectedToken || 0, uids);
      if (response?.responseCode === '0' && response.data) {
        setPositionData(response.data);
        let positions = response.data.positions || [];
        if (selectedSymbol) positions = positions.filter((p: any) => p.tradeSymbol === selectedSymbol);
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
      <div className="flex gap-2 mb-2">
        <button type="button" className={`flex-1 px-2 py-1 rounded ${buySell === 'Sell' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200'}`} onClick={() => setBuySell('Sell')}>Sell</button>
        <button type="button" className={`flex-1 px-2 py-1 rounded ${buySell === 'Buy' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200'}`} onClick={() => setBuySell('Buy')}>Buy</button>
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
        <select value={orderType} onChange={e => setOrderType(e.target.value)} className="w-full px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm">
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
        <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={() => handleView()} disabled={loading} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm transition shadow-md">Submit</button>
        <button onClick={() => { setSelectedSymbol(''); setBuySell('Buy'); setOrderType(''); setQty(''); setRateBy('Market Price'); setPrice(''); handleView(); }} className="flex-1 px-4 py-2 bg-gray-400 dark:bg-slate-600 text-white rounded font-semibold text-sm transition">Clear</button>
      </div>
    </div>
  );

  // --- Table and content (copied from Positions.tsx, but only Add Order tab is live) ---
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
                      <td className="px-4 py-4 text-center"><button className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-2.5 py-1 rounded transition-all shadow hover:scale-105">B</button></td>
                      <td className="px-4 py-4 text-center"><button className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-2.5 py-1 rounded transition-all shadow hover:scale-105">S</button></td>
                      <td className="px-6 py-4 text-left text-sm font-semibold text-blue-600">{p.username}</td>
                      <td className="px-6 py-4 text-left"><span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded border border-purple-200 uppercase">{p.exchange}</span></td>
                      <td className="px-6 py-4 text-left">{p.position}</td>
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
      </div>
    </FilterLayout>
  );
};

export default UserPositionsPanel;