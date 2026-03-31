import React, { useState, useEffect } from 'react'
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '../../services/authService'

interface LoginHistoryRecord {
  loginHistoryId: number
  userId: number
  loginDateTime: string
  logoutDateTime: string | null
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
  const pageSize = 10

  useEffect(() => {
    fetchLoginHistoryData(currentPage)
  }, [currentPage])

  const fetchLoginHistoryData = async (page: number) => {
    try {
      setLoading(true)
      const userDataStr = localStorage.getItem('userData')
      const userData = userDataStr ? JSON.parse(userDataStr) : null
      const userId = userData?.userId 

      const response = await authService.fetchLoginHistory(userId, page, pageSize)
      
      if (response && response.loginHistories) {
        setLoginHistory(response.loginHistories)
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
    }
  }

  const stats = {
    total: totalRecords,
    active: loginHistory.filter(r => !r.logoutDateTime).length,
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Login History</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Track your login and logout activities
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
                  <col style={{width: '80px'}} />
                  <col style={{width: '280px'}} />
                  <col style={{width: '280px'}} />
                  <col style={{width: '180px'}} />
                  <col style={{width: '150px'}} />
                </colgroup>
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      S.No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Login Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Logout Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Session Duration
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800">
                  {loginHistory.map((record, index) => {
                    const isActive = !record.logoutDateTime
                    return (
                      <tr
                        key={record.loginHistoryId}
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200 border-b border-slate-200/50 dark:border-slate-700/30"
                      >
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {currentPage * pageSize + index + 1}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {formatDateTime(record.loginDateTime)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {formatDateTime(record.logoutDateTime)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {calculateDuration(record.loginDateTime, record.logoutDateTime)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-center">
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
    </div>
  )
}

export default LoginHistory
