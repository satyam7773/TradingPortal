import React, { useState, useEffect } from 'react';
import { BarChart3, Search, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import userManagementService from '../../services/userManagementService';
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
  pnl: number;
  pnlPercentage: number;
  realisedPnl: number;
  totalPnl: number;
  marginUsed: number;
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
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<string>('NSE');
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
            setSelectedExchange(exchangesResponse[0].name);
            
            // Fetch symbols for the first exchange
            const symbolsResponse = await userManagementService.fetchSymbols(exchangesResponse[0].name);
            if (symbolsResponse?.responseCode === '0' && Array.isArray(symbolsResponse.data)) {
              setSymbols(symbolsResponse.data);
              setFilteredSymbols(symbolsResponse.data);
            }
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
    if (selectedExchange) {
      const fetchSymbolsForExchange = async () => {
        try {
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
    }
  }, [selectedExchange]);

  const handleView = async () => {
    if (!selectedUsername.trim()) {
      toast.error('Please select a username');
      return;
    }

    setLoading(true);
    try {
      // Find user ID
      const userData = users.find(u => u.name === selectedUsername);
      if (!userData) {
        toast.error('User not found');
        return;
      }

      // Use the new positions API with exchange, token, and userIds
      // Send empty string for exchange if "All Exchanges" is selected (backend will handle it)
      // Send 0 for token if "All Symbols" is selected (backend will handle it)
      const exchangeToUse = selectedExchange === '' ? '' : selectedExchange;
      const tokenToUse = selectedToken === null ? 0 : selectedToken;
      
      const response = await userManagementService.fetchUserPositionsForExchange(
        exchangeToUse,
        tokenToUse,
        [userData.id]
      );
      
      if (response?.responseCode === '0') {
        // Extract positions from response.data.positions
        const posData = response.data;
        setPositionData(posData);
        setFilteredPositions(posData?.positions || []);
        toast.success('Positions loaded successfully');
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

  const handleMainFilterApply = () => {
    if (!positionData?.positions) return;

    let filtered = [...positionData.positions];

    // Filter by exchange
    if (selectedExchange && selectedExchange !== 'All') {
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
    setSelectedUsername('');
    setSelectedExchange('NSE');
    setSelectedSymbol('All Symbols');
    setPlPercent('');
    setPosiDays('');
    setPositionData(null);
    setFilteredPositions([]);
    setUsers([]);
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
                  setSelectedUsername(e.target.value);
                  const userData = users.find(u => u.name === e.target.value);
                  setSelectedUserId(userData?.id || null);
                }}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Select User</option>
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
                  if (e.target.value === 'All') {
                    setSelectedExchange('');
                  } else {
                    setSelectedExchange(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="All">All Exchanges</option>
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
                <table className="min-w-[1200px] w-full">
                  <thead className="sticky top-0 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-600 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">PositionDate</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">PositionDays</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">Exchange</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">Symbol</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Position</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Quantity</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Avg Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Realised P&L</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Unrealised P&L</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Margin Used</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Buy Qty</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Sell Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
                    {filteredPositions.map((position, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200"
                      >
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
                        <td className={`px-4 py-2 text-xs text-right font-semibold ${
                          position.realisedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          ₹{position.realisedPnl?.toFixed(2)}
                        </td>
                        <td className={`px-4 py-2 text-xs text-right font-semibold ${
                          position.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          ₹{position.pnl?.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-xs text-right text-slate-700 dark:text-slate-300">₹{position.marginUsed?.toFixed(2)}</td>
                        <td className="px-4 py-2 text-xs text-center text-slate-700 dark:text-slate-300">{position.pnlPercentage?.toFixed(2)}%</td>
                        <td className="px-4 py-2 text-xs text-center text-slate-700 dark:text-slate-300">{position.username}</td>
                      </tr>
                    ))}
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
