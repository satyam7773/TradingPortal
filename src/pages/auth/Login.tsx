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
import marketWatchService from '../../services/marketWatchService'

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
      console.log('✅ Login successful, initializing socket connection before navigation')
      
      // Initialize WebSocket connection before navigating
      const initializeSocket = async () => {
        try {
          await marketWatchService.connect(() => {
            console.log('🔌 Socket connected successfully from Login')
          })
          console.log('✅ Socket connection established, navigating to dashboard')
          navigate('/dashboard')
        } catch (error) {
          console.error('❌ Failed to connect socket:', error)
          // Still navigate even if socket connection fails
          navigate('/dashboard')
        }
      }
      
      initializeSocket()
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          animate={{
            x: [0, 100, -100, 0],
            y: [0, 50, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-20 right-1/4 w-72 h-72 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{
            x: [0, -100, 100, 0],
            y: [0, -50, 50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, delay: 2 }}
          className="absolute bottom-0 left-1/3 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, delay: 1 }}
          className="absolute top-1/2 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl"
        />
      </div>

      {/* Theme toggle - fixed position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle variant="icon" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center p-4 lg:p-8">
        {/* Left Hero Section - Hidden on mobile */}
        <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center lg:pr-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-md"
          >
            {/* Logo */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="mb-12 flex justify-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center shadow-2xl">
                <ABQuotesLogo size="lg" variant="icon-only" />
              </div>
            </motion.div>

            {/* Heading */}
            <h1 className="text-5xl font-bold mb-6 text-white leading-tight">
              Trade <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">smarter</span>, move <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">faster</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Real-time market quotes, advanced trading tools, and comprehensive portfolio management — all in one powerful platform.
            </p>

            {/* Feature Cards */}
            <div className="space-y-4">
              {[
                { icon: '⚡', text: 'Lightning-fast execution' },
                { icon: '📊', text: 'Advanced analytics & insights' },
                { icon: '🛡️', text: 'Bank-level security' },
                { icon: '🌍', text: 'Global market access' }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 text-slate-300"
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <span>{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Animated chart */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12"
            >
              <svg viewBox="0 0 600 200" className="w-full h-48 opacity-80">
                <defs>
                  <linearGradient id="gradient" x1="0" x2="1">
                    <stop offset="0" stopColor="#8b5cf6" />
                    <stop offset="0.5" stopColor="#ec4899" />
                    <stop offset="1" stopColor="#06b6d4" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <path d="M0,150 C100,80 150,120 250,60 C350,0 400,100 500,50 C550,20 580,80 600,40" fill="none" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />
                <circle cx="250" cy="60" r="8" fill="#ec4899" filter="url(#glow)" />
                <circle cx="500" cy="50" r="8" fill="#06b6d4" filter="url(#glow)" />
              </svg>
            </motion.div>
          </motion.div>
        </div>

        {/* Right Form Section */}
        <div className="w-full lg:w-1/2 flex items-center justify-center">
          <motion.div 
            initial={{scale:0.95, opacity:0}} 
            animate={{scale:1, opacity:1}} 
            transition={{duration:0.6, delay: 0.1}} 
            className="w-full max-w-md"
          >
            {/* Form Card */}
            <div className="relative">
              {/* Glow effect behind card */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl opacity-20 blur-2xl"></div>
              
              {/* Actual card */}
              <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 lg:p-10 shadow-2xl border border-white/10 dark:border-slate-700/50 backdrop-blur-xl">
                {/* Logo for mobile */}
                <div className="lg:hidden mb-6 flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center">
                    <ABQuotesLogo size="md" variant="icon-only" />
                  </div>
                </div>

                {/* Heading */}
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</h2>
                  <p className="text-slate-600 dark:text-slate-400">Sign in to your trading account</p>
                </div>
                
                {/* Form */}
                <Formik
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
                >
                  {({ values, errors, touched, setFieldValue }) => (
                    <Form className="space-y-5">
                      {/* Server Selection */}
                      <Field name="server">
                        {({ field, meta }: any) => (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              <Server className="w-4 h-4 inline mr-2 text-purple-600 dark:text-purple-400" />
                              Select Server
                            </label>
                            <Select
                              options={serverOptions}
                              value={field.value}
                              onChange={(value) => setFieldValue('server', value)}
                              error={meta.touched && meta.error ? meta.error : ''}
                              name={field.name}
                              onBlur={field.onBlur}
                            />
                          </motion.div>
                        )}
                      </Field>

                      {/* User ID Input */}
                      <Field name="userId">
                        {({ field, meta }: any) => (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                          >
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              <User className="w-4 h-4 inline mr-2 text-purple-600 dark:text-purple-400" />
                              User ID
                            </label>
                            <Input
                              icon={User}
                              placeholder="Enter your user ID"
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              error={meta.touched && meta.error ? meta.error : ''}
                              isValid={field.value && !meta.error}
                            />
                          </motion.div>
                        )}
                      </Field>

                      {/* Password Input */}
                      <Field name="password">
                        {({ field, meta }: any) => (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                              <Lock className="w-4 h-4 inline mr-2 text-purple-600 dark:text-purple-400" />
                              Password
                            </label>
                            <Input
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
                          </motion.div>
                        )}
                      </Field>

                      {/* Submit Button */}
                      <motion.button 
                        type="submit" 
                        disabled={loading}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 mt-8 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-white transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Sign in</span>
                          </>
                        )}
                      </motion.button>
                    </Form>
                  )}
                </Formik>
                
                {/* Error Alert */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/50 text-red-600 dark:text-red-400 text-sm font-medium flex items-start gap-2"
                  >
                    <span className="text-lg">⚠️</span>
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Demo Credentials */}
                
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      
      {/* Change Password Modal (shown when changePasswordFlag is true) */}
      {showChangeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 dark:border-slate-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 px-8 py-6">
              <h3 className="text-2xl font-bold text-white mb-1">Change Password</h3>
              <p className="text-sm text-purple-100">Required before first login</p>
            </div>

            {/* Content */}
            <div className="p-8">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Your account requires a password change for security purposes. Please set a strong new password.
              </p>

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
                  <Form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        <Lock className="w-4 h-4 inline mr-2 text-purple-600 dark:text-purple-400" />
                        Current Password
                      </label>
                      <Input
                        label=""
                        name="oldPassword"
                        type="password"
                        placeholder="Enter current password"
                        value={values.oldPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.oldPassword && (errors as any).oldPassword ? (errors as any).oldPassword : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        <Lock className="w-4 h-4 inline mr-2 text-purple-600 dark:text-purple-400" />
                        New Password
                      </label>
                      <Input
                        label=""
                        name="newPassword"
                        type="password"
                        placeholder="Enter new password (min 6 characters)"
                        value={values.newPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.newPassword && (errors as any).newPassword ? (errors as any).newPassword : ''}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        <Lock className="w-4 h-4 inline mr-2 text-purple-600 dark:text-purple-400" />
                        Confirm Password
                      </label>
                      <Input
                        label=""
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        value={values.confirmPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.confirmPassword && (errors as any).confirmPassword ? (errors as any).confirmPassword : ''}
                      />
                    </div>

                    {cpError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-600 dark:text-red-400 text-sm font-medium flex items-start gap-2"
                      >
                        <span className="text-lg">⚠️</span>
                        <span>{cpError}</span>
                      </motion.div>
                    )}

                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          // Clear tokens and user data locally (do NOT call logout API)
                          TokenManager.clearTokens()
                          try { localStorage.removeItem('userData') } catch (e) { /* ignore */ }

                          // Reset redux auth state without triggering logout saga (avoid calling logout API)
                          dispatch(loginFailure(''))

                          // Close modal and go to login screen so user can re-login
                          setShowChangeModal(false)
                          navigate('/login')
                        }}
                        className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                      >
                        Back
                      </motion.button>
                      <motion.button
                        type="submit"
                        disabled={cpLoading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white rounded-lg font-medium hover:from-purple-700 hover:via-pink-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center gap-2"
                      >
                        {cpLoading ? (
                          <>
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Save & Continue</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default Login
