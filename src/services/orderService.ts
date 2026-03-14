import axios, { AxiosInstance } from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api-staging.rivoplus.live'

export interface PlaceOrderRequest {
  requestTimestamp: string
  userId: number
  deviceId: string
  tradeOrderMethod: string
  data: {
    userId: number
    exchange: string
    tradeSymbol: string
    side: 'BUY' | 'SELL'
    orderType: 'MARKET' | 'LIMIT' | 'STOP_LOSS'
    lotSize: number
    price: number
    token: number
    lotValue: number
  }
}

export interface PlaceOrderResponse {
  responseCode: string
  responseMessage: string
  data?: {
    orderId: number | string
    [key: string]: any
  }
}

class OrderService {
  private baseURL = BASE_URL
  private endpoint = '/oms/placeOrder'

  /**
   * Place a new order (Buy or Sell)
   */
  async placeOrder(orderData: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    try {
      const response = await axios.post<PlaceOrderResponse>(
        `${this.baseURL}${this.endpoint}`,
        orderData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )

      if (response.data?.responseCode === '0' || response.status === 200) {
        console.log('✅ Order placed successfully:', response.data)
        return response.data
      } else {
        throw new Error(response.data?.responseMessage || 'Failed to place order')
      }
    } catch (error: any) {
      console.error('❌ Error placing order:', error)
      const errorMessage = error.response?.data?.responseMessage || error.message || 'Failed to place order'
      throw new Error(errorMessage)
    }
  }

  /**
   * Place a buy order
   * @param loggedInUserId The ID of the logged-in user (admin/broker)
   * @param clientUserId The ID of the client for whom the order is being placed
   */
  async placeBuyOrder(
    loggedInUserId: number,
    clientUserId: number,
    exchange: string,
    tradeSymbol: string,
    token: number,
    quantity: number,
    price: number,
    lotValue: number,
    deviceId: string = '1234567890'
  ): Promise<PlaceOrderResponse> {
    const orderData: PlaceOrderRequest = {
      requestTimestamp: Date.now().toString(),
      userId: loggedInUserId,
      deviceId,
      tradeOrderMethod: 'ANDROID',
      data: {
        userId: clientUserId,
        exchange,
        tradeSymbol,
        side: 'BUY',
        orderType: 'MARKET',
        lotSize: quantity,
        price,
        token,
        lotValue,
      },
    }

    return this.placeOrder(orderData)
  }

  /**
   * Place a sell order
   * @param loggedInUserId The ID of the logged-in user (admin/broker)
   * @param clientUserId The ID of the client for whom the order is being placed
   */
  async placeSellOrder(
    loggedInUserId: number,
    clientUserId: number,
    exchange: string,
    tradeSymbol: string,
    token: number,
    quantity: number,
    price: number,
    lotValue: number,
    deviceId: string = '1234567890'
  ): Promise<PlaceOrderResponse> {
    const orderData: PlaceOrderRequest = {
      requestTimestamp: Date.now().toString(),
      userId: loggedInUserId,
      deviceId,
      tradeOrderMethod: 'ANDROID',
      data: {
        userId: clientUserId,
        exchange,
        tradeSymbol,
        side: 'SELL',
        orderType: 'MARKET',
        lotSize: quantity,
        price,
        token,
        lotValue,
      },
    }

    return this.placeOrder(orderData)
  }
}

// Export singleton instance
export const orderService = new OrderService()
export default orderService
