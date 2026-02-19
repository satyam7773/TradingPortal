import { useState, useEffect } from 'react'
import { 
  getUserData, 
  getUserProfile, 
  getToken, 
  isAuthenticated,
  clearAuth 
} from '../utils/storage'
import { useNavigate } from 'react-router-dom'

/**
 * Custom hook to access authentication state and user data
 * Usage: const { user, token, isAuth, logout } = useAuth()
 */
export const useAuth = () => {
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isAuth, setIsAuth] = useState<boolean>(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Load user data from storage
    const userData = getUserData()
    const userToken = getToken()
    const authenticated = isAuthenticated()

    setUser(userData)
    setToken(userToken)
    setIsAuth(authenticated)
  }, [])

  const logout = () => {
    clearAuth()
    setUser(null)
    setToken(null)
    setIsAuth(false)
    navigate('/login')
  }

  const refreshUserData = () => {
    const userData = getUserData()
    const userToken = getToken()
    const authenticated = isAuthenticated()

    setUser(userData)
    setToken(userToken)
    setIsAuth(authenticated)
  }

  return {
    user,
    token,
    isAuth,
    logout,
    refreshUserData,
    userId: user?.userId,
    username: user?.username,
    email: user?.email,
    roleId: user?.roleId,
    permissions: user?.permissions || []
  }
}

/**
 * Get user data directly (for use outside components)
 */
export const getCurrentUser = () => {
  return getUserData()
}

/**
 * Get user profile directly (for use outside components)
 */
export const getCurrentUserProfile = () => {
  return getUserProfile()
}

/**
 * Check if user has specific permission
 */
export const hasPermission = (permission: string): boolean => {
  const user = getUserData()
  return user?.permissions?.includes(permission) || false
}

/**
 * Check if user has specific role
 */
export const hasRole = (roleId: number): boolean => {
  const user = getUserData()
  return user?.roleId === roleId
}
