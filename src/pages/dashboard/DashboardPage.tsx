import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Activity, DollarSign, Target } from 'lucide-react'

// Portfolio Data
const portfolioStats = {
  totalValue: 15748392.50,
  dayPnL: 45892.75,
  dayPnLPercent: 0.29,
  totalPnL: 2894756.30,
  totalPnLPercent: 22.5,
  buyingPower: 894567.80,
  availableMargin: 1247893.20,
  usedMargin: 652106.80,
  totalTrades: 1247,
  winRate: 68.5,
  avgProfit: 3456.78
}

const DashboardPage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [marketStatus, setMarketStatus] = useState('OPEN')

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
      const hour = new Date().getHours()
      if (hour >= 9 && hour < 15) {
        setMarketStatus('OPEN')
      } else if (hour >= 15 && hour < 16) {
        setMarketStatus('CLOSING')
      } else {
        setMarketStatus('CLOSED')
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num)
  }

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      {/* Header Section */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-text-primary mb-2">Trading Dashboard</h1>
          <p className="text-sm text-text-secondary">Welcome back, Professional Trader</p>
          
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="text-xl font-mono font-bold text-text-primary">
              {currentTime.toLocaleTimeString()}
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              marketStatus === 'OPEN' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 
              marketStatus === 'CLOSING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 
              'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              Market {marketStatus}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Portfolio Stats Cards */}
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Portfolio Value */}
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }} 
            className="bg-surface-primary border border-border-primary rounded-2xl p-4 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-text-secondary text-xs font-medium">Portfolio Value</div>
                <div className="text-base font-bold text-text-primary truncate">₹1,57,48,392.50</div>
              </div>
            </div>
            <div className="pt-3 border-t border-border-primary">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs">Overall Return</span>
                <span className="text-sm font-semibold text-brand-primary">+22.5%</span>
              </div>
            </div>
          </motion.div>

          {/* Today's P&L */}
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }} 
            className="bg-surface-primary border border-border-primary rounded-2xl p-4 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-brand-primary to-brand-accent rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-text-secondary text-xs font-medium">Today's P&L</div>
                <div className="text-base font-bold text-brand-primary truncate">+₹45,892.75</div>
              </div>
            </div>
            <div className="pt-3 border-t border-border-primary">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs">Today's Return</span>
                <span className="text-sm font-semibold text-brand-primary">+0.29%</span>
              </div>
            </div>
          </motion.div>

          {/* Buying Power */}
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }} 
            className="bg-surface-primary border border-border-primary rounded-2xl p-4 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-text-secondary text-xs font-medium">Buying Power</div>
                <div className="text-base font-bold text-text-primary truncate">₹8,94,567.80</div>
              </div>
            </div>
            <div className="pt-3 border-t border-border-primary">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs">Total Trades</span>
                <span className="text-sm font-semibold text-blue-400">1,247</span>
              </div>
            </div>
          </motion.div>

          {/* Win Rate */}
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }} 
            className="bg-surface-primary border border-border-primary rounded-2xl p-4 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-text-secondary text-xs font-medium">Win Rate</div>
                <div className="text-base font-bold text-orange-400">68.5%</div>
              </div>
            </div>
            <div className="pt-3 border-t border-border-primary">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs">Avg Profit</span>
                <span className="text-sm font-semibold text-brand-primary">₹3,456.78</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Additional Portfolio Details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface-primary border border-border-primary rounded-2xl p-8 shadow-lg"
        >
          <h2 className="text-xl font-bold text-text-primary mb-6 text-center">Portfolio Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Total P&L */}
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-primary mb-2">
                {formatCurrency(portfolioStats.totalPnL)}
              </div>
              <div className="text-sm text-text-secondary">Total P&L</div>
              <div className="text-xs text-brand-primary mt-1">+{portfolioStats.totalPnLPercent}%</div>
            </div>

            {/* Available Margin */}
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {formatCurrency(portfolioStats.availableMargin)}
              </div>
              <div className="text-sm text-text-secondary">Available Margin</div>
              <div className="text-xs text-text-secondary mt-1">Used: {formatCurrency(portfolioStats.usedMargin)}</div>
            </div>

            {/* Performance */}
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {portfolioStats.winRate}%
              </div>
              <div className="text-sm text-text-secondary">Success Rate</div>
              <div className="text-xs text-text-secondary mt-1">{formatNumber(portfolioStats.totalTrades)} trades</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default DashboardPage
