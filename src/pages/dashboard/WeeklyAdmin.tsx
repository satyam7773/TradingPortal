import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import FilterLayout from '../../components/FilterLayout'
import SearchableSelect from '../../components/ui/SearchableSelect'
import userManagementService from '../../services/userManagementService'
import UserDetailsModal from '../user-management/UserDetailsModal'

interface WeeklyAdminData {
  userId: number
  username: string
  name: string
  parentUsername: string
  parentUserId: number
  adminPnlPercent: number
  adminBrkPercent: number
  realisedPnl: number
  m2mPnl: number
  totalPnl: number
  brokerage: number
  netPnl: number
  adminPnl: number
  adminBrk: number
  adminNetPnl: number
}

interface WeeklyAdminSummary {
  realisedPnl: number
  brokerage: number
  m2mPnl: number
  totalPnl: number
  netPnl: number
  adminPnl: number
  adminBrk: number
  adminNetPnl: number
}

const WeeklyAdmin: React.FC = () => {
  // Get logged in user ID
  const userDataStr = localStorage.getItem('userData')
  const userData = userDataStr ? JSON.parse(userDataStr) : null
  const loggedInUserId = userData?.userId || 31

  const tableContainerRef = React.useRef<HTMLDivElement>(null)

  const [selectedUserId, setSelectedUserId] = useState<number>(0)
  const [reportData, setReportData] = useState<WeeklyAdminData[]>([])
  const [summaryData, setSummaryData] = useState<WeeklyAdminSummary>({
    realisedPnl: 0,
    brokerage: 0,
    m2mPnl: 0,
    totalPnl: 0,
    netPnl: 0,
    adminPnl: 0,
    adminBrk: 0,
    adminNetPnl: 0
  })
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(0)
  const pageSize = 10

  const userOptions = useMemo(() => [
    ...users.map(u => ({ id: u.userId, name: u.userName }))
  ], [users])

  // Fetch Weekly Admin Report
  const handleFetchReport = async (page: number = 0) => {
    if (!loggedInUserId) {
      toast.error('User not logged in')
      return
    }

    setLoading(true)
    try {
      const userIdForRequest = selectedUserId || loggedInUserId

      const payload = {
        userId: loggedInUserId,
        requestTimestamp: Date.now().toString(),
        data: {
          userId: userIdForRequest
        }
      }

      const response = await fetch('https://api-staging.rivoplus.live/reports/weeklyAdmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (result?.responseCode === '0') {
        const reportList = result.data?.data || []
        const paginated = Array.isArray(reportList) ? reportList : []

        setReportData(paginated)
        setSummaryData({
          realisedPnl: result.data?.realisedPnl || 0,
          brokerage: result.data?.brokerage || 0,
          m2mPnl: result.data?.m2mPnl || 0,
          totalPnl: result.data?.totalPnl || 0,
          netPnl: result.data?.netPnl || 0,
          adminPnl: result.data?.adminPnl || 0,
          adminBrk: result.data?.adminBrk || 0,
          adminNetPnl: result.data?.adminNetPnl || 0
        })
        setTotalPages(1)
        setCurrentPage(page)
      } else {
        setReportData([])
        setSummaryData({
          realisedPnl: 0,
          brokerage: 0,
          m2mPnl: 0,
          totalPnl: 0,
          netPnl: 0,
          adminPnl: 0,
          adminBrk: 0,
          adminNetPnl: 0
        })
        if (result?.responseMessage) toast.error(result.responseMessage)
      }
    } catch (error) {
      toast.error('Error fetching weekly admin report')
      setReportData([])
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      handleFetchReport(newPage)
    }
  }

  const getRoleType = (roleId: number): 'Client' | 'Master' | 'Admin' => {
    switch (roleId) {
      case 1: return 'Admin'
      case 2: return 'Admin'
      case 3: return 'Master'
      case 4: return 'Client'
      default: return 'Client'
    }
  }

  const handleOpenUserDetails = async (username: string) => {
    try {
      const apiResponse = await userManagementService.fetchUserDetails(parseInt(username) || 0)

      if (apiResponse?.data) {
        const apiData = apiResponse.data
        const apiUser = apiData.userProfile
        const userInfo = apiData.userInfo
        const userSettings = apiData.userSettings

        // Extract toggle values from userSettingsToggles array
        const getToggleValue = (toggleName: string): boolean => {
          const toggle = userSettings?.togglingSettingsToggles?.find((t: any) => t.toggle === toggleName)
          return toggle?.value ?? false
        }

        // Extract toggleEnabled values
        const getToggleEnabled = (toggleName: string): boolean => {
          const toggle = userSettings?.togglingSettingsToggles?.find((t: any) => t.toggle === toggleName)
          return toggle?.toggleEnabled ?? false
        }

        // Format dates
        const formatDate = (timestamp: number | string | null): string => {
          if (!timestamp) return 'N/A'
          const numTimestamp = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
          return new Date(numTimestamp).toLocaleString()
        }

        const formattedData = {
          id: apiUser?.userId?.toString() || '',
          username: apiUser?.username || '',
          name: userInfo?.name || '',
          type: getRoleType(apiUser?.roleId || 4),
          parent: userInfo?.parentUsername || `Parent-${userInfo?.parentId}`,
          parentName: userInfo?.parentName || userInfo?.parentUsername || 'N/A',
          credit: apiUser?.credits || 0,
          balance: apiUser?.balance || 0,
          parentCredits: userInfo?.parentCredits || 0,
          sharing: userInfo?.pnlSharing || null,
          bet: getToggleValue('bet'),
          closeOut: getToggleValue('closeOnly'),
          margin: getToggleValue('marginSquareOff'),
          status: getToggleValue('status'),
          creditLimit: !apiUser?.isBlocked,
          creditBasedMargin: getToggleValue('creditBasedMargin'),
          betEnabled: getToggleEnabled('bet'),
          closeOutEnabled: getToggleEnabled('closeOnly'),
          marginEnabled: getToggleEnabled('marginSquareOff'),
          statusEnabled: getToggleEnabled('status'),
          freshStopLoss: getToggleValue('freshStopLoss'),
          freshStopLossEnabled: getToggleEnabled('freshStopLoss'),
          creditLimitEnabled: true,
          creditBasedMarginEnabled: getToggleEnabled('creditBasedMargin'),
          manualOrder: getToggleValue('manualOrder'),
          manualOrderEnabled: getToggleEnabled('manualOrder'),
          createdDate: formatDate(userInfo?.createdAt),
          ipAddress: userInfo?.ipAddress || 'N/A',
          deviceId: userInfo?.deviceId || 'N/A',
          lastLogin: formatDate(userInfo?.lastLoginDate),
          isActive: apiUser?.isActive ?? true,
          isTradeLock: apiUser?.isTradeLock ?? false,
          roleId: apiUser?.roleId,
        }

        setSelectedUser(formattedData)
      }
    } catch (err) {
      console.error('Error fetching user details:', err)
      toast.error('Failed to fetch user details')
    }
  }

  const handleToggle = useCallback(async (userId: string, field: 'bet' | 'closeOut' | 'margin' | 'status' | 'creditLimit' | 'creditBasedMargin') => {
    try {
      // Map field names to API type values
      const fieldToApiType: Record<string, string> = {
        'bet': 'bet',
        'closeOut': 'closeOnly',
        'freshStopLoss': 'freshStopLoss',
        'margin': 'marginSquareOff',
        'status': 'status',
        'creditLimit': 'creditLimit',
        'creditBasedMargin': 'creditBasedMargin',
        'manualOrder': 'manualOrder'
      }

      // Map field names to display names
      const fieldToDisplayName: Record<string, string> = {
        'bet': 'Bet',
        'closeOut': 'Close',
        'margin': 'Margin',
        'status': 'Status',
        'freshStopLoss': 'Fresh Stop Loss',
        'creditLimit': 'Credit Limit',
        'creditBasedMargin': 'CBM',
        'manualOrder': 'Manual Order'
      }

      const apiType = fieldToApiType[field]
      const displayName = fieldToDisplayName[field]

      if (!selectedUser) return

      const currentValue = selectedUser[field]
      const newValue = !currentValue

      const response = await userManagementService.toggleUserSettings({
        userId: loggedInUserId,
        requestTimestamp: Date.now().toString(),
        data: {
          userId: Number(userId),
          type: apiType,
          value: newValue,
        },
      })

      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        const statusText = newValue ? 'enabled' : 'disabled'
        const successMsg = `${selectedUser.username}: ${displayName} has been successfully ${statusText}`
        toast.success(successMsg)

        // Update local state
        setSelectedUser((prev: any) => ({
          ...prev,
          [field]: newValue
        }))
      } else {
        const errorMsg = response?.responseMessage || 'Failed to update setting'
        toast.error(errorMsg)
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.responseMessage || error.message || 'Failed to update setting'
      toast.error(errorMsg)
    }
  }, [selectedUser, loggedInUserId])

  // Load initial metadata
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)

        const usersResponse = await userManagementService.fetchOwnUsers(loggedInUserId)
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setUsers(usersResponse.data)
          if (usersResponse.data.length > 0) {
            setSelectedUserId(usersResponse.data[0].userId)
          }
        }
      } catch (error) {
        toast.error('Failed to load users')
      } finally {
        setInitialLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // Auto-fetch when selected user changes
  useEffect(() => {
    if (!initialLoading) {
      handleFetchReport()
    }
  }, [selectedUserId])

  // Scroll table to left when data loads
  useEffect(() => {
    if (tableContainerRef.current && reportData.length > 0) {
      tableContainerRef.current.scrollLeft = 0
    }
  }, [reportData])

  const handleClearFilters = () => {
    if (users.length > 0) {
      setSelectedUserId(users[0].userId)
      setReportData([])
      setSummaryData({
        realisedPnl: 0,
        brokerage: 0,
        m2mPnl: 0,
        totalPnl: 0,
        netPnl: 0,
        adminPnl: 0,
        adminBrk: 0,
        adminNetPnl: 0
      })
    }
  }

  const formatCurrency = (val: number) => {
    const formatted = val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    // toLocaleString already includes the minus sign for negative values
    if (formatted.startsWith('-')) {
      return '-₹' + formatted.slice(1)
    }
    return '₹' + formatted
  }

  const formatPercent = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
  }

  const getSummaryColor = (value: number) => {
    if (value > 0) return 'text-green-600 dark:text-green-400'
    if (value < 0) return 'text-red-600 dark:text-red-400'
    return 'text-slate-600 dark:text-slate-400'
  }

  const getRowColor = (value: number) => {
    if (value > 0) return 'text-emerald-600 dark:text-emerald-400'
    if (value < 0) return 'text-red-600 dark:text-red-400'
    return 'text-slate-700 dark:text-slate-300'
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full w-full">
        <FilterLayout
          storageKey="weeklyAdmin:showFilters"
          filterWidthClass="lg:w-[16%]"
          filters={
            <div className="space-y-4 p-4">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Filters</h3>

              {/* User Selection */}
              <SearchableSelect
                label="Username :"
                items={userOptions}
                selectedId={selectedUserId}
                onSelect={(userId) => setSelectedUserId(Number(userId))}
                placeholder="Search user..."
              />

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleFetchReport()}
                  disabled={loading || initialLoading}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded font-semibold text-sm transition"
                >
                  {loading ? 'Loading...' : 'View'}
                </button>
                <button
                  onClick={handleClearFilters}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded font-semibold text-sm transition"
                >
                  Clear
                </button>
              </div>
            </div>
          }
        >
          {/* Main Content */}
          <div className="flex flex-col h-full bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
            {/* Header */}
            {/* <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-blue-500" />
                    Weekly Admin Report
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Admin profit/loss and brokerage summary
                  </p>
                </div>
              </div>
            </div> */}

            {/* Summary Cards */}
            <div className="flex-shrink-0 px-4 py-2 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/30">
              <div className="grid grid-cols-2 md:grid-cols-8 gap-1.5">
                {/* Realised PnL */}
                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-1.5 border border-slate-200/50 dark:border-slate-600/50">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Realised PnL</div>
                  <div className={`text-xs font-bold mt-0.5 ${getSummaryColor(summaryData.realisedPnl)}`}>
                    {formatCurrency(summaryData.realisedPnl)}
                  </div>
                </div>

                {/* Brokerage */}
                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-1.5 border border-slate-200/50 dark:border-slate-600/50">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Brokerage</div>
                  <div className={`text-xs font-bold mt-0.5 ${getSummaryColor(summaryData.brokerage)}`}>
                    {formatCurrency(summaryData.brokerage)}
                  </div>
                </div>

                {/* M2M PnL */}
                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-1.5 border border-slate-200/50 dark:border-slate-600/50">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">M2M PnL</div>
                  <div className={`text-xs font-bold mt-0.5 ${getSummaryColor(summaryData.m2mPnl)}`}>
                    {formatCurrency(summaryData.m2mPnl)}
                  </div>
                </div>

                {/* Total PnL */}
                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-1.5 border border-slate-200/50 dark:border-slate-600/50">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total PnL</div>
                  <div className={`text-xs font-bold mt-0.5 ${getSummaryColor(summaryData.totalPnl)}`}>
                    {formatCurrency(summaryData.totalPnl)}
                  </div>
                </div>

                {/* Net PnL */}
                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-1.5 border border-slate-200/50 dark:border-slate-600/50">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Net PnL</div>
                  <div className={`text-xs font-bold mt-0.5 ${getSummaryColor(summaryData.netPnl)}`}>
                    {formatCurrency(summaryData.netPnl)}
                  </div>
                </div>

                {/* Admin PnL */}
                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-1.5 border border-slate-200/50 dark:border-slate-600/50">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Admin PnL</div>
                  <div className={`text-xs font-bold mt-0.5 ${getSummaryColor(summaryData.adminPnl)}`}>
                    {formatCurrency(summaryData.adminPnl)}
                  </div>
                </div>

                {/* Admin Brokerage */}
                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-1.5 border border-slate-200/50 dark:border-slate-600/50">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Admin Brk</div>
                  <div className={`text-xs font-bold mt-0.5 ${getSummaryColor(summaryData.adminBrk)}`}>
                    {formatCurrency(summaryData.adminBrk)}
                  </div>
                </div>

                {/* Admin Net PnL */}
                <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-1.5 border border-slate-200/50 dark:border-slate-600/50">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Admin Net</div>
                  <div className={`text-xs font-bold mt-0.5 ${getSummaryColor(summaryData.adminNetPnl)}`}>
                    {formatCurrency(summaryData.adminNetPnl)}
                  </div>
                </div>
              </div>
            </div>
 
            {/* Table Container */}
            <div className="flex-1 overflow-auto" ref={tableContainerRef}>
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-3 text-slate-600 dark:text-slate-400">Loading weekly admin report...</p>
                  </div>
                </div>
              ) : reportData.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-slate-600 dark:text-slate-400">No data found</p>
                  </div>
                </div>
              ) : (
                <>
                  <table className="w-full border-collapse min-w-max">
                    <colgroup>
                      <col style={{width: '90px'}} />
                      <col style={{width: '85px'}} />
                      <col style={{width: '90px'}} />
                      <col style={{width: '90px'}} />
                      <col style={{width: '90px'}} />
                      <col style={{width: '90px'}} />
                      <col style={{width: '85px'}} />
                      <col style={{width: '90px'}} />
                      <col style={{width: '85px'}} />
                      <col style={{width: '85px'}} />
                      <col style={{width: '90px'}} />
                      <col style={{width: '85px'}} />
                      <col style={{width: '90px'}} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Username</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Name</th>
                        <th className="px-2 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Parent</th>
                        <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Realised PnL</th>
                        <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">M2M PnL</th>
                        <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Total PnL</th>
                        <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Brokerage</th>
                        <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Net PnL</th>
                        <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Admin PnL %</th>
                        <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Admin Brk %</th>
                        <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Admin PnL</th>
                        <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Admin Brk</th>
                        <th className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Admin Net</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800">
                      {reportData.map((item, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200 border-b border-slate-200/50 dark:border-slate-700/30">
                          <td className="px-2 py-1.5">
                            <span 
                              className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:underline"
                              onClick={() => handleOpenUserDetails(item.userId.toString())}
                            >
                              {item.username}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {item.name}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <span 
                              className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:underline"
                              onClick={() => handleOpenUserDetails(item.parentUserId.toString())}
                            >
                              {item.parentUsername}
                            </span>
                          </td>
                          <td className={`px-2 py-1.5 text-right text-xs font-semibold ${getRowColor(item.realisedPnl)}`}>
                            {formatCurrency(item.realisedPnl)}
                          </td>
                          <td className={`px-2 py-1.5 text-right text-xs font-semibold ${getRowColor(item.m2mPnl)}`}>
                            {formatCurrency(item.m2mPnl)}
                          </td>
                          <td className={`px-2 py-1.5 text-right text-xs font-semibold ${getRowColor(item.totalPnl)}`}>
                            {formatCurrency(item.totalPnl)}
                          </td>
                          <td className={`px-2 py-1.5 text-right text-xs font-semibold ${getRowColor(item.brokerage)}`}>
                            {formatCurrency(item.brokerage)}
                          </td>
                          <td className={`px-2 py-1.5 text-right text-xs font-bold ${getRowColor(item.netPnl)}`}>
                            {formatCurrency(item.netPnl)}
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {formatPercent(item.adminPnlPercent)}
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {formatPercent(item.adminBrkPercent)}
                          </td>
                          <td className={`px-2 py-1.5 text-right text-xs font-semibold ${getRowColor(item.adminPnl)}`}>
                            {formatCurrency(item.adminPnl)}
                          </td>
                          <td className={`px-2 py-1.5 text-right text-xs font-semibold ${getRowColor(item.adminBrk)}`}>
                            {formatCurrency(item.adminBrk)}
                          </td>
                          <td className={`px-2 py-1.5 text-right text-xs font-bold ${getRowColor(item.adminNetPnl)}`}>
                            {formatCurrency(item.adminNetPnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination Footer */}
                  <div className="flex-shrink-0 px-4 py-2 border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Showing <span className="font-semibold text-slate-900 dark:text-white">{reportData.length}</span> results
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 0}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-1 shadow-sm"
                        >
                          <ChevronLeft className="w-3 h-3" />
                          Prev
                        </button>
                        <span className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg">
                          Page {currentPage + 1} of {totalPages}
                        </span>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages - 1}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-1 shadow-sm"
                        >
                          Next
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </FilterLayout>

        {/* User Details Modal */}
        <UserDetailsModal
          user={selectedUser}
          onToggle={handleToggle}
          onClose={() => setSelectedUser(null)}
        />
      </div>
    </div>
  )
}

export default WeeklyAdmin
