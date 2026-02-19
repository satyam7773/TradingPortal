// Storage keys constants
export const STORAGE_KEYS = {
  TOKEN: 'trading_app_token',
  REFRESH_TOKEN: 'trading_app_refresh_token',
  USER_DATA: 'trading_app_user_data',
  USER_PROFILE: 'trading_app_user_profile',
} as const

// Generic storage functions
export const save = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value))
}

export const load = (key: string) => {
  const v = localStorage.getItem(key)
  return v ? JSON.parse(v) : null
}

export const remove = (key: string) => localStorage.removeItem(key)

// User-specific storage functions
export const saveUserData = (userData: any) => {
  save(STORAGE_KEYS.USER_DATA, userData)
}

export const getUserData = () => {
  return load(STORAGE_KEYS.USER_DATA)
}

export const saveToken = (token: string) => {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token)
}

export const getToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.TOKEN)
}

export const saveRefreshToken = (refreshToken: string) => {
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
}

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
}

export const clearAuth = () => {
  remove(STORAGE_KEYS.TOKEN)
  remove(STORAGE_KEYS.REFRESH_TOKEN)
  remove(STORAGE_KEYS.USER_DATA)
  remove(STORAGE_KEYS.USER_PROFILE)
}

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = getToken()
  return !!token
}

// Get user profile
export const getUserProfile = () => {
  return load(STORAGE_KEYS.USER_PROFILE)
}

export const saveUserProfile = (profile: any) => {
  save(STORAGE_KEYS.USER_PROFILE, profile)
}
