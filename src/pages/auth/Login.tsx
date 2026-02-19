import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks'
import { apiClient, TokenManager } from '../../services'
import { loginSuccess, loginFailure } from '../../store/slices/authSlice'
import { loginRequest } from '../../store/slices/authSlice'
import { motion } from 'framer-motion'
import { Formik, Form, Field } from 'formik'
import toast from 'react-hot-toast'
import * as Yup from 'yup'
import { Server, Globe, Code, Play, TestTube, User, Lock } from 'lucide-react'
import ThemeToggle from '../../components/ui/ThemeToggle'
import ABQuotesLogo from '../../components/ui/ABQuotesLogo'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

// Validation schema
const validationSchema = Yup.object({
  server: Yup.string().required('Server is required'),
  userId: Yup.string().required('User ID is required'),
  password: Yup.string().required('Password is required')
})

// Initial form values
const initialValues = {
  server: 'matrix',
  userId: 'admin',
  password: '123456'
}

// Server options with icons and descriptions
const serverOptions = [
  { value: 'matrix', label: 'Matrix', icon: Server, description: 'Primary trading server' },
  { value: 'production', label: 'Production Server', icon: Globe, description: 'Live trading environment' },
  { value: 'staging', label: 'Staging Server', icon: TestTube, description: 'Testing environment' },
  { value: 'development', label: 'Development Server', icon: Code, description: 'Development environment' },
  { value: 'demo', label: 'Demo Server', icon: Play, description: 'Practice trading' }
]

const Login: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  // Get auth state from Redux
  const { loading, error, token, user } = useAppSelector(state => state.auth)

  // Debug: log the user's role after login
  useEffect(() => {
    if (user && user.role) {
      console.log('🔑 User role from Redux:', user.role)
    }
  }, [user])

  // Navigate when login is successful
  useEffect(() => {
    // If user must change password, don't navigate - show modal instead
    if (token && !loading && !(user && (user as any).changePasswordFlag)) {
      console.log('✅ Login successful, navigating to dashboard')
      navigate('/dashboard')
    }
  }, [token, loading, navigate])

  // Change password modal state
  const [showChangeModal, setShowChangeModal] = useState(false)
  const [cpLoading, setCpLoading] = useState(false)
  const [cpError, setCpError] = useState<string | null>(null)

  // Show modal when login response indicates changePasswordFlag
  useEffect(() => {
    if (token && user && (user as any).changePasswordFlag) {
      setShowChangeModal(true)
    }
  }, [token, user])

  const handleSubmit = async (values: typeof initialValues) => {
    console.log('🎯 Login form submitted with values:', values)
    
    // Just dispatch the login request action with server value
    // The authSaga will handle the actual API call
    dispatch(loginRequest({ 
      email: values.userId, 
      password: values.password,
      server: values.server 
    }))
  }

  return (
    <div className="min-h-screen flex items-stretch bg-bg-primary">
      {/* Theme toggle - fixed position */}
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle variant="icon" />
      </div>
      
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-surface-primary via-surface-secondary to-surface-tertiary p-12 items-center justify-center">
        <div className="max-w-md">
          <div className="mb-8 flex justify-center">
            <ABQuotesLogo size="xl" variant="icon-only" />
          </div>
          <h2 className="text-4xl font-bold mb-4 text-text-primary">Trade smarter, move faster</h2>
          <p className="text-text-secondary mb-6">Real-  market quotes, advanced trading tools, and comprehensive portfolio management — all in one platform.</p>
          {/* Simple animated SVG sparkline with AB Quotes colors */}
          <motion.svg initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}} viewBox="0 0 600 200" className="w-full h-48">
            <defs>
              <linearGradient id="g" x1="0" x2="1">
                <stop offset="0" stopColor="#22c55e"/>
                <stop offset="1" stopColor="#dc2626"/>
              </linearGradient>
            </defs>
            <path d="M0,150 C120,30 240,120 360,60 420,30 480,90 600,40" fill="none" stroke="url(#g)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div 
          initial={{scale:0.98, opacity:0}} 
          animate={{scale:1, opacity:1}} 
          transition={{duration:0.45}} 
          className="w-full max-w-md p-8 bg-gradient-to-tr from-white/3 to-white/2 border border-white/6 rounded-2xl backdrop-blur-sm"
        >
          <div className="mb-6 flex justify-center">
            <ABQuotesLogo size="lg" variant="icon-only" />
          </div>
          <h3 className="text-2xl font-semibold mb-2 text-text-primary">Welcome back</h3>
          <p className="text-sm text-text-secondary mb-6">Sign in to continue to Trading Platform</p>
          
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, setFieldValue }) => (
              <Form className="space-y-4">
                {/* Server Selection */}
                <Field name="server">
                  {({ field, meta }: any) => (
                    <Select
                      label="Server"
                      options={serverOptions}
                      value={field.value}
                      onChange={(value) => setFieldValue('server', value)}
                      error={meta.touched && meta.error ? meta.error : ''}
                      name={field.name}
                      onBlur={field.onBlur}
                    />
                  )}
                </Field>

                {/* User ID Input */}
                <Field name="userId">
                  {({ field, meta }: any) => (
                    <Input
                      label="User ID"
                      icon={User}
                      placeholder="Enter your user ID"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      error={meta.touched && meta.error ? meta.error : ''}
                      isValid={field.value && !meta.error}
                    />
                  )}
                </Field>

                {/* Password Input */}
                <Field name="password">
                  {({ field, meta }: any) => (
                    <Input
                      label="Password"
                      icon={Lock}
                      type="password"
                      placeholder="Enter your password"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      showPasswordToggle
                      error={meta.touched && meta.error ? meta.error : ''}
                      isValid={field.value && !meta.error}
                    />
                  )}
                </Field>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-white transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 shadow-lg hover:shadow-xl"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </Form>
            )}
          </Formik>
          
          {/* Show error if login fails */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="mt-4 text-center text-sm text-text-muted">Demo account — user ID: testadmin / password: 123456</div>
        </motion.div>
      </div>
      
      {/* Change Password Modal (shown when changePasswordFlag is true) */}
      {showChangeModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3 text-text-primary">Change Password</h3>
            <p className="text-sm text-text-secondary mb-4">Your account requires a password change before you can continue. Please set a new password.</p>

            <Formik
              initialValues={{ oldPassword: '', newPassword: '', confirmPassword: '' }}
              validationSchema={Yup.object({
                oldPassword: Yup.string().required('Old password is required'),
                newPassword: Yup.string().min(6, 'New password must be at least 6 characters').required('New password is required'),
                confirmPassword: Yup.string().oneOf([Yup.ref('newPassword')], 'Passwords must match').required('Please confirm new password')
              })}
              onSubmit={async (vals, { setSubmitting }) => {
                try {
                  setCpLoading(true)
                  setCpError(null)
                  const userId = (user && (user as any).userId) || null
                  if (!userId) throw new Error('User id not available')

                  const payload = {
                    requestTimestamp: Date.now().toString(),
                    userId: Number(userId),
                    data: {
                      oldPassword: vals.oldPassword,
                      newPassword: vals.newPassword,
                      confirmPassword: vals.confirmPassword
                    }
                  }

                  const resp = await apiClient.post('/user/settings/changePassword', payload)
                  if (resp && (resp.responseCode === '0' || resp.responseCode === '1000')) {
                    toast.success(resp.responseMessage || 'Password changed successfully')
                    // update localStorage and redux user to clear flag
                    try {
                      const raw = localStorage.getItem('userData')
                      if (raw) {
                        const ud = JSON.parse(raw)
                        ud.changePasswordFlag = false
                        localStorage.setItem('userData', JSON.stringify(ud))
                      }
                    } catch (e) {
                      // ignore
                    }

                    // Dispatch updated user state
                    dispatch(loginSuccess({ token: token || '', user: { ...(user as any), changePasswordFlag: false } }))

                    // Clear all session caches when navigating to dashboard
                    sessionStorage.removeItem('userListCache')
                    sessionStorage.removeItem('userListCacheTime')
                    sessionStorage.removeItem('cachedUserId')
                    Object.keys(sessionStorage).forEach(key => {
                      if (key.includes('Cache') || key.includes('cache')) {
                        sessionStorage.removeItem(key)
                      }
                    })

                    setShowChangeModal(false)
                    navigate('/dashboard')
                  } else {
                    const msg = resp?.responseMessage || 'Failed to change password'
                    setCpError(msg)
                    toast.error(msg)
                  }
                } catch (err: any) {
                  console.error('Change password error', err)
                  const msg = err.response?.data?.responseMessage || err.message || 'Failed to change password'
                  setCpError(msg)
                  toast.error(msg)
                } finally {
                  setCpLoading(false)
                  setSubmitting(false)
                }
              }}
            >
              {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
                <Form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Input label="Old password" name="oldPassword" type="password" value={values.oldPassword} onChange={handleChange} onBlur={handleBlur} error={touched.oldPassword && (errors as any).oldPassword ? (errors as any).oldPassword : ''} />
                  </div>
                  <div>
                    <Input label="New password" name="newPassword" type="password" value={values.newPassword} onChange={handleChange} onBlur={handleBlur} error={touched.newPassword && (errors as any).newPassword ? (errors as any).newPassword : ''} />
                  </div>
                  <div>
                    <Input label="Confirm password" name="confirmPassword" type="password" value={values.confirmPassword} onChange={handleChange} onBlur={handleBlur} error={touched.confirmPassword && (errors as any).confirmPassword ? (errors as any).confirmPassword : ''} />
                  </div>

                  {cpError && <div className="text-sm text-red-500">{cpError}</div>}

                  <div className="flex items-center justify-end gap-3 mt-4">
                    <button type="button" onClick={() => {
                      // Clear tokens and user data locally (do NOT call logout API)
                      TokenManager.clearTokens()
                      try { localStorage.removeItem('userData') } catch (e) { /* ignore */ }

                      // Reset redux auth state without triggering logout saga (avoid calling logout API)
                      dispatch(loginFailure(''))

                      // Close modal and go to login screen so user can re-login
                      setShowChangeModal(false)
                      navigate('/login')
                    }} className="px-4 py-2 bg-white dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-200 rounded-lg">Back</button>
                    <button type="submit" disabled={cpLoading} className="px-4 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white rounded-lg">
                      {cpLoading ? 'Saving...' : 'Save & Continue'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
