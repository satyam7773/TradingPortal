import React, { useState, useEffect } from 'react'
import { BarChart3, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import userManagementService from '../../services/userManagementService'
import FilterLayout from '../../components/FilterLayout'

interface M2MData {
  userId: number
  username: string
  userType: string
  pnlSharing: number
  pnl: number
  plShareAmount: number
}

const M2MProfitLoss: React.FC = () => {
  const getLoggedInUserId = (): number => {
    const userDataStr = localStorage.getItem('userData')
    if (userDataStr) {
      const userData = JSON.parse(userDataStr)
      return userData.userId || 31
    }
    return 31
  }

  const loggedInUserId = getLoggedInUserId()

  // Change default to "0" to match the API's "All" userId
  const [selectedUserId, setSelectedUserId] = useState<number>(0)
  const [reportData, setReportData] = useState<M2MData[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)
        const response = await userManagementService.fetchOwnUsers(loggedInUserId)
        if (response?.responseCode === '0' && Array.isArray(response.data)) {
          setUsers(response.data)
        }
      } catch (error: any) {
        toast.error('Failed to load users')
      } finally {
        setInitialLoading(false)
      }
    }
    loadInitialData()
  }, [loggedInUserId])

  const handleView = async () => {
    setLoading(true)
    try {
      /* LOGIC: 
         If selectedUserId is 0 (The "All" option from API): 
         -> Pass loggedInUserId and 'ALL'
         Else:
         -> Pass selectedUserId and 'SINGLE'
      */
      const isAllSelected = selectedUserId === 0
      const userIdToFetch = isAllSelected ? loggedInUserId : selectedUserId
      const filterType = isAllSelected ? 'ALL' : 'SINGLE'

      const response = await userManagementService.fetchM2MReport(userIdToFetch, filterType)

      if (response?.responseCode === '0' && Array.isArray(response.data)) {
        setReportData(response.data)
        toast.success('M2M Report Loaded')
      } else {
        setReportData([])
        toast.error(response?.responseMessage || 'No data found')
      }
    } catch (error: any) {
      toast.error('Failed to fetch M2M data')
      setReportData([])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setSelectedUserId(0) // Reset to "All"
    setReportData([])
  }

  const formatCurrency = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="m2m:showFilters"
          filterWidthClass="lg:w-[25%]"
          filters={
            <div className="space-y-4 p-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">M2M Filters</h3>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Username :</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {/* No hardcoded "All Users" here anymore as it comes from the API response */}
                    {users.map(user => (
                      <option key={user.userId} value={user.userId}>
                        {user.userName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleView}
                    disabled={loading || initialLoading}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded font-semibold text-sm transition shadow-md"
                  >
                    {loading ? 'Loading...' : 'Apply'}
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded font-semibold text-sm transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          }
        >
          <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
             <div className="px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 dark:via-slate-800/80 dark:to-slate-800/80">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                M2M Profit & Loss
              </h2>
            </div>

            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-blue-400 dark:scrollbar-thumb-blue-600">
              {reportData.length === 0 && !loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Users size={48} className="opacity-20" />
                  <p>Select a user and click Apply</p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-700 z-10 border-b">
                    <tr className="text-slate-700 dark:text-blue-300 text-xs font-bold uppercase">
                      <th className="px-6 py-4 text-left">User</th>
                      <th className="px-6 py-4 text-left">User Type</th>
                      <th className="px-6 py-4 text-right">Profit / Loss</th>
                      <th className="px-6 py-4 text-right">PL Share(%)</th>
                      <th className="px-6 py-4 text-right">PLShare Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-700 hover:bg-blue-50/50">
                        <td className="px-6 py-4 text-sm font-bold">{item.username}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{item.userType}</td>
                        <td className={`px-6 py-4 text-right text-sm font-bold ${item.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ₹{formatCurrency(item.pnl)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold">{item.pnlSharing}%</td>
                        <td className={`px-6 py-4 text-right text-sm font-bold ${item.plShareAmount >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          ₹{formatCurrency(item.plShareAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </FilterLayout>
      </div>
    </div>
  )
}

export default M2MProfitLoss