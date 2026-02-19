/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_DEMO_MODE: string
  readonly VITE_AUTH_LOGIN_ENDPOINT: string
  readonly VITE_AUTH_LOGOUT_ENDPOINT: string
  readonly VITE_AUTH_REFRESH_ENDPOINT: string
  readonly VITE_AUTH_PROFILE_ENDPOINT: string
  readonly VITE_TRADING_ORDERS_ENDPOINT: string
  readonly VITE_TRADING_POSITIONS_ENDPOINT: string
  readonly VITE_TRADING_PORTFOLIO_ENDPOINT: string
  readonly VITE_TRADING_MARKET_DATA_ENDPOINT: string
  readonly VITE_TRADING_ORDER_BOOK_ENDPOINT: string
  readonly VITE_TRADING_TRADES_ENDPOINT: string
  readonly VITE_REPORTS_PNL_ENDPOINT: string
  readonly VITE_REPORTS_TRADE_HISTORY_ENDPOINT: string
  readonly VITE_REPORTS_TAX_ENDPOINT: string
  readonly VITE_REPORTS_ACCOUNT_SUMMARY_ENDPOINT: string
  readonly VITE_ADMIN_USERS_ENDPOINT: string
  readonly VITE_ADMIN_ROLES_ENDPOINT: string
  readonly VITE_ADMIN_SETTINGS_ENDPOINT: string
  readonly VITE_ADMIN_AUDIT_LOGS_ENDPOINT: string
  readonly VITE_TOAST_DURATION: string
  readonly VITE_TOAST_POSITION: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_ENABLE_NETWORK_LOGS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}