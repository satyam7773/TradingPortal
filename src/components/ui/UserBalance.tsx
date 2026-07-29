import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import balanceService, { BalanceData } from '../../services/balanceService'

interface UserBalanceProps {
  className?: string
}

interface BalanceItem {
  label: string
  value: number
  color: string
  bgColor: string
}

export const UserBalance: React.FC<UserBalanceProps> = ({ className = '' }) => {
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBalance = async () => {
    try {
      setRefreshing(true)
      const data = await balanceService.getBalance()
      setBalance(data)
    } catch (error) {
      console.error('❌ Error fetching balance:', error)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Initial fetch on page load
    fetchBalance()

    // Subscribe to real-time balance updates from socket
    // Balance will refresh when socket receives position/order updates
    const unsubscribe = balanceService.onBalanceUpdate((updatedBalance) => {
      console.log('📊 Balance updated from socket:', updatedBalance)
      setBalance(updatedBalance)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const formatNumber = (num: number): string => {
    if (num === null || num === undefined) return '0.00'
    
    // Format with Indian number system (commas)
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
    
    return formatted
  }

  const getAmountColor = (value: number) => {
    if (value >= 0) return 'text-emerald-500'
    return 'text-red-500'
  }

  const getAmountBgColor = (value: number) => {
    if (value >= 0) return 'bg-emerald-500/10 border-emerald-500/30'
    return 'bg-red-500/10 border-red-500/30'
  }

  const balanceItems: BalanceItem[] = [
    {
      label: 'PL',
      value: balance?.pnl || 0,
      color: getAmountColor(balance?.pnl || 0),
      bgColor: ''
    },
    {
      label: 'BK',
      value: balance?.brokerage || 0,
      color: getAmountColor(balance?.brokerage || 0),
      bgColor: ''
    },
    {
      label: 'OTHER',
      value: balance?.other || 0,
      color: getAmountColor(balance?.other || 0),
      bgColor: ''
    },
    {
      label: 'BAL',
      value: balance?.balance || 0,
      color: getAmountColor(balance?.balance || 0),
      bgColor: getAmountBgColor(balance?.balance || 0)
    }
  ]

  if (loading && !balance) {
    return (
      <div className={`flex items-center gap-4 px-4 py-2 rounded-lg bg-surface-secondary/50 animate-pulse ${className}`}>
        <div className="h-5 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-5 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-5 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-5 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-surface-secondary to-surface-secondary/50 backdrop-blur-md border border-border-primary/40 shadow-md hover:shadow-lg transition-shadow ${className}`}>
      {balanceItems.map((item, index) => (
        <React.Fragment key={item.label}>
          {/* Balance Item */}
          <div className={`flex flex-col items-center ${item.bgColor ? `px-3 py-1.5 rounded-lg border ${item.bgColor}` : ''}`}>
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {item.label}
            </span>
            <div className={`flex items-center gap-1.5 ${item.color} font-bold text-sm`}>
              {item.value >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <span className="font-mono">{formatNumber(item.value)}</span>
            </div>
          </div>

          {/* Separator */}
          {index < balanceItems.length - 1 && (
            <div className="w-px h-8 bg-border-primary/20"></div>
          )}
        </React.Fragment>
      ))}

      {/* Refresh Button */}
      <button
        onClick={fetchBalance}
        disabled={refreshing}
        className="ml-2 p-2 rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50 hover:text-brand-primary"
        title="Refresh balance"
      >
        <RefreshCw className={`w-4 h-4 text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}

export default UserBalance
