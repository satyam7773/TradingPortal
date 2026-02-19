import React, { useState } from 'react';
import { Users, Calendar, Filter } from 'lucide-react';
import FilterLayout from '../../components/FilterLayout';

interface TradeData {
  id: string;
  username: string;
  fromDate: string;
  toDate: string;
  time: string;
  userName: string;
  buyOrSell: string;
  orderType: string;
  symbolType: string;
  symbols: string;
  exchange: string;
  type: string;
  quantity: number;
  price: number;
  brk: number;
  deal: number;
  duration: string;
  status: string;
  orderTime: string;
}

const ManageTraders: React.FC = () => {
  const [filters, setFilters] = useState({
    username: '',
    fromDate: '05/15/2025',
    toDate: '05/15/2025',
    time: '',
    userName: 'All Event',
    status: 'All',
    orderType: 'All',
    buyOrSell: 'NFO',
    symbolType: 'All Symbols',
    symbols: 'All Symbols',
    exchange: 'All Exchange'
  });

  // Sample data
  const trades: TradeData[] = [
    {
      id: '1',
      username: 'demo666',
      fromDate: '05/15/2025',
      toDate: '05/15/2025',
      time: '09:15:00',
      userName: 'trader001',
      buyOrSell: 'BUY',
      orderType: 'LIMIT',
      symbolType: 'NFO',
      symbols: 'NIFTY25JUN24500CE',
      exchange: 'NSE',
      type: 'OPTIONS',
      quantity: 50,
      price: 125.50,
      brk: 2.5,
      deal: 1,
      duration: '1D',
      status: 'EXECUTED',
      orderTime: '09:15:23'
    },
    {
      id: '2',
      username: 'demo501',
      fromDate: '05/15/2025',
      toDate: '05/15/2025',
      time: '09:30:00',
      userName: 'trader002',
      buyOrSell: 'SELL',
      orderType: 'MARKET',
      symbolType: 'NFO',
      symbols: 'BANKNIFTY25JUN45000PE',
      exchange: 'NSE',
      type: 'OPTIONS',
      quantity: 25,
      price: 98.75,
      brk: 1.25,
      deal: 1,
      duration: '1D',
      status: 'EXECUTED',
      orderTime: '09:30:15'
    }
  ];

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
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
              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">User</label>
                <select
                  value={filters.username}
                  onChange={(e) => handleFilterChange('username', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Users</option>
                  <option value="demo666">demo666</option>
                  <option value="demo501">demo501</option>
                </select>
              </div>

              {/* From Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">From</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.fromDate}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* To Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">To</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.toDate}
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Time</label>
                <input
                  type="text"
                  value={filters.time}
                  onChange={(e) => handleFilterChange('time', e.target.value)}
                  placeholder="HH:MM:SS"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Username Event */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Username</label>
                <select
                  value={filters.userName}
                  onChange={(e) => handleFilterChange('userName', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="All Event">All Event</option>
                  <option value="trader001">trader001</option>
                  <option value="trader002">trader002</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="All">All</option>
                  <option value="EXECUTED">Executed</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
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
                  <option value="All">All</option>
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                  <option value="STOP_LOSS">Stop Loss</option>
                </select>
              </div>

              {/* Buy/Sell Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Buy/Sell Type</label>
                <select
                  value={filters.buyOrSell}
                  onChange={(e) => handleFilterChange('buyOrSell', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="NFO">NFO</option>
                  <option value="NSE">NSE</option>
                  <option value="BSE">BSE</option>
                  <option value="MCX">MCX</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold shadow-lg">Apply</button>
              <button className="px-6 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-all duration-200 text-sm font-semibold">Clear</button>
            </div>
          </>
        )}
      >
        <div className="flex-1 overflow-auto">
          <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl h-full">
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-100 to-blue-100 dark:from-slate-700 dark:to-slate-600 border-b border-gray-200/50 dark:border-slate-600/50">
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Username</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Symbol Type</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Symbols</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Quantity</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Price</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Brk</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Deal</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Duration</th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Order Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
                {trades.map((trade, index) => (
                  <tr 
                    key={trade.id}
                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200"
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-white">
                      {trade.username}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {trade.time}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                        {trade.symbolType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 font-mono">
                      {trade.symbols}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.buyOrSell === 'BUY' 
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {trade.buyOrSell}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-slate-800 dark:text-white">
                      {trade.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-slate-800 dark:text-white">
                      ₹{trade.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600 dark:text-slate-300">
                      {trade.brk.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-slate-600 dark:text-slate-300">
                      {trade.deal}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold">
                        {trade.duration}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.status === 'EXECUTED'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : trade.status === 'PENDING'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {trade.orderTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {trades.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  No trades found
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Adjust your filters to see more results
                </p>
              </div>
            )}
            </div>
          </div>
        </div>
      </FilterLayout>
  );
};

export default ManageTraders;
