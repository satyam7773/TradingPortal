import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Formik, Form, Field } from 'formik'
import * as Yup from 'yup'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  MessageSquare,
  Key,
  RefreshCw,
  Save,
  X,
  TrendingUp
} from 'lucide-react'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { navigateWithScrollToTop } from '../../utils/navigation'
import { userManagementService } from '../../services'
import { UserConfigResponse } from '../../services/api.types'
import { useTabs } from '../../hooks/useTabs'

// Validation schema
const validationSchema = Yup.object({
  accountName: Yup.string().required('Account name is required'),
  userType: Yup.string().required('User type is required'),
  name: Yup.string().required('Name is required'),
  username: Yup.string().required('Username is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  retypePassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please retype password'),
  mobileNumber: Yup.string().optional(),
  city: Yup.string().optional(),
  credit: Yup.number().min(0, 'Credit must be positive').required('Credit is required'),
  remark: Yup.string(),
  changePasswordOnFirstLogin: Yup.boolean(),
  autoSquareOff: Yup.boolean(),
  pnlSharing: Yup.number().when('userType', {
    is: 'master',
    then: (schema) => schema.min(0, 'Must be 0 or positive').required('P&L sharing is required'),
    otherwise: (schema) => schema.notRequired()
  }),
  brokerageSharing: Yup.number().when('userType', {
    is: 'master',
    then: (schema) => schema.min(0, 'Must be 0 or positive').required('Brokerage sharing is required'),
    otherwise: (schema) => schema.notRequired()
  })
})

// Initial form values with dummy data for testing
const initialValues = {
  accountName: '',
  userType: '',
  name: '',
  username: '',
  password: '',
  retypePassword: '',
  mobileNumber: '',
  city: '',
  credit: 0,
  remark: '',
  changePasswordOnFirstLogin: false,
  autoSquareOff: false,
  addMaster: false,
  pnlSharing: '',
  brokerageSharing: '',
  exchanges: {
    nse: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false },
    mcx: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false },
    sgx: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false },
    cds: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false },
    callput: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false },
    others: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false }
  },
  highTradeLimit: {
    nse: false,
    mcx: false,
    sgx: false,
    cds: false,
    callput: false
  }
}

// User type options - will be dynamically set based on logged-in user's role
const getUserTypeOptions = (roleId: number) => {
  // roleId: 1 = super_admin, 2 = admin, 3 = master
  if (roleId === 1) {
    // Super admin can create admin and master
    return [
      { value: 'admin', label: 'Admin', icon: User, description: 'Administrative access' },
      { value: 'master', label: 'Master', icon: User, description: 'Master account' },
    ]
  } else if (roleId === 2) {
    // Admin can create master and client
    return [
      { value: 'master', label: 'Master', icon: User, description: 'Master account' },
      { value: 'client', label: 'Client', icon: User, description: 'Regular trading client' },
    ]
  } else if (roleId === 3) {
    // Master can create master and client
    return [
      { value: 'master', label: 'Master', icon: User, description: 'Master account' },
      { value: 'client', label: 'Client', icon: User, description: 'Regular trading client' },
    ]
  }
  
  // Default: only client
  return [
    { value: 'client', label: 'Client', icon: User, description: 'Regular trading client' },
  ]
}

// Exchange data
const exchangeData = [
  { 
    key: 'nse', 
    name: 'NSE', 
    fullName: 'National Stock Exchange',
    defaultGroup: 'NSE_DEFAULT',
    color: 'bg-blue-500'
  },
  { 
    key: 'mcx', 
    name: 'MCX', 
    fullName: 'Multi Commodity Exchange',
    defaultGroup: 'MCX_2_LOT',
    color: 'bg-purple-500'
  },
  { 
    key: 'sgx', 
    name: 'SGX', 
    fullName: 'Singapore Exchange',
    defaultGroup: 'SGX_500',
    color: 'bg-purple-500'
  },
  { 
    key: 'cds', 
    name: 'CDS', 
    fullName: 'Currency Derivatives',
    defaultGroup: 'CDS_25_Lot',
    color: 'bg-orange-500'
  },
  { 
    key: 'callput', 
    name: 'CALLPUT', 
    fullName: 'Options Trading',
    defaultGroup: 'CALLPUT_10_Lot',
    color: 'bg-indigo-500'
  },
  { 
    key: 'others', 
    name: 'OTHERS', 
    fullName: 'Other Instruments',
    defaultGroup: 'OTHERS_250',
    color: 'bg-gray-500'
  }
]

const CreateNewUser: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEditMode = searchParams.get('mode') === 'edit'
  const editingUserId = searchParams.get('userId')
  const { tabs, updateTabCache, removeTab } = useTabs()
  
  const configFetchedRef = React.useRef(false)
  
  const [userConfig, setUserConfig] = useState<UserConfigResponse | null>(null)
  const [originalUserConfig, setOriginalUserConfig] = useState<UserConfigResponse | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)
  const [formInitialValues, setFormInitialValues] = useState(initialValues)
  const [forUserAccount, setForUserAccount] = useState(false)
  const [userTypeOptions, setUserTypeOptions] = useState<Array<{value: string; label: string; icon: any; description: string}>>([])
  const [selectedUserRole, setSelectedUserRole] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [availableUserTypes, setAvailableUserTypes] = useState<Array<{value: string; label: string; icon: any; description: string}>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameValidating, setUsernameValidating] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [selectedUserAllowedExchanges, setSelectedUserAllowedExchanges] = useState<string[]>([])
  const [selectedUserAllowedExchangeCount, setSelectedUserAllowedExchangeCount] = useState(0)
  const [isFetchingSelectedUserDetails, setIsFetchingSelectedUserDetails] = useState(false)

  // Dynamic validation schema based on selected user role
  const getValidationSchema = () => {
    return Yup.object({
      accountName: isEditMode ? Yup.string().optional() : Yup.string().required('Account name is required'),
      userType: isEditMode ? Yup.string().optional() : (selectedUserRole === 2 
        ? Yup.string().required('User type is required').oneOf(['master'], 'Admin can only create master users')
        : availableUserTypes.length > 0
        ? Yup.string().test('is-not-empty', 'User type is required', value => value !== '' && value !== undefined)
        : Yup.string().optional().nullable()),
      name: Yup.string().required('Name is required'),
      username: isEditMode ? Yup.string().optional() : Yup.string().required('Username is required'),
      password: isEditMode ? Yup.string().optional() : Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
      retypePassword: isEditMode ? Yup.string().optional() : Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Please retype password'),
      mobile: Yup.string().optional(),
      city: Yup.string().optional(),
      credit: Yup.number()
        .min(0, 'Credit must be positive')
        .required('Credit is required')
        .test('max-credit', 'Cannot exceed available credit', function(value) {
          const availableCredit = userConfig?.credits || 0
          if (value && value > availableCredit) {
            return this.createError({ message: `Cannot exceed available credit of ${availableCredit}` })
          }
          return true
        }),
      remark: Yup.string(),
      changePasswordOnFirstLogin: Yup.boolean(),
      autoSquareOff: Yup.boolean(),
      pnlSharing: Yup.number().when('userType', {
        is: 'master',
        then: (schema) => schema
          .min(0, 'Must be positive')
          .required('P&L sharing is required')
          .test('max-pnl', 'Cannot exceed available P&L sharing', function(value) {
            const availablePnl = userConfig?.pnlSharing || 100
            if (value && value > availablePnl) {
              return this.createError({ message: `Cannot exceed available P&L sharing of ${availablePnl}` })
            }
            return true
          }),
        otherwise: (schema) => schema.notRequired()
      }),
      brokerageSharing: Yup.number().when('userType', {
        is: 'master',
        then: (schema) => schema
          .min(0, 'Must be positive')
          .required('Brokerage sharing is required')
          .test('max-brokerage', 'Cannot exceed available brokerage', function(value) {
            const availableBrokerage = userConfig?.brokeragePercentage || 100
            if (value && value > availableBrokerage) {
              return this.createError({ message: `Cannot exceed available brokerage of ${availableBrokerage}` })
            }
            return true
          }),
        otherwise: (schema) => schema.notRequired()
      })
    })
  }

  // Fetch user config on component mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserConfig = async () => {
      if (!isMounted || configFetchedRef.current) return;
      
      configFetchedRef.current = true;
      
      try {
        setConfigLoading(true)
        setConfigError(null)
        console.log('🔄 [CreateNewUser] Fetching user config...');
        // Get userId from localStorage
        const userDataStr = localStorage.getItem('userData')
        if (!userDataStr) {
          throw new Error('User data not found in localStorage')
        }
        const userData = JSON.parse(userDataStr)
        const userId = userData.userId || 2
        const roleId = userData.roleId || 2

        const config = await userManagementService.fetchUserConfig(userId)
        console.log('✅ [CreateNewUser] User config fetched successfully');
        
        if (!isMounted) return;
        
        setUserConfig(config)
        setOriginalUserConfig(config) // Store original config for restoration

        // Build user type options based on addMaster field from API
        const options = []
        if (config.addMaster) {
          // If addMaster is true, allow creating both master and client
          options.push(
            { value: 'master', label: 'Master', icon: User, description: 'Master account' },
            { value: 'client', label: 'Client', icon: User, description: 'Regular trading client' }
          )
        } else {
          // If addMaster is false, only allow creating client
          options.push(
            { value: 'client', label: 'Client', icon: User, description: 'Regular trading client' }
          )
        }
        setUserTypeOptions(options)
        setAvailableUserTypes(options)

        if (!isEditMode) {
          // Only auto-select first user and patch initial values in create mode
          // Patch initialValues.exchanges from allowedExchanges
          let patchedExchanges = { ...initialValues.exchanges }
          if (config.allowedExchanges && Array.isArray(config.allowedExchanges)) {
            config.allowedExchanges.forEach((ex) => {
              const key = ex.name.toLowerCase() as keyof typeof patchedExchanges
              if (key in patchedExchanges) {
                patchedExchanges[key] = {
                  ...patchedExchanges[key],
                  enabled: false,
                  turnoverBrk: false,
                  symbolBrk: false,
                  group: ex.groupId ? String(ex.groupId) : patchedExchanges[key].group
                }
              }
            })
          }

          // Auto-select first user by default
          const firstUser = config.userList?.[0]
          if (firstUser) {
            const firstUsername = firstUser.username
            // Set form initial values with first user selected
            const initialFormValues = { 
              ...initialValues, 
              accountName: firstUsername,
              exchanges: patchedExchanges || initialValues.exchanges
            }
            setFormInitialValues(initialFormValues)
            // Update selected user state
            setSelectedUserRole(firstUser.roleId)
            setSelectedUserId(firstUser.userId)
            setSearchQuery(firstUsername)
            // Update user config with first user's data
            setUserConfig(prev => ({ 
              ...(prev || config), 
              pnlSharing: firstUser.pnlSharing || 100, 
              brokeragePercentage: firstUser.brkSharing || 100, 
              credits: firstUser.credits || 0 
            }))
            // If admin (roleId 2) is selected, show only master option
            if (firstUser.roleId === 2) {
              const masterOnlyOption = [
                { value: 'master', label: 'Master', icon: User, description: 'Master account' }
              ]
              setAvailableUserTypes(masterOnlyOption)
            }
          } else {
            // Fallback if no users available
            setFormInitialValues({ 
              ...initialValues, 
              exchanges: patchedExchanges || initialValues.exchanges
            })
          }
        }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to fetch user configuration'
        console.error('❌ Error fetching user config:', error)
        setConfigError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setConfigLoading(false)
      }
    }
    fetchUserConfig()
    
    return () => {
      isMounted = false;
    };
  }, [])

  // Load editing user data when in edit mode
  useEffect(() => {
    if (isEditMode && editingUserId) {
      // Find the current tab and get the cached user data
      const currentTab = tabs.find(tab => tab.path.includes(`userId=${editingUserId}`))
      
      if (currentTab?.cacheData?.formData?.editingUserData) {
        const userData = currentTab.cacheData.formData.editingUserData
        setEditingUser(userData)
      }
    }
  }, [isEditMode, editingUserId, tabs])

  // Compute patched form initial values using useMemo
  const patchedFormInitialValues = React.useMemo(() => {
    if (isEditMode && editingUser && userConfig && !configLoading) {
      const allowedExchangesArr = editingUser.allowedExchanges || [];
      const exchangesObj: any = {
        nse: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false },
        mcx: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false },
        sgx: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false },
        cds: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false },
        callput: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false },
        others: { enabled: false, turnoverBrk: false, symbolBrk: false, group: '', highLowLimit: false }
      };
      allowedExchangesArr.forEach((ex: any) => {
        const key = ex.name?.toLowerCase();
        if (key && exchangesObj.hasOwnProperty(key)) {
          exchangesObj[key] = {
            enabled: true,
            turnoverBrk: !!ex.turnover,
            symbolBrk: !!ex.lot,
            group: ex.groupId ? String(ex.groupId) : '',
            highLowLimit: false
          };
        }
      });
      let highTradeLimitObj = { nse: false, mcx: false, sgx: false, cds: false, callput: false };
      
      if (editingUser.highLowTradeLimit) {
        const highArr = Array.isArray(editingUser.highLowTradeLimit)
          ? editingUser.highLowTradeLimit
          : String(editingUser.highLowTradeLimit).split(',');
        
        highArr.forEach((ex: string) => {
          const key = ex.trim().toLowerCase();
          if (key && highTradeLimitObj.hasOwnProperty(key)) {
            highTradeLimitObj[key] = true;
          }
        });
      }
      
      const patched = {
        ...initialValues,
        name: editingUser.name || '',
        username: editingUser.username || '',
        password: '',
        retypePassword: '',
        accountName: editingUser.username || '',
        userType: editingUser.roleId === 3 ? 'master' : (editingUser.roleId === 4 ? 'client' : ''),
        mobileNumber: editingUser.mobile || '',
        city: editingUser.city || '',
        credit: editingUser.credit ?? 0,
        remark: editingUser.remark ?? '',
        pnlSharing: editingUser.pnlSharing ?? editingUser.sharing ?? 0,
        brokerageSharing: editingUser.brokeragePercentage ?? editingUser.brokerageSharing ?? editingUser.brkSharing ?? 0,
        addMaster: editingUser.addMaster ?? false,
        changePasswordOnFirstLogin: editingUser.changePasswordFirstLogin ?? false,
        autoSquareOff: editingUser.marginSquareOff ?? editingUser.autoSquareOff ?? false,
        exchanges: exchangesObj,
        highTradeLimit: highTradeLimitObj,
        bet: editingUser.bet !== undefined ? editingUser.bet : true,
        closeOut: editingUser.closeOut !== undefined ? editingUser.closeOut : true,
        margin: editingUser.margin !== undefined ? editingUser.margin : true,
        status: editingUser.status !== undefined ? editingUser.status : true,
        creditLimit: editingUser.creditLimit !== undefined ? editingUser.creditLimit : true,
      };
      
      return patched;
    }
    return formInitialValues;
  }, [isEditMode, editingUser, userConfig, configLoading, formInitialValues]);

  // Handler for when user selects an account from dropdown
  const handleAccountChange = async (username: string, setFieldValue: any) => {
    setFieldValue('accountName', username)
    
    if (!username) {
      // If cleared, reset to default - restore original userConfig values
      setSelectedUserRole(null)
      setSelectedUserId(null)
      setAvailableUserTypes(userTypeOptions)
      setFieldValue('userType', userTypeOptions.length > 0 ? userTypeOptions[0].value : '')
      setSelectedUserAllowedExchanges([])
      setSelectedUserAllowedExchangeCount(0)
      
      // Restore original userConfig
      if (originalUserConfig) {
        setUserConfig(originalUserConfig)
      }
      return
    }
    
    // Find the selected user in userList
    const selectedUser = userConfig?.userList?.find(user => user.username === username)
    
    if (selectedUser) {
      const selectedRoleId = selectedUser.roleId
      setSelectedUserRole(selectedRoleId)
      setSelectedUserId(selectedUser.userId)
      
      // Update userConfig with selected user's pnlSharing and brkSharing values
      if (userConfig) {
        setUserConfig({
          ...userConfig,
          pnlSharing: selectedUser.pnlSharing || 100,
          brokeragePercentage: selectedUser.brkSharing || 100,
          credits: selectedUser.credits || 0
        })
      }
      
      // If admin (roleId 2) is selected, show only master option
      if (selectedRoleId === 2) {
        const masterOnlyOption = [
          { value: 'master', label: 'Master', icon: User, description: 'Master account' }
        ]
        setAvailableUserTypes(masterOnlyOption)
        setFieldValue('userType', 'master')
      } else {
        // For other roles, show all available options
        setAvailableUserTypes(userTypeOptions)
        setFieldValue('userType', '')
      }

      // Fetch selected user details to get allowed exchanges
      try {
        setIsFetchingSelectedUserDetails(true)
        const detailsResponse = await userManagementService.fetchUserDetails(selectedUser.userId)
        const userInfo = detailsResponse?.data?.userInfo
        const allowed = userInfo?.allowedExchanges || []
        let allowedKeys = Array.isArray(allowed)
          ? allowed
              .map((ex: any) => (ex?.name || '').toString().toLowerCase())
              .filter((name: string) => name)
          : []

        // Fallback to comma-separated exchanges string if allowedExchanges is empty
        if (allowedKeys.length === 0 && typeof userInfo?.exchanges === 'string') {
          allowedKeys = userInfo.exchanges
            .split(',')
            .map((name) => name.trim().toLowerCase())
            .filter((name) => name)
        }

        setSelectedUserAllowedExchanges(allowedKeys)
        setSelectedUserAllowedExchangeCount(allowedKeys.length)

        // Disable exchanges not allowed for the selected user
        exchangeData.forEach((ex) => {
          const allowedForUser = allowedKeys.length === 0 || allowedKeys.includes(ex.key)
          if (!allowedForUser) {
            setFieldValue(`exchanges.${ex.key}.enabled`, false)
            setFieldValue(`exchanges.${ex.key}.turnoverBrk`, false)
            setFieldValue(`exchanges.${ex.key}.symbolBrk`, false)
          }
        })
      } catch (error) {
        console.error('❌ Error fetching selected user details:', error)
        setSelectedUserAllowedExchanges([])
        setSelectedUserAllowedExchangeCount(0)
      } finally {
        setIsFetchingSelectedUserDetails(false)
      }
    } else {
      setSelectedUserRole(null)
      setSelectedUserId(null)
      setAvailableUserTypes(userTypeOptions)
      setSelectedUserAllowedExchanges([])
      setSelectedUserAllowedExchangeCount(0)
    }
  }

  // Handler for username validation on blur
  const handleUsernameBlur = async (username: string) => {
    if (!username) {
      setUsernameError(null)
      return
    }

    try {
      setUsernameValidating(true)
      setUsernameError(null)
      
      const response = await userManagementService.checkUsername(username)
      
      console.log('✅ Username validation response:', response)
      
      // Check response code - if "0" or "1000" means valid/available
      const code = response?.responseCode ?? response?.data?.responseCode ?? null
      const message = response?.responseMessage ?? response?.data?.responseMessage ?? 'Username validation failed'
      
      if (code !== '0' && code !== '1000') {
        setUsernameError(message || 'Username is not available')
      } else {
        setUsernameError(null)
      }
    } catch (error: any) {
      console.error('❌ Error validating username:', error)
      const errorMsg = error?.response?.data?.responseMessage || error.message || 'Failed to validate username'
      setUsernameError(errorMsg)
    } finally {
      setUsernameValidating(false)
    }
  }

  const isExchangeAllowed = (key: string) => {
    if (!forUserAccount) return true
    if (selectedUserAllowedExchanges.length === 0) return true
    return selectedUserAllowedExchanges.includes(key)
  }

  const handleSubmit = async (values: typeof initialValues, { resetForm }: any) => {
    try {
      console.log('Form Submitted:', values)

      // Check if there's a username validation error
      if (!isEditMode && usernameError) {
        toast.error('Please fix username validation errors before submitting')
        return
      }

      if (isEditMode && editingUser) {
        // EDIT MODE - Use editUserDetails API
        const userDataStr = localStorage.getItem('userData')
        const userData = userDataStr ? JSON.parse(userDataStr) : null
        const parentUserId = userData?.userId || 2

        // Prepare allowedExchanges array from form values
        const allowedExchanges = Object.entries(values.exchanges)
          .filter(([key, exchange]) => exchange.enabled)
          .map(([key, exchange]) => ({
            name: key.toUpperCase(),
            turnover: exchange.turnoverBrk,
            lot: exchange.symbolBrk,
            groupId: null
          }))

        // Prepare highLowTradeLimit
        const highLowTradeLimit = Object.entries(values.highTradeLimit)
          .filter(([key, isEnabled]) => isEnabled)
          .map(([key]) => key.toUpperCase())
          .join(',')

        // Build update payload - only include editable fields from API spec
        const updatePayload = {
          name: values.name,
          mobile: values.mobileNumber,
          city: values.city,
          remarks: values.remark,
          pnlSharing: values.pnlSharing || 0,
          brkSharing: values.brokerageSharing || 0,
          addMaster: values.addMaster,
          changePasswordFirstLogin: values.changePasswordOnFirstLogin,
          highLowTradeLimit,
          allowedExchanges
        }

        console.log('📤 Update User API Payload:', updatePayload)

        const response = await userManagementService.editUserDetails(parentUserId, parseInt(editingUserId!), updatePayload)
        
        console.log('✅ API Response:', response)
        
        if (response?.responseCode === '0' || response?.responseCode === '1000') {
          toast.success(response?.responseMessage || 'User updated successfully!')
          
          // Clear userList cache so it refetches fresh data
          sessionStorage.removeItem('userListCache')
          sessionStorage.removeItem('userListCacheTime')
          
          // Close the current tab
          const currentTab = tabs.find(tab => tab.path.includes(`userId=${editingUserId}`))
          if (currentTab) {
            removeTab(currentTab.id)
          }
          
          // Navigate back immediately
          navigateWithScrollToTop(navigate, '/dashboard/user-list')
        } else {
          toast.error(response?.responseMessage || 'Failed to update user')
        }
      } else {
        // CREATE MODE - Original logic
        // Map userType to roleId (3 = master, 4 = client)
        const roleId = values.userType === 'master' ? 3 : 4

        // Prepare allowedExchanges array from form values
        const allowedExchanges = Object.entries(values.exchanges)
          .filter(([key, exchange]) => exchange.enabled)
          .map(([key, exchange]) => ({
            name: key.toUpperCase(),
            turnover: exchange.turnoverBrk,
            lot: exchange.symbolBrk,
            groupId: null
          }))

        // Prepare highLowTradeLimit from High Trade Limit section (when admin account is selected)
        const highLowTradeLimit = selectedUserRole === 2
          ? Object.entries(values.highTradeLimit)
              .filter(([key, isEnabled]) => isEnabled)
              .map(([key]) => key.toUpperCase())
              .join(',')
          : ''

        // Prepare API payload
        const apiPayload = {
          userType: roleId,
          name: values.name,
          username: values.username,
          password: values.password,
          confirmPassword: values.retypePassword,
          credits: values.credit,
          remarks: values.remark,
          pnlSharing: values.userType === 'master' ? values.pnlSharing : 0,
          brokeragePercentage: values.userType === 'master' ? values.brokerageSharing : 0,
          highLowTradeLimit,
          addMaster: values.addMaster,
          changePasswordFirstLogin: values.changePasswordOnFirstLogin,
          marginSquareOff: values.autoSquareOff,
          allowedExchanges
        }

        console.log('📤 API Payload:', apiPayload)

        // Call API with the selected user's ID (or fallback to logged-in user's ID)
        const response = await userManagementService.createUser(apiPayload, selectedUserId)
        
        console.log('✅ API Response:', response)
        
        // Check response code - "0" or "1000" is success, anything else is error
        if (response?.responseCode === '0' || response?.responseCode === '1000') {
          toast.success(response?.responseMessage || 'User created successfully!')
          
          // Clear userList cache so it refetches fresh data
          sessionStorage.removeItem('userListCache')
          sessionStorage.removeItem('userListCacheTime')
          
          // Clear the form and reset to initial values
          resetForm()
          
          // Reset the selectedUserRole, selectedUserId and availableUserTypes
          setSelectedUserRole(null)
          setSelectedUserId(null)
          setAvailableUserTypes(userTypeOptions)
          
          // Optionally navigate back after a short delay to show the success message
          setTimeout(() => {
            navigateWithScrollToTop(navigate, '/dashboard')
          }, 1500)
        } else {
          // Handle API error response
          toast.error(response?.responseMessage || 'Failed to create user')
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error)
      // Check if error response has the standard format
      const errorData = error.response?.data
      const errorMessage = errorData?.responseMessage || error.message || 'Failed to process request'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-text-primary">
              {isEditMode ? `Update User - ${editingUserId}` : 'Create New User'}
            </h1>
            <p className="text-text-secondary text-sm">
              {isEditMode ? 'Update user account details and exchange permissions' : 'Set up a new trading account with exchange permissions'}
            </p>
          </div>
        </motion.div>

        {/* Loading State */}
        {configLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-surface-primary border border-border-primary rounded-2xl p-8 text-center"
          >
            <div className="flex justify-center mb-4">
              <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-text-secondary">Loading user configuration...</p>
          </motion.div>
        )}

        {/* Error State */}
        {configError && !configLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-start gap-3">
              <div className="text-red-500 mt-1">⚠️</div>
              <div>
                <p className="font-semibold text-red-900">Failed to load user configuration</p>
                <p className="text-red-700 text-sm mt-1">{configError}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Success State - Show form and config */}
        {!configLoading && userConfig && (
        <Formik
          key={isEditMode ? `edit-${editingUserId}` : 'create'}
          enableReinitialize
          initialValues={patchedFormInitialValues}
          validationSchema={getValidationSchema()}
          validateOnChange={true}
          validateOnBlur={true}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, setFieldValue, isValid, validateForm }: any) => {
            // Debug: Log what Formik received and what it has
            React.useEffect(() => {
              console.log('🎨 [Formik Render] Current values in form:', {
                credit: values.credit,
                remark: values.remark,
                username: values.username,
                name: values.name
              })
              console.log('🎨 [Formik Render] patchedFormInitialValues passed to Formik:', {
                credit: patchedFormInitialValues.credit,
                remark: patchedFormInitialValues.remark,
                username: patchedFormInitialValues.username,
                name: patchedFormInitialValues.name
              })
            }, [values.credit, values.remark, values.username, values.name])
            
            // Re-validate when selectedUserRole or availableUserTypes change
            React.useEffect(() => {
              validateForm()
            }, [selectedUserRole, availableUserTypes.length, validateForm])
            
            const visibleExchangeData = forUserAccount && selectedUserAllowedExchanges.length > 0
              ? exchangeData.filter((ex) => isExchangeAllowed(ex.key))
              : exchangeData

            return (
            <Form className="space-y-6">
              {/* Account Selection - Hidden in Edit Mode */}
              {!isEditMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-primary border border-border-primary rounded-2xl p-6"
                >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-brand-primary/20 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-brand-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">Account Setup</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-text-secondary">Create Account for User</label>
                      <div className="flex items-center gap-2">
                        <input
                          id="forUserCheckbox"
                          type="checkbox"
                          checked={forUserAccount}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setForUserAccount(checked)
                            // If disabled now (unchecked), reset to first option
                            if (!checked) {
                              const defaultAccount = userConfig?.userList && userConfig.userList.length > 0 ? userConfig.userList[0].username : ''
                              setFieldValue('accountName', defaultAccount)
                              setSearchQuery(defaultAccount)
                              handleAccountChange(defaultAccount, setFieldValue)
                            }
                          }}
                          className="w-4 h-4 rounded border border-border-primary bg-surface-secondary"
                        />
                        <label htmlFor="forUserCheckbox" className="text-xs text-text-secondary">For user</label>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          setShowDropdown(true)
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => {
                          // Delay to allow click on dropdown item
                          setTimeout(() => setShowDropdown(false), 200)
                        }}
                        placeholder="Search user..."
                        disabled={!forUserAccount}
                        className={`w-full h-12 px-4 py-3 bg-surface-secondary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all ${!forUserAccount ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-tertiary'}`}
                      />
                      <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                      
                      {/* Dropdown */}
                      {showDropdown && forUserAccount && userConfig?.userList && (
                        <div className="absolute z-10 w-full mt-1 bg-surface-secondary border border-border-primary rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {userConfig.userList
                            .filter((user) => 
                              user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              user.name.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((user) => (
                              <div
                                key={user.userId}
                                onClick={() => {
                                  setSearchQuery(user.username)
                                  setFieldValue('accountName', user.username)
                                  handleAccountChange(user.username, setFieldValue)
                                  setShowDropdown(false)
                                }}
                                className="px-4 py-2 hover:bg-surface-hover cursor-pointer text-text-primary text-sm border-b border-border-primary last:border-b-0"
                              >
                                {user.name} ({user.username}) - Role: {user.roleId}
                              </div>
                            ))}
                          {userConfig.userList.filter((user) => 
                            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            user.name.toLowerCase().includes(searchQuery.toLowerCase())
                          ).length === 0 && (
                            <div className="px-4 py-2 text-text-secondary text-sm">
                              No users found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <Field name="userType">
                    {({ field, meta, form }: any) => {
                      return (
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">
                          Select Type
                        </label>
                        <select
                          value={field.value}
                          onChange={(e) => {
                            const newValue = e.target.value
                            form.setFieldValue('userType', newValue)
                          }}
                          disabled={availableUserTypes.length === 0}
                          className={`w-full h-12 px-4 py-3 bg-surface-secondary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-brand-primary ${
                            availableUserTypes.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <option value="">Select user type</option>
                          {availableUserTypes.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {meta.touched && meta.error && (
                          <div className="mt-1 text-xs text-red-400">{meta.error}</div>
                        )}
                      </div>
                      )
                    }}
                  </Field>
                </div>
              </motion.div>
              )}

              {/* User Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-surface-primary border border-border-primary rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">User Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field name="name">
                    {({ field, meta }: any) => (
                      <Input
                        label="Name*"
                        icon={User}
                        placeholder="Enter full name"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        error={meta.touched && meta.error ? meta.error : ''}
                        isValid={field.value && !meta.error}
                      />
                    )}
                  </Field>

                  <Field name="username">
                    {({ field, meta }: any) => (
                      !isEditMode && (
                      <Input
                        label="Username*"
                        icon={Mail}
                        placeholder="Enter username"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={(e) => {
                          field.onBlur(e)
                          handleUsernameBlur(field.value)
                        }}
                        name={field.name}
                        error={usernameError || (meta.touched && meta.error ? meta.error : '')}
                        isValid={field.value && !meta.error && !usernameError && !usernameValidating}
                      />
                      )
                    )}
                  </Field>

                  <Field name="password">
                    {({ field, meta }: any) => (
                      !isEditMode && (
                      <Input
                        label="Password*"
                        icon={Key}
                        type="password"
                        placeholder="Enter password"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        showPasswordToggle
                        error={meta.touched && meta.error ? meta.error : ''}
                        isValid={field.value && !meta.error}
                      />
                      )
                    )}
                  </Field>

                  <Field name="retypePassword">
                    {({ field, meta }: any) => (
                      !isEditMode && (
                      <Input
                        label="Retype Password*"
                        icon={Key}
                        type="password"
                        placeholder="Confirm password"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        showPasswordToggle
                        error={meta.touched && meta.error ? meta.error : ''}
                        isValid={field.value && !meta.error}
                      />
                      )
                    )}
                  </Field>

                  <Field name="mobileNumber">
                    {({ field, meta }: any) => (
                      <Input
                        label="Mobile Number"
                        icon={Phone}
                        placeholder="Enter mobile number"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        error={meta.touched && meta.error ? meta.error : ''}
                        isValid={field.value && !meta.error}
                      />
                    )}
                  </Field>

                  <Field name="city">
                    {({ field, meta }: any) => (
                      <Input
                        label="City"
                        icon={MapPin}
                        placeholder="Enter city"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        error={meta.touched && meta.error ? meta.error : ''}
                        isValid={field.value && !meta.error}
                      />
                    )}
                  </Field>

                  {/* Credit Field - Hidden in Edit Mode */}
                  {!isEditMode && (
                    <Field name="credit">
                      {({ field, meta }: any) => {
                        const availableCredit = userConfig?.credits || 0
                        const currentValue = field.value || 0
                        const isExceeding = currentValue > availableCredit
                        
                        return (
                        <div>
                          <Input
                            label={`Credit (Available: ${availableCredit})`}
                            icon={CreditCard}
                            type="number"
                            placeholder="Enter credit amount"
                            value={field.value || ''}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            error={
                              isExceeding 
                                ? `Cannot exceed available credit of ${availableCredit}` 
                                : meta.touched && meta.error ? meta.error : ''
                            }
                            isValid={field.value !== '' && field.value !== 0 && !meta.error && !isExceeding}
                            min="0"
                            step="1"
                          />
                        </div>
                        )
                      }}
                    </Field>
                  )}

                  <Field name="remark">
                    {({ field, meta }: any) => (
                      <Input
                        label="Remark"
                        icon={MessageSquare}
                        placeholder="Enter remarks"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        error={meta.touched && meta.error ? meta.error : ''}
                        isValid={field.value && !meta.error}
                      />
                    )}
                  </Field>
                </div>
                </motion.div>

              {/* Partnership Share Detail - Only show when userType is master */}
              {values.userType === 'master' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-red-500/10 border-2 border-purple-500/30 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
                    Partnership Share Detail
                  </h3>
                </div>

                {/* PROFIT & LOSS SHARING */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">
                    Profit & Loss Sharing*
                  </label>
                      <Field name="pnlSharing">
                    {({ field, meta }: any) => {
                      const availablePnl = userConfig?.pnlSharing || 100
                      const currentValue = field.value ?? 0
                      const isExceeding = currentValue > availablePnl
                      const remaining = availablePnl - currentValue
                      
                      return (
                      <div>
                        <input
                          type="number"
                          placeholder="Enter Profit & Loss sharing"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={(e) => {
                            field.onBlur(e)
                            // Trigger validation on blur only if truly empty (not zero)
                            if (field.value === '' || field.value === null || field.value === undefined) {
                              setTimeout(() => field.onBlur(e), 0)
                            }
                          }}
                          name={field.name}
                          min="0"
                          step="0.01"
                          className={`w-full h-14 px-4 py-3 bg-surface-secondary border-2 rounded-xl text-text-primary text-lg focus:ring-2 transition-all ${
                            isExceeding || (meta.touched && meta.error)
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                              : 'border-border-primary focus:ring-purple-500 focus:border-purple-500'
                          }`}
                        />
                        {isExceeding && (
                          <div className="mt-1 text-xs text-red-400">
                            Cannot exceed available P&L sharing of {availablePnl}
                          </div>
                        )}
                        {meta.touched && meta.error && !isExceeding && (
                          <div className="mt-1 text-xs text-red-400">{meta.error}</div>
                        )}
                      </div>
                      )
                    }}
                  </Field>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-surface-secondary rounded-xl p-4 border border-border-primary">
                      <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide">Our</p>
                      <p className="text-2xl font-bold text-purple-500">{userConfig?.pnlSharing || 100}.00</p>
                    </div>
                    <div className="bg-surface-secondary rounded-xl p-4 border border-border-primary">
                      <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide">Remaining</p>
                      <p className={`text-2xl font-bold ${
                        (values.pnlSharing || 0) > (userConfig?.pnlSharing || 100) 
                          ? 'text-red-500' 
                          : 'text-text-primary'
                      }`}>
                        {((userConfig?.pnlSharing || 100) - (values.pnlSharing || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* BRK SHARING */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">
                    BRK Sharing*
                  </label>
                    <Field name="brokerageSharing">
                    {({ field, meta }: any) => {
                      const availableBrokerage = userConfig?.brokeragePercentage || 100
                      const currentValue = field.value ?? 0
                      const isExceeding = currentValue > availableBrokerage
                      const remaining = availableBrokerage - currentValue
                      
                      return (
                      <div>
                        <input
                          type="number"
                          placeholder="Enter Brokerage sharing"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={(e) => {
                            field.onBlur(e)
                            // Trigger validation on blur only if truly empty (not zero)
                            if (field.value === '' || field.value === null || field.value === undefined) {
                              setTimeout(() => field.onBlur(e), 0)
                            }
                          }}
                          name={field.name}
                          min="0"
                          step="0.01"
                          className={`w-full h-14 px-4 py-3 bg-surface-secondary border-2 rounded-xl text-text-primary text-lg focus:ring-2 transition-all ${
                            isExceeding || (meta.touched && meta.error)
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                              : 'border-border-primary focus:ring-purple-500 focus:border-purple-500'
                          }`}
                        />
                        {isExceeding && (
                          <div className="mt-1 text-xs text-red-400">
                            Cannot exceed available brokerage of {availableBrokerage}
                          </div>
                        )}
                        {meta.touched && meta.error && !isExceeding && (
                          <div className="mt-1 text-xs text-red-400">{meta.error}</div>
                        )}
                      </div>
                      )
                    }}
                  </Field>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-surface-secondary rounded-xl p-4 border border-border-primary">
                      <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide">Our</p>
                      <p className="text-2xl font-bold text-pink-500">{userConfig?.brokeragePercentage || 100}.00</p>
                    </div>
                    <div className="bg-surface-secondary rounded-xl p-4 border border-border-primary">
                      <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide">Remaining</p>
                      <p className={`text-2xl font-bold ${
                        (values.brokerageSharing || 0) > (userConfig?.brokeragePercentage || 100) 
                          ? 'text-red-500' 
                          : 'text-text-primary'
                      }`}>
                        {((userConfig?.brokeragePercentage || 100) - (values.brokerageSharing || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
              )}

              {/* Exchange Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface-primary border border-border-primary rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Exchange Settings</h3>
                    {forUserAccount && (
                      <p className="text-xs text-text-secondary mt-1">
                        {isFetchingSelectedUserDetails
                          ? 'Loading allowed exchanges…'
                          : `Allowed exchanges: ${selectedUserAllowedExchangeCount}`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Master View - Only Exchange Selection */}
                {values.userType === 'master' ? (
                  <div>
                    <div className="flex items-center justify-end mb-3">
                      {/* Select All Toggle */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-text-secondary">Select All</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={visibleExchangeData.every((ex) => values.exchanges[ex.key as keyof typeof values.exchanges].enabled)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              visibleExchangeData.forEach((ex) => {
                                if (isExchangeAllowed(ex.key)) {
                                  setFieldValue(`exchanges.${ex.key}.enabled`, checked)
                                }
                              })
                            }}
                          />
                          <div className="relative w-11 h-6 bg-gray-200 dark:bg-surface-secondary rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {visibleExchangeData.map((exchange) => (
                        <div 
                          key={exchange.key} 
                          className="bg-surface-secondary border border-border-primary rounded-lg p-4 hover:border-brand-primary transition-all"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 ${exchange.color} rounded-lg flex items-center justify-center`}>
                              <span className="text-white text-sm font-bold">{exchange.name.slice(0, 2)}</span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-text-primary text-sm">{exchange.name}</div>
                              <div className="text-xs text-text-secondary">{exchange.fullName}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <span className="text-sm text-text-secondary">Enable</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={values.exchanges[exchange.key as keyof typeof values.exchanges].enabled}
                                  onChange={(e) => setFieldValue(`exchanges.${exchange.key}.enabled`, e.target.checked)}
                                  disabled={!isExchangeAllowed(exchange.key)}
                                />
                                <div className="relative w-11 h-6 bg-gray-200 dark:bg-surface-secondary rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                              </label>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Client/Admin View - Full Exchange Settings Table */
                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-primary">
                        <th className="text-left py-3 px-2 text-sm font-medium text-text-secondary">Exchange</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-text-secondary">Enable
                          <div className="inline-block ml-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={visibleExchangeData.every((ex) => values.exchanges[ex.key as keyof typeof values.exchanges].enabled)}
                                onChange={(e) => {
                                  const checked = e.target.checked
                                  visibleExchangeData.forEach((ex) => {
                                    if (isExchangeAllowed(ex.key)) {
                                      setFieldValue(`exchanges.${ex.key}.enabled`, checked)
                                    }
                                  })
                                }}
                              />
                              <div className="relative w-8 h-5 bg-gray-200 dark:bg-surface-secondary rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                            </label>
                          </div>
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-text-secondary">Turnover Brk.</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-text-secondary">Symbol Brk.</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-text-secondary">Group</th>
                      </tr>
                    </thead>
                    <tbody className="space-y-2">
                      {visibleExchangeData.map((exchange) => (
                        <tr key={exchange.key} className="hover:bg-surface-hover transition-colors">
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 ${exchange.color} rounded-lg flex items-center justify-center`}>
                                <span className="text-white text-xs font-bold">{exchange.name.slice(0, 2)}</span>
                              </div>
                              <div>
                                <div className="font-medium text-text-primary text-sm">{exchange.name}</div>
                                <div className="text-xs text-text-secondary">{exchange.fullName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={values.exchanges[exchange.key as keyof typeof values.exchanges].enabled}
                                onChange={(e) => setFieldValue(`exchanges.${exchange.key}.enabled`, e.target.checked)}
                                disabled={!isExchangeAllowed(exchange.key)}
                              />
                              <div className="relative w-8 h-5 bg-gray-200 dark:bg-surface-secondary rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                            </label>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={values.exchanges[exchange.key as keyof typeof values.exchanges].turnoverBrk}
                                onChange={(e) => setFieldValue(`exchanges.${exchange.key}.turnoverBrk`, e.target.checked)}
                                disabled={!isExchangeAllowed(exchange.key)}
                              />
                              <div className="relative w-8 h-5 bg-gray-200 dark:bg-surface-secondary rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                            </label>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={values.exchanges[exchange.key as keyof typeof values.exchanges].symbolBrk}
                                onChange={(e) => setFieldValue(`exchanges.${exchange.key}.symbolBrk`, e.target.checked)}
                                disabled={!isExchangeAllowed(exchange.key)}
                              />
                              <div className="relative w-8 h-5 bg-gray-200 dark:bg-surface-secondary rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                            </label>
                          </td>
                          <td className="py-4 px-2">
                            <select
                              value={values.exchanges[exchange.key as keyof typeof values.exchanges].group}
                              onChange={(e) => 
                                setFieldValue(`exchanges.${exchange.key}.group`, e.target.value)
                              }
                              disabled={!isExchangeAllowed(exchange.key)}
                              className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary text-sm focus:ring-1 focus:ring-brand-primary focus:border-transparent transition-all"
                            >
                              <option value={exchange.defaultGroup}>{exchange.defaultGroup}</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </motion.div>

              {/* High Trade Limit - Only when Admin account is selected OR in edit mode for Master users with highLowTradeLimit */}
              {(selectedUserRole === 2 || (isEditMode && editingUser?.roleId === 3 && editingUser?.highLowTradeLimit)) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.27 }}
                className="bg-surface-primary border border-border-primary rounded-2xl p-6"
              >
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary">High Trade Limit</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-text-secondary">Select All</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exchangeData.filter(ex => ex.key !== 'others').every(
                          ex => values.highTradeLimit[ex.key as keyof typeof values.highTradeLimit]
                        )}
                        onChange={(e) => {
                          const newHighTradeLimit = { ...values.highTradeLimit }
                          exchangeData.filter(ex => ex.key !== 'others').forEach(ex => {
                            newHighTradeLimit[ex.key as keyof typeof newHighTradeLimit] = e.target.checked
                          })
                          setFieldValue('highTradeLimit', newHighTradeLimit)
                        }}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-gray-200 dark:bg-surface-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {exchangeData.filter(ex => ex.key !== 'others').map((exchange) => (
                    <div key={`high-trade-${exchange.key}`} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">{exchange.name}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={values.highTradeLimit[exchange.key as keyof typeof values.highTradeLimit] || false}
                          onChange={(e) => 
                            setFieldValue(`highTradeLimit.${exchange.key}`, e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 dark:bg-surface-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </motion.div>
              )}

              {/* Additional Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-surface-primary border border-border-primary rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Key className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">Additional Settings</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Change Password On First Login - Hidden in Edit Mode */}
                  {!isEditMode && (
                    <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-primary">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Key className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-text-primary cursor-pointer">
                            Change Password On First Login
                          </label>
                          <p className="text-xs text-text-secondary mt-1">
                            User will be required to change password on first login
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={values.changePasswordOnFirstLogin || false}
                        onChange={(e) => setFieldValue('changePasswordOnFirstLogin', e.target.checked)}
                        className="w-5 h-5 text-brand-primary bg-surface-secondary border-2 border-border-primary rounded focus:ring-brand-primary focus:ring-2"
                      />
                    </div>
                  )}

                  {/* Auto Square Off - Only for Client */}
                  {values.userType === 'client' && (
                    <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-primary">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-text-primary cursor-pointer">
                            Auto Square Off
                          </label>
                          <p className="text-xs text-text-secondary mt-1">
                            Automatically square off positions at market close
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={values.autoSquareOff || false}
                          onChange={(e) => setFieldValue('autoSquareOff', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                      </label>
                    </div>
                  )}

                  {/* Add Master - Only for Master */}
                  {values.userType === 'master' && (
                    <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-primary">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-purple-500" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-text-primary cursor-pointer">
                            Add Master
                          </label>
                          <p className="text-xs text-text-secondary mt-1">
                            Allow this user to create master accounts
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={values.addMaster || false}
                          onChange={(e) => setFieldValue('addMaster', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                      </label>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex items-center justify-between gap-4 pt-6"
              >
                <div className="text-xs text-text-secondary flex items-center gap-4">
                  <span>2/11/2025 12:06:32</span>
                  <span>v1.1.2.28</span>
                  <div className="flex items-center gap-2">
                    <span>PL: -478.65</span>
                    <span>BK: 33.36</span>
                    <span>OTHER: 0.00</span>
                    <span>BAL: -445.29</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => navigateWithScrollToTop(navigate, isEditMode ? '/dashboard/user-list' : '/dashboard')}
                    className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isValid || (!isEditMode && usernameError !== null)}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:via-pink-600 disabled:hover:to-red-600"
                  >
                    {isEditMode ? 'Update User' : 'Save'}
                  </button>
                </div>
              </motion.div>
            </Form>
            )
          }}
        </Formik>
        )}
      </div>
    </div>
  )
}

export default CreateNewUser