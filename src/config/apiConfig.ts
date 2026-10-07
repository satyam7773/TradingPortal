/**
 * Centralized API Configuration
 * 
 * Change BASE_URL and WEBSOCKET_URL here to update all API endpoints across the application
 * Uses VITE_API_BASE_URL and VITE_WEBSOCKET_URL environment variables with fallback to staging
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api-staging.rivoplus.live'
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'wss://quotes.rivoplus.live/ws/market'
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'staging'

export const API_ENDPOINTS = {
  // Reports
  REPORTS: {
    TRADE_ACCOUNT: `${BASE_URL}/reports/tradeAccountReport`,
    TRADE_ACCOUNT_DOWNLOAD: `${BASE_URL}/reports/tradeAccount/download`,
    POSITIONS: `${BASE_URL}/reports/positions`,
    POSITIONS_DOWNLOAD: `${BASE_URL}/reports/positions/download`,
    POSITIONS_FETCH_USERS: `${BASE_URL}/reports/positions/fetchUsers`,
    TRADES: `${BASE_URL}/reports/trades`,
    TRADES_DOWNLOAD: `${BASE_URL}/reports/trades/download`,
    TRADES_FETCH_USERS: `${BASE_URL}/reports/trades/fetchUsers`,
    DELETED_TRADES: `${BASE_URL}/reports/trades/deleted`,
    DELETED_ORDER_STATUS: `${BASE_URL}/reports/deleted/orderStatus`,
    SETTLEMENT: `${BASE_URL}/reports/settlement`,
    SETTLEMENT_DOWNLOAD: `${BASE_URL}/reports/settlement/download`,
    ACCOUNT_SUMMARY: `${BASE_URL}/reports/accountSummary`,
    ACCOUNT_SUMMARY_DOWNLOAD: `${BASE_URL}/reports/accountSummary/download`,
    BILLING: `${BASE_URL}/reports/billing`,
    IP_DEVICE_SUMMARY: `${BASE_URL}/reports/ipDeviceSummary`,
    IP_DEVICE_SUMMARY_DOWNLOAD: `${BASE_URL}/reports/ipDeviceSummary/download`,
    IP_DEVICE_DETAILS: `${BASE_URL}/reports/ipDeviceDetails`,
    WEEKLY_ADMIN: `${BASE_URL}/reports/weeklyAdmin`,
    USER_WISE_POSITIONS: `${BASE_URL}/reports/userWisePositions`,
  },

  // OMS (Order Management System)
  OMS: {
    POSITIONS: `${BASE_URL}/oms/positions`,
    POSITIONS_PORTAL: `${BASE_URL}/oms/positions/portal`,
    CLOSE_MULTIPLE_POSITIONS: `${BASE_URL}/oms/closeMultiplePositions`,
    POSITIONS_PORTAL_CLIENT: `${BASE_URL}/oms/positions/portal/ClientPositions`,
    POSITIONS_PORTAL_CUMULATIVE: `${BASE_URL}/oms/positions/portal/cumulative`,
    TRADES: `${BASE_URL}/oms/portal/trades`,
    TRADES_DOWNLOAD: `${BASE_URL}/oms/portal/trades/download`,
    ORDERS: `${BASE_URL}/oms/orders`,
    CANCEL_MULTIPLE_ORDERS: `${BASE_URL}/oms/cancelMultipleOrders`,
    PROCEED_TO_SUCCESS: `${BASE_URL}/oms/proceedToSuccess`,
    PNL: `${BASE_URL}/oms/pnl`,
    PNL_DOWNLOAD: `${BASE_URL}/oms/pnl/download`,
    USER_M2M: (userId: string | number, userFilterType?: string) => 
      `${BASE_URL}/oms/api/v1/m2m/user/${userId}${userFilterType ? `?userFilterType=${userFilterType}` : ''}`,
    USER_DOWNLOAD: (userId: string | number, userFilterType?: string) =>
      `${BASE_URL}/oms/user/download/${userId}?pdf=true${userFilterType ? `&userFilterType=${userFilterType}` : ''}`,
    REJECTED_ORDERS_LOG: `${BASE_URL}/oms/rejected/orders/log`,
    TRADE_DURATION_RANK: `${BASE_URL}/oms/tradeDurationRank`,
    UNDO_TRADE: `${BASE_URL}/oms/undoTrade`,
    FETCH_SYMBOLS: `${BASE_URL}/oms/fetchSymbols`,
    FETCH_ALL_SYMBOLS: `${BASE_URL}/oms/fetchAllSymbols`,
    TRADE_SYMBOLS: `${BASE_URL}/oms/tradeSymbols`,
  },

  // User Management
  USER: {
    CREATE_USER: `${BASE_URL}/user/createUser`,
    EDIT_USER: `${BASE_URL}/user/portal/editUserDetails`,
    FETCH_USER_LIST: `${BASE_URL}/user/portal/fetchUserList`,
    FETCH_OWN_USERS: `${BASE_URL}/user/portal/fetchOwnUsers`,
    FETCH_OWN_USERS_REJECTED_LOGS: `${BASE_URL}/user/portal/fetchOwnUsers?userFilterType=REJECTED_LOGS`,
    FETCH_OWN_USERS_BILLING: `${BASE_URL}/user/portal/fetchOwnUsers?userFilterType=BILLING`,
    FETCH_CLIENT_TRADE: `${BASE_URL}/user/portal/fetchUserClientsTrade`,
    UPDATE_CF_MARGIN: `${BASE_URL}/user/settings/updateCfMargin`,
    FETCH_AUTO_SQUARE_OFF: `${BASE_URL}/user/portal/fetchAutoSquareOff`,
    UPDATE_AUTO_SQUARE_OFF: `${BASE_URL}/user/portal/updateAutoSquareOff`,
  },

  // Market Watch
  WATCHLIST: {
    REORDER: `${BASE_URL}/user/watchlist/reorder`,
    TAB: (tabId: string | number) => `${BASE_URL}/user/api/watchlist-tabs/tab/${tabId}`,
  },

  // Settings & Admin
  SETTINGS: {
    EXCHANGE_HOLIDAYS: `${BASE_URL}/user/settings/exchangeHolidays`,
    EXCHANGE_HOLIDAYS_UPDATE: `${BASE_URL}/user/settings/exchangeHolidays/update`,
    UPDATE_SCRIP_BUFFER_SETTINGS: `${BASE_URL}/user/portal/updateScripBufferSettings`,
    FETCH_SCRIP_BUFFER_SETTINGS: `${BASE_URL}/user/portal/fetchScripBufferSettings`,
    VIEW_SCRIP_BUFFER_UPDATED_USER: `${BASE_URL}/user/portal/viewScripBufferUpdatedUser`,
    UPDATE_SCRIP_MASTER_SETTINGS: `${BASE_URL}/user/portal/updateScripMasterSettings`,
    FETCH_SCRIP_MASTER_SETTINGS: `${BASE_URL}/user/portal/fetchScripMasterSettings`,
    FETCH_SCRIP_MASTER_DOWNLOAD: `${BASE_URL}/user/portal/fetchScripMasterSettings/download`,
    VIEW_SCRIP_MASTER_UPDATED_USER: `${BASE_URL}/user/portal/viewScripMasterUpdatedUser`,
    TRADE_ATTRIBUTES: `${BASE_URL}/user/portal/tradeAttributes`,
    ALLOW_TRADE: `${BASE_URL}/user/portal/allowTrade`,
    EXCHANGE_LOT_LIMIT: `${BASE_URL}/user/portal/exchangeLotLimit`,
    UPDATE_EXCHANGE_LOT_LIMIT: `${BASE_URL}/user/portal/updateExchangeLotLimit`,
  },

  // Portal
  PORTAL: {
    QUANTITY_GROUP_EXCHANGE_USERID: `${BASE_URL}/user/api/quantity/group/exchange/userid`,
    EXCHANGE_USER_ID: `${BASE_URL}/user/api/v1/portal/exchange/userId`,
    USER_WISE_QUANTITY_GROUP: `${BASE_URL}/user/api/v1/user/wise/quantity/group`,
    USER_WISE_QUANTITY_GROUP_EXCHANGE: `${BASE_URL}/user/api/v1/user/wise/quantity/group/exchange`,
    QUANTITY_GROUPS_USERS: (groupId: string | number, parentId: string | number) =>
      `${BASE_URL}/user/api/v1/portal/quantity-groups/users?groupId=${groupId}&parentId=${parentId}`,
    USERS_GROUPS_DROPDOWN: `${BASE_URL}/user/api/v1/portal/users/groups/dropdown`,
    ASSIGN_USERS_GROUP: `${BASE_URL}/user/api/v1/portal/assign/users/group`,
  },

  // Login & Auth
  LOGIN: {
    HISTORY: `${BASE_URL}/user/login/history/uId/download`,
  },

  // Market Data
  QUOTES: {
    KITE_HISTORY: `${BASE_URL}/quotes/kite/history`,
    UPDATE_CIRCUITS: `${BASE_URL}/quotes/kite/updateCircuits`,
    UPDATE_CLOSING_PRICE: `${BASE_URL}/quotes/kite/updateClosingPrice`,
    FILE_UPLOAD: `${BASE_URL}/quotes/api/v1/bhaav-copy`,
  },

  // Configuration
  CONFIG: {
    MAIN: `${BASE_URL}/configuration/configs`,
  },

  // Market Trade Rights
  MARKET: {
    TRADE_RIGHT: `${BASE_URL}/user/market/trade/right`,
  },

  // OMS v2
  OMS_V2: {
    SETTLEMENT_POSITION: `${BASE_URL}/oms2/settlement/position`,
  },
}

/**
 * Export the base URL for cases where it's needed directly
 */
export const getBaseURL = (): string => BASE_URL

/**
 * Export the WebSocket URL for market data connections
 */
export const getWebSocketURL = (): string => WEBSOCKET_URL

/**
 * Export the current environment name
 */
export const getEnvironment = (): string => ENVIRONMENT

/**
 * Helper function to build download URLs with format parameter
 */
export const getDownloadURL = (endpoint: string, format: 'pdf' | 'excel'): string => {
  const queryParam = format === 'pdf' ? 'pdf=true' : 'excel=true'
  return `${endpoint}?${queryParam}`
}
