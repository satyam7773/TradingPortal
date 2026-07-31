import React, { useState, useEffect, useMemo } from 'react';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import FilterLayout from '../../components/FilterLayout';
import toast from 'react-hot-toast';
import userManagementService from '../../services/userManagementService';
import SearchableSelect from '../../components/ui/SearchableSelect';
import UserDetailsModal from '../user-management/UserDetailsModal';
import DealBrkDetailsModal from './DealBrkDetailsModal';
import DurationDetailsModal from './DurationDetailsModal';

interface TradeData {
  id?: number;
  tradeId?: number;
  username: string;
  userId?: number;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  brokerage: number;
  pnl: number;
  duration: string;
  status: string;
  orderTime: string;
  executionTime: string;
  ipAddress: string;
  deviceId: string | null;
  referencePrice: number;
  orderMethod: string;
  exchange?: string;
  placedByUsername?: string;
  placedBy?:string;
}

let lastClickTime = 0;
let lastProcessedId: number | null = null;

const ManageTraders: React.FC = () => {
  // Initialize dates to today using en-CA format (YYYY-MM-DD)
  const today = new Date().toLocaleDateString('en-CA');

  const [filters, setFilters] = useState({
    live: false,
    fromDate: today,
    toDate: today,
    time: false,
    fromTime: '00:00:00',
    toTime: '23:59:59',
    selectedUserId: 0,
    status: '',
    orderType: '',
    buySell: '',
    exchange: '',
    symbols: '',
    ipDev: 'Default',
    duration: '',
    pnl: ''
  });

  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<number | null>(null);
  const [selectedTradeUserId, setSelectedTradeUserId] = useState<number | null>(null);
  const [isBrkModalOpen, setIsBrkModalOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const pageSize = 10;

  // Dynamic dropdown options
  const [users, setUsers] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [symbols, setSymbols] = useState<any[]>([]);
  const [statuses] = useState(['Pending', 'Successful', 'Rejected']);
  const [orderTypes] = useState(['Market', 'Limit']);
  const [buySellTypes] = useState(['BUY', 'SELL']);

  // Get logged in user ID
  const userDataStr = localStorage.getItem('userData');
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  const loggedInUserId = userData?.userId;

  const userOptions = useMemo(() => [
    ...users.map(u => ({ id: u.userId, name: u.userName }))
  ], [users]);

  const symbolOptions = useMemo(() => [
    ...symbols.map(s => ({ id: s.tradeSymbol || s.token, name: s.tradeSymbol || s }))
  ], [symbols]);

  // Fetch trades data
  const handleFetchTrades = async (page: number = 0, currentFilters?: typeof filters) => {
    if (!loggedInUserId) {
      toast.error('User not logged in');
      return;
    }

    setLoading(true);
    try {
      const filtersToUse = currentFilters || filters;

      const targetUserId = filtersToUse.selectedUserId || loggedInUserId;
      const payload: any = {
        userId: targetUserId,
        requestTimestamp: '',
        data: {
          fromDate: filtersToUse.fromDate,
          toDate: filtersToUse.toDate,
          time: filtersToUse.time,
          fromTime: filtersToUse.fromTime,
          toTime: filtersToUse.toTime,
          page: page,
          exchange: filtersToUse.exchange,
          userId: targetUserId
        }
      };

      // Only include optional fields if they have values
      if (filtersToUse.status) payload.data.status = filtersToUse.status;
      if (filtersToUse.orderType) payload.data.orderType = filtersToUse.orderType;
      if (filtersToUse.buySell) payload.data.side = filtersToUse.buySell;
      if (filtersToUse.ipDev && filtersToUse.ipDev !== 'Default') payload.data.ipDev = filtersToUse.ipDev;
      if (filtersToUse.duration) payload.data.duration = filtersToUse.duration;
      if (filtersToUse.pnl) payload.data.pnl = filtersToUse.pnl;

      const response = await fetch('https://api-staging.rivoplus.live/reports/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result?.responseCode === '0') {
        const tradesList = result.data?.trades || result.data?.content || [];
        console.log('API Response trades:', tradesList);
        if (Array.isArray(tradesList) && tradesList.length > 0) {
          console.log('First trade object:', tradesList[0]);
          console.log('First trade keys:', Object.keys(tradesList[0]));
        }
        setTrades(Array.isArray(tradesList) ? tradesList : []);
        const limit = result.data?.limit || 100;
        const totalSize = result.data?.total || result.data?.totalRecords || result.data?.size || tradesList.length;
        setTotalRecords(totalSize);
        // Calculate pages based on total records and limit
        const calculatedPages = Math.ceil(totalSize / limit);
        setTotalPages(calculatedPages);
        setCurrentPage(page);
      } else {
        setTrades([]);
        if (result?.responseMessage) toast.error(result.responseMessage);
      }
    } catch (error) {
      toast.error('Error fetching trades');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      handleFetchTrades(newPage);
    }
  };

  const handleUserNameClick = (e: React.MouseEvent, username: string, userId: number | undefined | null) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('handleUserNameClick called:', { username, userId, type: typeof userId });

    const currentTime = Date.now();

    if (!userId || userId === 0) {
      console.log('Click blocked - no valid userId:', userId);
      return;
    }

    if (lastProcessedId === userId && currentTime - lastClickTime < 800) {
      console.log('Click blocked - duplicate within 800ms');
      return;
    }

    const userDataStr = localStorage.getItem('userData');
    const loggedInUser = userDataStr ? JSON.parse(userDataStr) : null;
    if (loggedInUser?.roleId === 4) {
      console.log('Click blocked - roleId 4');
      return;
    }

    lastClickTime = currentTime;
    lastProcessedId = userId;

    const placeholderUser: any = {
      id: userId.toString(),
      username: username,
      name: username,
      isActive: true
    };

    console.log('Setting selectedUser:', placeholderUser);
    setSelectedUser(placeholderUser);
  };

  // Load initial metadata and fetch trades on page load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true);

        // Fetch users
        const usersResponse = await userManagementService.fetchOwnUsersForUserwiseforManageTrades(loggedInUserId);
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data);
        }

        // Fetch exchanges
        const exchangesResponse = await userManagementService.fetchExchanges();
        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse);
          const defaultExchange = exchangesResponse[0].name;
          setFilters(prev => ({ ...prev, exchange: defaultExchange }));
          
          // Fetch symbols for the default exchange on page load
          const symbolsResponse = await userManagementService.fetchSymbols(defaultExchange);
          if (symbolsResponse) {
            let symbolsData = symbolsResponse;
            // Handle both auto-unwrapped (array) and non-unwrapped (object with data) responses
            if (symbolsResponse?.responseCode === '0' && symbolsResponse.data) {
              symbolsData = symbolsResponse.data;
            }
            if (Array.isArray(symbolsData) && symbolsData.length > 0) {
              setSymbols(symbolsData);
            }
          }
        }

      } catch (error) {
        toast.error('Failed to load metadata');
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Fetch trades when exchange is set
  useEffect(() => {
    if (!initialLoading && filters.exchange) {
      handleFetchTrades();
    }
  }, [initialLoading, filters.exchange]);

  // Fetch symbols when exchange changes
  useEffect(() => {
    if (filters.exchange) {
      const fetchSymbols = async () => {
        try {
          const response = await userManagementService.fetchSymbols(filters.exchange);
          let symbolsData = response;
          // Handle both auto-unwrapped (array) and non-unwrapped (object with data) responses
          if (response?.responseCode === '0' && response.data) {
            symbolsData = response.data;
          }
          if (Array.isArray(symbolsData) && symbolsData.length > 0) {
            setSymbols(symbolsData);
          } else {
            setSymbols([]);
          }
        } catch (error) {
          setSymbols([]);
        }
      };
      fetchSymbols();
    }
  }, [filters.exchange]);

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    const today = new Date().toLocaleDateString('en-CA');
    const exchange = exchanges.length > 0 ? exchanges[0].name : '';
    setFilters({
      live: false,
      fromDate: today,
      toDate: today,
      time: false,
      fromTime: '00:00:00',
      toTime: '23:59:59',
      selectedUserId: 0,
      status: '',
      orderType: '',
      buySell: '',
      exchange,
      symbols: '',
      ipDev: 'Default',
      duration: '',
      pnl: ''
    });
    setTrades([]);
  };

  return (
    <>
      <FilterLayout
        header={(
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Manage Trades
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{trades.length} trades found</p>
              </div>
            </div>
          </div>
        )}
        filters={(
          <>
            <div className="space-y-4">
              {/* Live Toggle */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Live</label>
                <button
                  onClick={() => handleFilterChange('live', !filters.live)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${filters.live ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${filters.live ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>

              {/* From Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">From</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">To</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Time Toggle */}
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Time</label>
                <button
                  onClick={() => handleFilterChange('time', !filters.time)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${filters.time ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${filters.time ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>

              {/* Time Inputs - Only visible when time toggle is on */}
              {filters.time && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">From Time</label>
                    <input
                      type="time"
                      value={filters.fromTime}
                      onChange={(e) => handleFilterChange('fromTime', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">To Time</label>
                    <input
                      type="time"
                      value={filters.toTime}
                      onChange={(e) => handleFilterChange('toTime', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Username */}
              <SearchableSelect
                label="Username :"
                items={userOptions}
                selectedId={filters.selectedUserId}
                onSelect={(userId) => handleFilterChange('selectedUserId', Number(userId))}
                placeholder="Search user..."
              />

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {/* Order Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Order Type</label>
                <select
                  value={filters.orderType}
                  onChange={(e) => handleFilterChange('orderType', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  {orderTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Buy/Sell Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Buy/Sell Type</label>
                <select
                  value={filters.buySell}
                  onChange={(e) => handleFilterChange('buySell', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Both</option>
                  {buySellTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Order Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Order Type</label>
                <select
                  value={filters.orderType}
                  onChange={(e) => handleFilterChange('orderType', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                  <option value="SL">Stop Loss</option>
                </select>
              </div>

              {/* Exchange */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Exchange</label>
                <select
                  value={filters.exchange}
                  onChange={(e) => handleFilterChange('exchange', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {exchanges.map(exchange => (
                    <option key={exchange.name} value={exchange.name}>{exchange.name}</option>
                  ))}
                </select>
              </div>

              {/* Symbols */}
              <SearchableSelect
                label="Symbol :"
                items={symbolOptions}
                selectedId={filters.symbols}
                onSelect={(id) => handleFilterChange('symbols', String(id))}
                placeholder="Search symbol..."
              />

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleFetchTrades()}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold shadow-lg disabled:opacity-60"
                >
                  {loading ? 'Loading...' : 'View'}
                </button>
                <button
                  onClick={() => {
                    const allExchangesValue = 'All Exchanges';
                    setFilters(prev => ({
                      ...prev,
                      selectedUserId: 0,
                      status: '',
                      orderType: '',
                      buySell: '',
                      exchange: allExchangesValue,
                      symbols: ''
                    }));
                    setTrades([]);
                    
                    // Fetch symbols for All Exchanges
                    userManagementService.fetchSymbols(allExchangesValue).then(res => {
                      let symbolsData = res;
                      // Handle both auto-unwrapped (array) and non-unwrapped (object with data) responses
                      if (res?.responseCode === '0' && res.data) {
                        symbolsData = res.data;
                      }
                      if (Array.isArray(symbolsData) && symbolsData.length > 0) {
                        setSymbols(symbolsData);
                      } else {
                        setSymbols([]);
                      }
                    }).catch(() => {
                      setSymbols([]);
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-all duration-200 text-sm font-semibold"
                >
                  Clear
                </button>
              </div>

              {/* Advance Filter Section */}
              <div className="border-t border-gray-200 dark:border-slate-600 pt-4 mt-4">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase">Advance Filter</h3>

                {/* IP / Dev */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">IP / Dev</label>
                  <select
                    value={filters.ipDev}
                    onChange={(e) => setFilters({ ...filters, ipDev: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Default">Default</option>
                    <option value="IPAddress Base All">IPAddress Base All</option>
                    <option value="IPAddress Base Summary">IPAddress Base Summary</option>
                    <option value="Deviceid Base All">Deviceid Base All</option>
                    <option value="Deviceid Base Summary">Deviceid Base Summary</option>
                  </select>
                </div>

                {/* Duration */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Duration (M)</label>
                  <input
                    type="number"
                    value={filters.duration}
                    onChange={(e) => setFilters({ ...filters, duration: e.target.value })}
                    placeholder="60"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* P/L */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">P/L</label>
                  <input
                    type="number"
                    value={filters.pnl}
                    onChange={(e) => setFilters({ ...filters, pnl: e.target.value })}
                    placeholder="10.000"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Apply Advanced Filter */}
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 text-sm font-semibold">
                    Apply
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, ipDev: 'Default', duration: '', pnl: '' })}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-all duration-200 text-sm font-semibold"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      >
        <div className="flex-1 overflow-auto flex flex-col">
          <div className="flex-1 bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl">
            <div className="overflow-x-auto h-full">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-100 to-blue-100 dark:from-slate-700 dark:to-slate-600 border-b border-gray-200/50 dark:border-slate-600/50">
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Username</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Symbol</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Type</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Quantity</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Price</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Brk</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Deal</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Duration</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Order Time</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Execution Time</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">IPAddress</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">DeviceId</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Reference Price</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Order Method</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Placed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="px-4 py-12 text-center">
                        <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No trades found</h3>
                        <p className="text-slate-500 dark:text-slate-400">Adjust your filters and click "View" to load trades</p>
                      </td>
                    </tr>
                  ) : trades.map((trade, index) => {
                    const typeColorClass = trade.type === 'BUY'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400';
                    const typeBgClass = trade.type === 'BUY'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-red-100 dark:bg-red-900/30';
                    const pnlColorClass = trade.pnl >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400';

                    return (
                      <tr
                        key={index}
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200"
                      >
                        {/* Username */}
                        <td className="px-4 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                          <span
                            onClick={(e) => {
                              console.log('Span onClick triggered. Trade:', { username: trade.username, userId: trade.userId });
                              handleUserNameClick(e, trade.username, trade.userId);
                            }}
                            className="hover:opacity-80 transition-opacity"
                          >
                            {trade.username}
                          </span>
                        </td>

                        {/* Symbol */}
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white">
                          {trade.symbol}
                        </td>

                        {/* Type (BUY/SELL) */}
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold ${trade.type?.toUpperCase().startsWith('BUY') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {trade.type}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className={`px-4 py-3 text-sm font-bold text-center ${typeColorClass}`}>
                          {trade.quantity}
                        </td>

                        {/* Price */}
                        <td className={`px-4 py-3 text-sm text-right font-mono font-bold ${typeColorClass}`}>
                          {trade.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Brk (Brokerage) */}
                        <td
                          className="px-4 py-3 text-sm text-right text-blue-600 dark:text-blue-400 font-mono cursor-pointer hover:underline hover:opacity-80 transition-opacity"
                          onClick={() => {
                            const tradeId = (trade as any).id || (trade as any).tradeId;
                            if (tradeId) {
                              setSelectedTradeId(tradeId);
                              setIsBrkModalOpen(true);
                            } else {
                              toast.error('Trade ID not found');
                            }
                          }}
                        >
                          {trade.brokerage}
                        </td>

                        {/* Deal (P&L) */}
                        <td 
                          className={`px-4 py-3 text-sm text-right font-mono font-bold cursor-pointer hover:underline hover:opacity-80 transition-opacity ${pnlColorClass}`}
                          onClick={() => {
                            const tradeId = (trade as any).id || (trade as any).tradeId;
                            if (tradeId) {
                              setSelectedTradeId(tradeId);
                              setIsDealModalOpen(true);
                            } else {
                              toast.error('Trade ID not found');
                            }
                          }}
                        >
                          {trade.pnl?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Duration */}
                        <td 
                          className="px-4 py-3 text-xs text-center text-blue-600 dark:text-blue-400 underline cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            const tradeId = (trade as any).id || (trade as any).tradeId;
                            if (tradeId) {
                              setSelectedTradeId(tradeId);
                              setSelectedTradeUserId(trade.userId || null);
                              setIsDurationModalOpen(true);
                            } else {
                              toast.error('Trade ID not found');
                            }
                          }}
                        >
                          {trade.duration || '-'}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${trade.status === 'Successful'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                              : trade.status === 'Pending'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}>
                            {trade.status}
                          </span>
                        </td>

                        {/* Order Time */}
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {trade.orderTime ? new Date(trade.orderTime).toLocaleString() : '-'}
                        </td>

                        {/* Execution Time */}
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {trade.executionTime ? new Date(trade.executionTime).toLocaleString() : '-'}
                        </td>

                        {/* IP Address */}
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {trade.ipAddress || '-'}
                        </td>

                        {/* Device ID */}
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 font-mono max-w-xs truncate" title={trade.deviceId || ''}>
                          {trade.deviceId || '-'}
                        </td>

                        {/* Reference Price */}
                        <td className="px-4 py-3 text-xs text-right text-slate-600 dark:text-slate-300 font-mono">
                          {trade.referencePrice ? trade.referencePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                        </td>

                        {/* Order Method */}
                        <td className="px-4 py-3 text-xs text-center text-slate-600 dark:text-slate-300 whitespace-nowrap font-semibold">
                          {trade.orderMethod || '-'}
                        </td>

                        {/* Placed By */}
                        <td className="px-4 py-3 text-xs text-left text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {trade.placedBy || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200/50 dark:border-slate-600/50 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing <span className="font-semibold text-slate-900 dark:text-white">1</span> to{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{totalRecords}</span> of{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{totalRecords}</span> results
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0 || loading}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 transition shadow-sm inline-flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1 || loading}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 transition shadow-sm inline-flex items-center gap-2"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </FilterLayout>

      {selectedUser && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-[9999]" onClick={() => setSelectedUser(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col border border-gray-200/50 overflow-hidden" style={{ width: '98vw', height: '96vh', maxWidth: '1800px' }} onClick={(e) => e.stopPropagation()}>
            <UserDetailsModal
              user={selectedUser}
              onClose={() => setSelectedUser(null)}
              onToggle={() => { }}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Deal Brokerage Details Modal */}
      <DealBrkDetailsModal
        isOpen={isBrkModalOpen}
        tradeId={selectedTradeId || 0}
        userId={loggedInUserId}
        onClose={() => {
          setIsBrkModalOpen(false);
          setSelectedTradeId(null);
        }}
      />

      {/* Deal Details Modal */}
      <DealBrkDetailsModal
        isOpen={isDealModalOpen}
        tradeId={selectedTradeId || 0}
        userId={loggedInUserId}
        onClose={() => {
          setIsDealModalOpen(false);
          setSelectedTradeId(null);
        }}
      />

      {/* Duration Details Modal */}
      <DurationDetailsModal
        isOpen={isDurationModalOpen}
        tradeId={selectedTradeId || 0}
        userId={selectedTradeUserId || loggedInUserId}
        onClose={() => {
          setIsDurationModalOpen(false);
          setSelectedTradeId(null);
          setSelectedTradeUserId(null);
        }}
      />
    </>
  );
};

export default ManageTraders;
