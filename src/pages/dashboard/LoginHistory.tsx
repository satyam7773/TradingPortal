import React, { useState, useEffect } from 'react'
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '../../services/authService'
import userManagementService from '../../services/userManagementService'
import FilterLayout from '../../components/FilterLayout'

interface LoginHistoryRecord {
  loginHistoryId: number
  userId: number
  loginDateTime: string
  logoutDateTime: string | null
  userName: string
  userType: string
  lastAppAccessTime: string | null
  ipAddress: string | null
  deviceId: string | null
  remarks: string | null
  parentId: number
}

interface LoginHistoryResponse {
  loginHistories: LoginHistoryRecord[]
  currentPage: number
  totalRecords: number
  totalPages: number
}

const LoginHistory: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [loginHistory, setLoginHistory] = useState<LoginHistoryRecord[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const pageSize = 10

  useEffect(() => {
    // Load users on mount
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await userManagementService.fetchUserClientsForTrade()
      if (response?.data) {
        setUsers(response.data)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleView = async () => {
    setCurrentPage(0)
    
    // If single user is selected, fetch their history by userId (with optional date range)
    if (selectedUserId) {
      // fetchUserLoginHistoryByUserId will handle both with/without dates
      await fetchUserLoginHistoryByUserId(0)
    }
    // Else determine which API to call based on other filters
    else if (searchTerm.trim().length >= 1) {
      await fetchSearchLoginHistory(searchTerm, 0)
    } else if (fromDate && toDate) {
      await fetchUserLoginHistoryByDateRange(0)
    } else {
      // Default to ALL users
      await fetchLoginHistoryFiltered(0)
    }
  }

  const filterBySelectedUser = (records: LoginHistoryRecord[]): LoginHistoryRecord[] => {
    if (!selectedUser || selectedUser === '') {
      return records
    }
    return records.filter(record => record.userName === selectedUser)
  }

  const fetchUserLoginHistoryByUserId = async (page: number) => {
    try {
      setLoading(true)
      const response = await authService.fetchUserLoginHistoryByUserId(
        selectedUserId!,
        page,
        pageSize,
        fromDate,
        toDate
      )
      
      if (response && response.loginHistories) {
        setLoginHistory(response.loginHistories)
        setCurrentPage(response.currentPage)
        setTotalPages(response.totalPages)
        setTotalRecords(response.totalRecords)
      }
    } catch (error) {
      console.error('Error fetching user login history:', error)
      toast.error('Failed to fetch user login history')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setSearchTerm('')
    setFromDate('')
    setToDate('')
    setSelectedUser('')
    setLoginHistory([])
    setCurrentPage(0)
  }

  const fetchLoginHistoryFiltered = async (page: number) => {
    try {
      setLoading(true)
      const response = await authService.fetchLoginHistoryFiltered('ALL', page, pageSize)
      
      if (response && response.loginHistories) {
        const filtered = filterBySelectedUser(response.loginHistories)
        setLoginHistory(filtered)
        setCurrentPage(response.currentPage)
        setTotalPages(response.totalPages)
        setTotalRecords(response.totalRecords)
      }
    } catch (error) {
      console.error('Error fetching login history:', error)
      toast.error('Failed to fetch login history')
    } finally {
      setLoading(false)
    }
  }

  const fetchSearchLoginHistory = async (username: string, page: number) => {
    try {
      setLoading(true)
      const response = await authService.searchLoginHistory(username, page, pageSize)
      
      if (response && response.loginHistories) {
        const filtered = filterBySelectedUser(response.loginHistories)
        setLoginHistory(filtered)
        setCurrentPage(response.currentPage)
        setTotalPages(response.totalPages)
        setTotalRecords(response.totalRecords)
      }
    } catch (error) {
      console.error('Error searching login history:', error)
      toast.error('Failed to search login history')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserLoginHistoryByDateRange = async (page: number) => {
    try {
      setLoading(true)
      const response = await authService.fetchUserLoginHistoryByDateRange(
        fromDate,
        toDate,
        page,
        pageSize
      )
      
      if (response && response.loginHistories) {
        const filtered = filterBySelectedUser(response.loginHistories)
        setLoginHistory(filtered)
        setCurrentPage(response.currentPage)
        setTotalPages(response.totalPages)
        setTotalRecords(response.totalRecords)
      }
    } catch (error) {
      console.error('Error fetching login history by date range:', error)
      toast.error('Failed to fetch login history by date range')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return '-'
    const date = new Date(dateTimeStr)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const calculateDuration = (loginDateTime: string, logoutDateTime: string | null) => {
    if (!logoutDateTime) return 'Active'
    
    const login = new Date(loginDateTime)
    const logout = new Date(logoutDateTime)
    const diffMs = logout.getTime() - login.getTime()
    
    if (diffMs < 0) return 'Invalid'
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage)
      
      // Refetch data for new page
      if (searchTerm.trim().length >= 1) {
        fetchSearchLoginHistory(searchTerm, newPage)
      } else if (fromDate && toDate) {
        fetchUserLoginHistoryByDateRange(newPage)
      } else {
        fetchLoginHistoryFiltered(newPage)
      }
    }
  }

  const stats = {
    total: totalRecords,
    active: loginHistory.filter(r => !r.logoutDateTime).length,
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="loginHistory:showFilters"
          filterWidthClass="lg:w-[25%]"
          filters={
            <div className="space-y-4 p-4">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Filter</h3>
              
              {/* From Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">From :</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* To Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">To :</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* User Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">User :</label>
                <select
                  value={selectedUser}
                  onChange={(e) => {
                    const value = e.target.value
                    setSelectedUser(value)
                    if (value === '') {
                      setSelectedUserId(null)
                    } else {
                      const userData = users.find(u => u.name === value)
                      setSelectedUserId(userData?.id || null)
                    }
                  }}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Users</option>
                  {users.map(user => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Search :</label>
                <input
                  type="text"
                  placeholder="Search username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleView}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded font-semibold text-sm transition"
                >
                  {loading ? 'Loading...' : 'View'}
                </button>
                <button
                  onClick={handleClear}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded font-semibold text-sm transition"
                >
                  Clear
                </button>
              </div>
            </div>
          }
        >
          {/* Table Container */}
          <div className="flex flex-col h-full bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Login History</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Track login and logout activities
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Total Records: </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{totalRecords}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Page: </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{currentPage + 1} / {totalPages}</span>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-3 text-slate-600 dark:text-slate-400">Loading login history...</p>
                </div>
              </div>
            ) : loginHistory.length === 0 ? (
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-slate-600 dark:text-slate-400">No login history found</p>
                </div>
              </div>
            ) : (
              <>
                {/* Table Container */}
                <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
                  <table className="w-full border-collapse">
                    <colgroup>
                      <col style={{width: '60px'}} />
                      <col style={{width: '120px'}} />
                      <col style={{width: '100px'}} />
                      <col style={{width: '200px'}} />
                      <col style={{width: '200px'}} />
                      <col style={{width: '130px'}} />
                      <col style={{width: '200px'}} />
                      <col style={{width: '150px'}} />
                      <col style={{width: '120px'}} />
                      <col style={{width: '150px'}} />
                      <col style={{width: '120px'}} />
                    </colgroup>
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">S.No</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Username</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Type</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Login Date & Time</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Logout Date & Time</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Duration</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Last App Access</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">IP Address</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Device ID</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Remarks</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800">
                      {loginHistory.map((record, index) => {
                        const isActive = !record.logoutDateTime
                        const userTypeBadgeColor = {
                          'ADMIN': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                          'MASTER': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                          'CLIENT': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        }[record.userType] || 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
                        
                        return (
                          <tr
                            key={record.loginHistoryId}
                            className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200 border-b border-slate-200/50 dark:border-slate-700/30"
                          >
                            <td className="px-3 py-3 text-center">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {currentPage * pageSize + index + 1}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {record.userName || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-block ${userTypeBadgeColor}`}>
                                {record.userType || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                  {formatDateTime(record.loginDateTime)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                  {formatDateTime(record.logoutDateTime)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {calculateDuration(record.loginDateTime, record.logoutDateTime)}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                {formatDateTime(record.lastAppAccessTime)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
                                {record.ipAddress || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                {record.deviceId || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                {record.remarks && record.remarks.trim() !== '' ? record.remarks : '-'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {isActive ? (
                                <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 inline-flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                  Active
                                </span>
                              ) : (
                                <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 inline-block">
                                  Logged Out
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      Showing <span className="font-semibold text-slate-900 dark:text-white">{currentPage * pageSize + 1}</span> to{' '}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {Math.min((currentPage + 1) * pageSize, totalRecords)}
                      </span>{' '}
                      of <span className="font-semibold text-slate-900 dark:text-white">{totalRecords}</span> results
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 0}
                        className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-2 shadow-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages - 1}
                        className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-2 shadow-sm"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </FilterLayout>
      </div>
    </div>
  )
}

export default LoginHistory
