/**
 * Market Watch Service using @stomp/stompjs
 * Handles WebSocket connections and market data streaming via STOMP protocol
 */

import { Client, StompSubscription } from '@stomp/stompjs'

type TimerType = ReturnType<typeof setInterval>

class MarketWatchService {
  private client: Client | null = null
  private feedCallbacks: Set<(data: any) => void> = new Set()
  private watchlistSubscription: StompSubscription | null = null
  private instrumentsSubscription: StompSubscription | null = null
  private onConnectedCallback: (() => void) | null = null
  private onDisconnectedCallback: (() => void) | null = null
  private connectPromiseResolve: (() => void) | null = null
  
  // Message throttling (1 second, matching Flutter)
  private throttleInterval = 1000
  private latestMessage: any = null
  private throttleTimer: TimerType | null = null

  /**
   * Connect to WebSocket using STOMP client
   */
  connect(onConnected?: () => void, onDisconnected?: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      // If already connected, just call callback and resolve
      if (this.client && this.client.connected) {
        if (onConnected) onConnected()
        resolve()
        return
      }

      // Store callbacks
      this.onConnectedCallback = onConnected || null
      this.onDisconnectedCallback = onDisconnected || null
      this.connectPromiseResolve = resolve

      try {
        // Create STOMP client
        this.client = new Client({
          brokerURL: 'wss://quotes.rivoplus.live/ws/market',
          connectHeaders: {
            login: 'guest',
            passcode: 'guest',
            'heart-beat': '20000,20000' // Client heartbeat every 20s
          },
          reconnectDelay: 3000, // Reconnect after 3 seconds
          heartbeatIncoming: 0,
          heartbeatOutgoing: 20000, // Send heartbeat every 20 seconds
          // Debugging - only log important messages
          debug: (msg: string) => {
            if (msg.includes('CONNECTED') || msg.includes('DISCONNECT')) {
              console.log('🔌 STOMP:', msg)
            }
          }
        })

        // Handle connection established
        this.client.onConnect = (frame) => {
          console.log('✅ STOMP Connected')
          // Call the onConnected callback
          if (this.onConnectedCallback) {
            this.onConnectedCallback()
            this.onConnectedCallback = null
          }
          // Resolve the connect promise
          if (this.connectPromiseResolve) {
            this.connectPromiseResolve()
            this.connectPromiseResolve = null
          }
        }

        // Handle disconnection
        this.client.onDisconnect = (frame) => {
          console.log('❌ WebSocket DISCONNECTED - will reconnect in 3s')
          // Reset subscriptions
          this.watchlistSubscription = null
          this.instrumentsSubscription = null
          // Stop throttle timer
          this._stopThrottle()
          // Call the onDisconnected callback
          if (this.onDisconnectedCallback) {
            this.onDisconnectedCallback()
          }
        }

        // Handle errors
        this.client.onStompError = (frame) => {
          console.error('❌ STOMP Error:', frame.body)
          reject(new Error(`STOMP Error: ${frame.body}`))
        }

        // Activate the client (connect)
        this.client.activate()
      } catch (error) {
        console.error('❌ Failed to create STOMP client:', error)
        reject(error)
      }
    })
  }

  /**
   * Register callback for feed data
   */
  onFeedData(callback: (data: any) => void): () => void {
    this.feedCallbacks.add(callback)

    // Return unsubscribe function
    return () => {
      this.feedCallbacks.delete(callback)
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.client && this.client.connected) {
      console.log('🔌 Disconnecting from WebSocket')
      this._stopThrottle()
      this.client.deactivate().catch(() => {
        // Ignore errors during disconnect
      })
    }
  }

  /**
   * Subscribe to watchlist queue with userId
   */
  subscribeToWatchlist(userId: string): void {
    if (!this.client || !this.client.connected) {
      console.error('❌ Cannot subscribe - STOMP client not connected')
      return
    }

    if (this.watchlistSubscription) {
      console.log('✅ Already subscribed to watchlist')
      return
    }

    console.log('📌 Subscribing to watchlist for user:', userId)
    
    this.watchlistSubscription = this.client.subscribe(
      `/queue/watchlist/${userId}`,
      (message) => {
        try {
          const data = JSON.parse(message.body)
          if (Array.isArray(data)) {
            this._storeAndThrottle(data)
          }
        } catch (error) {
          console.error('❌ Error parsing watchlist message:', error)
        }
      },
      {
        ack: 'auto'
      }
    )
  }

  /**
   * Send watchlist subscription request to server
   */
  sendWatchlistRequest(userId: string): void {
    if (!this.client || !this.client.connected) {
      console.error('❌ Cannot send watchlist request - STOMP client not connected')
      return
    }

    console.log('📌 Sending watchlist request for user:', userId)
    
    this.client.publish({
      destination: '/app/subscribe',
      body: JSON.stringify({ userId }),
      headers: {
        'content-type': 'application/json'
      }
    })
  }

  /**
   * Subscribe to instruments queue with userId
   */
  subscribeToInstruments(userId: string): void {
    if (!this.client || !this.client.connected) {
      console.error('❌ Cannot subscribe to instruments - STOMP client not connected')
      return
    }

    if (this.instrumentsSubscription) {
      console.log('✅ Already subscribed to instruments')
      return
    }

    console.log('📌 Subscribing to instruments for user:', userId)
    
    this.instrumentsSubscription = this.client.subscribe(
      `/queue/instruments/${userId}`,
      (message) => {
        try {
          const data = JSON.parse(message.body)
          if (Array.isArray(data)) {
            this._storeAndThrottle(data)
          }
        } catch (error) {
          console.error('❌ Error parsing instruments message:', error)
        }
      },
      {
        ack: 'auto'
      }
    )
  }

  /**
   * Send instruments request with userId and instrument tokens
   */
  sendInstrumentsRequest(userId: string, instrumentTokens: string[]): void {
    if (!this.client || !this.client.connected) {
      console.error('❌ Cannot send instruments request - STOMP client not connected')
      return
    }

    console.log('📌 Sending instruments request with', instrumentTokens.length, 'tokens')
    
    this.client.publish({
      destination: '/app/instruments',
      body: JSON.stringify({ userId, instrumentTokens }),
      headers: {
        'content-type': 'application/json'
      }
    })
  }

/**
   * Store message and start throttle timer
   */
  private _storeAndThrottle(data: any): void {
    this.latestMessage = data
    
    // Start throttle timer only once (if not already running)
    if (!this.throttleTimer) {
      this._startThrottle()
    }
  }

  /**
   * Start throttle timer - dispatch latest message every 1 second
   */
  private _startThrottle(): void {
    if (this.throttleTimer) {
      return // Already running
    }

    this.throttleTimer = setInterval(() => {
      if (this.latestMessage === null) {
        return
      }

      // Dispatch the latest message
      const messageToSend = this.latestMessage
      this.latestMessage = null

      this.feedCallbacks.forEach(callback => {
        try {
          callback(messageToSend)
        } catch (error) {
          console.error('❌ Error in feed callback:', error)
        }
      })
    }, this.throttleInterval)
  }

  /**
   * Stop throttle timer
   */
  private _stopThrottle(): void {
    if (this.throttleTimer) {
      clearInterval(this.throttleTimer)
      this.throttleTimer = null
    }
    this.latestMessage = null
  }}

export const marketWatchService = new MarketWatchService()
export default marketWatchService
