import { apiClient, TokenManager } from './apiClient'
import { LoginResponse } from './api.types'

/**
 * Authentication Service
 * All authentication related API calls
 */
class AuthService {
  private readonly baseUrl = '/user'

  /**
   * Login user
   */
  async login(credentials: { username: string; password: string; server: string }): Promise<LoginResponse> {
    const requestPayload = {
      requestTimestamp: Date.now().toString(),
      data: {
        username: credentials.username,
        password: credentials.password,
        server: credentials.server
      }
    }

    console.log('🔧 Login Request:', { 
      endpoint: `${this.baseUrl}/login`,
      server: credentials.server 
    })

    const response = await apiClient.post<{ responseCode: string; responseMessage: string; data: LoginResponse }>(
      `${this.baseUrl}/login`,
      requestPayload
    )

    // Check if the API returned an error response
    if (response.responseCode !== '0' && response.responseCode !== '1000') {
      // API returned an error
      throw new Error(response.responseMessage || 'Login failed')
    }

    // Check if data is null
    if (!response.data) {
      throw new Error(response.responseMessage || 'Invalid login response')
    }

    return response.data
  }

  /**
   * Logout user
   */
  async logout(): Promise<boolean> {
    try {
      const userDataStr = localStorage.getItem('userData')
      const userData = userDataStr ? JSON.parse(userDataStr) : null
      const userId = userData?.userId || 0

      const logoutRequest = {
        userId,
        requestTimestamp: Date.now().toString()
      }

      const response = await apiClient.post<{ data: boolean }>(
        `${this.baseUrl}/logout`,
        logoutRequest
      )

      TokenManager.clearTokens()
      return response.data
    } catch (error) {
      console.error('Logout error:', error)
      TokenManager.clearTokens()
      return false
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const response = await apiClient.post<{ data: { token: string } }>(
      `${this.baseUrl}/refresh`,
      { refreshToken }
    )

    return response.data
  }

  /**
   * Change password
   */
  async changePassword(data: {
    oldPassword: string
    newPassword: string
  }): Promise<any> {
    const response = await apiClient.post<{ data: any }>(
      `${this.baseUrl}/changePassword`,
      data
    )

    return response.data
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<any> {
    const response = await apiClient.post<{ data: any }>(
      `${this.baseUrl}/resetPassword`,
      { email }
    )

    return response.data
  }

  /**
   * Get login history
   */
  async fetchLoginHistory(userId: number, page: number = 0, size: number = 10): Promise<any> {
    const response = await apiClient.get<{ data: any }>(
      `${this.baseUrl}/login/history`,
      {
        params: { userId, page, size }
      }
    )

    return response.data
  }

  /**
   * Get filtered login history (OWN or ALL)
   */
  async fetchLoginHistoryFiltered(userFilterType: 'OWN' | 'ALL', page: number = 0, size: number = 10): Promise<any> {
    const userDataStr = localStorage.getItem('userData')
    const userData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = userData?.userId || 0

    const requestPayload = {
      userId,
      requestTimestamp: Date.now().toString(),
      data: 'login-history-request'
    }

    const response = await apiClient.post<{ data: any }>(
      `${this.baseUrl}/login/history`,
      requestPayload,
      {
        params: { userFilterType, page, size }
      }
    )

    return response.data
  }

  /**
   * Search login history by username
   */
  async searchLoginHistory(username: string, page: number = 0, size: number = 10): Promise<any> {
    const response = await apiClient.get<{ data: any }>(
      `${this.baseUrl}/search/login/history`,
      {
        params: { username, page, size }
      }
    )

    return response.data
  }

  /**
   * Fetch user login history by date range
   */
  async fetchUserLoginHistoryByDateRange(
    fromDate: string,
    toDate: string,
    page: number = 0,
    size: number = 10
  ): Promise<any> {
    const userDataStr = localStorage.getItem('userData')
    const userData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = userData?.userId || 0

    // Convert datetime-local format to "YYYY-MM-DD HH:MM:SS" format
    const fromDateTime = fromDate ? new Date(fromDate).toLocaleString('en-CA', { 
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '') : ''

    const toDateTime = toDate ? new Date(toDate).toLocaleString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '') : ''

    const requestPayload = {
      userId,
      requestTimestamp: Date.now().toString(),
      data: {
        fromDate: fromDateTime,
        toDate: toDateTime,
        page,
        size
      }
    }

    const response = await apiClient.post<{ data: any }>(
      `${this.baseUrl}/login/history/uId`,
      requestPayload
    )

    return response.data
  }

  /**
   * Fetch login history for a specific user
   */
  async fetchUserLoginHistoryByUserId(
    userId: number,
    page: number = 0,
    size: number = 10,
    fromDate?: string,
    toDate?: string
  ): Promise<any> {
    // Convert datetime-local format to "YYYY-MM-DD HH:MM:SS" format if provided
    const fromDateTime = fromDate ? new Date(fromDate).toLocaleString('en-CA', { 
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '') : ''

    const toDateTime = toDate ? new Date(toDate).toLocaleString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(',', '') : ''

    const requestPayload = {
      userId,
      requestTimestamp: Date.now().toString(),
      data: {
        ...(fromDateTime && { fromDate: fromDateTime }),
        ...(toDateTime && { toDate: toDateTime }),
        page,
        size
      }
    }

    const response = await apiClient.post<{ data: any }>(
      `${this.baseUrl}/login/history/uId`,
      requestPayload
    )

    return response.data
  }
}

export const authService = new AuthService()
export default authService
