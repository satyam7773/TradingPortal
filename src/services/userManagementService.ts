import { apiClient, TokenManager } from './apiClient'
import { UserConfigResponse, ExchangeData } from './api.types'

/**
 * User Management Service
 * All user management related API calls
 */
class UserManagementService {
  private readonly baseUrl = '/user'

  /**
   * Fetch user configuration for creating a new user
   */
  async fetchUserConfig(userId: number): Promise<UserConfigResponse> {
    const request = {
      requestTimestamp: '',
      userId,
      data: ''
    }

    const response = await apiClient.post<{ data: UserConfigResponse }>(
      `${this.baseUrl}/fetchUserConfig`,
      request
    )
    
    return response.data
  }

  /**
   * Fetch allowed exchanges for a user
   */
  async getExchanges(userId: number): Promise<ExchangeData[]> {
    const request = {
      userId,
      requestTimestamp: '',
      data: ''
    }

    const response = await apiClient.post<{ data: ExchangeData[] }>(
      `${this.baseUrl}/portal/exchanges`,
      request
    )
    
    return response.data
  }

  /**
   * Create a new user
   */
  async createUser(userData: {
    userType: number
    name: string
    username: string
    password: string
    confirmPassword: string
    credits: number
    remarks: string
    pnlSharing: number
    brokeragePercentage: number
    highLowTradeLimit: string
    addMaster: boolean
    changePasswordFirstLogin: boolean
    marginSquareOff: boolean
    allowedExchanges: Array<{
      name: string
      turnover: boolean
      lot: boolean
      groupId: any
    }>
  }, parentUserId?: number | null): Promise<any> {
    // Use parentUserId if provided, otherwise get userId from localStorage
    let userId: number
    
    if (parentUserId) {
      userId = parentUserId
    } else {
      const userDataStr = localStorage.getItem('userData')
      const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
      userId = storedUserData?.userId || 2
    }

    const request = {
      requestTimestamp: Date.now().toString(),
      userId,
      data: userData
    }

    console.log('🔧 Creating User:', {
      endpoint: `https://api-staging.rivoplus.live/user/createUser`,
      payload: request
    })

    // const response = await apiClient.post<any>(
    //   `${this.baseUrl}/createUser`,
    //   request
    // )

    const response = await apiClient.post<any>(
      `https://api-staging.rivoplus.live/user/createUser`,
      request
    )

    return response
  }

  /**
   * Update user
   */
  async updateUser(userId: number, userData: any): Promise<any> {
    const request = {
      userId,
      data: userData
    }

    const response = await apiClient.put<{ data: any }>(
      `${this.baseUrl}/updateUser`,
      request
    )

    return response.data
  }

  /**
   * Edit user details (using editUserDetails endpoint)
   */
  async editUserDetails(parentUserId: number, targetUserId: number, userData: any): Promise<any> {
    const request = {
      userId: parentUserId,
      requestTimestamp: '',
      data: {
        userId: targetUserId,
        ...userData
      }
    }

    console.log('🔧 Editing User Details:', {
      endpoint: `https://api-staging.rivoplus.live/user/portal/editUserDetails`,
      payload: request
    })

    const response = await apiClient.post<any>(
      `https://api-staging.rivoplus.live/user/portal/editUserDetails`,
      request
    )

    return response
  }

  /**
   * Delete user
   */
  async deleteUser(userId: number): Promise<any> {
    const response = await apiClient.delete<{ data: any }>(
      `${this.baseUrl}/deleteUser/${userId}`
    )

    return response.data
  }

  /**
   * Get user list
   */
  async getUserList(userFilterType: 'OWN' | 'ALL' = 'OWN'): Promise<any> {
    // Get userId from localStorage
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = storedUserData?.userId || 2

    const request = {
      requestTimestamp: Date.now().toString(),
      userId
    }

    const response = await apiClient.post<any>(
      `https://api-staging.rivoplus.live/user/portal/fetchUserList?userFilterType=${userFilterType}`,
      request
    )

    return response
  }

  /**
   * Fetch detailed user information
   */
  async fetchUserDetails(searchUserId: number): Promise<any> {
    // Get userId from localStorage
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = storedUserData?.userId || 2

    const request = {
      requestTimestamp: Date.now().toString(),
      userId,
      data: {
        searchUserId
      }
    }

    console.log('🔍 Fetching User Details:', {
      endpoint: 'user/portal/fetchUserDetails',
      payload: request
    })

    const response = await apiClient.post<any>(
      'user/portal/fetchUserDetails',
      request
    )

    return response
  }

  /**
   * Manage credits for a user (add or deduct)
   * payload.data must include: amount, userId (target), comments, type ('CREDIT'|'DEBIT')
   */
  async manageCredits(payload: { amount: number; userId: number; comments?: string; type: 'CREDIT' | 'DEBIT' }, operatorUserId?: number): Promise<any> {
    // operatorUserId - the user making the request (from localStorage if not provided)
    let userId: number
    if (operatorUserId) {
      userId = operatorUserId
    } else {
      const userDataStr = localStorage.getItem('userData')
      const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
      userId = storedUserData?.userId || 0
    }

    const request = {
      // Use epoch milliseconds as string to match required format
      requestTimestamp: Date.now().toString(),
      userId,
      data: payload
    }

    console.log('🔧 Manage Credits Request:', {
      endpoint: `${this.baseUrl}/manageCredits`,
      payload: request
    })

    const response = await apiClient.post<any>(
      `${this.baseUrl}/manageCredits`,
      request
    )

    return response
  }

  /**
   * Fetch sharing details for a user (PNL and Brokerage hierarchy)
   */
  async fetchSharingDetails(searchUserId?: number): Promise<any> {
    // Get userId from localStorage
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = storedUserData?.userId || 2

    const request: any = {
      requestTimestamp: Date.now().toString(),
      userId
    }

    // Add searchUserId to data if provided
    if (searchUserId) {
      request.data = {
        searchUserId
      }
    }

    console.log('🔍 Fetching Sharing Details:', {
      endpoint: '/user/settings/sharingDetails',
      payload: request
    })

    const response = await apiClient.post<any>(
      '/user/settings/sharingDetails',
      request
    )

    return response
  }

  /**
   * Fetch trade margin settings for a user and exchange
   */
  async fetchTradeMarginSettings(userId: number, exchange: string): Promise<any> {
    const response = await apiClient.get<any>(
      '/user/portal/tradeMarginSettings',
      {
        params: {
          userId,
          exchange
        }
      }
    )

    console.log('📊 Fetching Trade Margin Settings:', {
      endpoint: '/user/portal/tradeMarginSettings',
      params: { userId, exchange },
      response
    })

    return response
  }

  /**
   * Update trade margin settings for a user
   */
  async updateTradeMarginSettings(payload: any): Promise<any> {
    const response = await apiClient.post<any>(
      '/user/portal/updateTradeMargin',
      payload
    )

    console.log('📤 Updating Trade Margin Settings:', {
      endpoint: '/user/portal/updateTradeMargin',
      payload,
      response
    })

    return response
  }

  /**
   * Fetch brokerage settings for a user and exchange
   */
  async fetchBrokerageSettings(userId: number, exchange: string): Promise<any> {
    const response = await apiClient.get<any>(
      '/user/portal/brokerageSettings',
      {
        params: {
          userId,
          exchange
        }
      }
    )

    console.log('💰 Fetching Brokerage Settings:', {
      endpoint: '/user/settings/brokerageSettings',
      params: { userId, exchange },
      response
    })

    return response
  }

  /**
   * Check if username is valid and available
   */
  async checkUsername(username: string): Promise<any> {
    // Get userId from localStorage
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = storedUserData?.userId || 2

    const request = {
      requestTimestamp: Date.now().toString(),
      userId,
      data: {
        username
      }
    }


    console.log('🔍 Checking Username:', {
      endpoint: `${this.baseUrl}/checkUsername`,
      payload: request
    })

    const response = await apiClient.post<any>(
      `${this.baseUrl}/checkUsername`,
      request
    )

    return response
  }

  /**
   * Toggle user settings (status, closeOnly, bet, freshStopLoss, marginSquareOff)
   */
  async toggleUserSettings(payload: {
    userId: number
    requestTimestamp: string
    data: {
      userId: number
      type: string
      value: boolean
    }
  }): Promise<any> {
    console.log('🔄 Toggling User Settings:', {
      endpoint: `${this.baseUrl}/settings/toggleSettings`,
      payload
    })

    const response = await apiClient.post<any>(
      `${this.baseUrl}/settings/toggleSettings`,
      payload
    )

    return response
  }

  /**
   * Fetch account limit for a user
   */
  async fetchAccountLimit(searchUserId?: number): Promise<any> {
    // Get userId from localStorage
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = storedUserData?.userId || 2

    const request: any = {
      requestTimestamp: Date.now().toString(),
      userId
    }

    // Add searchUserId to data if provided
    if (searchUserId) {
      request.data = {
        searchUserId: Number(searchUserId)
      }
    }

    console.log('📊 Fetching Account Limit:', {
      endpoint: '/user/settings/fetchAccountLimit',
      payload: request
    })

    const response = await apiClient.post<any>(
      '/user/settings/fetchAccountLimit',
      request
    )

    return response
  }

  /**
   * Update account limit for a user
   */
  async updateAccountLimit(payload: {
    userId: number;
    accountLimit: boolean;
    masterAccountLimit: number;
    clientAccountLimit: number;
  }): Promise<any> {
    // Get userId from localStorage
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const loggedInUserId = storedUserData?.userId || 2

    const request = {
      requestTimestamp: Date.now().toString(),
      userId: loggedInUserId,
      data: {
        userId: payload.userId,
        accountLimit: payload.accountLimit,
        masterAccountLimit: payload.masterAccountLimit,
        clientAccountLimit: payload.clientAccountLimit
      }
    }

    console.log('📤 Updating Account Limit:', {
      endpoint: '/user/settings/updateAccountLimit',
      payload: request
    })

    const response = await apiClient.post<any>(
      '/user/settings/updateAccountLimit',
      request
    )

    return response
  }

  /**
   * Fetch exchanges
   */
  async fetchExchanges(userId?: number | string): Promise<Array<{name: string; turnover: boolean; lot: boolean; groupId: number; intraDaySquareOff?: boolean}>> {
    // Use provided userId, convert to number if string, otherwise get from localStorage
    let requestUserId: number
    
    if (userId) {
      requestUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId
    } else {
      const userDataStr = localStorage.getItem('userData')
      const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
      requestUserId = storedUserData?.userId || 2
    }

    const request = {
      userId: requestUserId,
      requestTimestamp: '',
      data: ''
    }

    const response = await apiClient.post<{ 
      responseCode: string; 
      responseMessage: string; 
      data: Array<{name: string; turnover: boolean; lot: boolean; groupId: number}> 
    }>(
      `${this.baseUrl}/portal/exchanges/v2`,
      request
    )

    return response.data
  }

  /**
   * Update IntraDay SquareOff settings for user exchanges
   */
  async updateIntraDaySquareOff(userId: number | string, exchangeData: any[]): Promise<any> {
    const requestUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;

    const request = {
      userId: requestUserId,
      requestTimestamp: '',
      data: exchangeData
    }

    const response = await apiClient.post<{
      responseCode: string;
      responseMessage: string;
      data: any;
    }>(
      `${this.baseUrl}/settings/updateIntraDaySquareOff`,
      request
    )

    return response.data
  }

  /**
   * Fetch clients list
   */
  async fetchClients(): Promise<Array<{userId: number; name: string; username: string; parentId: number; roleId: number}>> {
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = storedUserData?.userId || 2

    const response = await apiClient.get<{ 
      responseCode: string; 
      responseMessage: string; 
      data: Array<{userId: number; name: string; username: string; parentId: number; roleId: number}> 
    }>(
      `${this.baseUrl}/portal/fetchClients?userId=${userId}`
    )

    return response.data
  }

  /**
   * Fetch allowed brokerage exchanges for a user based on datatype
   */
  async fetchBrokerageExchanges(userId: number, datatype: string): Promise<{
    responseCode: string;
    responseMessage: string;
    data: string[];
  }> {
    const response = await apiClient.get<{
      responseCode: string;
      responseMessage: string;
      data: string[];
    }>(
      `${this.baseUrl}/fetchBrokerageExchanges?userId=${userId}&datatype=${datatype}`
    ) as any

    return response.data
  }

  /**
   * Update brokerage settings for a user
   */
  async updateBrokerageSettings(payload: {
    userId: number;
    requestTimestamp: string;
    data: {
      userId: number;
      brokerages: Array<{
        instrumentId: number;
        brokeragePerLot: boolean;
        scripName: string;
        brokerage: number;
      }>;
    };
  }, isForAllUser: boolean = false): Promise<any> {
    console.log('💾 Updating Brokerage Settings:', {
      endpoint: '/user/settings/updateBrokerage',
      isForAllUser,
      payload
    })

    const response = await apiClient.post<any>(
      '/user/settings/updateBrokerage',
      payload,
      {
        params: isForAllUser ? { isForAllUser: true } : {}
      }
    )

    return response
  }

  /**
   * Fetch user positions
   */
  async getUserPositions(userId: number): Promise<any> {
    const request = {
      requestTimestamp: Date.now().toString(),
      userId
    }

    try {
      const response = await apiClient.post<any>(
        'https://api-staging.rivoplus.live/oms/positions',
        request
      )
      console.log('🔍 Service Response from API:', response);
      console.log('🔍 Service Response Keys:', Object.keys(response || {}));

      // Return the full response object (contains responseCode, responseMessage, data)
      return response as any
    } catch (error) {
      console.error('🔍 Service Error:', error);
      throw error;
    }
  }

  /**
   * Fetch user clients for trading
   */
  async fetchUserClientsForTrade(): Promise<any> {
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = storedUserData?.userId || 2

    const request = {
      requestTimestamp: Date.now().toString(),
      userId
    }

    try {
      const response = await apiClient.post<any>(
        'https://api-staging.rivoplus.live/user/portal/fetchUserClientsTrade',
        request
      )
      return response
    } catch (error) {
      console.error('❌ Failed to fetch user clients:', error)
      throw error
    }
  }

  /**
   * Fetch symbols for trading
   */
  async fetchSymbols(exchange?: string): Promise<any> {
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = storedUserData?.userId || 2

    const request: any = {
      requestTimestamp: Date.now().toString(),
      userId
    }

    // Add exchange to data if provided
    if (exchange) {
      request.data = {
        exchange
      }
    }

    try {
      const response = await apiClient.post<any>(
        'https://api-staging.rivoplus.live/oms/fetchSymbols',
        request
      )
      return response
    } catch (error) {
      console.error('❌ Failed to fetch symbols:', error)
      throw error
    }
  }


  /**
   * Fetch Trade Symbols for Reports (Orders & Rejection Logs)
   * GET /oms/tradeSymbols?userFIlterType={type}&exchange={exchange}
   */
  async fetchTradeSymbolsReport(userFilterType: 'ALL' | 'SINGLE' = 'ALL', exchange?: string): Promise<any> {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('userFIlterType', userFilterType);
      
      if (userFilterType === 'SINGLE' && exchange) {
        params.append('exchange', exchange);
      }

      const endpoint = `https://api-staging.rivoplus.live/oms/tradeSymbols?${params.toString()}`;
      
      console.log('🔄 Fetching Report Symbols:', endpoint);
      
      // Using apiClient.get
      const response = await apiClient.get<any>(endpoint);
      return response;
    } catch (error: any) {
      console.error('❌ Failed to fetch report symbols:', error);
      throw error;
    }
  }
  /**
   * Fetch user positions for specific exchange, token and user IDs
   */
  async fetchUserPositionsForExchange(exchange: string, token: number, userIds: number[]): Promise<any> {
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = storedUserData?.userId || 2

    const data: any = {
      userIds
    }

    // Only add exchange if not empty (not "All Exchanges")
    if (exchange) {
      data.exchange = exchange
    }

    // Only add token if not 0 (not "All Symbols")
    if (token !== 0) {
      data.token = token
    }

    const request = {
      requestTimestamp: Date.now().toString(),
      userId,
      data
    }

    try {
      const response = await apiClient.post<any>(
        'https://api-staging.rivoplus.live/oms/positions/portal',
        request
      )
      return response
    } catch (error) {
      console.error('❌ Failed to fetch positions:', error)
      throw error
    }
  }

  /**
   * Fetch trades for a user
   * POST /oms/trades
   * @param userId - User ID to fetch trades for
   * @param page - Page number (starting from 0)
   * @param type - Trade type (e.g., 'PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED')
   */
  async fetchTrades(userId: number, params: {
    from?: string;
    to?: string;
    exchange?: string;
    page?: number;
    tradeSymbol?: string;
  } = {}): Promise<any> {
    const request = {
      userId,
      data: {
        from: params.from || new Date().toISOString().split('T')[0],
        to: params.to || new Date().toISOString().split('T')[0],
        exchange: params.exchange || '',
        page: params.page || 0,
        tradeSymbol: params.tradeSymbol || ''
      }
    }

    try {
      const response = await apiClient.post<any>(
        'https://api-staging.rivoplus.live/oms/portal/trades',
        request
      )
      return response
    } catch (error) {
      console.error('❌ Failed to fetch trades:', error)
      throw error
    }
  }

  /**
   * Fetch own users (for user dropdown)
   */
  async fetchOwnUsers(userId: number): Promise<any> {
    const request = {
      userId
    }

    try {
      const response = await apiClient.post<any>(
        'https://api-staging.rivoplus.live/user/portal/fetchOwnUsers',
        request
      )
      return response
    } catch (error) {
      console.error('❌ Failed to fetch own users:', error)
      throw error
    }
  }

  /**
   * Fetch orders with filters
   */
  async fetchOrders(userId: number, filters: {
    limit?: number
    offset?: number
    fromDate?: string
    toDate?: string
    tradeSymbol?: string
    exchange?: string
    userId?: number
  }): Promise<any> {
    const request = {
      userId,
      data: {
        limit: filters.limit || 10,
        offset: filters.offset || 0,
        fromDate: filters.fromDate || '',
        toDate: filters.toDate || '',
        tradeSymbol: filters.tradeSymbol || '',
        exchange: filters.exchange || '',
        userId: filters.userId !== undefined ? filters.userId : 0
      }
    }

    try {
      const response = await apiClient.post<any>(
        'https://api-staging.rivoplus.live/oms/orders',
        request
      )
      return response
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error)
      throw error
    }
  }

  /**
   * Update market trade rights for a user
   */
  async updateMarketTradeRights(payload: {
    userId: number;
    requestTimestamp: number;
    data: {
      isTradeLock: boolean;
    };
  }): Promise<any> {
    try {
      const response = await apiClient.post<any>(
        'https://api-staging.rivoplus.live/user/market/trade/right',
        payload
      )
      return response
    } catch (error) {
      console.error('❌ Failed to update market trade rights:', error)
      throw error
    }
  }

  /**
   * Cancel multiple orders at once
   */
  async cancelMultipleOrders(userId: number, orderIds: number[]): Promise<any> {
    const request = {
      requestTimestamp: Date.now().toString(),
      userId,
      deviceId: '',
      tradeOrderMethod: 'WEB',
      data: {
        userId,
        orderIds
      }
    }

    try {
      const response = await apiClient.post<any>(
        'https://api-staging.rivoplus.live/oms/cancelMultipleOrders',
        request
      )
      return response
    } catch (error) {
      console.error('❌ Failed to cancel multiple orders:', error)
      throw error
    }
  }

  /**
   * Fetch Profit & Loss data for user (POST)
   * URL: /oms/pnl
   */
  async fetchProfitAndLoss(userId: number): Promise<any> {
    const request = {
      userId: userId,
      requestTimestamp: new Date().toISOString(),
      data: "" // Keeping consistent with sample curl
    }

    try {
      console.log('📊 Fetching P&L data (POST):', request)
      const response = await apiClient.post<any>(
        'https://api-staging.rivoplus.live/oms/pnl',
        request
      )
      console.log('✅ P&L data received:', response)
      return response
    } catch (error: any) {
      console.error('❌ Failed to fetch P&L data:', error)
      throw error
    }
  }

 /**
 * Fetch M2M Sharing data (GET API)
 * Path: /m2m/user/{userId}?userFilterType={type}
 */

async fetchM2MReport(userId: number | string, userFilterType: 'ALL' | 'SINGLE'): Promise<any> {
  try {
    // FIX: Changed 'userFIlterType' to 'userFilterType'
    const endpoint = `https://api-staging.rivoplus.live/oms/api/v1/m2m/user/${userId}?userFIlterType=${userFilterType}`;
    
    console.log('📡 Requesting M2M:', endpoint);
    
    const response = await apiClient.get<any>(endpoint);
    return response;
  } catch (error: any) {
    console.error('❌ M2M API Error:', error.response?.status, error.response?.data);
    throw error;
  }
}

/**
 * Fetch Rejection Order Logs
 * URL: /oms/rejected/orders/log
 */
async fetchRejectionLogs(payload: any): Promise<any> {
  try {
    const response = await apiClient.post<any>(
      'https://api-staging.rivoplus.live/oms/rejected/orders/log',
      { data: payload }
    );
    return response;
  } catch (error: any) {
    console.error('❌ Rejection Log Error:', error);
    throw error;
  }
}


async updateCarryForwardMargin(userId: number, exchanges: any[]): Promise<any> {
  const payload = {
    userId: userId,
    requestTimestamp: Date.now(),
     // Or keep as "" if required by backend
    data: exchanges
  };

  try {
    const response = await apiClient.post(
      'https://api-staging.rivoplus.live/user/settings/updateCfMargin',
      payload
    );
    return response;
  } catch (error) {
    console.error('❌ Failed to update CF Margin:', error);
    throw error;
  }
}

// services/userManagementService.ts

async fetchAutoSquareOff(userId: number): Promise<any> {
  return await apiClient.post('https://api-staging.rivoplus.live/user/portal/fetchAutoSquareOff', {
    userId,
    requestTimestamp: "",
    data: ""
  });
}

async updateAutoSquareOff(userId: number, percentage: number): Promise<any> {
  return await apiClient.post('https://api-staging.rivoplus.live/user/portal/updateAutoSquareOff', {
    userId,
    requestTimestamp: "",
    data: {
      autoSquareOffPercent: percentage
    }
  });
}


async fetchTradeDurationRank(userId: number): Promise<any> {
  try {
    const response = await apiClient.post('https://api-staging.rivoplus.live/oms/tradeDurationRank', {
      userId: userId,
      requestTimestamp: "",
      data: ""
    });
    return response.data; // Ensure you return data wrapper
  } catch (error) {
    console.error('❌ Failed to fetch Trade Duration Rank:', error);
    throw error;
  }
}

}

export const userManagementService = new UserManagementService()
export default userManagementService
