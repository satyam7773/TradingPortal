/**
 * Services Index
 * Export all service modules for easy import
 * 
 * Usage:
 * import { authService, userManagementService } from '@/services'
 */

export { apiClient, TokenManager } from './apiClient'
export { authService } from './authService'
export { userManagementService } from './userManagementService'

// Re-export types
export * from './api.types'

// You can add more services here as you build them:
// export { tradingService } from './tradingService'
// export { marketDataService } from './marketDataService'
// export { reportsService } from './reportsService'
// export { adminService } from './adminService'
// etc.
