/**
 * Order Update Service
 * Handles real-time order updates via WebSocket STOMP protocol
 * Subscribes to /queue/positions/{userId} for order status updates
 */

import toast from 'react-hot-toast'
import { marketWatchService } from './marketWatchService'

export enum OrderStatus {
  APPROVED = 'APPROVED',
  FILLED = 'FILLED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING'
}

export interface OrderUpdate {
  orderId: number
  positionId?: number
  token: number
  status: OrderStatus
  orderType: string
  netQuantity: number
  lotValue?: number
  price: number
  userId: number
  userName?: string
  instrumentName?: string
  exchange?: string
  tradeSymbol?: string
  side?: 'BUY' | 'SELL'
  lotSize?: number
  margin?: number
  realisedPnl?: number
  createdAt?: string
  updatedAt?: string
  placedBy?: number
}

class OrderUpdateService {
  private orderCallbacks: Set<(order: OrderUpdate) => void> = new Set()
  private subscriptionId: string | null = null
  private currentUserId: string | null = null

  /**
   * Subscribe to order updates for a user
   * If master user, will receive updates for all their clients on same queue
   */
  subscribeToOrders(userId: string): void {
    if (!marketWatchService.isConnected()) {
      console.warn('⚠️  Cannot subscribe to orders - WebSocket not connected')
      return
    }

    // Unsubscribe from previous subscription if exists
    if (this.currentUserId && this.currentUserId !== userId) {
      this.unsubscribeFromOrders()
    }

    this.currentUserId = userId
    this.subscriptionId = `sub-orders-${userId}`

    const frame = `SUBSCRIBE\nid:${this.subscriptionId}\ndestination:/queue/positions/${userId}\nack:auto\n\n\0`
    
    const success = marketWatchService.sendStompFrame(frame)
    if (success) {
      console.log(`🔔 Subscribed to order updates: /queue/positions/${userId}`)
    } else {
      console.error('❌ Failed to subscribe to order updates')
    }
  }

  /**
   * Unsubscribe from order updates
   */
  unsubscribeFromOrders(): void {
    if (!this.subscriptionId || !marketWatchService.isConnected()) {
      return
    }

    const frame = `UNSUBSCRIBE\nid:${this.subscriptionId}\n\n\0`
    
    const success = marketWatchService.sendStompFrame(frame)
    if (success) {
      console.log(`🔕 Unsubscribed from order updates`)
    }

    this.subscriptionId = null
    this.currentUserId = null
  }

  /**
   * Register callback for order updates
   */
  onOrderUpdate(callback: (order: OrderUpdate) => void): () => void {
    this.orderCallbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.orderCallbacks.delete(callback)
    }
  }

  /**
   * Handle incoming order update message
   * Called by the WebSocket message handler
   */
  handleOrderMessage(data: string): void {
    try {
      const orderUpdate: OrderUpdate = JSON.parse(data)
      
      console.log('📦 Order update received:', orderUpdate)

      // Show toast notification
      this.showOrderNotification(orderUpdate)

      // Notify all registered callbacks
      this.orderCallbacks.forEach(callback => {
        try {
          callback(orderUpdate)
        } catch (error) {
          console.error('Error in order callback:', error)
        }
      })
    } catch (error) {
      console.error('Error parsing order update:', error)
    }
  }

  /**
   * Show beautiful toast notification for order updates
   */
  private showOrderNotification(order: OrderUpdate): void {
    const userName = order.userName ? `[${order.userName}] ` : ''
    
    // Build instrument info from available fields
    const side = order.side || 'N/A'
    const tradeSymbol = order.tradeSymbol || `Token ${order.token}`
    const exchange = order.exchange || ''
    const instrumentInfo = exchange ? `${exchange}: ${tradeSymbol}` : tradeSymbol
    const sideEmoji = side === 'BUY' ? '📈' : side === 'SELL' ? '📉' : '📊'
    
    switch (order.status) {
      case OrderStatus.APPROVED:
        // Skip toast for APPROVED - only log it
        console.log('✅ Order approved (no toast):', order.orderId, instrumentInfo)
        break

      case OrderStatus.FILLED:
        toast.success(
          `${userName}${sideEmoji} ${side} Order Filled\n${instrumentInfo}\nQty: ${order.lotSize || 0} lots @ ₹${order.price.toFixed(2)}`,
          {
            duration: 3000,
            icon: '🎯',
            style: {
              background: '#059669',
              color: '#fff',
              fontWeight: '600',
              whiteSpace: 'pre-line'
            }
          }
        )
        break

      case OrderStatus.REJECTED:
        toast.error(
          `${userName}${sideEmoji} ${side} Order Rejected\n${instrumentInfo}\nQty: ${order.lotSize || 0} lots`,
          {
            duration: 3000,
            icon: '❌',
            style: {
              background: '#ef4444',
              color: '#fff',
              fontWeight: '600',
              whiteSpace: 'pre-line'
            }
          }
        )
        break

      case OrderStatus.CANCELLED:
        toast(
          `${userName}${sideEmoji} ${side} Order Cancelled\n${instrumentInfo}`,
          {
            duration: 2500,
            icon: '🚫',
            style: {
              background: '#f59e0b',
              color: '#fff',
              fontWeight: '600',
              whiteSpace: 'pre-line'
            }
          }
        )
        break

      default:
        // For other statuses, show generic notification
        toast(
          `${userName}Order Update\n${instrumentInfo}\nStatus: ${order.status}`,
          {
            duration: 2500,
            icon: 'ℹ️',
            style: {
              fontWeight: '600',
              whiteSpace: 'pre-line'
            }
          }
        )
    }
  }

  /**
   * Check if subscribed to order updates
   */
  isSubscribed(): boolean {
    return this.subscriptionId !== null
  }

  /**
   * Get current subscribed userId
   */
  getCurrentUserId(): string | null {
    return this.currentUserId
  }
}

export const orderUpdateService = new OrderUpdateService()
export default orderUpdateService
