import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  ArrowLeft, 
  Settings,
  DicesIcon as Bet,
  Activity,
  X,
  Grid3X3,
  StopCircle,
  CreditCard,
  Users,
  Calculator,
  BarChart3,
  Zap,
  FileText,
  ArrowLeftRight,
  TrendingUp,
  Share2,
  Lock,
  Shield,
  User,
  Wallet,
  Phone,
  Mail,
  Calendar,
  Clock,
  Badge
} from 'lucide-react'

// Mock user data - you can replace this with actual API calls
const mockUserData = {
  '1': {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 234 567 8900',
    exchange: 'NSE,MCX,SGX,CDS,CALLPUT,OTHERS',
    status: 'Active',
    totalBalance: 125000,
    marginUsed: 45000,
    availableBalance: 80000,
    joinDate: '2024-01-15',
    lastActive: '2 hours ago',
    avatar: 'JD',
    plSharing: 3.5,
    credit: 50000,
    settings: {
      bet: true,
      status: true,
      closeOnly: false,
      marginSquareOff: false,
      freshStopLoss: false
    }
  },
  '2': {
    id: '2',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@example.com',
    phone: '+1 234 567 8901',
    exchange: 'NSE,MCX,SGX,CDS,CALLPUT,OTHERS',
    status: 'Active',
    totalBalance: 75000,
    marginUsed: 25000,
    availableBalance: 50000,
    joinDate: '2024-02-10',
    lastActive: '5 minutes ago',
    avatar: 'SW',
    plSharing: 2.5,
    credit: 30000,
    settings: {
      bet: true,
      status: true,
      closeOnly: false,
      marginSquareOff: false,
      freshStopLoss: false
    }
  },
  // Add more mock users as needed
}

const UserDetails: React.FC = () => {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const [activeTab, setActiveTab] = useState<'overview' | 'tradelist' | 'position'>('overview')
  const [settings, setSettings] = useState(mockUserData[userId as keyof typeof mockUserData]?.settings || {})
  
  const user = mockUserData[userId as keyof typeof mockUserData]
  
  // Initialize exchange access state - all enabled by default since they're in the user data
  const [exchangeAccess, setExchangeAccess] = useState(() => {
    if (user) {
      const exchanges = user.exchange.split(',').map(ex => ex.trim())
      return exchanges.reduce((acc, exchange) => ({
        ...acc,
        [exchange]: true
      }), {} as Record<string, boolean>)
    }
    return {}
  })

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">User not found</h2>
          <button 
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  const toggleSetting = (key: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }))
  }

  const toggleExchangeAccess = (exchange: string) => {
    setExchangeAccess(prev => ({
      ...prev,
      [exchange]: !prev[exchange]
    }))
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tradelist', label: 'Tradelist' },
    { id: 'position', label: 'Position' }
  ]

  const settingsOptions = [
    {
      id: 'bet',
      label: 'BET',
      icon: Bet,
      enabled: settings.bet,
      color: 'bg-red-100 text-red-600'
    },
    {
      id: 'status',
      label: 'Status',
      icon: Activity,
      enabled: settings.status,
      color: 'bg-red-100 text-red-600'
    },
    {
      id: 'closeOnly',
      label: 'Close Only',
      icon: X,
      enabled: settings.closeOnly,
      color: 'bg-slate-100 text-slate-600'
    },
    {
      id: 'marginSquareOff',
      label: 'Margin Square Off',
      icon: Grid3X3,
      enabled: settings.marginSquareOff,
      color: 'bg-slate-100 text-slate-600'
    },
    {
      id: 'freshStopLoss',
      label: 'Fresh Stop-loss',
      icon: StopCircle,
      enabled: settings.freshStopLoss,
      color: 'bg-slate-100 text-slate-600'
    }
  ]

  const actionCards = [
    {
      id: 'addCredit',
      label: 'Add Credit',
      icon: CreditCard,
      color: 'from-purple-500 to-indigo-600',
      hoverColor: 'hover:from-purple-600 hover:to-indigo-700'
    },
    {
      id: 'groupQuantity',
      label: 'Group Quantity Settings',
      icon: Users,
      color: 'from-green-500 to-emerald-600',
      hoverColor: 'hover:from-green-600 hover:to-emerald-700'
    },
    {
      id: 'marginSquareSettings',
      label: 'Margin Square-off Settings',
      subtitle: '100.0%',
      icon: Calculator,
      color: 'from-red-500 to-pink-600',
      hoverColor: 'hover:from-red-600 hover:to-pink-700'
    },
    {
      id: 'brkSetting',
      label: 'Brk Setting',
      icon: BarChart3,
      color: 'from-blue-500 to-cyan-600',
      hoverColor: 'hover:from-blue-600 hover:to-cyan-700'
    },
    {
      id: 'scriptQuantity',
      label: 'Script Quantity Setting',
      icon: FileText,
      color: 'from-orange-500 to-amber-600',
      hoverColor: 'hover:from-orange-600 hover:to-amber-700'
    },
    {
      id: 'intradaySquareOff',
      label: 'Intraday SquareOff',
      icon: ArrowLeftRight,
      color: 'from-indigo-500 to-purple-600',
      hoverColor: 'hover:from-indigo-600 hover:to-purple-700'
    },
    {
      id: 'tradeMargin',
      label: 'Trade Margin Setting',
      icon: TrendingUp,
      color: 'from-violet-500 to-purple-600',
      hoverColor: 'hover:from-violet-600 hover:to-purple-700'
    },
    {
      id: 'sharingDetails',
      label: 'Sharing Details',
      icon: Share2,
      color: 'from-teal-500 to-green-600',
      hoverColor: 'hover:from-teal-600 hover:to-green-700'
    },
    {
      id: 'changePassword',
      label: 'Change Password',
      icon: Lock,
      color: 'from-red-500 to-rose-600',
      hoverColor: 'hover:from-red-600 hover:to-rose-700'
    },
    {
      id: 'investorPassword',
      label: 'Investor Password',
      icon: Shield,
      color: 'from-blue-500 to-indigo-600',
      hoverColor: 'hover:from-blue-600 hover:to-indigo-700'
    }
  ]

  const getAvatarColor = (name: string) => {
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-green-500 to-emerald-600', 
      'from-purple-500 to-violet-600',
      'from-orange-500 to-amber-600',
      'from-pink-500 to-rose-600',
      'from-teal-500 to-cyan-600'
    ]
    const index = name.length % colors.length
    return colors[index]
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-7xl mx-auto">
        
        <div className="p-6">
        
        {/* Compact Header Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-primary rounded-2xl p-4 border border-border-primary mb-6"
        >
          {/* Top Row - Back Button & User ID */}
          <div className="flex items-center justify-between mb-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="w-10 h-10 bg-surface-secondary hover:bg-surface-tertiary rounded-xl flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-text-primary" />
            </motion.button>
            
            <div className="text-right">
              <div className="text-sm text-text-secondary">User ID</div>
              <div className="text-lg font-bold text-brand-primary">#{user.id}</div>
            </div>
          </div>

          {/* User Profile Row */}
          <div className="flex items-center gap-4 mb-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${getAvatarColor(user.name)} rounded-xl flex items-center justify-center shadow-lg`}>
                <span className="text-white font-bold text-base">{user.avatar}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-brand-secondary rounded-full border-2 border-white dark:border-slate-800 shadow-lg"></div>
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold text-text-primary mb-1 truncate"
              >
                {user.name}
              </motion.h1>
              
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-3 mb-2"
              >
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  user.status === 'Active' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  {user.status}
                </span>
                <span className="text-sm text-text-secondary">Last active: {user.lastActive}</span>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-4 text-sm text-text-secondary"
              >
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  <span className="truncate max-w-48">{user.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone}</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Tabs Row */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex gap-2"
          >
            {tabs.map((tab, index) => (
              <motion.button
                key={tab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 font-medium text-sm transition-all rounded-xl ${
                  activeTab === tab.id
                    ? 'bg-brand-primary text-white shadow-lg'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                }`}
              >
                {tab.label}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        <>
          {/* Overview Content - Show main sections when Overview tab is active */}
          {activeTab === 'overview' && (
            <>
              {/* Account Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100">Total Balance</p>
                      <p className="text-2xl font-bold">₹{user.totalBalance.toLocaleString()}</p>
                    </div>
                    <Wallet className="w-8 h-8 text-green-200" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-4 text-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100">Available</p>
                      <p className="text-2xl font-bold">₹{user.availableBalance.toLocaleString()}</p>
                    </div>
                    <CreditCard className="w-8 h-8 text-blue-200" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-4 text-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-100">Margin Used</p>
                      <p className="text-2xl font-bold">₹{user.marginUsed.toLocaleString()}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-red-200" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-4 text-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-100">P&L Sharing</p>
                      <p className="text-2xl font-bold">{user.plSharing}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-200" />
                  </div>
                </motion.div>
              </div>

              {/* Exchange Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-surface-primary rounded-2xl p-6 border border-border-primary mb-6"
              >
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Badge className="w-5 h-5" />
                  Exchange Access
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.exchange.split(',').map((ex) => {
                    const exchangeName = ex.trim()
                    const isEnabled = exchangeAccess[exchangeName] || false
                    const exchangeColors = {
                      'NSE': 'bg-blue-100 text-blue-600',
                      'MCX': 'bg-green-100 text-green-600',
                      'SGX': 'bg-purple-100 text-purple-600',
                      'CDS': 'bg-orange-100 text-orange-600',
                      'CALLPUT': 'bg-indigo-100 text-indigo-600',
                      'OTHERS': 'bg-gray-100 text-gray-600'
                    }
                    const colorClass = exchangeColors[exchangeName as keyof typeof exchangeColors] || 'bg-gray-100 text-gray-600'
                    
                    return (
                      <div
                        key={exchangeName}
                        className="flex items-center justify-between p-4 bg-surface-secondary rounded-xl border border-border-primary"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <TrendingUp className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-text-primary">{exchangeName}</span>
                        </div>
                        
                        <button
                          onClick={() => toggleExchangeAccess(exchangeName)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isEnabled 
                              ? 'bg-brand-primary' 
                              : 'bg-surface-tertiary'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg ${
                              isEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Trading Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-surface-primary rounded-2xl p-6 border border-border-primary mb-6"
              >
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Trading Settings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {settingsOptions.map((option) => {
                    const IconComponent = option.icon
                    return (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-4 bg-surface-secondary rounded-xl border border-border-primary"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${option.color}`}>
                            <IconComponent className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-text-primary">{option.label}</span>
                        </div>
                        
                        <button
                          onClick={() => toggleSetting(option.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            option.enabled 
                              ? 'bg-brand-primary' 
                              : 'bg-surface-tertiary'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-lg ${
                              option.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Action Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-surface-primary rounded-2xl p-6 border border-border-primary mb-6"
              >
                <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5" />
                  Quick Actions
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {actionCards.map((card, index) => {
                    const IconComponent = card.icon
                    return (
                      <motion.button
                        key={card.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        className={`bg-gradient-to-br ${card.color} ${card.hoverColor} rounded-2xl p-4 text-white transition-all shadow-lg hover:shadow-xl h-32 flex flex-col justify-center`}
                      >
                        <div className="flex flex-col items-center text-center space-y-2">
                          <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1 flex flex-col justify-center">
                            <div className="font-semibold text-xs leading-tight line-clamp-2">
                              {card.label}
                            </div>
                            {card.subtitle && (
                              <div className="text-xs opacity-80 mt-1 font-medium">
                                {card.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            </>
          )}

          {/* Tab Content for other tabs */}
          {(activeTab === 'tradelist' || activeTab === 'position') && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-surface-primary rounded-2xl p-6 border border-border-primary"
            >

            {activeTab === 'tradelist' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Trade History
                  </h3>
                  <div className="flex items-center gap-2">
                    <select className="px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary text-sm">
                      <option>Last 30 days</option>
                      <option>Last 7 days</option>
                      <option>Today</option>
                      <option>Custom Range</option>
                    </select>
                  </div>
                </div>

                {/* Trade Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
                    <div className="text-sm text-green-100">Total Trades</div>
                    <div className="text-2xl font-bold">1,247</div>
                    <div className="text-xs text-green-100">+15% this month</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
                    <div className="text-sm text-blue-100">Winning Trades</div>
                    <div className="text-2xl font-bold">856</div>
                    <div className="text-xs text-blue-100">68.6% win rate</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white">
                    <div className="text-sm text-purple-100">Total P&L</div>
                    <div className="text-2xl font-bold">₹45,678</div>
                    <div className="text-xs text-purple-100">+12.4% this month</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 text-white">
                    <div className="text-sm text-orange-100">Avg Trade Size</div>
                    <div className="text-2xl font-bold">₹12,450</div>
                    <div className="text-xs text-orange-100">Per transaction</div>
                  </div>
                </div>

                {/* Recent Trades Table */}
                <div className="bg-surface-secondary rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-surface-primary border-b border-border-primary">
                    <h4 className="font-semibold text-text-primary">Recent Trades</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface-primary">
                        <tr>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Date/Time</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Symbol</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Type</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Quantity</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Price</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">P&L</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { date: '23/11/2025 10:30', symbol: 'RELIANCE', type: 'BUY', qty: '100', price: '2,450.50', pnl: '+2,340', status: 'Executed' },
                          { date: '23/11/2025 10:15', symbol: 'TCS', type: 'SELL', qty: '50', price: '3,680.25', pnl: '+1,850', status: 'Executed' },
                          { date: '23/11/2025 09:45', symbol: 'INFY', type: 'BUY', qty: '75', price: '1,720.80', pnl: '-890', status: 'Executed' },
                          { date: '22/11/2025 15:20', symbol: 'HDFC', type: 'SELL', qty: '25', price: '1,580.30', pnl: '+1,200', status: 'Executed' },
                          { date: '22/11/2025 14:10', symbol: 'ITC', type: 'BUY', qty: '200', price: '415.60', pnl: '+780', status: 'Executed' }
                        ].map((trade, index) => (
                          <tr key={index} className="border-b border-border-primary hover:bg-surface-hover transition-colors">
                            <td className="py-4 px-6 text-sm text-text-primary">{trade.date}</td>
                            <td className="py-4 px-6 text-sm font-medium text-text-primary">{trade.symbol}</td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                trade.type === 'BUY' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                              }`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-sm text-text-primary">{trade.qty}</td>
                            <td className="py-4 px-6 text-sm text-text-primary">₹{trade.price}</td>
                            <td className="py-4 px-6">
                              <span className={`text-sm font-medium ${
                                trade.pnl.startsWith('+') ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ₹{trade.pnl}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                                {trade.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'position' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Current Positions
                  </h3>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-2 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:from-red-700 hover:via-pink-700 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-xl">
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Position Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
                    <div className="text-sm text-green-100">Total P&L</div>
                    <div className="text-2xl font-bold">₹8,450</div>
                    <div className="text-xs text-green-100">Unrealized</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
                    <div className="text-sm text-blue-100">Open Positions</div>
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-xs text-blue-100">Active trades</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white">
                    <div className="text-sm text-purple-100">Day Change</div>
                    <div className="text-2xl font-bold">+₹1,250</div>
                    <div className="text-xs text-purple-100">+2.8% today</div>
                  </div>
                </div>

                {/* Holdings Table */}
                <div className="bg-surface-secondary rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-surface-primary border-b border-border-primary">
                    <h4 className="font-semibold text-text-primary">Open Positions</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface-primary">
                        <tr>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Symbol</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Qty</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Avg Price</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">LTP</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">P&L</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Day Change</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { symbol: 'RELIANCE', qty: '100', avgPrice: '2,450.50', ltp: '2,478.30', pnl: '+2,780', dayChange: '+1.1%' },
                          { symbol: 'TCS', qty: '-50', avgPrice: '3,680.25', ltp: '3,658.90', pnl: '+1,067', dayChange: '-0.6%' },
                          { symbol: 'INFY', qty: '75', avgPrice: '1,720.80', ltp: '1,698.45', pnl: '-1,676', dayChange: '-1.3%' },
                          { symbol: 'HDFC BANK', qty: '25', avgPrice: '1,580.30', ltp: '1,592.80', pnl: '+312', dayChange: '+0.8%' },
                          { symbol: 'ITC', qty: '200', avgPrice: '415.60', ltp: '418.95', pnl: '+670', dayChange: '+0.8%' }
                        ].map((position, index) => (
                          <tr key={index} className="border-b border-border-primary hover:bg-surface-hover transition-colors">
                            <td className="py-4 px-6 text-sm font-medium text-text-primary">{position.symbol}</td>
                            <td className="py-4 px-6">
                              <span className={`text-sm font-medium ${
                                position.qty.startsWith('-') ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {position.qty}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-sm text-text-primary">₹{position.avgPrice}</td>
                            <td className="py-4 px-6 text-sm text-text-primary">₹{position.ltp}</td>
                            <td className="py-4 px-6">
                              <span className={`text-sm font-medium ${
                                position.pnl.startsWith('+') ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ₹{position.pnl}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`text-sm font-medium ${
                                position.dayChange.startsWith('+') ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {position.dayChange}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <button className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors">
                                  Exit
                                </button>
                                <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors">
                                  Modify
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Open Orders */}
                <div className="bg-surface-secondary rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-surface-primary border-b border-border-primary">
                    <h4 className="font-semibold text-text-primary">Pending Orders</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface-primary">
                        <tr>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Symbol</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Type</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Qty</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Order Price</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">LTP</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Status</th>
                          <th className="text-left py-3 px-6 text-sm font-medium text-text-secondary">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { symbol: 'BAJFINANCE', type: 'LIMIT BUY', qty: '50', orderPrice: '6,800.00', ltp: '6,825.30', status: 'Open' },
                          { symbol: 'MARUTI', type: 'STOP SELL', qty: '30', orderPrice: '10,200.00', ltp: '10,180.50', status: 'Open' },
                          { symbol: 'WIPRO', type: 'LIMIT BUY', qty: '100', orderPrice: '445.50', ltp: '448.20', status: 'Open' }
                        ].map((order, index) => (
                          <tr key={index} className="border-b border-border-primary hover:bg-surface-hover transition-colors">
                            <td className="py-4 px-6 text-sm font-medium text-text-primary">{order.symbol}</td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.type.includes('BUY') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                              }`}>
                                {order.type}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-sm text-text-primary">{order.qty}</td>
                            <td className="py-4 px-6 text-sm text-text-primary">₹{order.orderPrice}</td>
                            <td className="py-4 px-6 text-sm text-text-primary">₹{order.ltp}</td>
                            <td className="py-4 px-6">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                                {order.status}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <button className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors">
                                  Cancel
                                </button>
                                <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors">
                                  Modify
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
          )}
        </>
        </div>
      </div>
    </div>
  )
}

export default UserDetails