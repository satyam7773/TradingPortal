import { apiClient } from './apiClient'

/**
 * Group Service
 * All group and quantity management related API calls
 */
class GroupService {
  private readonly baseUrl = 'user/api/quantity/group'

  /**
   * Create new group
   */
  async createGroup(data: { groupName: string; exchangeId: number }): Promise<any> {
    const userDataStr = localStorage.getItem('userData')
    const userData = userDataStr ? JSON.parse(userDataStr) : { userId: 31 }
    const userId = userData?.userId || 31
    
    const timestamp = Date.now().toString()
    
    const payload = {
      requestTimestamp: timestamp,
      userId: userId,
      data: {
        groupName: data.groupName,
        exchangeId: data.exchangeId,
      }
    }
    
    const response = await apiClient.post<{ data: any }>(
      this.baseUrl,
      payload
    )
    return response.data
  }

  /**
   * Get group by ID
   */
  async getGroupById(groupId: number): Promise<any> {
    const response = await apiClient.get<{ data: any }>(
      `${this.baseUrl}/${groupId}`
    )
    return response.data
  }

  /**
   * Get groups by exchange ID
   */
  async getGroupsByExchange(exchangeId: number): Promise<any> {
    const response = await apiClient.get<{ data: any }>(
      this.baseUrl,
      {
        params: { exchangeId }
      }
    )
    return response.data
  }

  /**
   * Update group
   */
  async updateGroup(groupId: number, data: { groupName: string; exchangeId: number }): Promise<any> {
    const response = await apiClient.put<{ data: any }>(
      `${this.baseUrl}/${groupId}`,
      data
    )
    return response.data
  }

  /**
   * Delete group
   */
  async deleteGroup(groupId: number): Promise<any> {
    const response = await apiClient.delete<{ data: any }>(
      `${this.baseUrl}/${groupId}`
    )
    return response.data
  }

  /**
   * Upload quantity settings via Excel
   */
  async uploadQuantityExcel(groupId: number, file: File): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<{ data: any }>(
      `user/api/quantity/group/setting/upload-excel`,
      formData,
      {
        params: { groupId },
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    return response.data
  }

  /**
   * Download quantity template
   */
  async downloadTemplate(): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      'user/api/quantity/group/setting/download-template',
      {
        responseType: 'blob'
      }
    )
    return response as unknown as Blob
  }

  /**
   * Get quantity settings by group ID
   */
  async getQuantitySettings(groupId: number): Promise<any> {
    const response = await apiClient.get<{ data: any }>(
      `user/api/quantity/group/setting/group/${groupId}`
    )
    return response.data
  }

  /**
   * Fetch groups by exchange name (exchange-wise)
   * GET endpoint returning groups organized by exchange
   */
  async getGroupsByExchangeWise(): Promise<any> {
    const response = await apiClient.get<{ responseCode: string; responseMessage: string; data: any }>(
      'user/api/quantity/group/exchange-wise'
    )
    return response
  }

  /**
   * Fetch groups exchange-wise dynamically based on user context
   * POST endpoint returning groups assigned/allowed for a specific user ID
   */
  async getGroupsByExchangeWiseUserSpecific(data: { requestTimestamp: number; userId: number }): Promise<any> {
    const response = await apiClient.post<{ responseCode: string; responseMessage: string; data: any }>(
      'user/api/quantity/group/exchange-wise/v1',
      data
    )
    return response.data
  }
}

export const groupService = new GroupService()
export default groupService
