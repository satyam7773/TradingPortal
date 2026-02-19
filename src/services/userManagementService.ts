import { apiClient, TokenManager } from './apiClient'
import { UserConfigResponse } from './api.types'

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
      endpoint: `${this.baseUrl}/createUser`,
      payload: request
    })

    const response = await apiClient.post<any>(
      `${this.baseUrl}/createUser`,
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
      endpoint: `${this.baseUrl}/editUserDetails`,
      payload: request
    })

    const response = await apiClient.post<any>(
      `${this.baseUrl}/editUserDetails`,
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
  async getUserList(): Promise<any> {
    // Get userId from localStorage
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = storedUserData?.userId || 2

    const request = {
      requestTimestamp: Date.now().toString(),
      userId
    }

    const response = await apiClient.post<any>(
      'user/portal/fetchUserList',
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
  async fetchExchanges(): Promise<Array<{name: string; turnover: boolean; lot: boolean; groupId: number}>> {
    const userDataStr = localStorage.getItem('userData')
    const storedUserData = userDataStr ? JSON.parse(userDataStr) : null
    const userId = storedUserData?.userId || 2

    const request = {
      userId,
      requestTimestamp: '',
      data: ''
    }

    const response = await apiClient.post<{ 
      responseCode: string; 
      responseMessage: string; 
      data: Array<{name: string; turnover: boolean; lot: boolean; groupId: number}> 
    }>(
      `${this.baseUrl}/portal/exchanges`,
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
    )

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
  }): Promise<any> {
    console.log('💾 Updating Brokerage Settings:', {
      endpoint: '/user/settings/updateBrokerage',
      payload
    })

    const response = await apiClient.post<any>(
      '/user/settings/updateBrokerage',
      payload
    )

    return response
  }
}

export const userManagementService = new UserManagementService()
export default userManagementService
