import { takeLatest, put, call, SagaReturnType } from 'redux-saga/effects'
import { loginRequest, loginSuccess, loginFailure } from '../slices/authSlice'
import { authService, TokenManager } from '../../services'

function* handleLogin(action: any): any {
  try {
    const { email, password, server } = action.payload
    
    console.log('🎯 authSaga: Login request received for:', email, 'on server:', server)
    
    // Call the API service login method with server
    const loginResponse: any = yield call(
      (credentials: { username: string; password: string; server: string }) => authService.login(credentials),
      { username: email, password: password, server: server || 'matrix' }
    )
    
    console.log('✅ authSaga: Login response:', loginResponse)
    
    // Check if login response is valid (not null)
    if (!loginResponse || !loginResponse.token) {
      console.error('❌ authSaga: Invalid login response - no token found')
      const errorMessage = 'Invalid login response from server'
      yield put(loginFailure(errorMessage))
      return
    }
    
    // Store the token
    TokenManager.setToken(loginResponse.token)
    
    // Save complete user data to localStorage, including role and changePasswordFlag if present
    const userData = {
      userId: loginResponse.userId,
      username: loginResponse.username,
      email: loginResponse.email,
      roleId: loginResponse.roleId,
      role: loginResponse.role, // Store the role string
      token: loginResponse.token,
      changePasswordFlag: loginResponse.changePasswordFlag || false,
      firstLogin: loginResponse.firstLogin || false
    }
    localStorage.setItem('userData', JSON.stringify(userData))

    // Clear all session storage caches on login to ensure fresh data
    sessionStorage.removeItem('userListCache')
    sessionStorage.removeItem('userListCacheTime')
    sessionStorage.removeItem('cachedUserId')
    // Clear any other potential caches
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('Cache') || key.includes('cache') || key.includes('Cache')) {
        sessionStorage.removeItem(key)
      }
    })

    console.log('✅ authSaga: User data saved to localStorage and all caches cleared')

    // Fetch and store configuration after successful login
    try {
      const configResponse: any = yield call(
        () => fetch('https://api-staging.rivoplus.live/configuration/configs').then(res => res.json())
      )
      
      if (configResponse) {
        // Store the full configuration
        localStorage.setItem('appConfig', JSON.stringify(configResponse))
        
        // Create optimized indexes for quick access (store IDs only to save space)
        const configIndex = {
          // Index instruments by ID for quick lookup (full objects)
          instrumentsById: {} as Record<number, any>,
          // Index instruments by exchange (store only IDs, not full objects)
          instrumentsByExchange: {} as Record<string, number[]>,
          // Index instruments by name/symbol (store only IDs, not full objects)
          instrumentsByName: {} as Record<string, number>,
          // Store market hours by exchange
          marketHours: {} as Record<string, any>
        }
        
        // Process all instruments across exchanges
        if (configResponse.instruments) {
          Object.keys(configResponse.instruments).forEach((exchange: string) => {
            const instrumentsList = configResponse.instruments[exchange]
            if (Array.isArray(instrumentsList)) {
              configIndex.instrumentsByExchange[exchange] = []
              
              // Index each instrument
              instrumentsList.forEach((instrument: any) => {
                if (instrument.id) {
                  // Store full instrument only once by ID
                  configIndex.instrumentsById[instrument.id] = instrument
                  // Store only ID in exchange index
                  configIndex.instrumentsByExchange[exchange].push(instrument.id)
                }
                if (instrument.tradeSymbol) {
                  configIndex.instrumentsByName[instrument.tradeSymbol] = instrument.id
                }
                if (instrument.instrumentName) {
                  configIndex.instrumentsByName[instrument.instrumentName] = instrument.id
                }
                
                // Store market hours by exchange (one entry per exchange)
                if (!configIndex.marketHours[exchange]) {
                  configIndex.marketHours[exchange] = {
                    openTime: instrument.marketOpenTime,
                    closeTime: instrument.marketCloseTime,
                    exchangeType: instrument.exchangeType
                  }
                }
              })
            }
          })
        }
        
        // Process others if available
        if (configResponse.Others && Array.isArray(configResponse.Others)) {
          configIndex.instrumentsByExchange['Others'] = []
          configResponse.Others.forEach((instrument: any) => {
            if (instrument.id) {
              configIndex.instrumentsById[instrument.id] = instrument
              configIndex.instrumentsByExchange['Others'].push(instrument.id)
            }
            if (instrument.tradeSymbol) {
              configIndex.instrumentsByName[instrument.tradeSymbol] = instrument.id
            }
            if (instrument.instrumentName) {
              configIndex.instrumentsByName[instrument.instrumentName] = instrument.id
            }
          })
        }
        
        // Store the optimized index
        localStorage.setItem('appConfigIndex', JSON.stringify(configIndex))
        
        console.log('✅ authSaga: App configuration stored in localStorage with optimized indexes')
        console.log('📊 authSaga: Total instruments indexed:', Object.keys(configIndex.instrumentsById).length)
      }
    } catch (configError) {
      console.error('⚠️ authSaga: Failed to fetch configuration:', configError)
      // Don't fail login if config fetch fails
    }

    // Dispatch success action, including role and changePasswordFlag
    yield put(loginSuccess({ 
      token: loginResponse.token, 
      user: { 
        name: loginResponse.username || email,
        username: loginResponse.username, // Add username to Redux user
        email: loginResponse.email,
        userId: loginResponse.userId,
        roleId: loginResponse.roleId,
        role: loginResponse.role, // Add role to Redux user
        changePasswordFlag: loginResponse.changePasswordFlag || false,
        firstLogin: loginResponse.firstLogin || false
      } 
    }))
    
    console.log('✅ authSaga: Login success action dispatched')
  } catch (err: any) {
    console.error('❌ authSaga: Login error:', err)
    const errorMessage = err.message || 'Login failed'
    yield put(loginFailure(errorMessage))
  }
}

function* handleLogout() {
  try {
    // Call logout API
    yield call([authService, 'logout'])
    
    // Clear tokens (already done in authService.logout, but just to be sure)
    TokenManager.clearTokens()
    
  } catch (err: any) {
    console.error('Logout error:', err)
    // Even if logout API fails, clear local tokens
    TokenManager.clearTokens()
  }
}

export default function* authSaga() {
  yield takeLatest(loginRequest.type, handleLogin)
  yield takeLatest('auth/logout', handleLogout)
}
