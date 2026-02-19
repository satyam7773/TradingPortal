// API Response Types for Trading Platform

export interface BaseApiResponse<T = any> {
  responseCode: string
  responseMessage: string
  data: T
  timestamp?: string
  requestId?: string
}

// Authentication Types
export interface LoginRequest {
  requestTimestamp?: string
  data: {
    username: string
    password: string
    server?: string
  }
}

export interface LoginResponse {
  token: string
  roleId: number
  role?: string // e.g., 'admin', 'super_admin', etc.
  email: string
  username?: string
  userId?: string
  permissions?: string[]
  expiresAt?: string
}

export interface UserProfile {
  userId: string
  username: string
  email: string
  roleId: number
  roleName: string
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string
  preferences?: UserPreferences
  lastLoginAt?: string
  createdAt?: string
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  language: string
  timezone: string
  currency: string
  notifications: NotificationSettings
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  sms: boolean
  trading: boolean
  reports: boolean
}

// Trading Types
export interface Order {
  orderId: string
  symbol: string
  side: 'BUY' | 'SELL'
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT'
  quantity: number
  price?: number
  stopPrice?: number
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'PARTIAL' | 'REJECTED'
  filledQuantity?: number
  averagePrice?: number
  timestamp: string
  expiryDate?: string
  commission?: number
}

export interface Position {
  positionId: string
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  realizedPnL: number
  totalPnL: number
  pnLPercent: number
  dayPnL: number
  dayPnLPercent: number
  timestamp: string
}

export interface Portfolio {
  portfolioId: string
  totalValue: number
  totalPnL: number
  totalPnLPercent: number
  dayPnL: number
  dayPnLPercent: number
  cashBalance: number
  marginUsed: number
  marginAvailable: number
  buyingPower: number
  positions: Position[]
  orders: Order[]
  lastUpdated: string
}

export interface MarketData {
  symbol: string
  lastPrice: number
  bid: number
  ask: number
  high: number
  low: number
  open: number
  close: number
  volume: number
  change: number
  changePercent: number
  timestamp: string
}

export interface OrderBook {
  symbol: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
  timestamp: string
}

export interface OrderBookLevel {
  price: number
  quantity: number
  orders: number
}

export interface Trade {
  tradeId: string
  orderId: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  commission: number
  tax: number
  netAmount: number
  timestamp: string
  counterparty?: string
}

// Reports Types
export interface PnLReport {
  reportId: string
  dateRange: {
    from: string
    to: string
  }
  totalPnL: number
  realizedPnL: number
  unrealizedPnL: number
  commission: number
  taxes: number
  netPnL: number
  trades: Trade[]
  positions: Position[]
  generatedAt: string
}

export interface TradeHistoryReport {
  reportId: string
  dateRange: {
    from: string
    to: string
  }
  trades: Trade[]
  summary: {
    totalTrades: number
    totalVolume: number
    totalCommission: number
    avgTradeSize: number
    winRate: number
  }
  generatedAt: string
}

export interface AccountSummary {
  accountId: string
  accountType: string
  totalValue: number
  cashBalance: number
  marginUsed: number
  marginAvailable: number
  buyingPower: number
  dayTradingBuyingPower: number
  maintenanceExcess: number
  equity: number
  lastUpdated: string
}

// Admin Types
export interface User {
  userId: string
  username: string
  email: string
  firstName: string
  lastName: string
  roleId: number
  roleName: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface Role {
  roleId: number
  roleName: string
  permissions: Permission[]
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Permission {
  permissionId: string
  permissionName: string
  module: string
  action: string
  description?: string
}

export interface AuditLog {
  logId: string
  userId: string
  username: string
  action: string
  module: string
  details: any
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

// Pagination Types
export interface PaginationRequest {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  filters?: Record<string, any>
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Error Types
export interface ApiError {
  code: string
  message: string
  details?: any
  timestamp: string
  path?: string
  method?: string
}

// Notification Types
export interface Notification {
  id: string
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  title: string
  message: string
  timestamp: string
  read: boolean
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: string
  url?: string
}

// WebSocket Types
export interface WebSocketMessage<T = any> {
  type: string
  channel: string
  data: T
  timestamp: string
}

export interface MarketDataUpdate {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  timestamp: string
}

export interface OrderUpdate {
  orderId: string
  status: string
  filledQuantity?: number
  averagePrice?: number
  timestamp: string
}

export interface PortfolioUpdate {
  totalValue: number
  totalPnL: number
  dayPnL: number
  timestamp: string
}

// User Configuration Types for Create New User
export interface ExchangeConfig {
  name: string
  turnover: boolean
  lot: boolean
  groupId?: any
}

export interface UserInHierarchy {
  name: string
  parentId: number
  username: string
  isActive: boolean
  isBlocked: boolean
  userId: number
  roleId: number
  pnlSharing: number | null
  credits: number
  balance: number
  brkSharing: number
}

export interface UserConfigResponse {
  name: string
  username: string
  roleId: number
  userId: null
  email: string | null
  brokeragePercentage: number
  pnlSharing: number
  allowedExchanges: ExchangeConfig[]
  addMaster: boolean
  userList?: UserInHierarchy[]
  credits?: number
}

export interface FetchUserConfigRequest {
  requestTimestamp: string
  userId: number
  data: string
}