import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { apiClient } from '../../services/apiClient';

interface TradeData {
  tradeId: number;
  executionTime: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  deal: number;
  squareOffQty: number;
  duration: string;
  orderMethod: string;
}

interface DurationDetailsModalProps {
  isOpen: boolean;
  tradeId: number;
  userId: number;
  onClose: () => void;
}

const DurationDetailsModal: React.FC<DurationDetailsModalProps> = ({ isOpen, tradeId, userId, onClose }) => {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && tradeId) {
      fetchTradeDuration();
    }
  }, [isOpen, tradeId]);

  const fetchTradeDuration = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/reports/trades/tradeDuration', {
        userId,
        data: {
          tradeId
        }
      });

      console.log('📊 Duration Response:', response);

      // The apiClient already unwraps the response
      if ((response?.responseCode === '0' || response?.responseCode === 0) && response?.data) {
        console.log('✅ Setting trades data:', response.data);
        if (Array.isArray(response.data)) {
          setTrades(response.data);
        } else {
          setTrades([]);
        }
      } else {
        console.error('❌ Invalid response:', response);
        toast.error(response?.responseMessage || 'Failed to fetch duration details');
      }
    } catch (error: any) {
      console.error('❌ Error fetching trade duration:', error);
      toast.error('Failed to fetch trade duration details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const typeColorClass = (side: string) => side?.toUpperCase().startsWith('BUY') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  const typeBgClass = (side: string) => side?.toUpperCase().startsWith('BUY') ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30';

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200/50 dark:border-slate-700 flex flex-col h-full">
          {/* Header - Fixed with rounded top corners */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-t-xl flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Trade Duration Details</h2>
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
          <div className="p-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-500 dark:text-slate-400">Loading...</div>
              </div>
            ) : trades.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="bg-gradient-to-r from-blue-100 to-indigo-50 dark:from-slate-700 dark:to-slate-600">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Trade ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Execution Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Symbol</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Side</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Deal</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Square Off</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">Order Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {trades.map((trade, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                          <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold whitespace-nowrap">{trade.tradeId}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">
                            {new Date(trade.executionTime).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-slate-900 dark:text-white font-bold whitespace-nowrap">{trade.symbol}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={`text-xs font-bold ${typeColorClass(trade.side)} ${typeBgClass(trade.side)} px-2 py-1 rounded`}>
                              {trade.side}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-center font-bold whitespace-nowrap ${typeColorClass(trade.side)}`}>
                            {trade.quantity}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${typeColorClass(trade.side)}`}>
                            {trade.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${trade.deal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {trade.deal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {trade.squareOffQty}
                          </td>
                          <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold whitespace-nowrap">
                            {trade.duration || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">
                            {trade.orderMethod || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-500 dark:text-slate-400">No duration data available</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DurationDetailsModal;
