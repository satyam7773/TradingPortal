import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  name?: string
  email?: string
  userId?: string
  username?: string
  roleId?: number
  role?: string // e.g., 'admin', 'super_admin', etc.
  changePasswordFlag?: boolean
  firstLogin?: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
}

// Restore user from localStorage on app initialization
const restoreAuthState = (): AuthState => {
  try {
    const userData = localStorage.getItem('userData')
    if (userData) {
      const parsedData = JSON.parse(userData)
      return {
        token: parsedData.token || null,
        user: {
          name: parsedData.name,
          email: parsedData.email,
          userId: parsedData.userId,
          username: parsedData.username,
          roleId: parsedData.roleId,
          role: parsedData.role,
          changePasswordFlag: parsedData.changePasswordFlag,
          firstLogin: parsedData.firstLogin
        },
        loading: false,
        error: null
      }
    }
  } catch (error) {
    console.error('Failed to restore auth state from localStorage:', error)
  }
  
  return {
    token: null,
    user: null,
    loading: false,
    error: null,
  }
}

const initialState: AuthState = restoreAuthState()

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest(state, action: PayloadAction<{email:string;password:string;server?:string}>) {
      state.loading = true
      state.error = null
    },
    loginSuccess(state, action: PayloadAction<{token:string;user:User}>) {
      state.loading = false
      state.token = action.payload.token
      state.user = action.payload.user
      state.error = null
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.loading = false
      state.error = action.payload
      state.token = null
      state.user = null
    },
    logout(state) {
      state.token = null
      state.user = null
      state.error = null
      state.loading = false
    },
    clearError(state) {
      state.error = null
    },
    clearFirstLogin(state) {
      if (state.user) {
        state.user.firstLogin = false
        // Update localStorage
        const userData = localStorage.getItem('userData')
        if (userData) {
          const parsedData = JSON.parse(userData)
          parsedData.firstLogin = false
          localStorage.setItem('userData', JSON.stringify(parsedData))
        }
      }
    }
  }
})

export const { loginRequest, loginSuccess, loginFailure, logout, clearError, clearFirstLogin } = authSlice.actions
export default authSlice.reducer
