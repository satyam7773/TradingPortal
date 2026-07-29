import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../services/apiClient';

interface BrokageItem {
  username: string;
  userId: number;
  percent: number;
  amount: number;
}

interface DealBrkData {
  username: string;
  scrip: string;
  orderType: string;
  quantity: number;
  price: number;
  executionTime: string;
  brokerage: BrokageItem[];
  pnl: BrokageItem[];
}

interface DealBrkDetailsModalProps {
  isOpen: boolean;
  tradeId: number;
  userId: number;
  onClose: () => void;
}

const DealBrkDetailsModal: React.FC<DealBrkDetailsModalProps> = ({ isOpen, tradeId, userId, onClose }) => {
  const [data, setData] = useState<DealBrkData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && tradeId) {
      fetchDealBrkDetails();
    }
  }, [isOpen, tradeId]);

  const fetchDealBrkDetails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/reports/trades/dealBrkDetails', {
        userId,
        data: {
          tradeId
        }
      });

      console.log('📊 Response:', response);

      // The apiClient already unwraps the response, so check response directly
      if ((response?.responseCode === '0' || response?.responseCode === 0) && response?.data) {
        console.log('✅ Setting data:', response.data);
        setData(response.data);
      } else {
        console.error('❌ Invalid response:', response);
        toast.error(response?.responseMessage || 'Failed to fetch details');
      }
    } catch (error: any) {
      console.error('❌ Error fetching deal brokerage details:', error);
      toast.error('Failed to fetch deal brokerage details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999]">
      <div className="overflow-y-auto min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200/50 dark:border-slate-700 flex flex-col">
            {/* Header - Fixed with rounded top corners */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-xl flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deal Brokerage & P&L Details</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Trade ID: {tradeId}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition flex-shrink-0"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="p-6 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-500 dark:text-slate-400">Loading...</div>
              </div>
            ) : data ? (
              <div className="space-y-6">
              {/* Trade Details */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700/50 dark:to-slate-600/50 p-4 rounded-lg">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">Username</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{data.username}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">Script</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{data.scrip}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">Qty</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{data.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">Price</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{data.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase">Execution Time</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(data.executionTime).toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Brokerage and P&L Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Brokerage Table */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase">Brokerage Distribution</h3>
                  <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0">
                        <tr className="bg-gradient-to-r from-orange-100 to-orange-50 dark:from-slate-700 dark:to-slate-600">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Username</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Brk%</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Brk Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {data.brokerage.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                            <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold">{item.username}</td>
                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{(item.percent ?? 0).toFixed(2)}%</td>
                            <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${
                              (item.amount ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {(item.amount ?? 0) >= 0 ? '+' : ''}{(item.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* P&L Table */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase">P&L Distribution</h3>
                  <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0">
                        <tr className="bg-gradient-to-r from-emerald-100 to-emerald-50 dark:from-slate-700 dark:to-slate-600">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Username</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">PL%</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">PL Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                        {data.pnl.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                            <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold">{item.username}</td>
                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{(item.percent ?? 0).toFixed(2)}%</td>
                            <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${
                              (item.amount ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {(item.amount ?? 0) >= 0 ? '+' : ''}{(item.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-500 dark:text-slate-400">No data available</div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default DealBrkDetailsModal;
