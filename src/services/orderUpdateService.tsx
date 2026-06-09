/**
 * Order Update Service
 */

import React from "react";
import toast from "react-hot-toast";
import { marketWatchService } from "./marketWatchService";

export enum OrderStatus {
  APPROVED = "APPROVED",
  FILLED = "FILLED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
  PENDING = "PENDING",
}

export interface OrderUpdate {
  orderId: number;
  positionId?: number;
  token: number;
  status: OrderStatus;
  orderType: string;
  netQuantity: number;
  lotValue?: number;
  price: number;
  orderPrice: any;
  userId: number;
  username?: string;
  instrumentName?: string;
  exchange?: string;
  tradeSymbol?: string;
  rejectedReason?: string;
  side?: "BUY" | "SELL";
  lotSize?: number;
  margin?: number;
  realisedPnl?: number;
  createdAt?: string;
  updatedAt?: string;
  placedBy?: number;
}

// Helper component for the Toast UI
const OrderToastContent = ({ 
  t, message, subInfo 
}: { 
  t: any, message: string, subInfo?: string 
}) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
    <div style={{ whiteSpace: "pre-line" }}>
      <div>{message}</div>
      {subInfo && <div style={{ fontSize: "0.85em", opacity: 0.9 }}>{subInfo}</div>}
    </div>
    <button
      onClick={() => toast.dismiss(t.id)}
      style={{
        background: "rgba(255,255,255,0.2)",
        border: "none",
        color: "white",
        cursor: "pointer",
        borderRadius: "4px",
        padding: "2px 6px",
        fontSize: "12px",
        marginLeft: "auto"
      }}
    >
      ✕
    </button>
  </div>
);

class OrderUpdateService {
  private orderCallbacks: Set<(order: OrderUpdate) => void> = new Set();
  private subscriptionId: string | null = null;
  private currentUserId: string | null = null;

  subscribeToOrders(userId: string): void {
    if (!marketWatchService.isConnected()) {
      console.warn("⚠️  Cannot subscribe to orders - WebSocket not connected");
      return;
    }
    if (this.currentUserId && this.currentUserId !== userId) {
      this.unsubscribeFromOrders();
    }
    this.currentUserId = userId;
    this.subscriptionId = `sub-orders-${userId}`;
    const frame = `SUBSCRIBE\nid:${this.subscriptionId}\ndestination:/queue/positions/${userId}\nack:auto\n\n\0`;
    const success = marketWatchService.sendStompFrame(frame);
    if (success) console.log(`🔔 Subscribed to order updates: /queue/positions/${userId}`);
  }

  unsubscribeFromOrders(): void {
    if (!this.subscriptionId || !marketWatchService.isConnected()) return;
    const frame = `UNSUBSCRIBE\nid:${this.subscriptionId}\n\n\0`;
    if (marketWatchService.sendStompFrame(frame)) console.log(`🔕 Unsubscribed from order updates`);
    this.subscriptionId = null;
    this.currentUserId = null;
  }

  onOrderUpdate(callback: (order: OrderUpdate) => void): () => void {
    this.orderCallbacks.add(callback);
    return () => this.orderCallbacks.delete(callback);
  }

  handleOrderMessage(data: string): void {
    try {
      const sanitizedData = data.replace(/\0/g, "").trim();
      const orderUpdate: OrderUpdate = JSON.parse(sanitizedData);
      this.showOrderNotification(orderUpdate);
      this.orderCallbacks.forEach((callback) => callback(orderUpdate));
    } catch (error) {
      console.error("Error parsing order update:", error);
    }
  }

  private showOrderNotification(order: OrderUpdate): void {
    const userName = order.username ? `[${order.username}] ` : "[System] ";
    const side = order.side || "N/A";
    const tradeSymbol = order.tradeSymbol || `Token ${order.token}`;
    const exchange = order.exchange || "";
    const instrumentInfo = exchange ? `${exchange}: ${tradeSymbol}` : tradeSymbol;
    const sideEmoji = side === "BUY" ? "📈" : side === "SELL" ? "📉" : "📊";
    
    // Quantity Logic
    const isMcxOrCds = exchange.toUpperCase().includes("MCX") || exchange.toUpperCase().includes("CDS");
    const isCallPut = tradeSymbol.toUpperCase().endsWith("CE") || tradeSymbol.toUpperCase().endsWith("PE");
    const displayQty = (isMcxOrCds || isCallPut) && order.lotValue ? order.lotSize : order.lotValue;

    const commonStyle = { fontWeight: "600", color: "#fff", padding: "12px" };
    const priceDisplay = order.orderPrice ? ` @ ₹${Number(order.orderPrice).toFixed(2)}` : "";
    const message = `${userName}${sideEmoji} ${order.orderType} ${side} Order ${order.status}`;
    const subInfo = `${instrumentInfo}\nQty: ${displayQty}${priceDisplay}`;

    const toastOptions = (bg: string) => ({
      duration: order.status === OrderStatus.REJECTED ? 8000 : 4000,
      style: { ...commonStyle, background: bg },
    });

    switch (order.status) {
      case OrderStatus.APPROVED:
        toast.success((t) => <OrderToastContent t={t} message={message} subInfo={subInfo} />, toastOptions("#2563eb"));
        break;
      case OrderStatus.FILLED:
        const filledBg = side === "BUY" ? "#059669" : "#ef4444";
        toast.success((t) => <OrderToastContent t={t} message={message} subInfo={subInfo} />, toastOptions(filledBg));
        break;
      case OrderStatus.REJECTED:
        toast.error((t) => <OrderToastContent t={t} message={message} subInfo={`${subInfo}\nReason: ${order.rejectedReason || "N/A"}`} />, toastOptions("#ef4444"));
        break;
      case OrderStatus.CANCELLED:
        toast((t) => <OrderToastContent t={t} message={message} subInfo={subInfo} />, toastOptions("#f59e0b"));
        break;
      default:
        toast((t) => <OrderToastContent t={t} message={message} subInfo={subInfo} />, toastOptions("#4b5563"));
    }
  }

  isSubscribed(): boolean { return this.subscriptionId !== null; }
  getCurrentUserId(): string | null { return this.currentUserId; }
}

export const orderUpdateService = new OrderUpdateService();
export default orderUpdateService;