/**
 * Market Watch Service
 * Handles WebSocket connections and market data streaming via STOMP protocol
 */

class MarketWatchService {
  private socket: WebSocket | null = null
  private feedCallbacks: Set<(data: any) => void> = new Set()
  private stompConnected = false
  private messageBuffer = ''
  private onConnectedCallback: (() => void) | null = null
  private connectPromiseResolve: (() => void) | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private lastPingTime = 0

  /**
   * Connect to WebSocket for market data
   */
  connect(onConnected?: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
        if (onConnected) onConnected()
        resolve()
        return
      }

      // Store callbacks to call after STOMP connection
      this.onConnectedCallback = onConnected || null
      this.connectPromiseResolve = resolve

      const wsUrl = 'wss://quotes.rivoplus.live/ws/market'

      try {
        this.socket = new WebSocket(wsUrl)

        this.socket.onopen = () => {
          // Send STOMP CONNECT frame
          this._sendStompConnect()
        }

        this.socket.onmessage = (event: MessageEvent) => {
          try {
            // Accumulate message data (STOMP frames may come in chunks)
            this.messageBuffer += event.data
            
            // Process complete STOMP frames
            this._processStompFrames()
          } catch (error) {
            console.error('Error processing message:', error, event.data)
          }
        }

        this.socket.onerror = (error: Event) => {
          console.error('❌ WebSocket error:', error)
          reject(new Error('WebSocket connection failed'))
        }

        this.socket.onclose = () => {
          this.stompConnected = false
          this._stopHeartbeat()
        }
      } catch (error) {
        console.error('Error creating WebSocket:', error)
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
    // Stop heartbeat
    this._stopHeartbeat()
    
    if (this.socket) {
      this.socket.close()
      this.socket = null
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
   */
  subscribeToWatchlist(userId: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
      this._sendStompSubscribeToWatchlist(userId)
    } else {
      console.error('❌ Cannot subscribe to watchlist - WebSocket not connected or STOMP not ready')
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
   */
  subscribeToInstruments(userId: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
      const frame = `SUBSCRIBE\nid:sub-queue-instruments\ndestination:/queue/instruments/${userId}\nack:auto\n\n\0`
      this.socket.send(frame)
    } else {
      console.error('❌ Cannot subscribe to instruments - WebSocket not connected or STOMP not ready')
    }
  }

  /**
   * Send instruments polling request with userId and instrumentTokens
   */
  sendInstrumentsRequest(userId: string, instrumentTokens: string[]): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.stompConnected) {
      const payload = JSON.stringify({ userId, instrumentTokens })
      const frame = `SEND\ndestination:/app/instruments\ncontent-type:application/json\ncontent-length:${payload.length}\n\n${payload}\0`
      this.socket.send(frame)
    } else {
      console.error('❌ Cannot send instruments request - WebSocket not connected or STOMP not ready')
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
          this.stompConnected = true
          // Subscribe to feed after STOMP connection established
          this._sendStompSubscribe()
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
          break

        case 'MESSAGE':
          // Parse message body as JSON
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
