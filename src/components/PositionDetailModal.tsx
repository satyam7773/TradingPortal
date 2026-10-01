import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PositionDetailModalProps {
  isOpen: boolean;
  data: any;
  selectedPosition: any;
  loading: boolean;
  liveTicks: any;
  onClose: () => void;
}

const PositionDetailModal: React.FC<PositionDetailModalProps> = ({
  isOpen,
  data,
  selectedPosition,
  loading,
  liveTicks,
  onClose,
}) => {
  const [showFilters, setShowFilters] = useState(true);
  const [filterUsername, setFilterUsername] = useState('');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterPnlMin, setFilterPnlMin] = useState('');
  const [filterPnlMax, setFilterPnlMax] = useState('');
  const [filterDaysMin, setFilterDaysMin] = useState('');
  const [filterDaysMax, setFilterDaysMax] = useState('');

  // Compute filtered positions - must be before early return to maintain hook order
  const filteredPositions = useMemo(() => {
    return (data?.positions || []).filter((pos: any) => {
      if (filterUsername && !pos.username?.toLowerCase().includes(filterUsername.toLowerCase())) return false;
      if (filterSymbol && pos.tradeSymbol !== filterSymbol) return false;
      if (filterPnlMin !== '' && pos.pnlPercentage < parseFloat(filterPnlMin)) return false;
      if (filterPnlMax !== '' && pos.pnlPercentage > parseFloat(filterPnlMax)) return false;
      if (filterDaysMin !== '' && pos.positionDays < parseInt(filterDaysMin)) return false;
      if (filterDaysMax !== '' && pos.positionDays > parseInt(filterDaysMax)) return false;
      return true;
    });
  }, [data?.positions, filterUsername, filterSymbol, filterPnlMin, filterPnlMax, filterDaysMin, filterDaysMax]);

  const positionsWithLiveData = useMemo(() => {
    return filteredPositions.map((pos: any) => {
      // Get live price from liveTicks using bid/ask based on position type
      const tickData = liveTicks?.[pos.token];
      const livePrice = tickData 
        ? (pos.position === "BUY" ? tickData.bid : tickData.ask) 
        : pos.ltp;
      
      // Get the correct quantity - check multiple possible field names
      const qty = pos.netQuantity || pos.quantity || 0;
      
      // Calculate live P&L using correct logic
      const priceChange =
        pos.position === "BUY"
          ? livePrice - pos.averagePrice
          : pos.averagePrice - livePrice;
      const livePnl = priceChange * Math.abs(qty);
      
      // Calculate live P&L percentage
      const amount = pos.averagePrice * Math.abs(qty);
      const livePnlPercentage = amount !== 0 ? (livePnl * 100) / amount : 0;

      return {
        ...pos,
        ltp: livePrice,
        pnl: livePnl,
        pnlPercentage: livePnlPercentage,
        totalPnl: livePnl + (pos.realisedPnl || 0)
      };
    });
  }, [filteredPositions, liveTicks]);

  if (!isOpen || !data) return null;

  const handleClose = () => {
    setFilterUsername('');
    setFilterSymbol('');
    setFilterPnlMin('');
    setFilterPnlMax('');
    setFilterDaysMin('');
    setFilterDaysMax('');
    setShowFilters(true);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-7xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Open Position ({data.positions?.length || 0})</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {selectedPosition?.tradeSymbol} @ {selectedPosition?.exchange}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area with Left Sidebar + Right Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Toggle Button when Filters Hidden */}
            {!showFilters && (
              <div className="flex items-start justify-center pt-4 px-2 flex-shrink-0">
                <button
                  onClick={() => setShowFilters(true)}
                  className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 flex items-center justify-center group"
                  title="Show Filters"
                >
                  <svg className="w-5 h-5 rotate-90 group-hover:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
              </div>
            )}

            {/* Left Sidebar - Filters */}
            {showFilters && (
              <div className="w-64 border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto flex flex-col">
                {/* Main Filter Section */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Main Filter</p>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold"
                    >
                      X
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Username :</label>
                      <input
                        type="text"
                        placeholder="Enter Username"
                        value={filterUsername}
                        onChange={(e) => setFilterUsername(e.target.value)}
                        className="w-full mt-1 px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Symbol :</label>
                      <select
                        value={filterSymbol}
                        onChange={(e) => setFilterSymbol(e.target.value)}
                        className="w-full mt-1 px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      >
                        <option value="">All Symbols</option>
                        {[...new Set((data.positions || []).map((p: any) => p.tradeSymbol))].map((sym) => (
                          <option key={sym} value={sym}>{sym}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-1.5 rounded transition">
                        View
                      </button>
                      <button
                        onClick={() => {
                          setFilterUsername('');
                          setFilterSymbol('');
                        }}
                        className="flex-1 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 text-white text-xs font-bold py-1.5 rounded transition"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                {/* Advance Filter Section */}
                <div className="p-4 flex-1 overflow-y-auto">
                  <p className="text-sm font-bold text-slate-900 dark:text-white mb-3">Advance Filter</p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">P/L % :</label>
                      <input
                        type="number"
                        placeholder="2.00"
                        value={filterPnlMin}
                        onChange={(e) => setFilterPnlMin(e.target.value)}
                        className="w-full mt-1 px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Position Days :</label>
                      <input
                        type="number"
                        placeholder="10"
                        value={filterDaysMin}
                        onChange={(e) => setFilterDaysMin(e.target.value)}
                        className="w-full mt-1 px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-1.5 rounded transition">
                        Apply
                      </button>
                      <button
                        onClick={() => {
                          setFilterPnlMin('');
                          setFilterDaysMin('');
                        }}
                        className="flex-1 bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 text-white text-xs font-bold py-1.5 rounded transition"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Right Content Area - Table */}
            <div className={`${showFilters ? 'flex-1' : 'w-full'} flex flex-col min-w-0 overflow-hidden`}>
              {/* Positions Table */}
              {positionsWithLiveData.length > 0 ? (
                <div className="flex-1 overflow-auto min-h-0">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-700 border-b-2 border-slate-200 dark:border-slate-600 sticky top-0">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">Username</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">Parent</th>
                        <th className="px-3 py-3 text-left text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">Symbol</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">Position</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">Quantity</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">Average Rate</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">CMP</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">Profit / Loss</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">% P&L</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">Realized P&L</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">Total P&L</th>
                        <th className="px-3 py-3 text-right text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">Margin</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase text-slate-700 dark:text-slate-300 min-w-max">Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {positionsWithLiveData.map((pos: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition text-xs">
                          <td className="px-3 py-3 text-left font-semibold text-slate-900 dark:text-white whitespace-nowrap">{pos.username}</td>
                          <td className="px-3 py-3 text-left text-slate-700 dark:text-slate-300 whitespace-nowrap">{pos.parentUsername}</td>
                          <td className="px-3 py-3 text-left font-semibold text-slate-900 dark:text-white whitespace-nowrap">{pos.tradeSymbol}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${pos.position === 'BUY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {pos.position}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">{pos.quantity}</td>
                          <td className="px-3 py-3 text-right font-mono text-slate-900 dark:text-white whitespace-nowrap">{pos.averagePrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-3 text-right font-mono text-slate-900 dark:text-white font-semibold whitespace-nowrap">{pos.ltp?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className={`px-3 py-3 text-right font-bold whitespace-nowrap ${pos.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {pos.pnl?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-3 py-3 text-right font-bold whitespace-nowrap ${pos.pnlPercentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {pos.pnlPercentage?.toFixed(2)}%
                          </td>
                          <td className={`px-3 py-3 text-right font-bold whitespace-nowrap ${pos.realisedPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {pos.realisedPnl?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-3 py-3 text-right font-bold whitespace-nowrap ${pos.totalPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {pos.totalPnl?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-slate-900 dark:text-white whitespace-nowrap">{pos.marginUsed?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-3 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">{pos.positionDays}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 flex-1 text-slate-500">
                  <p>No positions match the applied filters</p>
                </div>
              )}

              {/* Bottom Summary */}
              <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 text-xs text-slate-700 dark:text-slate-300 font-semibold flex-shrink-0">
                <p>Total Buy: {data.totalBuy}, Total Sell: {data.totalSell}, Open Position: {filteredPositions.length} {selectedPosition?.position} At {selectedPosition?.averagePrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default PositionDetailModal;
