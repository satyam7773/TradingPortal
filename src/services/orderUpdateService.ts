/**
 * Order Update Service
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
  username?: string // Ensure this matches your JSON "username"
  instrumentName?: string
  exchange?: string
  tradeSymbol?: string
  rejectedReason?: string
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

  subscribeToOrders(userId: string): void {
    if (!marketWatchService.isConnected()) {
      console.warn('⚠️  Cannot subscribe to orders - WebSocket not connected')
      return
    }
    if (this.currentUserId && this.currentUserId !== userId) {
      this.unsubscribeFromOrders()
    }
    this.currentUserId = userId
    this.subscriptionId = `sub-orders-${userId}`
    const frame = `SUBSCRIBE\nid:${this.subscriptionId}\ndestination:/queue/positions/${userId}\nack:auto\n\n\0`
    const success = marketWatchService.sendStompFrame(frame)
    if (success) console.log(`🔔 Subscribed to order updates: /queue/positions/${userId}`)
  }

  unsubscribeFromOrders(): void {
    if (!this.subscriptionId || !marketWatchService.isConnected()) return
    const frame = `UNSUBSCRIBE\nid:${this.subscriptionId}\n\n\0`
    if (marketWatchService.sendStompFrame(frame)) console.log(`🔕 Unsubscribed from order updates`)
    this.subscriptionId = null
    this.currentUserId = null
  }

  onOrderUpdate(callback: (order: OrderUpdate) => void): () => void {
    this.orderCallbacks.add(callback)
    return () => { this.orderCallbacks.delete(callback) }
  }

  handleOrderMessage(data: string): void {
    try {
      const sanitizedData = data.replace(/\0/g, '').trim();
      const orderUpdate: OrderUpdate = JSON.parse(sanitizedData);
      
      // PRINT MESSAGE BEFORE TOAST
      console.log('📢 Incoming Position Update:', {
        Order: orderUpdate.orderId,
        User: orderUpdate.username,
        Status: orderUpdate.status,
        Symbol: orderUpdate.tradeSymbol,
        Qty: orderUpdate.netQuantity
      });

      this.showOrderNotification(orderUpdate);

      this.orderCallbacks.forEach(callback => {
        try { callback(orderUpdate) } catch (error) { console.error('Error in order callback:', error) }
      })
    } catch (error) {
      console.error('Error parsing order update:', error, 'Raw data:', data)
    }
  }

 private showOrderNotification(order: OrderUpdate): void {
    // Verified: Username is included in all scenarios below
    const userName = order.username ? `[${order.username}] ` : '[System] '
    const side = order.side || 'N/A'
    const tradeSymbol = order.tradeSymbol || `Token ${order.token}`
    const exchange = order.exchange || ''
    const instrumentInfo = exchange ? `${exchange}: ${tradeSymbol}` : tradeSymbol
    const sideEmoji = side === 'BUY' ? '📈' : side === 'SELL' ? '📉' : '📊'
    
    // --- New Quantity Logic ---
    let displayQty:any = order.lotValue || 0
    const upperExchange = exchange.toUpperCase()
    const upperSymbol = tradeSymbol.toUpperCase()

    // Check if exchange is MCX, CDS, or if it looks like a Call/Put option contract
    const isMcxOrCds = upperExchange.includes('MCX') || upperExchange.includes('CDS');
    const isCallPut = upperSymbol.endsWith('CE') || upperSymbol.endsWith('PE') || upperSymbol.includes('CALL') || upperSymbol.includes('PUT');

    if ((isMcxOrCds || isCallPut) && order.lotValue && order.lotValue > 0) {
        displayQty = order.lotSize
    }else{

    }
    // ---------------------------

    // Base formatting for UI consistency
    const commonStyle = {
        fontWeight: '600', whiteSpace: 'pre-line', color: '#fff'
    };

    switch (order.status) {
      case OrderStatus.APPROVED:
        toast.success(
          `${userName}${sideEmoji} ${side} Order Approved\n${instrumentInfo}\nQty: ${displayQty}`,
          {
            duration: 3000,
            icon: '✅',
            style: { ...commonStyle, background: '#2563eb' }
          }
        )
        break

      case OrderStatus.FILLED:
        toast.success(
          `${userName}${sideEmoji} ${side} Order Filled\n${instrumentInfo}\nQty: ${displayQty} @ ₹${order.price.toFixed(2)}`,
          {
            duration: 4000,
            icon: '🎯',
            style: { ...commonStyle, background: '#059669' }
          }
        )
        break

      case OrderStatus.REJECTED:
        toast.error(
          `${userName}${sideEmoji} ${side} Order Rejected\n${instrumentInfo}\nQty: ${displayQty}\nReason: ${order.rejectedReason || 'Rejected by RMS'}`,
          {
            duration: 5000,
            icon: '❌',
            style: { ...commonStyle, background: '#ef4444' }
          }
        )
        break

      case OrderStatus.CANCELLED:
        toast(
          `${userName}${sideEmoji} ${side} Order Cancelled\n${instrumentInfo}\nQty: ${displayQty}`,
          {
            duration: 3000,
            icon: '🚫',
            style: { ...commonStyle, background: '#f59e0b' }
          }
        )
        break

      default:
        toast(
          `${userName}Order Update: ${order.status}\n${instrumentInfo}\nQty: ${displayQty}`,
          {
            duration: 3000,
            icon: 'ℹ️',
            style: { fontWeight: '600', whiteSpace: 'pre-line' }
          }
        )
    }
  }

  isSubscribed(): boolean { return this.subscriptionId !== null }
  getCurrentUserId(): string | null { return this.currentUserId }
}

export const orderUpdateService = new OrderUpdateService()
export default orderUpdateService