import { API_ENDPOINTS } from '../config/apiConfig'
import { apiClient } from './apiClient'

/**
 * Watchlist Tabs Service
 * Handles fetching and managing user's watchlist tabs
 */

export interface WatchlistTab {
  tabId: number
  userId: number
  tabName: string
  tabNo: number
  status: boolean
  watchList: any[]
}

export interface WatchlistTabsResponse {
  responseCode: string
  responseMessage: string
  data: WatchlistTab[]
}

class WatchlistTabsService {
  private readonly baseUrl = '/user/watchlist'

  /**
   * Fetch user's watchlist tabs
   * ✅ Uses apiClient for automatic Bearer token handling
   */
  async getWatchlistTabs(userId: number): Promise<WatchlistTab[]> {
    try {
      console.log('📑 Fetching Watchlist Tabs:', { userId })

      const response = await apiClient.post<WatchlistTabsResponse>(
        this.baseUrl,
        {
          userId: userId,
          requestTimestamp: Date.now().toString(),
          data: ''
        }
      )

      if (response.responseCode !== '0') {
        throw new Error(response.responseMessage || 'Failed to fetch watchlist tabs')
      }

      return response.data || []
    } catch (error: any) {
      console.error('❌ Error fetching watchlist tabs:', error)
      throw error
    }
  }

  /**
   * Add a new watchlist tab
   * ✅ Uses apiClient for automatic Bearer token handling
   */
  async addTab(userId: number, tabName: string): Promise<WatchlistTab> {
    try {
      console.log('➕ Adding Watchlist Tab:', { userId, tabName })

      const response = await apiClient.post<any>(
        `${this.baseUrl}/add`,
        {
          userId: userId,
          requestTimestamp: Date.now().toString(),
          data: {
            tabName: tabName
          }
        }
      )

      if (response.responseCode !== '0') {
        throw new Error(response.responseMessage || 'Failed to add tab')
      }

      return response.data
    } catch (error: any) {
      console.error('❌ Error adding tab:', error)
      throw error
    }
  }

  /**
   * Delete a watchlist tab
   * ✅ Uses apiClient for automatic Bearer token handling
   */
  async deleteTab(tabId: number): Promise<boolean> {
    try {
      console.log('🗑️ Deleting Watchlist Tab:', { tabId })

      const response = await apiClient.delete<any>(
        `${this.baseUrl}/${tabId}`
      )

      if (response.responseCode !== '0') {
        throw new Error(response.responseMessage || 'Failed to delete tab')
      }

      return true
    } catch (error: any) {
      console.error('❌ Error deleting tab:', error)
      throw error
    }
  }

  /**
   * Update tab name
   * ✅ Uses apiClient for automatic Bearer token handling
   */
  async updateTabName(tabId: number, tabName: string): Promise<WatchlistTab> {
    try {
      console.log('✏️ Updating Watchlist Tab:', { tabId, tabName })

      const response = await apiClient.put<any>(
        `${this.baseUrl}/${tabId}`,
        {
          requestTimestamp: Date.now().toString(),
          data: {
            tabName: tabName
          }
        }
      )

      if (response.responseCode !== '0') {
        throw new Error(response.responseMessage || 'Failed to update tab')
      }

      return response.data
    } catch (error: any) {
      console.error('❌ Error updating tab:', error)
      throw error
    }
  }

  /**
   * Add instrument to watchlist tab
   * ✅ Uses apiClient for automatic Bearer token handling
   */
  async addToWatchlist(userId: number, token: number, watchListTabId: number): Promise<boolean> {
    try {
      console.log('➕ Adding to Watchlist Tab:', { userId, token, watchListTabId })

      const response = await apiClient.post<any>(
        `${this.baseUrl}/add`,
        {
          userId: userId,
          requestTimestamp: Date.now().toString(),
          data: {
            token: String(token),
            watchListTabId: watchListTabId
          }
        }
      )

      if (response.responseCode !== '0') {
        throw new Error(response.responseMessage || 'Failed to add to watchlist')
      }

      return true
    } catch (error: any) {
      console.error('❌ Error adding to watchlist:', error)
      throw error
    }
  }

  /**
   * Remove instrument from watchlist tab
   * ✅ Uses apiClient for automatic Bearer token handling
   */
  async removeFromWatchlist(userId: number, token: number, watchListTabId: number): Promise<boolean> {
    try {
      console.log('➖ Removing from Watchlist Tab:', { userId, token, watchListTabId })

      const response = await apiClient.post<any>(
        `${this.baseUrl}/delete`,
        {
          userId: userId,
          requestTimestamp: Date.now().toString(),
          data: {
            token: String(token),
            watchListTabId: watchListTabId
          }
        }
      )

      if (response.responseCode !== '0') {
        throw new Error(response.responseMessage || 'Failed to remove from watchlist')
      }

      return true
    } catch (error: any) {
      console.error('❌ Error removing from watchlist:', error)
      throw error
    }
  }
}

export default new WatchlistTabsService()
