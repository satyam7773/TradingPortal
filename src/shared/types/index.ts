// Global application types

// Theme types
export type Theme = 'light' | 'dark'

// User and Authentication types
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'trader' | 'viewer'
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: Theme
  language: string
  timezone: string
  currency: string
}

export interface LoginCredentials {
  email: string
  password: string
  server?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Trading types
export interface Symbol {
  id: string
  name: string
  symbol: string
  exchange: string
  type: 'stock' | 'option' | 'future' | 'forex'
  price: number
  change: number
  changePercent: number
}

export interface Order {
  id: string
  userId: string
  symbol: string
  type: OrderType
  side: 'buy' | 'sell'
  quantity: number
  price: number
  status: OrderStatus
  timestamp: Date
  filledQuantity?: number
  averagePrice?: number
}

export type OrderType = 'market' | 'limit' | 'stop' | 'stop-limit'
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'partial' | 'rejected'

export interface Position {
  id: string
  userId: string
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  unrealizedPnL: number
  realizedPnL: number
  totalPnL: number
  timestamp: Date
}

export interface Portfolio {
  id: string
  userId: string
  totalValue: number
  totalPnL: number
  totalPnLPercent: number
  cashBalance: number
  positions: Position[]
  dayTradingBuyingPower?: number
  overnightBuyingPower?: number
}

// Market Data types
export interface MarketData {
  symbol: string
  price: number
  bid: number
  ask: number
  volume: number
  high: number
  low: number
  open: number
  close: number
  timestamp: Date
}

export interface OrderBook {
  symbol: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  timestamp: Date
}

export interface OrderBookLevel {
  price: number
  quantity: number
}

// Report types
export interface TradeReport {
  id: string
  userId: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  commission: number
  pnl: number
  timestamp: Date
}

export interface AccountSummary {
  userId: string
  totalValue: number
  cashBalance: number
  marginUsed: number
  buyingPower: number
  dayTradingBuyingPower: number
  maintenanceExcess: number
  timestamp: Date
}

// API Response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Utility types
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface TableColumn<T> {
  key: keyof T
  title: string
  sortable?: boolean
  width?: string
  render?: (value: any, record: T) => React.ReactNode
}

export interface ChartDataPoint {
  timestamp: Date
  value: number
  label?: string
}

// Color system types
export interface ColorPalette {
  primary: string
  secondary: string
  tertiary: string
  hover?: string
  active?: string
}

export interface ThemeColors {
  background: ColorPalette
  surface: ColorPalette
  text: ColorPalette & { inverse: string; muted: string }
  border: ColorPalette & { focus: string }
  status: {
    success: string
    warning: string
    error: string
    info: string
  }
  trading: {
    profit: string
    loss: string
    buy: string
    sell: string
    neutral: string
  }
}