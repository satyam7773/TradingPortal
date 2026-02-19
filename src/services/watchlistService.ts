import { apiClient } from './apiClient'

interface WatchlistItem {
  id: number
  token: number
  sortOrder: number
}

interface WatchlistResponse {
  responseCode: string
  responseMessage: string
  data: {
    userId: number
    data: WatchlistItem[]
  }
}

interface AddWatchlistResponse {
  responseCode: string
  responseMessage: string
  data: any
}

/**
 * Watchlist Service
 * All watchlist related API calls
 */
class WatchlistService {
  private readonly baseUrl = '/user/watchlist'

  /**
   * Get user watchlist
   */
  async getWatchlist(userId: number): Promise<WatchlistItem[]> {
    const requestPayload = {
      userId: userId,
      requestTimestamp: Date.now().toString(),
      data: ''
    }

    console.log('📋 Fetching Watchlist:', { userId })

    const response = await apiClient.post<WatchlistResponse>(
      this.baseUrl,
      requestPayload
    )

    if (response.responseCode !== '0') {
      throw new Error(response.responseMessage || 'Failed to fetch watchlist')
    }

    return response.data?.data || []
  }

  /**
   * Add instrument to watchlist
   */
  async addToWatchlist(userId: number, token: number): Promise<boolean> {
    const requestPayload = {
      userId: userId,
      requestTimestamp: Date.now().toString(),
      data: {
        token: token
      }
    }

    console.log('➕ Adding to Watchlist:', { userId, token })

    const response = await apiClient.post<AddWatchlistResponse>(
      `${this.baseUrl}/add`,
      requestPayload
    )

    if (response.responseCode !== '0') {
      throw new Error(response.responseMessage || 'Failed to add to watchlist')
    }

    return true
  }

  /**
   * Remove instrument from watchlist
   */
  async removeFromWatchlist(userId: number, token: number): Promise<boolean> {
    const requestPayload = {
      userId: userId,
      requestTimestamp: Date.now().toString(),
      data: {
        token: token
      }
    }

    console.log('➖ Removing from Watchlist:', { userId, token })

    const response = await apiClient.post<AddWatchlistResponse>(
      `${this.baseUrl}/delete`,
      requestPayload
    )

    if (response.responseCode !== '0') {
      throw new Error(response.responseMessage || 'Failed to remove from watchlist')
    }

    return true
  }
}

export default new WatchlistService()
