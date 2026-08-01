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
import { userManagementService, groupService } from '../../services'
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

// Initial form values
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
  changePasswordOnFirstLogin: true,
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

const exchangeData = [
  { key: 'nse', name: 'NSE', fullName: 'National Stock Exchange', defaultGroup: 'NSE_DEFAULT', color: 'bg-blue-500' },
  { key: 'mcx', name: 'MCX', fullName: 'Multi Commodity Exchange', defaultGroup: 'MCX_2_LOT', color: 'bg-purple-500' },
  { key: 'sgx', name: 'SGX', fullName: 'Singapore Exchange', defaultGroup: 'SGX_500', color: 'bg-purple-500' },
  { key: 'cds', name: 'CDS', fullName: 'Currency Derivatives', defaultGroup: 'CDS_25_Lot', color: 'bg-orange-500' },
  { key: 'callput', name: 'CALLPUT', fullName: 'Options Trading', defaultGroup: 'CALLPUT_10_Lot', color: 'bg-indigo-500' },
  { key: 'others', name: 'OTHERS', fullName: 'Other Instruments', defaultGroup: 'OTHERS_250', color: 'bg-gray-500' }
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
  const [userTypeOptions, setUserTypeOptions] = useState<Array<{ value: string; label: string; icon: any; description: string }>>([])
  const [selectedUserRole, setSelectedUserRole] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [availableUserTypes, setAvailableUserTypes] = useState<Array<{ value: string; label: string; icon: any; description: string }>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [usernameValidating, setUsernameValidating] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [selectedUserAllowedExchanges, setSelectedUserAllowedExchanges] = useState<string[]>([])
  const [selectedUserAllowedExchangeCount, setSelectedUserAllowedExchangeCount] = useState(0)
  const [selectedUserHighLowTradeLimit, setSelectedUserHighLowTradeLimit] = useState<{ nse: boolean; mcx: boolean; sgx: boolean; cds: boolean; callput: boolean }>({ nse: false, mcx: false, sgx: false, cds: false, callput: false })
  const [selectedUserParentPnlSharing, setSelectedUserParentPnlSharing] = useState<number>(100)
  const [selectedUserParentBrkSharing, setSelectedUserParentBrkSharing] = useState<number>(100)
  const [isFetchingSelectedUserDetails, setIsFetchingSelectedUserDetails] = useState(false)
  const [exchangeGroups, setExchangeGroups] = useState<{ [key: string]: any[] }>({})
  const [groupsLoading, setGroupsLoading] = useState(false)

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
        .test('max-credit', 'Cannot exceed available credit', function (value) {
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
          .test('max-pnl', 'Cannot exceed available P&L sharing', function (value) {
            const availablePnl = userConfig?.pnlSharing || 100
            if (value && value > availablePnl) {
              return this.createError({ message: `Cannot exceed available P&L sharing of ${availablePnl}` })
            }
            return true
          }),
        otherwise: (schema) => schema.notRequired()
      }),
      exchanges: Yup.object().test(
        'at-least-one-exchange-enabled',
        'At least one exchange must be enabled',
        function (exchangesValues) {
          if (!exchangesValues) return false;
          return Object.entries(exchangesValues).some(([key, config]: [string, any]) => {
            const allowed = !forUserAccount || selectedUserAllowedExchanges.length === 0 || selectedUserAllowedExchanges.includes(key);
            return allowed && config?.enabled === true;
          });
        }
      ),
      brokerageSharing: Yup.number().when('userType', {
        is: 'master',
        then: (schema) => schema
          .min(0, 'Must be positive')
          .required('Brokerage sharing is required')
          .test('max-brokerage', 'Cannot exceed available brokerage', function (value) {
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

  // Fetch groups dynamically based on a clean target UserId
  const fetchExchangeGroupsForUser = async (userId: number) => {
    try {
      setGroupsLoading(true)
      const requestPayload = {
        requestTimestamp: Date.now(),
        userId: userId
      }
      
      const response = await groupService.getGroupsByExchangeWiseUserSpecific(requestPayload);
      const actualData = response?.data ? response.data : response;

      if (actualData) {
        const groups: { [key: string]: any[] } = {}
        Object.entries(actualData).forEach(([exchangeName, groupList]: [string, any]) => {
          if (Array.isArray(groupList)) {
            // FIX: Filter out backend duplicates using an index filter mapping loop
            groups[exchangeName.toLowerCase()] = groupList.filter(
              (item, index, self) => self.findIndex(g => g.groupId === item.groupId) === index
            )
          }
        })
        setExchangeGroups(groups)
        return groups
      }
      return {}
    } catch (error) {
      console.error('❌ Error fetching exchange-wise user groups:', error)
      toast.error('Failed to update exchange group configuration layout options.')
      return {}
    } finally {
      setGroupsLoading(false)
    }
  }

  // Fetch initial user config on mount
  useEffect(() => {
    let isMounted = true;

    const fetchUserConfig = async () => {
      if (!isMounted || configFetchedRef.current) return;
      configFetchedRef.current = true;

      try {
        setConfigLoading(true)
        setConfigError(null)
        
        const userDataStr = localStorage.getItem('userData')
        if (!userDataStr) {
          throw new Error('User data not found in localStorage')
        }
        const userData = JSON.parse(userDataStr)
        const userId = userData.userId || 2

        const config = await userManagementService.fetchUserConfig(userId)

        if (!isMounted) return;

        setUserConfig(config)
        setOriginalUserConfig(config)

        const options = []
        if (config.addMaster) {
          options.push(
            { value: 'master', label: 'Master', icon: User, description: 'Master account' },
            { value: 'client', label: 'Client', icon: User, description: 'Regular trading client' }
          )
        } else {
          options.push({ value: 'client', label: 'Client', icon: User, description: 'Regular trading client' })
        }
        setUserTypeOptions(options)
        setAvailableUserTypes(options)

        if (!isEditMode) {
          let currentFetchedGroups = await fetchExchangeGroupsForUser(userId);
          let patchedExchanges = { ...initialValues.exchanges }
          if (config.allowedExchanges && Array.isArray(config.allowedExchanges)) {
            config.allowedExchanges.forEach((ex) => {
              const key = ex.name.toLowerCase() as keyof typeof patchedExchanges
              if (key in patchedExchanges) {
                const availableExchangeArray = currentFetchedGroups[key] || [];
                const defaultGroupIdFallback = availableExchangeArray.length > 0 ? String(availableExchangeArray[0].groupId) : '';

                patchedExchanges[key] = {
                  ...patchedExchanges[key],
                  enabled: false,
                  turnoverBrk: false,
                  symbolBrk: false,
                  group: ex.groupId ? String(ex.groupId) : defaultGroupIdFallback
                }
              }
            })
          }

          const firstUser = config.userList?.[0]
          if (firstUser) {
            const firstUsername = firstUser.username
            
            const subGroups = await fetchExchangeGroupsForUser(firstUser.userId);
            
            exchangeData.forEach((ex) => {
              const subExchangeGroupList = subGroups[ex.key] || [];
              if (subExchangeGroupList.length > 0 && patchedExchanges[ex.key as keyof typeof patchedExchanges]) {
                patchedExchanges[ex.key as keyof typeof patchedExchanges].group = String(subExchangeGroupList[0].groupId);
              }
            });

            const initialFormValues = {
              ...initialValues,
              accountName: firstUsername,
              exchanges: patchedExchanges || initialValues.exchanges
            }
            setFormInitialValues(initialFormValues)
            setSelectedUserRole(firstUser.roleId)
            setSelectedUserId(firstUser.userId)
            setSearchQuery(firstUsername)
            setUserConfig(prev => ({
              ...(prev || config),
              pnlSharing: firstUser.pnlSharing || 100,
              brokeragePercentage: firstUser.brkSharing || 100,
              credits: firstUser.credits || 0
            }))
            if (firstUser.roleId === 2) {
              setAvailableUserTypes([{ value: 'master', label: 'Master', icon: User, description: 'Master account' }])
            }
          } else {
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
      const currentTab = tabs.find(tab => tab.path.includes(`userId=${editingUserId}`))
      if (currentTab?.cacheData?.formData?.editingUserData) {
        setEditingUser(currentTab.cacheData.formData.editingUserData)
      }
    }
  }, [isEditMode, editingUserId, tabs])

  // Fetch fresh user details from API when in edit mode
  useEffect(() => {
    if (isEditMode && editingUserId && !editingUser) {
      const fetchFreshUserDetails = async () => {
        try {
          const response = await userManagementService.fetchUserDetails(parseInt(editingUserId))
          if (response?.responseCode === '0' || response?.responseCode === '1000') {
            const apiUserData = response.data.userInfo
            const userSettings = response.data.userSettings

            let marginSquareOffValue = false
            if (userSettings?.userInfo && Array.isArray(userSettings.userInfo)) {
              const marginSquareOffToggle = userSettings.userInfo.find((item: any) => item.toggle === 'marginSquareOff')
              if (marginSquareOffToggle) {
                marginSquareOffValue = marginSquareOffToggle.value
              }
            }

            await fetchExchangeGroupsForUser(parseInt(editingUserId));

            setEditingUser({
              name: apiUserData.name,
              username: apiUserData.username,
              roleId: 3,
              mobileNumber: apiUserData.mobileNumber,
              city: apiUserData.city,
              mobile: apiUserData.mobileNumber,
              remark: apiUserData.remarks,
              remarks: apiUserData.remarks,
              pnlSharing: apiUserData.pnlSharing,
              brkSharing: apiUserData.brkSharing,
              brokeragePercentage: apiUserData.brkSharing,
              addMaster: apiUserData.addMaster,
              changePasswordFirstLogin: apiUserData.changePasswordFirstLogin,
              allowedExchanges: apiUserData.allowedExchanges,
              highLowTradeLimit: apiUserData.highLowTradeLimit,
              parentHighLowTradeLimit: apiUserData.parentHighLowTradeLimit,
              parentId: apiUserData.parentId,
              parentPnlSharing: apiUserData.parentPnlSharing,
              parentBrkSharing: apiUserData.parentBrkSharing,
              marginSquareOff: marginSquareOffValue,
              ...(response.data.userProfile && { roleId: response.data.userProfile.roleId })
            })
          }
        } catch (error) {
          console.error('❌ Error fetching fresh user details:', error)
        }
      }
      fetchFreshUserDetails()
    }
  }, [isEditMode, editingUserId, editingUser])

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
          const isLockedTurnover = ['nse', 'sgx', 'others'].includes(key);

          const fallbackArr = exchangeGroups[key] || [];
          const matchedGroupIdValue = ex.groupId ? String(ex.groupId) : (fallbackArr.length > 0 ? String(fallbackArr[0].groupId) : '');

          exchangesObj[key] = {
            enabled: true,
            turnoverBrk: isLockedTurnover ? true : !!ex.turnover,
            symbolBrk: isLockedTurnover ? false : (!!ex.turnover ? false : !!ex.lot),
            group: matchedGroupIdValue,
            highLowLimit: false
          };
        }
      });

      ['nse', 'sgx', 'others'].forEach((key) => {
        if (exchangesObj[key].enabled) {
          exchangesObj[key].turnoverBrk = true;
          exchangesObj[key].symbolBrk = false;
        }
      });

      let highTradeLimitObj = { nse: false, mcx: false, sgx: false, cds: false, callput: false };

      // Use parentHighLowTradeLimit to respect parent's restrictions
      if (editingUser.parentHighLowTradeLimit) {
        const highArr = Array.isArray(editingUser.parentHighLowTradeLimit)
          ? editingUser.parentHighLowTradeLimit
          : String(editingUser.parentHighLowTradeLimit).split(',');

        highArr.forEach((ex: string) => {
          const key = ex.trim().toLowerCase();
          if (key && key in highTradeLimitObj) {
            highTradeLimitObj[key as keyof typeof highTradeLimitObj] = true;
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
        mobileNumber: editingUser.mobileNumber || editingUser.mobile || '',
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
  }, [isEditMode, editingUser, userConfig, configLoading, formInitialValues, exchangeGroups]);

  // Handler for when user selects an account from dropdown
  const handleAccountChange = async (username: string, setFieldValue: any) => {
    setFieldValue('accountName', username)

    if (!username) {
      setSelectedUserRole(null)
      setSelectedUserId(null)
      setAvailableUserTypes(userTypeOptions)
      setFieldValue('userType', userTypeOptions.length > 0 ? userTypeOptions[0].value : '')
      setSelectedUserAllowedExchanges([])
      setSelectedUserAllowedExchangeCount(0)
      setSelectedUserParentPnlSharing(100)
      setSelectedUserParentBrkSharing(100)

      if (originalUserConfig) {
        setUserConfig(originalUserConfig)
      }
      return
    }

    const selectedUser = userConfig?.userList?.find(user => user.username === username)

    if (selectedUser) {
      const selectedRoleId = selectedUser.roleId
      setSelectedUserRole(selectedRoleId)
      setSelectedUserId(selectedUser.userId)

      if (userConfig) {
        setUserConfig({
          ...userConfig,
          pnlSharing: selectedUser.pnlSharing || 100,
          brokeragePercentage: selectedUser.brkSharing || 100,
          credits: selectedUser.credits || 0
        })
      }

      if (selectedRoleId === 2) {
        setAvailableUserTypes([{ value: 'master', label: 'Master', icon: User, description: 'Master account' }])
        setFieldValue('userType', 'master')
      } else {
        setAvailableUserTypes(userTypeOptions)
        setFieldValue('userType', '')
      }

      try {
        setIsFetchingSelectedUserDetails(true)
        
        const freshSubGroups = await fetchExchangeGroupsForUser(selectedUser.userId);

        const detailsResponse = await userManagementService.fetchUserDetails(selectedUser.userId)
        const userInfo = detailsResponse?.data?.userInfo
        const allowed = userInfo?.allowedExchanges || []
        let allowedKeys = Array.isArray(allowed)
          ? allowed.map((ex: any) => (ex?.name || '').toString().toLowerCase()).filter((name: string) => name)
          : []

        if (allowedKeys.length === 0 && typeof userInfo?.exchanges === 'string') {
          allowedKeys = userInfo.exchanges.split(',').map((name: string) => name.trim().toLowerCase()).filter((name: string) => name)
        }

        setSelectedUserAllowedExchanges(allowedKeys)
        setSelectedUserAllowedExchangeCount(allowedKeys.length)

        // Store parent's P&L and brokerage sharing for calculating remaining share
        setSelectedUserParentPnlSharing(userInfo?.parentPnlSharing || userInfo?.pnlSharing || 100)
        setSelectedUserParentBrkSharing(userInfo?.parentBrkSharing || userInfo?.brkSharing || 100)

        // Check addMaster flag from fetched user details and update available user types
        const userAddMaster = userInfo?.addMaster ?? false
        if (!userAddMaster) {
          // If addMaster is false, only allow client type
          const clientOnlyOption = [{ value: 'client', label: 'Client', icon: User, description: 'Regular trading client' }]
          setAvailableUserTypes(clientOnlyOption)
          setFieldValue('userType', 'client')
        }

        exchangeData.forEach((ex) => {
          const allowedForUser = allowedKeys.length === 0 || allowedKeys.includes(ex.key)
          const targetedGroupArray = freshSubGroups[ex.key] || [];
          const defaultIdString = targetedGroupArray.length > 0 ? String(targetedGroupArray[0].groupId) : '';

          if (!allowedForUser) {
            setFieldValue(`exchanges.${ex.key}.enabled`, false)
            setFieldValue(`exchanges.${ex.key}.turnoverBrk`, false)
            setFieldValue(`exchanges.${ex.key}.symbolBrk`, false)
            setFieldValue(`exchanges.${ex.key}.group`, '')
          } else {
            setFieldValue(`exchanges.${ex.key}.group`, defaultIdString);
          }
        })

        // Reset and populate High/Low Trade Limit checkboxes using parentHighLowTradeLimit
        let highTradeLimitObj = { nse: false, mcx: false, sgx: false, cds: false, callput: false };
        
        // Use parentHighLowTradeLimit to respect parent's restrictions
        const highLowTradeLimit = userInfo?.parentHighLowTradeLimit || '';
        if (highLowTradeLimit) {
          const highArr = Array.isArray(highLowTradeLimit)
            ? highLowTradeLimit
            : String(highLowTradeLimit).split(',');
          
          highArr.forEach((ex: string) => {
            const key = ex.trim().toLowerCase();
            if (key === 'nse' || key === 'mcx' || key === 'sgx' || key === 'cds' || key === 'callput') {
              highTradeLimitObj[key as keyof typeof highTradeLimitObj] = true;
            }
          });
        }
        
        // Store in state instead of directly setting form values
        setSelectedUserHighLowTradeLimit(highTradeLimitObj);
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
      setSelectedUserHighLowTradeLimit({ nse: false, mcx: false, sgx: false, cds: false, callput: false })
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
      const enabledExchangesWithoutBrokerage = Object.entries(values.exchanges)
        .filter(([key, exchange]: [string, any]) => isExchangeAllowed(key) && exchange.enabled)
        .filter(([key, exchange]: [string, any]) => !exchange.turnoverBrk && !exchange.symbolBrk)
        .map(([key]) => key.toUpperCase());

      if (enabledExchangesWithoutBrokerage.length > 0) {
        toast.error(`Please select either Turnover or Symbol Brokerage for: ${enabledExchangesWithoutBrokerage.join(', ')}`);
        return;
      }

      if (!isEditMode && usernameError) {
        toast.error('Please fix username validation errors before submitting')
        return
      }

      if (values.userType === 'client') {
        const enabledExchangesWithoutGroup = Object.entries(values.exchanges)
          .filter(([key, exchange]) => isExchangeAllowed(key) && exchange.enabled && !exchange.group)
          .map(([key]) => key.toUpperCase())

        if (enabledExchangesWithoutGroup.length > 0) {
          toast.error(`Please select groups for: ${enabledExchangesWithoutGroup.join(', ')}`);
          return;
        }
      }

      if (isEditMode && editingUser) {
        const userDataStr = localStorage.getItem('userData')
        const userData = userDataStr ? JSON.parse(userDataStr) : null
        const parentUserId = userData?.userId || 2

        const allowedExchanges = Object.entries(values.exchanges)
          .filter(([key, exchange]) => isExchangeAllowed(key) && exchange.enabled)
          .map(([key, exchange]) => ({
            name: key.toUpperCase(),
            turnover: exchange.turnoverBrk,
            lot: exchange.symbolBrk,
            groupId: exchange.group ? Number(exchange.group) : null
          }))

        const highLowTradeLimit = Object.entries(values.highTradeLimit)
          .filter(([key, isEnabled]) => isEnabled)
          .map(([key]) => key.toUpperCase())
          .join(',')

        const updatePayload = {
          name: values.name,
          mobileNumber: values.mobileNumber,
          city: values.city,
          remarks: values.remark,
          pnlSharing: values.pnlSharing || 0,
          brkSharing: values.brokerageSharing || 0,
          addMaster: values.addMaster,
          changePasswordFirstLogin: values.changePasswordOnFirstLogin,
          highLowTradeLimit,
          allowedExchanges,
          marginSquareOff: values.autoSquareOff
        }

        const response = await userManagementService.editUserDetails(parentUserId, parseInt(editingUserId!), updatePayload)

        if (response?.responseCode === '0' || response?.responseCode === '1000') {
          toast.success(response?.responseMessage || 'User updated successfully!')
          sessionStorage.removeItem('userListCache')
          sessionStorage.removeItem('userListCacheTime')

          const currentTab = tabs.find(tab => tab.path.includes(`userId=${editingUserId}`))
          if (currentTab) {
            removeTab(currentTab.id)
          }
          navigateWithScrollToTop(navigate, '/dashboard/user-list')
        } else {
          toast.error(response?.responseMessage || 'Failed to update user')
        }
      } else {
        const roleId = values.userType === 'master' ? 3 : 4

        const allowedExchanges = Object.entries(values.exchanges)
          .filter(([key, exchange]) => isExchangeAllowed(key) && exchange.enabled)
          .map(([key, exchange]) => ({
            name: key.toUpperCase(),
            turnover: exchange.turnoverBrk,
            lot: exchange.symbolBrk,
            groupId: exchange.group ? Number(exchange.group) : null
          }))

        const highLowTradeLimit = Object.entries(values.highTradeLimit)
          .filter(([key, isEnabled]) => isEnabled)
          .map(([key]) => key.toUpperCase())
          .join(',')

        const apiPayload = {
          userType: roleId,
          name: values.name,
          username: values.username,
          password: values.password,
          confirmPassword: values.retypePassword,
          credits: values.credit,
          remarks: values.remark,
          pnlSharing: values.userType === 'master' ? Number(values.pnlSharing) || 0 : 0,
          brokeragePercentage: values.userType === 'master' ? Number(values.brokerageSharing) || 0 : 0,
          highLowTradeLimit,
          addMaster: values.addMaster,
          changePasswordFirstLogin: values.changePasswordOnFirstLogin,
          marginSquareOff: values.autoSquareOff,
          allowedExchanges
        }

        const response = await userManagementService.createUser(apiPayload, selectedUserId)

        if (response?.responseCode === '0' || response?.responseCode === '1000') {
          toast.success(response?.responseMessage || 'User created successfully!')
          sessionStorage.removeItem('userListCache')
          sessionStorage.removeItem('userListCacheTime')
          resetForm()
          setSelectedUserRole(null)
          setSelectedUserId(null)
          setAvailableUserTypes(userTypeOptions)
          setTimeout(() => {
            navigateWithScrollToTop(navigate, '/dashboard')
          }, 1500)
        } else {
          toast.error(response?.responseMessage || 'Failed to create user')
        }
      }
    } catch (error: any) {
      console.error('❌ Error:', error)
      const errorData = error.response?.data
      const errorMessage = errorData?.responseMessage || error.message || 'Failed to process request'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-text-primary">
              {isEditMode ? `Update User - ${editingUser?.username || ''}` : 'Create New User'}
            </h1>
            <p className="text-text-secondary text-sm">
              {isEditMode ? 'Update user account details and exchange permissions' : 'Set up a new trading account with exchange permissions'}
            </p>
          </div>
        </motion.div>

        {/* Loading State */}
        {configLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-surface-primary border border-border-primary rounded-2xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-text-secondary">Loading user configuration...</p>
          </motion.div>
        )}

        {/* Error State */}
        {configError && !configLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-red-500 mt-1">⚠️</div>
              <div>
                <p className="font-semibold text-red-900">Failed to load user configuration</p>
                <p className="text-red-700 text-sm mt-1">{configError}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Success State */}
        {!configLoading && userConfig && (
          <Formik
            // Key handles cache state reset and prevents stale layout components matching conflicts
            key={isEditMode ? `edit-${editingUserId}-${Object.keys(exchangeGroups).length}` : `create-${Object.keys(exchangeGroups).length}`}
            enableReinitialize={true} 
            initialValues={patchedFormInitialValues}
            validationSchema={getValidationSchema()}
            validateOnChange={true}
            validateOnBlur={true}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, setFieldValue, isValid, validateForm }: any) => {
              React.useEffect(() => {
                validateForm()
              }, [selectedUserRole, availableUserTypes.length, validateForm])

              // Update High Trade Limit values when a user is selected
              React.useEffect(() => {
                if (!isEditMode && selectedUserHighLowTradeLimit) {
                  setFieldValue('highTradeLimit', selectedUserHighLowTradeLimit);
                }
              }, [selectedUserHighLowTradeLimit, isEditMode, setFieldValue])

              const visibleExchangeData = forUserAccount && selectedUserAllowedExchanges.length > 0
                ? exchangeData.filter((ex) => isExchangeAllowed(ex.key))
                : exchangeData

              return (
                <Form className="space-y-6">
                  {/* Account Selection */}
                  {!isEditMode && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-primary border border-border-primary rounded-2xl p-6">
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
                                setTimeout(() => setShowDropdown(false), 200)
                              }}
                              placeholder="Search user..."
                              disabled={!forUserAccount}
                              className={`w-full h-12 px-4 py-3 bg-surface-secondary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all ${!forUserAccount ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-tertiary'}`}
                            />
                            <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />

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
                                      {user.name} ({user.username})
                                    </div>
                                  ))}
                                {userConfig.userList.filter((user) =>
                                  user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  user.name.toLowerCase().includes(searchQuery.toLowerCase())
                                ).length === 0 && (
                                    <div className="px-4 py-2 text-text-secondary text-sm">No users found</div>
                                  )}
                              </div>
                            )}
                          </div>
                        </div>

                        <Field name="userType">
                          {({ field, meta, form }: any) => {
                            return (
                              <div>
                                <label className="block text-xs text-text-secondary mb-1">Select Type</label>
                                <select
                                  value={field.value}
                                  onChange={(e) => {
                                    const newValue = e.target.value
                                    form.setFieldValue('userType', newValue)
                                    if (!isEditMode) {
                                      form.setFieldValue('exchanges', {
                                        nse: { enabled: false, turnoverBrk: true, symbolBrk: false, group: values?.exchanges?.nse?.group || '', highLowLimit: false },
                                        mcx: { enabled: false, turnoverBrk: true, symbolBrk: false, group: values?.exchanges?.mcx?.group || '', highLowLimit: false },
                                        sgx: { enabled: false, turnoverBrk: true, symbolBrk: false, group: values?.exchanges?.sgx?.group || '', highLowLimit: false },
                                        cds: { enabled: false, turnoverBrk: false, symbolBrk: true, group: values?.exchanges?.cds?.group || '', highLowLimit: false },
                                        callput: { enabled: false, turnoverBrk: false, symbolBrk: true, group: values?.exchanges?.callput?.group || '', highLowLimit: false },
                                        others: { enabled: false, turnoverBrk: true, symbolBrk: false, group: values?.exchanges?.others?.group || '', highLowLimit: false }
                                      })
                                    }
                                  }}
                                  disabled={availableUserTypes.length === 0}
                                  className={`w-full h-12 px-4 py-3 bg-surface-secondary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-brand-primary ${availableUserTypes.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface-primary border border-border-primary rounded-2xl p-6">
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
                                  onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                  }}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  error={isExceeding ? `Cannot exceed available credit of ${availableCredit}` : meta.touched && meta.error ? meta.error : ''}
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

                  {/* Partnership Share Detail */}
                  {values.userType === 'master' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-red-500/10 border-2 border-purple-500/30 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">Partnership Share Detail</h3>
                      </div>

                      {(() => {
                        const hasParent = isEditMode ? !!editingUser?.parentId : forUserAccount
                        const availablePnl = isEditMode ? (editingUser?.parentPnlSharing || 100) : (userConfig?.pnlSharing || 100)
                        const availableBrokerage = isEditMode ? (editingUser?.parentBrkSharing || 100) : (userConfig?.brokeragePercentage || 100)

                        return (
                          <>
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">Profit & Loss Sharing*</label>
                        <Field name="pnlSharing">
                          {({ field, meta }: any) => {
                            const currentValue = field.value ?? 0
                            const isExceeding = currentValue > availablePnl

                            return (
                              <div>
                                <input
                                  type="number"
                                  placeholder="Enter Profit & Loss sharing"
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                  onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  onBlur={(e) => {
                                    field.onBlur(e)
                                    if (field.value === '' || field.value === null || field.value === undefined) setTimeout(() => field.onBlur(e), 0);
                                  }}
                                  name={field.name}
                                  min="0"
                                  step="0.01"
                                  className={`w-full h-14 px-4 py-3 bg-surface-secondary border-2 rounded-xl text-text-primary text-lg focus:ring-2 transition-all ${isExceeding || (meta.touched && meta.error) ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-border-primary focus:ring-purple-500 focus:border-purple-500'}`}
                                />
                                {isExceeding && <div className="mt-1 text-xs text-red-400">Cannot exceed available P&L sharing of {availablePnl}</div>}
                                {meta.touched && meta.error && !isExceeding && <div className="mt-1 text-xs text-red-400">{meta.error}</div>}
                              </div>
                            )
                          }}
                        </Field>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="bg-surface-secondary rounded-xl p-4 border border-border-primary">
                            <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide">Our</p>
                            <p className="text-2xl font-bold text-purple-500">{availablePnl}.00</p>
                          </div>
                          <div className="bg-surface-secondary rounded-xl p-4 border border-border-primary">
                            <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide">Remaining</p>
                            <p className={`text-2xl font-bold ${(values.pnlSharing || 0) > availablePnl ? 'text-red-500' : 'text-text-primary'}`}>
                              {(availablePnl - (values.pnlSharing || 0)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">BRK Sharing*</label>
                        <Field name="brokerageSharing">
                          {({ field, meta }: any) => {
                            const currentValue = field.value ?? 0
                            const isExceeding = currentValue > availableBrokerage

                            return (
                              <div>
                                <input
                                  type="number"
                                  placeholder="Enter Brokerage sharing"
                                  onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  onBlur={(e) => {
                                    field.onBlur(e)
                                    if (field.value === '' || field.value === null || field.value === undefined) setTimeout(() => field.onBlur(e), 0);
                                  }}
                                  name={field.name}
                                  min="0"
                                  step="0.01"
                                  className={`w-full h-14 px-4 py-3 bg-surface-secondary border-2 rounded-xl text-text-primary text-lg focus:ring-2 transition-all ${isExceeding || (meta.touched && meta.error) ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-border-primary focus:ring-purple-500 focus:border-purple-500'}`}
                                />
                                {isExceeding && <div className="mt-1 text-xs text-red-400">Cannot exceed available brokerage of {availableBrokerage}</div>}
                                {meta.touched && meta.error && !isExceeding && <div className="mt-1 text-xs text-red-400">{meta.error}</div>}
                              </div>
                            )
                          }}
                        </Field>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="bg-surface-secondary rounded-xl p-4 border border-border-primary">
                            <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide">Our</p>
                            <p className="text-2xl font-bold text-pink-500">{availableBrokerage}.00</p>
                          </div>
                          <div className="bg-surface-secondary rounded-xl p-4 border border-border-primary">
                            <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide">Remaining</p>
                            <p className={`text-2xl font-bold ${(values.brokerageSharing || 0) > availableBrokerage ? 'text-red-500' : 'text-text-primary'}`}>
                              {(availableBrokerage - (values.brokerageSharing || 0)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                          </>
                        )
                      })()}
                    </motion.div>
                  )}

                  {/* Exchange Settings */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-surface-primary border border-border-primary rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-text-primary">Exchange Settings</h3>
                        {forUserAccount && (
                          <p className="text-xs text-text-secondary mt-1">
                            {isFetchingSelectedUserDetails ? 'Loading allowed exchanges…' : `Allowed exchanges: ${selectedUserAllowedExchangeCount}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {values.userType === 'master' ? (
                      <div>
                        <div className="flex items-center justify-end mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-text-secondary">Select All</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={visibleExchangeData.every((ex) => values?.exchanges?.[ex.key]?.enabled)}
                                onChange={(e) => {
                                  const checked = e.target.checked
                                  visibleExchangeData.forEach((ex) => {
                                    if (isExchangeAllowed(ex.key)) setFieldValue(`exchanges.${ex.key}.enabled`, checked);
                                  })
                                }}
                              />
                              <div className="relative w-11 h-6 bg-gray-200 dark:bg-surface-secondary rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {visibleExchangeData.map((exchange) => (
                            <div key={exchange.key} className="bg-surface-secondary border border-border-primary rounded-lg p-4 hover:border-brand-primary transition-all">
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
                                      checked={!!values?.exchanges?.[exchange.key]?.enabled}
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
                                      checked={visibleExchangeData.every((ex) => !!values?.exchanges?.[ex.key]?.enabled)}
                                      onChange={(e) => {
                                        const checked = e.target.checked
                                        visibleExchangeData.forEach((ex) => {
                                          if (isExchangeAllowed(ex.key)) setFieldValue(`exchanges.${ex.key}.enabled`, checked);
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
                            {visibleExchangeData.map((exchange) => {
                              const currentSelectedValue = values?.exchanges?.[exchange.key]?.group;
                              const currentGroupArray = exchangeGroups[exchange.key] || [];

                              return (
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
                                      checked={!!values?.exchanges?.[exchange.key]?.enabled}
                                      onChange={(e) => setFieldValue(`exchanges.${exchange.key}.enabled`, e.target.checked)}
                                      disabled={!isExchangeAllowed(exchange.key)}
                                    />
                                    <div className="relative w-8 h-5 bg-gray-200 dark:bg-surface-secondary rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                                  </label>
                                </td>

                                {/* Turnover Brk. Cell */}
                                <td className="py-4 px-2 text-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={!!values?.exchanges?.[exchange.key.toLowerCase()]?.turnoverBrk}
                                      onChange={(e) => {
                                        const key = exchange.key.toLowerCase();
                                        if (!isExchangeAllowed(key)) return;

                                        if (['nse', 'sgx', 'others'].includes(key)) {
                                          setFieldValue(`exchanges.${key}.turnoverBrk`, true);
                                          setFieldValue(`exchanges.${key}.symbolBrk`, false);
                                          return;
                                        }

                                        if (!e.target.checked) {
                                          setFieldValue(`exchanges.${key}.turnoverBrk`, false);
                                          setFieldValue(`exchanges.${key}.symbolBrk`, true);
                                        } else {
                                          setFieldValue(`exchanges.${key}.turnoverBrk`, true);
                                          setFieldValue(`exchanges.${key}.symbolBrk`, false);
                                        }
                                      }}
                                      disabled={!isExchangeAllowed(exchange.key.toLowerCase())}
                                    />
                                    <div className="relative w-8 h-5 bg-gray-200 dark:bg-surface-secondary rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600"></div>
                                  </label>
                                </td>

                                {/* Symbol Brk. Cell */}
                                <td className="py-4 px-2 text-center">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={!!values?.exchanges?.[exchange.key.toLowerCase()]?.symbolBrk}
                                      onChange={(e) => {
                                        const key = exchange.key.toLowerCase();
                                        const isColumnDisabled = ['nse', 'sgx', 'others'].includes(key) || !isExchangeAllowed(key);
                                          
                                        if (isColumnDisabled) {
                                          if (['nse', 'sgx', 'others'].includes(key)) {
                                            setFieldValue(`exchanges.${key}.turnoverBrk`, true);
                                            setFieldValue(`exchanges.${key}.symbolBrk`, false);
                                          }
                                          return;
                                        }

                                        if (!e.target.checked) {
                                          setFieldValue(`exchanges.${key}.symbolBrk`, false);
                                          setFieldValue(`exchanges.${key}.turnoverBrk`, true);
                                        } else {
                                          setFieldValue(`exchanges.${key}.symbolBrk`, true);
                                          setFieldValue(`exchanges.${key}.turnoverBrk`, false);
                                        }
                                      }}
                                      disabled={['nse', 'sgx', 'others'].includes(exchange.key.toLowerCase()) || !isExchangeAllowed(exchange.key.toLowerCase())}
                                    />
                                    <div className={`relative w-8 h-5 bg-gray-200 dark:bg-surface-secondary rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:via-pink-600 peer-checked:to-red-600 ${['nse', 'sgx', 'others'].includes(exchange.key.toLowerCase()) ? 'opacity-30' : ''}`}></div>
                                  </label>
                                </td>

                                <td className="py-4 px-2">
                                  <select
                                    value={currentSelectedValue ? String(currentSelectedValue) : ''}
                                    onChange={(e) => {
                                      setFieldValue(`exchanges.${exchange.key}.group`, e.target.value);
                                    }}
                                    disabled={!isExchangeAllowed(exchange.key) || groupsLoading}
                                    className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary text-sm focus:ring-1 focus:ring-brand-primary focus:border-transparent transition-all"
                                  >
                                    <option value="">{groupsLoading ? 'Loading groups...' : 'Select Group'}</option>
                                    {currentGroupArray.map((group: any, idx: number) => (
                                      // FIX: Appending unique loop index mapping inside option element key completely satisfies React identity checks!
                                      <option key={`${group.groupId}-${idx}`} value={String(group.groupId)}>
                                        {group.groupName}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>

                  {/* High Trade Limit */}
                  {(selectedUserRole === 2 || values.userType === 'master' || values.userType === 'client' || (!isEditMode && selectedUserId && selectedUserRole) || (isEditMode && (editingUser?.roleId === 3 || editingUser?.roleId === 4) && editingUser?.highLowTradeLimit)) && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }} className="bg-surface-primary border border-border-primary rounded-2xl p-6">
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
                              checked={exchangeData.filter(ex => ex.key !== 'others').every(ex => !!values?.highTradeLimit?.[ex.key])}
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
                                checked={!!values?.highTradeLimit?.[exchange.key]}
                                onChange={(e) => setFieldValue(`highTradeLimit.${exchange.key}`, e.target.checked)}
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
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-surface-primary border border-border-primary rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <Key className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary">Additional Settings</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {!isEditMode && (
                        <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-primary">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                              <Key className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-text-primary cursor-pointer">Change Password On First Login</label>
                              <p className="text-xs text-text-secondary mt-1">User will be required to change password on first login</p>
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

                      {values.userType === 'client' && (
                        <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-primary">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                              <RefreshCw className="w-4 h-4 text-red-500" />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-text-primary cursor-pointer">Auto Square Off</label>
                              <p className="text-xs text-text-secondary mt-1">Automatically square off positions at market close</p>
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

                      {values.userType === 'master' && (
                        <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-primary">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                              <User className="w-4 h-4 text-purple-500" />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-text-primary cursor-pointer">Add Master</label>
                              <p className="text-xs text-text-secondary mt-1">Allow this user to create master accounts</p>
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
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex items-center justify-between gap-4 pt-6">
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
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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