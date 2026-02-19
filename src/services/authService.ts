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
}

export const authService = new AuthService()
export default authService
