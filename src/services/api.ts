import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import toast from 'react-hot-toast'
import { 
  BaseApiResponse, 
  LoginRequest, 
  LoginResponse, 
  UserProfile,
  Portfolio,
  Position,
  Order,
  MarketData,
  Trade,
  PnLReport,
  AccountSummary,
  User,
  Role,
  AuditLog,
  PaginatedResponse,
  PaginationRequest,
  ApiError,
  UserConfigResponse,
  FetchUserConfigRequest
} from './api.types'

// Environment configuration
const config = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api-staging.rivoplus.live',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  enableNetworkLogs: import.meta.env.VITE_ENABLE_NETWORK_LOGS === 'true',
  toastDuration: parseInt(import.meta.env.VITE_TOAST_DURATION) || 5000,
  endpoints: {
    auth: {
      login: import.meta.env.VITE_AUTH_LOGIN_ENDPOINT || '/user/login',
      logout: import.meta.env.VITE_AUTH_LOGOUT_ENDPOINT || '/user/logout',
      refresh: import.meta.env.VITE_AUTH_REFRESH_ENDPOINT || '/user/refresh-token',
      profile: import.meta.env.VITE_AUTH_PROFILE_ENDPOINT || '/user/profile'
    },
    trading: {
      orders: import.meta.env.VITE_TRADING_ORDERS_ENDPOINT || '/orders',
      positions: import.meta.env.VITE_TRADING_POSITIONS_ENDPOINT || '/positions',
      portfolio: import.meta.env.VITE_TRADING_PORTFOLIO_ENDPOINT || '/portfolio',
      marketData: import.meta.env.VITE_TRADING_MARKET_DATA_ENDPOINT || '/market-data',
      orderBook: import.meta.env.VITE_TRADING_ORDER_BOOK_ENDPOINT || '/order-book',
      trades: import.meta.env.VITE_TRADING_TRADES_ENDPOINT || '/trades'
    },
    reports: {
      pnl: import.meta.env.VITE_REPORTS_PNL_ENDPOINT || '/reports/pnl',
      tradeHistory: import.meta.env.VITE_REPORTS_TRADE_HISTORY_ENDPOINT || '/reports/trade-history',
      tax: import.meta.env.VITE_REPORTS_TAX_ENDPOINT || '/reports/tax',
      accountSummary: import.meta.env.VITE_REPORTS_ACCOUNT_SUMMARY_ENDPOINT || '/reports/account-summary'
    },
    admin: {
      users: import.meta.env.VITE_ADMIN_USERS_ENDPOINT || '/admin/users',
      roles: import.meta.env.VITE_ADMIN_ROLES_ENDPOINT || '/admin/roles',
      settings: import.meta.env.VITE_ADMIN_SETTINGS_ENDPOINT || '/admin/settings',
      auditLogs: import.meta.env.VITE_ADMIN_AUDIT_LOGS_ENDPOINT || '/admin/audit-logs'
    },
    userManagement: {
      fetchUserConfig: import.meta.env.VITE_USER_CONFIG_ENDPOINT || '/user/fetchUserConfig',
      createUser: import.meta.env.VITE_CREATE_USER_ENDPOINT || '/user/createUser'
    }
  }
}

// Token management
class TokenManager {
  private static readonly TOKEN_KEY = 'token'
  private static readonly REFRESH_TOKEN_KEY = 'trading_app_refresh_token'
  
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }
  
  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token)
  }
  
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
  }
  
  static setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token)
  }
  
  static clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
  }
  
  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch {
      return true
    }
  }
}

// Logger utility
class Logger {
  static log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (config.logLevel === 'debug' || level !== 'debug') {
      console[level](`[API ${level.toUpperCase()}]`, message, data || '')
    }
  }
}

// Toast notification utility
class NotificationManager {
  static showSuccess(message: string): void {
    toast.success(message, { duration: config.toastDuration })
  }
  
  static showError(message: string): void {
    toast.error(message, { duration: config.toastDuration })
  }
  
  static showWarning(message: string): void {
    toast(message, { 
      icon: '⚠️',
      duration: config.toastDuration 
    })
  }
  
  static showInfo(message: string): void {
    toast(message, { 
      icon: 'ℹ️',
      duration: config.toastDuration 
    })
  }
}

// API Service Class
class ApiService {
  private axiosInstance: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (token: string) => void
    reject: (error: any) => void
  }> = []

  constructor() {
    console.log('🔧 ApiService Constructor - Creating axios instance with baseURL:', config.baseURL)
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    console.log('✅ Axios instance created successfully')

    this.setupInterceptors()
    console.log('✅ Interceptors setup complete')
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = TokenManager.getToken()
        console.log('� [DEBUG] Token before sending request:', token)
        console.log('�🔍 Request Interceptor - Before:', {
          method: config.method,
          url: config.url,
          baseURL: config.baseURL,
          fullURL: `${config.baseURL}${config.url}`
        })

        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Don't override requestTimestamp if already set
        // if (config.data && typeof config.data === 'object' && !config.data.requestTimestamp) {
        //   config.data.requestTimestamp = Date.now().toString()
        // }

        console.log('🔍 Request Interceptor - After:', {
          headers: config.headers,
          data: config.data
        })

        // Use the global config for network logging
        if (import.meta.env.VITE_ENABLE_NETWORK_LOGS === 'true') {
          Logger.log('debug', `API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data
          })
        }

        return config
      },
      (error) => {
        Logger.log('error', 'Request interceptor error', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        if (import.meta.env.VITE_ENABLE_NETWORK_LOGS === 'true') {
          Logger.log('debug', `API Response: ${response.status} ${response.config.url}`, response.data)
        }

        // Handle API response format
        if (response.data && response.data.responseCode !== undefined) {
          if (response.data.responseCode === "0") {
            return response
          } else {
            // API returned error in response
            const apiError: ApiError = {
              code: response.data.responseCode,
              message: response.data.responseMessage || 'API Error',
              details: response.data.data,
              timestamp: new Date().toISOString(),
              path: response.config.url,
              method: response.config.method?.toUpperCase()
            }
            Logger.log('warn', 'API Error Response', apiError)
            NotificationManager.showError(apiError.message)
            return Promise.reject(apiError)
          }
        }

        return response
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        if (import.meta.env.VITE_ENABLE_NETWORK_LOGS === 'true') {
          Logger.log('error', `API Error: ${error.response?.status} ${originalRequest?.url}`, {
            message: error.message,
            response: error.response?.data
          })
        }

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject })
            }).then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`
              }
              return this.axiosInstance(originalRequest)
            })
          }

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            const refreshToken = TokenManager.getRefreshToken()
            if (refreshToken) {
              const response = await this.axiosInstance.post(config.endpoints.auth.refresh, {
                refreshToken
              })
              const newToken = response.data.data.token
              TokenManager.setToken(newToken)
              
              this.processQueue(null, newToken)
              
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`
              }
              return this.axiosInstance(originalRequest)
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null)
            TokenManager.clearTokens()
            NotificationManager.showError('Session expired. Please login again.')
            // Redirect to login
            window.location.href = '/login'
          } finally {
            this.isRefreshing = false
          }
        }

        // Handle other errors
        this.handleApiError(error)
        return Promise.reject(error)
      }
    )
  }

  private processQueue(error: any, token: string | null): void {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error)
      } else if (token) {
        resolve(token)
      }
    })
    
    this.failedQueue = []
  }

  private handleApiError(error: AxiosError): void {
    let message = 'An unexpected error occurred'

    if (error.code === 'ECONNABORTED') {
      message = 'Request timeout. Please try again.'
    } else if (error.code === 'ERR_NETWORK') {
      message = 'Network error. Please check your connection.'
    } else if (error.response) {
      switch (error.response.status) {
        case 400:
          message = 'Bad request. Please check your input.'
          break
        case 403:
          message = 'Access denied. You don\'t have permission.'
          break
        case 404:
          message = 'Resource not found.'
          break
        case 500:
          message = 'Server error. Please try again later.'
          break
        case 503:
          message = 'Service unavailable. Please try again later.'
          break
        default:
          message = `Server error (${error.response.status})`
      }
    }

    NotificationManager.showError(message)
    Logger.log('error', 'API Error Handler', { error, message })
  }



  // Authentication APIs
  async login(credentials: { username: string; password: string; server?: string }): Promise<LoginResponse> {
    // Format request according to API specification
    const requestPayload: LoginRequest = {
      requestTimestamp: Date.now().toString(),
      data: {
        username: credentials.username,
        password: credentials.password,
        server: credentials.server || 'MATRIX'
      }
    }

    console.log('🔧 API Config:', {
      baseURL: config.baseURL,
      endpoint: config.endpoints.auth.login,
      fullURL: `${config.baseURL}${config.endpoints.auth.login}`
    })
    console.log('📤 Request Payload:', requestPayload)

    try {
      console.log('🚀 About to make API call...')
      const response = await this.axiosInstance.post<BaseApiResponse<LoginResponse>>(
        config.endpoints.auth.login, 
        requestPayload
      )
      console.log('✅ API Response received:', response)
      return response.data.data
    } catch (error) {
      console.error('❌ API Call Failed:', error)
      throw error
    }
  }

  private getStoredUserData(): any {
    try {
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('userData')
        return userData ? JSON.parse(userData) : null
      }
    } catch (error) {
      console.error('Error retrieving user data from storage:', error)
    }
    return null
  }

  async logout(): Promise<boolean> {
    try {
      // Get userId from localStorage before clearing
      const userData = this.getStoredUserData()
      const userId = userData?.userId || 0
      
      // Prepare logout request with userId and requestTimestamp
      const logoutRequest = {
        userId,
        requestTimestamp: Date.now().toString()
      }
      
      const response = await this.axiosInstance.post<BaseApiResponse<boolean>>(
        config.endpoints.auth.logout,
        logoutRequest
      )
      
      // Clear all tokens and storage
      TokenManager.clearTokens()
      
      // Clear localStorage completely
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      return response.data.data
    } catch (error) {
      console.error('❌ Logout Failed:', error)
      // Clear tokens and storage even if logout API fails
      TokenManager.clearTokens()
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      throw error
    }
  }

  async getProfile(): Promise<UserProfile> {
    const response = await this.axiosInstance.get<BaseApiResponse<UserProfile>>(config.endpoints.auth.profile)
    return response.data.data
  }

  // Trading APIs
  async getPortfolio(): Promise<Portfolio> {
    const response = await this.axiosInstance.get<BaseApiResponse<Portfolio>>(config.endpoints.trading.portfolio)
    return response.data.data
  }

  async getPositions(): Promise<Position[]> {
    const response = await this.axiosInstance.get<BaseApiResponse<Position[]>>(config.endpoints.trading.positions)
    return response.data.data
  }

  async getOrders(pagination?: PaginationRequest): Promise<PaginatedResponse<Order>> {
    const response = await this.axiosInstance.get<BaseApiResponse<PaginatedResponse<Order>>>(
      config.endpoints.trading.orders,
      { params: pagination }
    )
    return response.data.data
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    const response = await this.axiosInstance.post<BaseApiResponse<Order>>(
      config.endpoints.trading.orders,
      order
    )
    NotificationManager.showSuccess('Order created successfully')
    return response.data.data
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const response = await this.axiosInstance.delete<BaseApiResponse<boolean>>(
      `${config.endpoints.trading.orders}/${orderId}`
    )
    NotificationManager.showSuccess('Order cancelled successfully')
    return response.data.data
  }

  async getMarketData(symbols?: string[]): Promise<MarketData[]> {
    const response = await this.axiosInstance.get<BaseApiResponse<MarketData[]>>(
      config.endpoints.trading.marketData,
      { params: { symbols: symbols?.join(',') } }
    )
    return response.data.data
  }

  async getTrades(pagination?: PaginationRequest): Promise<PaginatedResponse<Trade>> {
    const response = await this.axiosInstance.get<BaseApiResponse<PaginatedResponse<Trade>>>(
      config.endpoints.trading.trades,
      { params: pagination }
    )
    return response.data.data
  }

  // Reports APIs
  async getPnLReport(dateRange: { from: string; to: string }): Promise<PnLReport> {
    const response = await this.axiosInstance.get<BaseApiResponse<PnLReport>>(
      config.endpoints.reports.pnl,
      { params: dateRange }
    )
    return response.data.data
  }

  async getAccountSummary(): Promise<AccountSummary> {
    const response = await this.axiosInstance.get<BaseApiResponse<AccountSummary>>(
      config.endpoints.reports.accountSummary
    )
    return response.data.data
  }

  // Admin APIs
  async getUsers(pagination?: PaginationRequest): Promise<PaginatedResponse<User>> {
    const response = await this.axiosInstance.get<BaseApiResponse<PaginatedResponse<User>>>(
      config.endpoints.admin.users,
      { params: pagination }
    )
    return response.data.data
  }

  async getRoles(): Promise<Role[]> {
    const response = await this.axiosInstance.get<BaseApiResponse<Role[]>>(
      config.endpoints.admin.roles
    )
    return response.data.data
  }

  async getAuditLogs(pagination?: PaginationRequest): Promise<PaginatedResponse<AuditLog>> {
    const response = await this.axiosInstance.get<BaseApiResponse<PaginatedResponse<AuditLog>>>(
      config.endpoints.admin.auditLogs,
      { params: pagination }
    )
    return response.data.data
  }

  // User Management APIs
  async fetchUserConfig(userId: number): Promise<UserConfigResponse> {
    const request: FetchUserConfigRequest = {
      requestTimestamp: '',
      userId,
      data: ''
    }

    console.log('🔧 Fetching User Config:', {
      endpoint: config.endpoints.userManagement.fetchUserConfig,
      userId
    })

    const response = await this.axiosInstance.post<BaseApiResponse<UserConfigResponse>>(
      config.endpoints.userManagement.fetchUserConfig,
      request
    )
    return response.data.data
  }

  async createUser(userData: any): Promise<any> {
    // Get userId from localStorage
    const storedUserData = this.getStoredUserData()
    const userId = storedUserData?.userId || 2

    const request = {
      requestTimestamp: Date.now().toString(),
      userId,
      data: userData
    }

    console.log('🔧 Creating User:', {
      endpoint: config.endpoints.userManagement.createUser,
      payload: request
    })

    const response = await this.axiosInstance.post<BaseApiResponse<any>>(
      config.endpoints.userManagement.createUser,
      request
    )
    return response.data.data
  }

  // Generic API method for custom endpoints
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.axiosInstance.get<BaseApiResponse<T>>(url, { params })
    return response.data.data
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.post<BaseApiResponse<T>>(url, data)
    return response.data.data
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.put<BaseApiResponse<T>>(url, data)
    return response.data.data
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.axiosInstance.delete<BaseApiResponse<T>>(url)
    return response.data.data
  }
}

// Export singleton instance
const apiService = new ApiService()
export default apiService

// Export utilities
export { 
  TokenManager, 
  NotificationManager, 
  Logger, 
  config as apiConfig,
  ApiService
}
