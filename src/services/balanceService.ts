import axios from 'axios'
import { TokenManager } from './apiClient'

interface BalanceData {
  pnl: number
  brokerage: number
  other: number
  balance: number
}

interface BalanceResponse {
  responseCode: string
  responseMessage: string
  data: BalanceData
}

class BalanceService {
  private baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api-staging.rivoplus.live'
  private cacheKey = 'balance_cache'
  private cacheDuration = 5 * 60 * 1000 // 5 minutes cache
  private balanceCallbacks: Set<(balance: BalanceData | null) => void> = new Set()
  private isFetching = false

  private getCachedBalance(): BalanceData | null {
    if (typeof window === 'undefined') return null
    
    const cached = localStorage.getItem(this.cacheKey)
    if (!cached) return null
    
    try {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < this.cacheDuration) {
        return data
      }
    } catch (error) {
      console.error('❌ Error parsing cached balance:', error)
    }
    
    localStorage.removeItem(this.cacheKey)
    return null
  }

  private setCachedBalance(data: BalanceData): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('❌ Error caching balance:', error)
    }
  }

  async getBalance(): Promise<BalanceData | null> {
    try {
      // Check cache first
      const cached = this.getCachedBalance()
      if (cached) {
        console.log('💰 Balance loaded from cache:', cached)
        return cached
      }

      const userData = localStorage.getItem('userData')
      if (!userData) {
        console.warn('⚠️ No user data found')
        return null
      }

      const user = JSON.parse(userData)
      const userId = user?.userId

      if (!userId) {
        console.warn('⚠️ No userId found')
        return null
      }

      const token = TokenManager.getToken()
      if (!token) {
        console.warn('⚠️ No token found')
        return null
      }

      const response = await axios.post<BalanceResponse>(
        `${this.baseURL}/user/portal/getBalance`,
        {
          userId: userId,
          requestTimestamp: new Date().getTime().toString(),
          data: ''
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      )

      if (response.data?.responseCode === '0' && response.data?.data) {
        const balanceData = response.data.data
        this.setCachedBalance(balanceData)
        console.log('💰 Balance fetched successfully:', balanceData)
        return balanceData
      } else {
        console.warn('⚠️ Unexpected balance response:', response.data)
        return null
      }
    } catch (error) {
      console.error('❌ Error fetching balance:', error)
      // Return cached data as fallback even if request fails
      return this.getCachedBalance()
    }
  }

  /**
   * Force refresh balance - clears cache and fetches fresh data
   * This is called when socket receives position updates
   */
  async refreshBalance(): Promise<BalanceData | null> {
    try {
      // Prevent multiple simultaneous requests
      if (this.isFetching) {
        console.log('⏳ Balance refresh already in progress')
        return this.getCachedBalance()
      }

      this.isFetching = true
      
      // Clear cache to force fresh fetch
      this.clearCache()

      const userData = localStorage.getItem('userData')
      if (!userData) {
        console.warn('⚠️ No user data found')
        return null
      }

      const user = JSON.parse(userData)
      const userId = user?.userId

      if (!userId) {
        console.warn('⚠️ No userId found')
        return null
      }

      const token = TokenManager.getToken()
      if (!token) {
        console.warn('⚠️ No token found')
        return null
      }

      const response = await axios.post<BalanceResponse>(
        `${this.baseURL}/user/portal/getBalance`,
        {
          userId: userId,
          requestTimestamp: new Date().getTime().toString(),
          data: ''
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      )

      if (response.data?.responseCode === '0' && response.data?.data) {
        const balanceData = response.data.data
        this.setCachedBalance(balanceData)
        console.log('🔄 Balance refreshed successfully:', balanceData)
        
        // Notify all subscribers
        this.notifySubscribers(balanceData)
        
        return balanceData
      } else {
        console.warn('⚠️ Unexpected balance response:', response.data)
        return this.getCachedBalance()
      }
    } catch (error) {
      console.error('❌ Error refreshing balance:', error)
      return this.getCachedBalance()
    } finally {
      this.isFetching = false
    }
  }

  /**
   * Subscribe to balance updates
   * Returns unsubscribe function
   */
  onBalanceUpdate(callback: (balance: BalanceData | null) => void): () => void {
    this.balanceCallbacks.add(callback)
    return () => this.balanceCallbacks.delete(callback)
  }

  /**
   * Notify all subscribers of balance update
   */
  private notifySubscribers(balance: BalanceData | null): void {
    this.balanceCallbacks.forEach((callback) => {
      try {
        callback(balance)
      } catch (error) {
        console.error('❌ Error in balance callback:', error)
      }
    })
  }

  clearCache(): void {
    if (typeof window === 'undefined') return
    console.log('🗑️ Balance cache cleared')
    localStorage.removeItem(this.cacheKey)
  }
}

export default new BalanceService()
export type { BalanceData, BalanceResponse }

