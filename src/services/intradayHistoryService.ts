import axios from 'axios'
import { TokenManager } from './apiClient'

interface Candle {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface HistoryResponse {
  candles: Candle[]
}

const API_BASE_URL = 'https://api-staging.rivoplus.live'

class IntradayHistoryService {
  private axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
  })

  async getHistory(
    instrumentToken: string,
    interval: string,
    from: string,
    to: string
  ): Promise<Candle[]> {
    try {
      const response = await this.axiosInstance.get<HistoryResponse>(
        '/quotes/kite/history',
        {
          params: {
            instrumentToken,
            interval,
            from,
            to,
          },
          headers: {
            Authorization: `Bearer ${TokenManager.getToken()}`,
          },
        }
      )
      return response.data.candles || []
    } catch (error: any) {
      console.error('Error fetching history:', error)
      throw new Error(error.response?.data?.message || 'Failed to fetch history data')
    }
  }
}

export default new IntradayHistoryService()
