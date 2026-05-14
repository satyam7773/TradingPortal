/**
 * Market Watch Service
 * Handles WebSocket connections and market data streaming via STOMP protocol
 * Implements patterns from Flutter STOMP client for better reliability
 */

import orderUpdateService from './orderUpdateService'

class MarketWatchService {
  private socket: WebSocket | null = null
  private feedCallbacks: Set<(data: any) => void> = new Set()
  private stompConnected = false
  private messageBuffer = ''
  private onConnectedCallback: (() => void) | null = null
  private connectPromiseResolve: (() => void) | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private lastPingTime = 0
  
  // Track subscriptions to prevent duplicates
  private subscribedUsers: Set<string> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // 1 second
  
  // Health check tracking (similar to Flutter implementation)
  private lastReceivedTimePerQueue: Map<string, number> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private healthCheckThreshold = 5000 // 5 seconds - if no data received, mark as disconnected
  private isHealthCheckRunning = false
  private isConnecting = false;

  /**
   * Connect to WebSocket for market data
   */
  connect(onConnected?: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
        console.log('✅ WebSocket already connected')
        if (onConnected) onConnected()
        resolve()
        return
      }

      // 2. PREVENT MULTIPLE CALLS: If currently connecting, wait or return
      if (this.isConnecting) {
        console.log('⏳ Connection already in progress, skipping duplicate call')
        return; 
      }

      this.isConnecting = true;

      // Store callbacks to call after STOMP connection
      this.onConnectedCallback = onConnected || null
      this.connectPromiseResolve = resolve

      

      const wsUrl = 'wss://quotes.rivoplus.live/ws/market'
      
      // Add a timeout - if connection doesn't complete in 10 seconds, reject
      const connectionTimeout = setTimeout(() => {
        console.error('❌ WebSocket connection timeout - no CONNECTED frame received within 10 seconds')
        reject(new Error('WebSocket connection timeout'))
        if (this.socket) {
          this.socket.close()
          this.socket = null
        }
      }, 10000)

      try {
        this.socket = new WebSocket(wsUrl)

        this.socket.onopen = () => {
          console.log('🔌 WebSocket opened, sending STOMP CONNECT')
          // Send STOMP CONNECT frame
          this._sendStompConnect()
        }

        this.socket.onmessage = (event: MessageEvent) => {
          try {
            console.log('📨 WebSocket message received:', event.data.substring(0, 50))
            // Accumulate message data (STOMP frames may come in chunks)
            this.messageBuffer += event.data
            
            // Process complete STOMP frames
            this._processStompFrames()
            
            // Clear timeout on first message - connection is working
            clearTimeout(connectionTimeout)
          } catch (error) {
            console.error('Error processing message:', error, event.data)
          }
        }

        this.socket.onerror = (error: Event) => {
          console.error('❌ WebSocket error:', error)
          this.isConnecting = false;
          clearTimeout(connectionTimeout)
          reject(new Error('WebSocket connection failed'))
        }

        this.socket.onclose = () => {
          console.log('⚠️  WebSocket closed')
          this.isConnecting = false;
          clearTimeout(connectionTimeout)
          this.stompConnected = false
          this._stopHeartbeat()
        }
      } catch (error) {
        console.error('Error creating WebSocket:', error)
        clearTimeout(connectionTimeout)
        reject(error)
      }
    })
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private async _reconnect(onConnected?: () => void): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    console.log(`⏳ Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    
    try {
      await this.connect(onConnected)
      this.reconnectAttempts = 0 // Reset on successful connection
    } catch (error) {
      console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error)
      await this._reconnect(onConnected)
    }
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
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN && this.stompConnected
  }

  /**
   * Start health check to monitor subscription health (Flutter pattern)
   * Checks if data is being received on each queue
   * NOTE: Disabled for now - causes false positives when market is closed or no price updates
   */
  private _startHealthCheck(): void {
    if (this.isHealthCheckRunning) {
      return // Already running
    }

    this.isHealthCheckRunning = true
    // Health check is disabled - socket handles reconnection via heartbeat mechanism
    // Uncomment below to enable health checks (useful for debugging connection issues)
    /*
    console.log('🏥 Starting health check for subscriptions')

    this.healthCheckInterval = setInterval(() => {
      try {
        const now = Date.now()
        
        // Check each subscribed queue (exclude instruments queue like Flutter does)
        this.lastReceivedTimePerQueue.forEach((lastReceivedTime, queue) => {
          // Skip health check for instruments queue - it has sporadic data
          if (queue.includes('/queue/instruments/')) {
            return
          }
          
          const elapsed = now - lastReceivedTime
          
          if (elapsed > this.healthCheckThreshold) {
            console.warn(`⚠️  No data received from ${queue} for ${elapsed}ms (threshold: ${this.healthCheckThreshold}ms)`)
            // Mark as disconnected to trigger reconnection
            if (this.stompConnected) {
              console.log('🔄 Marking connection as stale - will attempt reconnect')
              this.stompConnected = false
            }
          }
        })
      } catch (error) {
        console.error('Error in health check:', error)
      }
    }, this.healthCheckThreshold)
    */
  }

  /**
   * Stop health check
   */
  private _stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
    this.isHealthCheckRunning = false
    console.log('🏥 Health check stopped')
  }

  /**
   * Update last received time for a queue (called when data is received)
   */
  private _updateLastReceivedTime(queue: string): void {
    this.lastReceivedTimePerQueue.set(queue, Date.now())
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    // Stop health check and heartbeat
    this._stopHealthCheck()
    this._stopHeartbeat()
    
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  /**
   * Send raw STOMP frame (public method for external services)
   * Used by orderUpdateService to send SUBSCRIBE/UNSUBSCRIBE frames
   */
  sendStompFrame(frame: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('⚠️  Cannot send STOMP frame - WebSocket not open')
      return false
    }

    try {
      this.socket.send(frame)
      return true
    } catch (error) {
      console.error('❌ Error sending STOMP frame:', error)
      return false
    }
  }

  /**
   * Send STOMP CONNECT frame with heartbeat
   */
  private _sendStompConnect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Enable heartbeat: server sends every 30s, client expects every 30s
      const frame = 'CONNECT\naccept-version:1.0,1.1,1.2\nheart-beat:30000,30000\n\n\0'
      this.socket.send(frame)
      
      // Start client-side heartbeat to keep connection alive
      this._startHeartbeat()
    }
  }

  /**
   * Start heartbeat mechanism to keep connection alive
   */
  private _startHeartbeat(): void {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    // Send ping every 25 seconds (before server's 30s timeout)
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Send STOMP heartbeat (empty line)
        this.socket.send('\n')
        this.lastPingTime = Date.now()
      }
    }, 25000) // 25 seconds
  }

  /**
   * Stop heartbeat mechanism
   */
  private _stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Send STOMP SUBSCRIBE frame to watchlist queue
   */
  private _sendStompSubscribeToWatchlist(userId: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
      const frame = `SUBSCRIBE\nid:sub-queue-watchlist\ndestination:/queue/watchlist/${userId}\nack:auto\n\n\0`
      this.socket.send(frame)
    }
  }

  /**
   * Send STOMP SUBSCRIBE frame
   * NOTE: Disabled - using watchlist request instead
   */
  private _sendStompSubscribe(): void {
    // Intentionally disabled - watchlist request is used instead
  }

  /**
   * Subscribe to watchlist queue with userId
   * Follows Flutter pattern: unsubscribe first to prevent duplicates, then resubscribe
   */
  subscribeToWatchlist(userId: string): void {
    const subscriptionKey = `watchlist-${userId}`
    
    // Step 1: Always unsubscribe first (prevent duplicates - Flutter pattern)
    if (this.subscribedUsers.has(subscriptionKey)) {
      console.log(`🔄 Clearing previous watchlist subscription for user: ${userId}`)
      this._unsubscribeFromWatchlistInternal(userId)
    }

    // Step 2: Now subscribe
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
      console.log(`🔌 Subscribing to watchlist for user: ${userId}`)
      this.subscribedUsers.add(subscriptionKey)
      this.lastReceivedTimePerQueue.set(`/queue/watchlist/${userId}`, Date.now())
      this._sendStompSubscribeToWatchlist(userId)
    } else {
      console.warn(`⚠️  Cannot subscribe to watchlist - WebSocket not connected. isConnected: ${this.isConnected()}, stompConnected: ${this.stompConnected}`)
    }
  }

  /**
   * Internal unsubscribe from watchlist - called by public method
   */
  private _unsubscribeFromWatchlistInternal(userId: string): void {
    const wasSubscribed = this.subscribedUsers.has(`watchlist-${userId}`)
    
    if (wasSubscribed) {
      console.log(`🔌 Unsubscribing from watchlist for user: ${userId}`)
      // Try to send UNSUBSCRIBE frame if socket is open
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        const frame = `UNSUBSCRIBE\nid:sub-queue-watchlist\n\n\0`
        try {
          this.socket.send(frame)
          console.log(`✅ UNSUBSCRIBE frame sent for watchlist/${userId}`)
        } catch (error) {
          console.warn(`⚠️  Failed to send UNSUBSCRIBE frame for watchlist:`, error)
        }
      } else {
        console.warn(`⚠️  Socket not open, cannot send UNSUBSCRIBE for watchlist/${userId}`)
      }
    }
    
    // Always clear tracking regardless of whether frame was sent
    this.subscribedUsers.delete(`watchlist-${userId}`)
    this.lastReceivedTimePerQueue.delete(`/queue/watchlist/${userId}`)
    console.log(`✅ Cleared watchlist subscription tracking for user: ${userId}`)
  }

  /**
   * Unsubscribe from watchlist queue with userId
   */
  unsubscribeFromWatchlist(userId: string): void {
    this._unsubscribeFromWatchlistInternal(userId)
  }

  /**
   * Unsubscribe from instruments queue with userId
   */
  unsubscribeFromInstruments(userId: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
      console.log(`🔌 Unsubscribing from instruments for user: ${userId}`)
      const frame = `UNSUBSCRIBE\nid:sub-queue-instruments\n\n\0`
      this.socket.send(frame)
      this.subscribedUsers.delete(`instruments-${userId}`)
    }
  }

  /**
   * Subscribe to specific instrument tokens
   * NOTE: Disabled - using watchlist request instead
   */
  subscribeToTokens(tokens: number[]): void {
    // Intentionally disabled - watchlist request is used instead
  }

  /**
   * Unsubscribe from specific instrument tokens
   */
  unsubscribeFromTokens(tokens: number[]): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
      const payload = JSON.stringify({ tokens })
      const frame = `SEND\ndestination:/app/unsubscribe\ncontent-type:application/json\ncontent-length:${payload.length}\n\n${payload}\0`
      this.socket.send(frame)
    }
  }

  /**
   * Send watchlist data request with userId
   */
  sendWatchlistRequest(userId: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
      const payload = JSON.stringify({ userId })
      const frame = `SEND\ndestination:/app/subscribe\ncontent-type:application/json\ncontent-length:${payload.length}\n\n${payload}\0`
      this.socket.send(frame)
    } else {
      console.error('❌ Cannot send watchlist request - WebSocket not connected or STOMP not ready')
    }
  }

  /**
   * Subscribe to instruments queue with userId
   * Follows Flutter pattern: unsubscribe first to prevent duplicates, then resubscribe
   */
 subscribeToInstruments(userId: string): void {
    const subscriptionKey = `instruments-${userId}`
    
    // Explicitly send the SUBSCRIBE frame to ensure the server sees it, 
    // even if we think we are already subscribed.
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
      console.log(`🔌 Refreshing subscription for positions/instruments: ${userId}`)
      
      // We don't use a check here, we just fire the frame to be safe.
      this.subscribedUsers.add(subscriptionKey)
      this.lastReceivedTimePerQueue.set(`/queue/instruments/${userId}`, Date.now())
      
      // Create the frame for positions (adjust destination if needed)
      const frame = `SUBSCRIBE\nid:sub-queue-instruments\ndestination:/queue/instruments/${userId}\nack:auto\n\n\0`
      this.socket.send(frame)
      
      // If your positions are on a different queue, send that too:
      const posFrame = `SUBSCRIBE\nid:sub-orders-${userId}\ndestination:/queue/positions/${userId}\nack:auto\n\n\0`
      this.socket.send(posFrame)
      
    } else {
      console.warn(`⚠️ Socket not ready for subscription.`)
    }
  }

  /**
   * Internal unsubscribe from instruments - called by public method
   */
  private _unsubscribeFromInstrumentsInternal(userId: string): void {
    const wasSubscribed = this.subscribedUsers.has(`instruments-${userId}`)
    
    if (wasSubscribed) {
      console.log(`🔌 Unsubscribing from instruments for user: ${userId}`)
      // Try to send UNSUBSCRIBE frame if socket is open
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        const frame = `UNSUBSCRIBE\nid:sub-queue-instruments\n\n\0`
        try {
          this.socket.send(frame)
          console.log(`✅ UNSUBSCRIBE frame sent for instruments/${userId}`)
        } catch (error) {
          console.warn(`⚠️  Failed to send UNSUBSCRIBE frame for instruments:`, error)
        }
      } else {
        console.warn(`⚠️  Socket not open, cannot send UNSUBSCRIBE for instruments/${userId}`)
      }
    }
    
    // Always clear tracking regardless of whether frame was sent
    this.subscribedUsers.delete(`instruments-${userId}`)
    this.lastReceivedTimePerQueue.delete(`/queue/instruments/${userId}`)
    console.log(`✅ Cleared instruments subscription tracking for user: ${userId}`)
  }

  /**
   * Send instruments polling request with userId and instrumentTokens
   */
  sendInstrumentsRequest(userId: string, instrumentTokens: string[]): void {
    console.log('📤 sendInstrumentsRequest called with:', { userId, tokenCount: instrumentTokens.length, tokens: instrumentTokens })
    console.log('🔍 Socket state:', this.socket?.readyState, 'STOMP connected:', this.stompConnected)
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
      const payload = JSON.stringify({ userId, instrumentTokens })
      const frame = `SEND\ndestination:/app/subscribe\ncontent-type:application/json\ncontent-length:${payload.length}\n\n${payload}\0`
      console.log('✅ Sending instruments request frame')
      this.socket.send(frame)
    } else {
      console.error('❌ Cannot send instruments request - WebSocket not connected or STOMP not ready')
      console.error('   Socket exists:', !!this.socket)
      console.error('   Socket readyState:', this.socket?.readyState, '(1 = OPEN)')
      console.error('   STOMP connected:', this.stompConnected)
    }
  }


   /**
   * Send instruments polling request with userId and instrumentTokens
   */
  sendInstrumentsRequestduplicate(userId: string, instrumentTokens: string[]): void {
    console.log('📤 sendInstrumentsRequest called with:', { userId, tokenCount: instrumentTokens.length, tokens: instrumentTokens })
    console.log('🔍 Socket state:', this.socket?.readyState, 'STOMP connected:', this.stompConnected)
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
      const payload = JSON.stringify({ userId, instrumentTokens })
      const frame = `SEND\ndestination:/app/instruments\ncontent-type:application/json\ncontent-length:${payload.length}\n\n${payload}\0`
      console.log('✅ Sending instruments request frame')
      this.socket.send(frame)
    } else {
      console.error('❌ Cannot send instruments request - WebSocket not connected or STOMP not ready')
      console.error('   Socket exists:', !!this.socket)
      console.error('   Socket readyState:', this.socket?.readyState, '(1 = OPEN)')
      console.error('   STOMP connected:', this.stompConnected)
    }
  }

  /**
   * Send STOMP DISCONNECT frame
   */
  private _sendStompDisconnect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const frame = 'DISCONNECT\n\n\0'
      this.socket.send(frame)
    }
  }

  /**
   * Process incoming STOMP frames from message buffer
   */
  private _processStompFrames(): void {
    // STOMP frames are separated by null character (\0)
    const frames = this.messageBuffer.split('\0')
    
    // Keep the last incomplete frame in the buffer
    this.messageBuffer = frames[frames.length - 1]
    
    // Process all complete frames
    for (let i = 0; i < frames.length - 1; i++) {
      const frame = frames[i].trim()
      if (frame) {
        this._handleStompFrame(frame)
      }
    }
  }

  /**
   * Handle a complete STOMP frame
   */
  private _handleStompFrame(frameStr: string): void {
    try {
      const lines = frameStr.split('\n')
      const command = lines[0].trim()
      console.log(`📍 Processing STOMP frame: ${command}`)
      
      const headers: Record<string, string> = {}
      let bodyStartIndex = 0

      // Parse headers
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) {
          bodyStartIndex = i + 1
          break
        }
        const [key, value] = line.split(':')
        if (key && value) {
          headers[key.trim()] = value.trim()
        }
      }

      // Extract body
      const body = lines.slice(bodyStartIndex).join('\n').trim()

      switch (command) {
        case 'CONNECTED':
          console.log('✅ STOMP CONNECTED frame received!')
          this.stompConnected = true
          this.isConnecting = false;
          // Start health check on connection (Flutter pattern)
          this._startHealthCheck()
          // Subscribe to feed after STOMP connection established
          this._sendStompSubscribe()
          // Call the onConnected callback
          if (this.onConnectedCallback) {
            console.log('🔔 Calling onConnected callback')
            this.onConnectedCallback()
            this.onConnectedCallback = null
          }
          // Resolve the connect promise
          if (this.connectPromiseResolve) {
            console.log('✅ Resolving connect promise')
            this.connectPromiseResolve()
            this.connectPromiseResolve = null
          }
          break

        case 'MESSAGE':
          console.log('📨 MESSAGE frame received from server')
          console.log('📍 Destination:', headers['destination'])
          console.log('📦 Body preview:', body.substring(0, 200))
          
          // Update last received time for health check (Flutter pattern)
          const destination = headers['destination'] || 'unknown'
          this._updateLastReceivedTime(destination)
          
          // Check if this is an order update message
          if (destination.startsWith('/queue/positions/')) {
            console.log('🎯 Detected order update message, routing to orderUpdateService')
            // Route to order update service
            try {
              orderUpdateService.handleOrderMessage(body)
            } catch (error) {
              console.error('Error handling order message:', error)
            }
            // Don't process order messages through feed callbacks
            break
          }
          
          // Parse message body as JSON for market data
          try {
            const data = JSON.parse(body)
            // Notify all feed callbacks
            this.feedCallbacks.forEach(callback => {
              try {
                callback(data)
              } catch (error) {
                console.error('Error in feed callback:', error)
              }
            })
          } catch (parseError) {
            // If not JSON, send raw body
            this.feedCallbacks.forEach(callback => {
              try {
                callback({ raw: body })
              } catch (error) {
                console.error('Error in feed callback:', error)
              }
            })
          }
          break

        case 'RECEIPT':
          break

        case 'ERROR':
          console.error('❌ STOMP Error:', body)
          break

        default:
          // Unhandled STOMP frame type
      }
    } catch (error) {
      console.error('Error handling STOMP frame:', error, frameStr)
    }
  }


}

export const marketWatchService = new MarketWatchService()
export default marketWatchService
