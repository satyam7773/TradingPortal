import React, { useState, useMemo } from "react";
import { X } from "lucide-react";
import { motion } from "framer-motion";

interface OwnUserPositionData {
  username: string;
  userId: number;
  name: string | null;
  parentUsername: string | null;
  parentUserId: number | null;
  tradeSymbol: string;
  price: number; // CMP from API
  token?: number; // Instrument token for live price lookup
  netPosition: "BUY" | "SELL";
  netQuantity: number;
  netAvgPrice: number;
  pnl: number;
  pnlPercentage: number;
  netBuyQuantity: number;
  netBuyAveragePrice: number;
  netSellQuantity: number;
  netSellAveragePrice: number;
}

interface OwnUserPositionModalProps {
  positions: OwnUserPositionData[];
  selectedExchange?: string;
  selectedSymbol?: string;
  onExchangeChange?: (exchange: string) => void;
  onSymbolChange?: (symbol: string) => void;
  onClose: () => void;
  title?: string;
  liveTicks?: Record<number, any>;
}

const OwnUserPositionModal: React.FC<OwnUserPositionModalProps> = ({
  positions,
  selectedExchange = "All Exchanges",
  selectedSymbol = "",
  onClose,
  title = "Own User Open Positions",
  liveTicks = {},
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      const symbolMatch =
        selectedSymbol === "" ||
        selectedSymbol === "All Symbols" ||
        p.tradeSymbol === selectedSymbol;
      const searchMatch =
        searchTerm === "" ||
        p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tradeSymbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return symbolMatch && searchMatch;
    });
  }, [positions, selectedSymbol, searchTerm]);

  const stats = useMemo(() => {
    let total = 0;
    let buy = 0;
    let sell = 0;
    let totalPnL = 0;

    filteredPositions.forEach((p) => {
      total++;
      if (p.netPosition === "BUY") {
        buy++;
      } else {
        sell++;
      }

      // Calculate live P&L using liveTicks for real-time updates
      const tick = p.token ? liveTicks[p.token] : null;
      const livePrice = tick ? (p.netPosition === "BUY" ? tick.bid : tick.ask) : p.price;
      
      const priceChange =
        p.netPosition === "BUY"
          ? livePrice - p.netAvgPrice
          : p.netAvgPrice - livePrice;
      const livePnl = priceChange * Math.abs(p.netQuantity);
      
      totalPnL += livePnl;
    });

    return { total, buy, sell, totalPnL };
  }, [filteredPositions, liveTicks]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col"
    >
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-800 px-8 py-4 border-b border-blue-700 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-blue-100 text-sm">{selectedSymbol}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-blue-500/20 p-2 rounded-lg transition"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* STATS BAR */}
      <div className="px-8 py-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Total
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.total}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
            Buy
          </p>
          <p className="text-2xl font-bold text-blue-600">{stats.buy}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">
            Sell
          </p>
          <p className="text-2xl font-bold text-red-600">{stats.sell}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Total P&L
          </p>
          <p
            className={`text-2xl font-bold ${
              stats.totalPnL > 0
                ? "text-emerald-600"
                : stats.totalPnL < 0
                  ? "text-red-600"
                  : "text-slate-600"
            }`}
          >
            ₹{stats.totalPnL.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="px-8 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <input
          type="text"
          placeholder="Search by username, symbol, or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-200 dark:bg-slate-700 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Parent User
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Symbol
              </th>
              <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Net Position
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Net Qty
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Net Avg Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                CMP
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                P&L
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                % P&L
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredPositions.length > 0 ? (
              filteredPositions.map((p, idx) => {
                // Get live price from liveTicks, fallback to API price
                const tick = p.token ? liveTicks[p.token] : null;
                const livePrice = tick ? (p.netPosition === "BUY" ? tick.bid : tick.ask) : p.price;
                
                // Calculate live P&L based on current price
                const priceChange =
                  p.netPosition === "BUY"
                    ? livePrice - p.netAvgPrice
                    : p.netAvgPrice - livePrice;
                const livePnl =
                  priceChange * Math.abs(p.netQuantity);
                
                const amount =
                  p.netAvgPrice * Math.abs(p.netQuantity);
                const livePnlPercentage =
                  amount !== 0 ? (livePnl * 100) / amount : 0;

                return (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {p.username}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {p.name || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {p.parentUsername || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                      {p.tradeSymbol}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`text-xs font-bold uppercase px-3 py-1 rounded-lg ${
                          p.netPosition === "BUY"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {p.netPosition}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                      {p.netQuantity}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-slate-900 dark:text-white">
                      ₹{p.netAvgPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-4 text-right text-sm font-mono font-bold ${livePrice >= p.netAvgPrice ? "text-emerald-600" : "text-red-600"}`}>
                      ₹{livePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`px-6 py-4 text-right text-sm font-mono font-bold ${
                        livePnl > 0
                          ? "text-emerald-600"
                          : livePnl < 0
                            ? "text-red-600"
                            : "text-slate-600"
                      }`}
                    >
                      ₹{livePnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`px-6 py-4 text-right text-sm font-mono font-bold ${
                        livePnlPercentage > 0
                          ? "text-emerald-600"
                          : livePnlPercentage < 0
                            ? "text-red-600"
                            : "text-slate-600"
                      }`}
                    >
                      {livePnlPercentage.toFixed(2)}%
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  No positions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default OwnUserPositionModal;
