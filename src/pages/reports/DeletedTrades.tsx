import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import FilterLayout from '../../components/FilterLayout';
import toast from 'react-hot-toast';
import userManagementService from '../../services/userManagementService';
import SearchableSelect from '../../components/ui/SearchableSelect';

interface DeletedTradeData {
  tradeId: number;
  tradeSymbol: string;
  orderType: string;
  quantity: number;
  orderPrice: number;
  brokerage: number;
  deal: number;
  orderStatus: string;
  orderTime: string;
  executionTime: string | null;
  ipAddress: string;
  deviceId: string;
  tradeOrderMethod: string;
  deletedBy: string;
  deletedOn: string;
  tradeBy: string;
  undo: boolean;
}

interface DeletedTradesProps {
  username?: string;
  userId?: string;
  roleId?: string;
  user?: any; // userDetails from modal
}

const DeletedTrades: React.FC<DeletedTradesProps> = ({ 
  username,
  userId: propsUserId,
  roleId,
  user: userDetails
}) => {
  // Detect if in modal mode based on presence of userDetails
  const isModalMode = !!userDetails;

  // Initialize dates to today using en-CA format (YYYY-MM-DD)
  const today = new Date().toLocaleDateString('en-CA');

  const [filters, setFilters] = useState({
    fromDate: today,
    toDate: today,
    selectedUserId: 0,
    status: 'ALL',
    exchange: '',
    selectedSymbolToken: 0
  });

  const [trades, setTrades] = useState<DeletedTradeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<number>>(new Set());
  const pageSize = 10;

  // Dynamic dropdown options
  const [users, setUsers] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [symbols, setSymbols] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any>({});

  // Get logged in user ID and device info
  const userDataStr = localStorage.getItem('userData');
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  const loggedInUserId = userData?.userId;
  const deviceId = userData?.deviceId || '';
  const tradeOrderMethod = userData?.tradeOrderMethod || 'WEB';
  const userRoleId = userData?.roleId;
  const isAdminUser = userRoleId === 1 || userRoleId === 2 || userRoleId === 3;

  // In modal mode, use propsUserId; in dashboard mode, use selectedUserId
  const targetUserId = isModalMode && propsUserId ? parseInt(propsUserId) : loggedInUserId;

  const userOptions = useMemo(() => [
    ...users.map(u => ({ id: u.userId, name: u.userName }))
  ], [users]);

  const symbolOptions = useMemo(() => [
    ...symbols.map(s => ({ id: s.token, name: s.tradeSymbol || s }))
  ], [symbols]);

  const statusOptions = useMemo(() => [
    ...Object.entries(statuses).map(([key, value]) => ({ id: value, name: key }))
  ], [statuses]);

  // Fetch deleted trades data
  const handleFetchTrades = async (page: number = 0, currentFilters?: typeof filters) => {
    if (!loggedInUserId) {
      toast.error('User not logged in');
      return;
    }

    setLoading(true);
    try {
      const filtersToUse = currentFilters || filters;

      // In modal mode, use targetUserId; in dashboard mode, use selectedUserId
      const userIdForData = isModalMode ? targetUserId : (filtersToUse.selectedUserId || loggedInUserId);

      const payload: any = {
        userId: loggedInUserId,
        requestTimestamp: '',
        data: {
          from: filtersToUse.fromDate,
          to: filtersToUse.toDate,
          page: page,
          userId: userIdForData,
          exchange: filtersToUse.exchange || null,
          token: filtersToUse.selectedSymbolToken || 0,
          status: filtersToUse.status || 'ALL'
        }
      };

      const response = await fetch('https://api-staging.rivoplus.live/reports/trades/deleted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result?.responseCode === '0') {
        const tradesList = result.data?.trades || [];
        setTrades(Array.isArray(tradesList) ? tradesList : []);
        const limit = result.data?.limit || 100;
        const totalSize = result.data?.size || 0;
        setTotalRecords(totalSize);
        const calculatedPages = Math.ceil(totalSize / limit);
        setTotalPages(calculatedPages);
        setCurrentPage(page);
      } else {
        setTrades([]);
        if (result?.responseMessage) toast.error(result.responseMessage);
      }
    } catch (error) {
      toast.error('Error fetching deleted trades');
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

  const handleSelectTrade = (index: number) => {
    if (!trades[index]?.undo) return; // Only allow selection if undo is true
    const newSelected = new Set(selectedTradeIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTradeIds(newSelected);
  };

  const handleSelectAll = () => {
    const undoableTrades = trades
      .map((trade, index) => trade.undo ? index : -1)
      .filter(index => index !== -1);
    
    if (selectedTradeIds.size === undoableTrades.length && undoableTrades.length > 0) {
      setSelectedTradeIds(new Set());
    } else {
      const allUndoableIndices = new Set(undoableTrades);
      setSelectedTradeIds(allUndoableIndices);
    }
  };

  const handleRestoreTrades = async () => {
    if (!isAdminUser) {
      toast.error('Only admins can restore trades');
      return;
    }

    if (selectedTradeIds.size === 0) {
      toast.error('Please select trades to restore');
      return;
    }

    if (!window.confirm(`Are you sure you want to restore ${selectedTradeIds.size} trade(s)? This action cannot be undone.`)) {
      return;
    }

    setIsRestoring(true);
    try {
      const selectedIndices = Array.from(selectedTradeIds);
      const tradeIdsToRestore = selectedIndices.map(index => trades[index]?.tradeId);

      const payload = {
        userId: loggedInUserId,
        deviceId: deviceId,
        tradeOrderMethod: tradeOrderMethod,
        data: {
          userId: loggedInUserId,
          tradeIds: tradeIdsToRestore
        }
      };

      const response = await fetch('https://api-staging.rivoplus.live/oms/undoTrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result?.responseCode === '0') {
        toast.success(`${selectedTradeIds.size} trade(s) restored successfully`);
        setSelectedTradeIds(new Set());
        handleFetchTrades(currentPage);
      } else {
        toast.error(result?.responseMessage || 'Failed to restore trades');
      }
    } catch (error: any) {
      console.error('Error restoring trades:', error);
      toast.error(error?.message || 'Error restoring trades');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreTrade = async (tradeId: number) => {
    if (!isAdminUser) {
      toast.error('Only admins can restore trades');
      return;
    }

    if (!window.confirm('Are you sure you want to restore this trade?')) {
      return;
    }

    setIsRestoring(true);
    try {
      const payload = {
        userId: loggedInUserId,
        deviceId: deviceId,
        tradeOrderMethod: tradeOrderMethod,
        data: {
          userId: loggedInUserId,
          tradeIds: [tradeId]
        }
      };

      const response = await fetch('https://api-staging.rivoplus.live/oms/undoTrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result?.responseCode === '0') {
        toast.success('Trade restored successfully');
        handleFetchTrades(currentPage);
      } else {
        toast.error(result?.responseMessage || result?.message || 'Failed to restore trade');
      }
    } catch (error: any) {
      console.error('Error restoring trade:', error);
      toast.error(error?.message || 'Error restoring trade');
    } finally {
      setIsRestoring(false);
    }
  };

  // Load initial metadata and fetch trades on page load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true);

        // Fetch order statuses
        const statusResponse = await fetch(`https://api-staging.rivoplus.live/reports/deleted/orderStatus?userId=${loggedInUserId}`);
        const statusData = await statusResponse.json();
        if (statusData?.responseCode === '0' && statusData.data) {
          setStatuses(statusData.data);
        }

        // Only fetch users in dashboard mode
        if (!isModalMode) {
          const usersResponse = await userManagementService.fetchOwnUsersForUserwiseforManageTrades(loggedInUserId);
          if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
            setUsers(usersResponse.data);
          }
        }

        // Fetch exchanges
        const exchangesResponse = await userManagementService.fetchExchanges();
        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse);
          const defaultExchange = exchangesResponse[0].name;
          setFilters(prev => ({ ...prev, exchange: defaultExchange }));
          
          // Fetch symbols for the default exchange
          const symbolsResponse = await userManagementService.fetchSymbols(defaultExchange);
          if (symbolsResponse) {
            let symbolsData = symbolsResponse;
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
  }, [isModalMode]);

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
      fromDate: today,
      toDate: today,
      selectedUserId: 0,
      status: 'ALL',
      exchange,
      selectedSymbolToken: 0
    });
    setTrades([]);
  };

  return (
    <>
      <FilterLayout
        filterWidthClass="lg:w-[16%]"
        header={(
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Deleted Trades
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{trades.length} trades found</p>
              </div>
            </div>
            {isAdminUser && selectedTradeIds.size > 0 && (
              <button
                onClick={handleRestoreTrades}
                disabled={isRestoring}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition inline-flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                Restore {selectedTradeIds.size > 0 && `(${selectedTradeIds.size})`}
              </button>
            )}
          </div>
        )}
        filters={(
          <>
            <div className="space-y-4">
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

              {!isModalMode && (
                <>
                  {/* Username */}
                  <SearchableSelect
                    label="Username :"
                    items={userOptions}
                    selectedId={filters.selectedUserId}
                    onSelect={(userId) => handleFilterChange('selectedUserId', Number(userId))}
                    placeholder="Search user..."
                  />
                </>
              )}

              {/* Order Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Order Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(status => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
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
                selectedId={filters.selectedSymbolToken}
                onSelect={(id) => handleFilterChange('selectedSymbolToken', Number(id))}
                placeholder="Search symbol..."
              />

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleFetchTrades()}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-200 text-sm font-semibold shadow-lg disabled:opacity-60"
                >
                  {loading ? 'Loading...' : 'View'}
                </button>
                <button
                  onClick={handleClearFilters}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-all duration-200 text-sm font-semibold"
                >
                  Clear
                </button>
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
                  <tr className="bg-gradient-to-r from-slate-100 to-red-100 dark:from-slate-700 dark:to-slate-600 border-b border-gray-200/50 dark:border-slate-600/50">
                    {isAdminUser && (
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedTradeIds.size === trades.filter(t => t.undo).length && trades.filter(t => t.undo).length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Username</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Symbol</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[120px]">Type</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Quantity</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Order Price</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Brk</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Deal</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[150px]">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Order Time</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Execution Time</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">IP Address</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Order Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminUser ? 13 : 12} className="px-4 py-12 text-center">
                        <Trash2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No deleted trades found</h3>
                        <p className="text-slate-500 dark:text-slate-400">Adjust your filters and click "View" to load deleted trades</p>
                      </td>
                    </tr>
                  ) : trades.map((trade, index) => {
                    const typeColorClass = trade.orderType?.toUpperCase().startsWith('BUY')
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400';

                    return (
                      <tr
                        key={index}
                        className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200"
                      >
                        {/* Checkbox - Only show for admin users */}
                        {isAdminUser && (
                          <td className="px-4 py-3 text-center">
                            {trade.undo ? (
                              <input
                                type="checkbox"
                                checked={selectedTradeIds.has(index)}
                                onChange={() => handleSelectTrade(index)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                              />
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </td>
                        )}

                        {/* Username */}
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {trade.tradeBy ? trade.tradeBy.split('-')[0].slice(1) : '-'}
                        </td>

                        {/* Symbol */}
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white">
                          {trade.tradeSymbol}
                        </td>

                        {/* Type (BUY/SELL) */}
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold ${typeColorClass}`}>
                            {trade.orderType}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className={`px-4 py-3 text-sm font-bold text-center ${typeColorClass}`}>
                          {trade.quantity}
                        </td>

                        {/* Order Price */}
                        <td className={`px-4 py-3 text-sm text-right font-mono font-bold ${typeColorClass}`}>
                          {trade.orderPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Brk (Brokerage) */}
                        <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-300 font-mono">
                          {trade.brokerage?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Deal */}
                        <td className="px-4 py-3 text-sm text-right font-mono font-bold text-slate-600 dark:text-slate-300">
                          {trade.deal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 whitespace-normal">
                            {trade.orderStatus}
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

                        {/* Order Method */}
                        <td className="px-4 py-3 text-xs text-center text-slate-600 dark:text-slate-300 whitespace-nowrap font-semibold">
                          {trade.tradeOrderMethod || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="sticky bottom-0 z-20 flex-shrink-0 px-4 py-4 border-t border-gray-200/50 dark:border-slate-600/50 bg-gradient-to-r from-slate-50 via-red-50 to-pink-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 shadow-lg">
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
    </>
  );
};

export default DeletedTrades;
