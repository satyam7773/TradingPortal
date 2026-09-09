import React, { useState, useMemo } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";

interface PositionData {
  positionId: number;
  positionDate: number | null;
  positionDays: number;
  username: string;
  parentUsername: string;
  exchange: string;
  tradeSymbol: string;
  position: "BUY" | "SELL";
  quantity: number;
  averagePrice: number;
  ltp: number | null;
  pnl: number;
  pnlPercentage: number;
  totalPnl: number;
  token?: number;
  userId?: number;
  netQuantity?: any;
  realisedPnl?: number;
  marginUsed?: number;
}

interface PositionDetailsModalProps {
  positions: PositionData[];
  exchanges: any[];
  symbols: any[];
  selectedExchange: string;
  selectedSymbol: string;
  onExchangeChange: (exchange: string) => void;
  onSymbolChange: (symbol: string) => void;
  onClose: () => void;
  title?: string;
  liveTicks?: Record<number, any>;
}

const PositionDetailsModal: React.FC<PositionDetailsModalProps> = ({
  positions,
  exchanges,
  symbols,
  selectedExchange,
  selectedSymbol,
  onExchangeChange,
  onSymbolChange,
  onClose,
  title = "Position Details",
  liveTicks = {},
}) => {
  const [pnlFilter, setPnlFilter] = useState<number>(0);
  const [posiDaysFilter, setPosiDaysFilter] = useState<number>(0);

  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      const exchange = selectedExchange === "All Exchanges" || p.exchange === selectedExchange;
      const symbol = selectedSymbol === "All Symbols" || !selectedSymbol || p.tradeSymbol === selectedSymbol;
      const pnl = pnlFilter === 0 || p.pnl >= pnlFilter;
      const days = posiDaysFilter === 0 || p.positionDays <= posiDaysFilter;
      return exchange && symbol && pnl && days;
    });
  }, [positions, selectedExchange, selectedSymbol, pnlFilter, posiDaysFilter]);

  const stats = useMemo(
    () => ({
      total: filteredPositions.length,
      buy: filteredPositions.filter((p) => p.position === "BUY").length,
      sell: filteredPositions.filter((p) => p.position === "SELL").length,
      totalPnL: filteredPositions.reduce((sum, p) => sum + (p.pnl || 0), 0),
    }),
    [filteredPositions],
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-row"
    >
      {/* LEFT SIDEBAR - FILTERS */}
      <div className="w-72 bg-slate-100 dark:bg-slate-700 border-r border-slate-200 dark:border-slate-600 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-900 dark:to-indigo-800 px-6 py-4 border-b border-indigo-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-indigo-500/20 p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-1 p-6 space-y-6">
          {/* Exchange Filter */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-2">
              Exchange
            </label>
            <select
              value={selectedExchange}
              onChange={(e) => onExchangeChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {exchanges.map((ex) => (
                <option key={ex.id || ex.name} value={ex.name || ex}>
                  {ex.name || ex}
                </option>
              ))}
            </select>
          </div>

          {/* Symbol Filter */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-2">
              Symbol
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Symbols</option>
              {symbols.map((sym, idx) => (
                <option key={idx} value={sym.tradeSymbol || sym}>
                  {sym.tradeSymbol || sym}
                </option>
              ))}
            </select>
          </div>

          {/* Advance Filter Section */}
          <div className="pt-4 border-t border-slate-300 dark:border-slate-600">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-4">Advance Filter</h3>

            {/* P&L Filter */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-2">
                P/L %
              </label>
              <input
                type="number"
                value={pnlFilter}
                onChange={(e) => setPnlFilter(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Position Days Filter */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-2">
                Posi Days
              </label>
              <input
                type="number"
                value={posiDaysFilter}
                onChange={(e) => setPosiDaysFilter(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-6 space-y-2">
            <button
              onClick={() => {
                setPnlFilter(0);
                setPosiDaysFilter(0);
              }}
              className="w-full px-4 py-2 bg-slate-400 dark:bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-500 dark:hover:bg-slate-700 transition text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - TABLE & STATS */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats Bar */}
        <div className="px-8 py-4 bg-slate-100 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 grid grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Total</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Buy</p>
            <p className="text-2xl font-bold text-blue-600">{stats.buy}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">Sell</p>
            <p className="text-2xl font-bold text-red-600">{stats.sell}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Total P&L</p>
            <p className={`text-2xl font-bold ${stats.totalPnL > 0 ? "text-emerald-600" : stats.totalPnL < 0 ? "text-red-600" : "text-slate-600"}`}>
              ₹{stats.totalPnL.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Positions Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-200 dark:bg-slate-700 z-10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Parent</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Exchange</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Position</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Avg Price</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">CMP</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">P&L</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">% P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredPositions.length > 0 ? (
                filteredPositions.map((p) => {
                  // ✅ MATCH POSITIONS.TSX LOGIC: Use bid/ask based on position type
                  const tick = liveTicks[p.token];
                  const price = p.position === "BUY" ? tick?.bid : tick?.ask;
                  const livePrice = price || p.ltp;
                  
                  // ✅ MATCH POSITIONS.TSX LOGIC: Correct P&L calculation
                  const priceChange =
                    p.position === "BUY"
                      ? livePrice - p.averagePrice
                      : p.averagePrice - livePrice;
                  const unrealisedPnl =
                    priceChange * Math.abs(p.netQuantity || p.quantity);
                  
                  // ✅ MATCH POSITIONS.TSX LOGIC: Correct percentage calculation
                  const amount =
                    p.averagePrice * Math.abs(p.netQuantity || p.quantity);
                  const unrealisedPnlPercentage =
                    amount !== 0 ? (unrealisedPnl * 100) / amount : 0;

                  return (
                    <tr key={p.positionId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                        {p.username}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {p.parentUsername || "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded border border-purple-200 uppercase">
                          {p.exchange}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                        {p.tradeSymbol}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`text-xs font-bold uppercase px-3 py-1 rounded-lg ${
                            p.position === "BUY"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          }`}
                        >
                          {p.position}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                        {p.netQuantity !== undefined ? p.netQuantity : p.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-mono text-slate-900 dark:text-white">
                        ₹{p.averagePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-6 py-4 text-right text-sm font-mono font-bold ${livePrice! >= p.averagePrice ? "text-emerald-600" : "text-red-600"}`}>
                        ₹{livePrice?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}
                      </td>
                      <td className={`px-6 py-4 text-right text-sm font-mono font-bold ${unrealisedPnl > 0 ? "text-emerald-600" : unrealisedPnl < 0 ? "text-red-600" : "text-slate-600"}`}>
                        ₹{unrealisedPnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-6 py-4 text-right text-sm font-mono font-bold ${unrealisedPnlPercentage > 0 ? "text-emerald-600" : unrealisedPnlPercentage < 0 ? "text-red-600" : "text-slate-600"}`}>
                        {unrealisedPnlPercentage.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    No positions found matching your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default PositionDetailsModal;
