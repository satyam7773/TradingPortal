import React, { useState, useEffect } from 'react';
import { BarChart3, Search, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import userManagementService from '../../services/userManagementService';
import toast from 'react-hot-toast';

interface PositionData {
  exchange: string;
  tradeSymbol: string;
  netQuantity: number;
  positionSide: 'BUY' | 'SELL';
  averagePrice: number;
  realisedPnl: number;
  unrealisedPnl: number;
  marginUsed: number;
  updatedAt: string;
  buyQuantity: number;
  sellQuantity: number;
  token: number;
}

interface PositionResponse {
  unrealisedPnl: number;
  realisedPnl: number;
  credits: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
  totalPnl: number;
  positionsData: PositionData[];
}

const UserWisePosition: React.FC = () => {
  const [userId, setUserId] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [positionData, setPositionData] = useState<PositionResponse | null>(null);
  const [filteredPositions, setFilteredPositions] = useState<PositionData[]>([]);

  const handleSearch = async () => {
    if (!userId.trim()) {
      toast.error('Please enter a User ID');
      return;
    }

    setLoading(true);
    try {
      const response = await userManagementService.getUserPositions(parseInt(userId));
      console.log('📊 Full Response:', response);
      console.log('Response Type:', typeof response);
      console.log('Response Keys:', Object.keys(response || {}));
      console.log('Response.responseCode:', response?.responseCode);
      console.log('Response.data:', response?.data);
      
      // Check if response has responseCode directly (API returns full object)
      if (response?.responseCode === '0') {
        console.log('✅ Setting position data:', response.data);
        setPositionData(response.data);
        setFilteredPositions(response.data?.positionsData || []);
        toast.success('Positions loaded successfully');
      } else {
        console.error('❌ Response check failed:', response);
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

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (positionData?.positionsData) {
      const filtered = positionData.positionsData.filter(pos =>
        pos.tradeSymbol.toLowerCase().includes(value.toLowerCase()) ||
        pos.exchange.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredPositions(filtered);
    }
  };

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-slate-600/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{label}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                User Wise Position
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                View and manage user positions across all instruments
              </p>
            </div>
          </div>

          {/* Search Section */}
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                placeholder="Enter User ID..."
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-4">Loading positions...</p>
              </div>
            </div>
          ) : !positionData ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-blue-400 dark:text-blue-300 mb-4 mx-auto" />
                <p className="text-slate-600 dark:text-slate-400">Search for a user to view their positions</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <StatCard
                  label="Total P&L"
                  value={`₹${positionData.totalPnl?.toFixed(2) || '0'}`}
                  icon={DollarSign}
                  color={positionData.totalPnl >= 0 ? 'bg-green-500' : 'bg-red-500'}
                />
                <StatCard
                  label="Realised P&L"
                  value={`₹${positionData.realisedPnl?.toFixed(2) || '0'}`}
                  icon={TrendingDown}
                  color={positionData.realisedPnl >= 0 ? 'bg-green-500' : 'bg-red-500'}
                />
                <StatCard
                  label="Unrealised P&L"
                  value={`₹${positionData.unrealisedPnl?.toFixed(2) || '0'}`}
                  icon={TrendingUp}
                  color={positionData.unrealisedPnl >= 0 ? 'bg-green-500' : 'bg-red-500'}
                />
                <StatCard
                  label="Equity"
                  value={`₹${positionData.equity?.toFixed(2) || '0'}`}
                  icon={DollarSign}
                  color="bg-blue-500"
                />
                <StatCard
                  label="Margin Used"
                  value={`₹${positionData.marginUsed?.toFixed(2) || '0'}`}
                  icon={AlertCircle}
                  color="bg-orange-500"
                />
                <StatCard
                  label="Free Margin"
                  value={`₹${positionData.freeMargin?.toFixed(2) || '0'}`}
                  icon={TrendingUp}
                  color="bg-green-500"
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
                <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl border border-gray-200/50 dark:border-slate-700/50 overflow-x-auto">
                  <div className="mb-3 px-4 pt-4">
                    <input
                      type="text"
                      placeholder="Search by symbol or exchange..."
                      value={searchInput}
                      onChange={(e) => handleSearchInputChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <table className="min-w-[1200px] w-full table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '150px' }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 sticky top-0 z-10">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">Exchange</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">Trade Symbol</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Net Qty</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Side</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Avg Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Realised P&L</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Unrealised</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Margin</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Buy Qty</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Sell Qty</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Token</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Updated At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
                      {filteredPositions.map((position, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200"
                        >
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">{position.exchange}</td>
                          <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-semibold">{position.tradeSymbol}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-700 dark:text-slate-300">{position.netQuantity}</td>
                          <td className="px-4 py-3 text-sm text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              position.positionSide === 'BUY'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {position.positionSide}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">₹{position.averagePrice?.toFixed(2)}</td>
                          <td className={`px-4 py-3 text-sm text-right font-semibold ${
                            position.realisedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            ₹{position.realisedPnl?.toFixed(2)}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-semibold ${
                            position.unrealisedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            ₹{position.unrealisedPnl?.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">₹{position.marginUsed?.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-700 dark:text-slate-300">{position.buyQuantity}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-700 dark:text-slate-300">{position.sellQuantity}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-600 dark:text-slate-400">{position.token}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-600 dark:text-slate-400">
                            {new Date(position.updatedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserWisePosition;
