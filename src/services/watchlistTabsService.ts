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
  private readonly baseUrl = 'https://api-staging.rivoplus.live/user-new/watchlist'

  /**
   * Fetch user's watchlist tabs
   */
  async getWatchlistTabs(userId: number): Promise<WatchlistTab[]> {
    try {
      console.log('📑 Fetching Watchlist Tabs:', { userId })

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch watchlist tabs: ${response.statusText}`)
      }

      const data: WatchlistTabsResponse = await response.json()

      if (data.responseCode !== '0') {
        throw new Error(data.responseMessage || 'Failed to fetch watchlist tabs')
      }

      return data.data || []
    } catch (error: any) {
      console.error('❌ Error fetching watchlist tabs:', error)
      throw error
    }
  }

  /**
   * Add a new watchlist tab
   */
  async addTab(userId: number, tabName: string): Promise<WatchlistTab> {
    try {
      console.log('➕ Adding Watchlist Tab:', { userId, tabName })

      const response = await fetch(`${this.baseUrl}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          tabName: tabName
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to add tab: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.responseCode !== '0') {
        throw new Error(data.responseMessage || 'Failed to add tab')
      }

      return data.data
    } catch (error: any) {
      console.error('❌ Error adding tab:', error)
      throw error
    }
  }

  /**
   * Delete a watchlist tab
   */
  async deleteTab(tabId: number): Promise<boolean> {
    try {
      console.log('🗑️ Deleting Watchlist Tab:', { tabId })

      const response = await fetch(`${this.baseUrl}/${tabId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete tab: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.responseCode !== '0') {
        throw new Error(data.responseMessage || 'Failed to delete tab')
      }

      return true
    } catch (error: any) {
      console.error('❌ Error deleting tab:', error)
      throw error
    }
  }

  /**
   * Update tab name
   */
  async updateTabName(tabId: number, tabName: string): Promise<WatchlistTab> {
    try {
      console.log('✏️ Updating Watchlist Tab:', { tabId, tabName })

      const response = await fetch(`https://api-staging.rivoplus.live/user-new/api/watchlist-tabs/tab/${tabId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            tabName: tabName
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update tab: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.responseCode !== '0') {
        throw new Error(data.responseMessage || 'Failed to update tab')
      }

      return data.data
    } catch (error: any) {
      console.error('❌ Error updating tab:', error)
      throw error
    }
  }

  /**
   * Add instrument to watchlist tab
   */
  async addToWatchlist(userId: number, token: number, watchListTabId: number): Promise<boolean> {
    try {
      console.log('➕ Adding to Watchlist Tab:', { userId, token, watchListTabId })

      const response = await fetch(`${this.baseUrl}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          requestTimestamp: Date.now(),
          data: {
            token: String(token),
            watchListTabId: watchListTabId
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to add to watchlist: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.responseCode !== '0') {
        throw new Error(data.responseMessage || 'Failed to add to watchlist')
      }

      return true
    } catch (error: any) {
      console.error('❌ Error adding to watchlist:', error)
      throw error
    }
  }

  /**
   * Remove instrument from watchlist tab
   */
  async removeFromWatchlist(userId: number, token: number, watchListTabId: number): Promise<boolean> {
    try {
      console.log('➖ Removing from Watchlist Tab:', { userId, token, watchListTabId })

      const response = await fetch(`${this.baseUrl}/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          requestTimestamp: Date.now(),
          data: {
            token: String(token),
            watchListTabId: watchListTabId
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to remove from watchlist: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.responseCode !== '0') {
        throw new Error(data.responseMessage || 'Failed to remove from watchlist')
      }

      return true
    } catch (error: any) {
      console.error('❌ Error removing from watchlist:', error)
      throw error
    }
  }
}

export default new WatchlistTabsService()
