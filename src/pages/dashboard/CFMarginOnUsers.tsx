import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-hot-toast'
import { X, Eye, Briefcase } from 'lucide-react'
import { API_ENDPOINTS } from '../../config/apiConfig'
import userManagementService from '../../services/userManagementService'
import { authFetchPost } from '../../utils/authFetch'
import FilterLayout from '../../components/FilterLayout'
import SearchableSelect from '../../components/ui/SearchableSelect'
import UserDetailsModal from '../user-management/UserDetailsModal'

interface CFMarginUser {
  userId: number
  username: string
  parentUsername: string
  exchange: string | null
}

interface CFMarginPosition {
  exchange: string
  symbol: string
  position: 'BUY' | 'SELL'
  quantity: number
  averagePrice: number
  cmp: number
  pnl: number
  margin: number
  cfMargin: number
}

interface CFMarginOnUsersProps {
  username?: string
  userId?: string | number
  roleId?: any
  user?: any
}

const CFMarginOnUsers: React.FC<CFMarginOnUsersProps> = ({ username, userId, roleId, user }) => {
  // Get logged-in user ID
  const getLoggedInUserId = (): number => {
    const userDataStr = localStorage.getItem('userData')
    const userData = userDataStr ? JSON.parse(userDataStr) : null
    return userData?.userId
  }

  const loggedInUserId = getLoggedInUserId()
  
  // Use passed userId if available, otherwise use logged-in user ID
  const passedUserId = userId ? Number(userId) : null

  // State for management users (dropdown filter)
  const [managementUsers, setManagementUsers] = useState<any[]>([])
  
  // State for CF Margin Users (main table data)
  const [cfMarginUsers, setCFMarginUsers] = useState<CFMarginUser[]>([])
  const [allCFMarginUsers, setAllCFMarginUsers] = useState<CFMarginUser[]>([])
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  
  // State for filters - Initialize with passed userId if available
  const [selectedUserId, setSelectedUserId] = useState<number | null>(passedUserId || null)
  const [selectedExchange, setSelectedExchange] = useState<string>('')
  const [exchanges, setExchanges] = useState<any[]>([])

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<CFMarginUser | null>(null)
  const [modalPositions, setModalPositions] = useState<CFMarginPosition[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  // UserDetailsModal state
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any>(null)

  // Ref to ensure metadata loads only once per session
  const metadataLoadedRef = React.useRef(false)

  // Memoized user options for SearchableSelect (from management users dropdown)
  const userOptions = useMemo(
    () => managementUsers.map((u: any) => ({
      id: u.userId || u.id,
      name: u.userName || u.username
    })),
    [managementUsers]
  )

  // Load metadata once per session (like Trades.tsx pattern)
  useEffect(() => {
    if (metadataLoadedRef.current) return

    const loadInitialData = async () => {
      try {
        setInitialLoading(true)
        
        // Step 1: Fetch users (for dropdown) - use logged-in user ID
        const usersResponse = await userManagementService.fetchOwnUsers(loggedInUserId)
        if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
          setManagementUsers(usersResponse.data)
          
          // Set user as selected - use passed userId if available, otherwise logged-in user
          setSelectedUserId(passedUserId || loggedInUserId)
        }
        
        // Step 2: Fetch exchanges
        const exchangesResponse = await userManagementService.fetchExchanges()
        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse)
          // Set first exchange as default
          setSelectedExchange(exchangesResponse[0].name)
        }
      } catch (error) {
        console.error('❌ Error loading initial metadata:', error)
        toast.error('Failed to load metadata')
      } finally {
        setInitialLoading(false)
      }
    }
    
    loadInitialData()
    metadataLoadedRef.current = true
  }, []) // Run only once on mount

  // Fetch CF Margin Users whenever selected user changes
  useEffect(() => {
    if (!selectedUserId) return
    
    const fetchCFMarginUsersData = async () => {
      try {
        setLoading(true)
        const cfMarginPayload = {
          userId: selectedUserId,
          requestTimestamp: ''
        }
        
        const cfMarginResponse = await authFetchPost(
          API_ENDPOINTS.OMS.CF_MARGIN_USERS || '/oms/cfMargin/users',
          cfMarginPayload
        )
        const cfMarginResult = await cfMarginResponse.json()
        
        if (cfMarginResult?.responseCode === '0' && Array.isArray(cfMarginResult.data)) {
          setAllCFMarginUsers(cfMarginResult.data)
          setCFMarginUsers(cfMarginResult.data)
        } else {
          toast.error(cfMarginResult?.responseMessage || 'Failed to fetch CF Margin users')
          setAllCFMarginUsers([])
          setCFMarginUsers([])
        }
      } catch (error) {
        console.error('❌ Error fetching CF Margin users:', error)
        toast.error('Failed to fetch CF Margin users')
        setAllCFMarginUsers([])
        setCFMarginUsers([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchCFMarginUsersData()
  }, [selectedUserId]) // Re-fetch when selected user changes

  // Filter CF Margin users by exchange (include null exchanges)
  useEffect(() => {
    if (selectedExchange && selectedExchange !== '') {
      const filtered = allCFMarginUsers.filter((u: any) => u.exchange === selectedExchange || u.exchange === null)
      setCFMarginUsers(filtered)
    } else {
      setCFMarginUsers(allCFMarginUsers)
    }
  }, [selectedExchange, allCFMarginUsers])

  // Fetch CF Margin Positions for selected user (minimal payload as per API requirement)
  const fetchCFMarginPositions = useCallback(async (userId: number) => {
    setModalLoading(true)
    try {
      // Minimal payload - only userId and requestTimestamp (like the curl example)
      const payload = {
        userId: userId,
        requestTimestamp: ''
      }
      
      const response = await authFetchPost(
        API_ENDPOINTS.OMS.CF_MARGIN_POSITIONS || '/oms/cfMargin/positions',
        payload
      )
      const result = await response.json()
      
      if (result?.responseCode === '0' && Array.isArray(result.data)) {
        setModalPositions(result.data)
      } else {
        toast.error(result?.responseMessage || 'Failed to fetch positions')
        setModalPositions([])
      }
    } catch (error) {
      console.error('❌ Error fetching CF Margin Positions:', error)
      toast.error('Failed to fetch positions')
      setModalPositions([])
    } finally {
      setModalLoading(false)
    }
  }, [])

  // Handle view user positions
  const handleViewPositions = async (user: any) => {
    setSelectedUser(user)
    setShowModal(true)
    await fetchCFMarginPositions(user.userId || user.id)
  }

  // Handle username click to open UserDetailsModal
  const handleUserNameClick = (e: React.MouseEvent, username: string, userId: number) => {
    e.preventDefault()
    e.stopPropagation()

    const userDataStr = localStorage.getItem('userData')
    const loggedInUser = userDataStr ? JSON.parse(userDataStr) : null
    if (loggedInUser?.roleId === 4) return // Don't allow clients to view other users

    const placeholderUser: any = {
      id: userId.toString(),
      username: username,
      name: username,
      type: 'Client',
      parent: '',
      credit: 0,
      balance: 0,
      sharing: null,
      bet: false,
      closeOut: false,
      margin: false,
      status: false,
      creditLimit: false,
      creditBasedMargin: false,
      betEnabled: false,
      closeOutEnabled: false,
      marginEnabled: false,
      statusEnabled: false,
      creditLimitEnabled: false,
      creditBasedMarginEnabled: false,
      createdDate: '',
      ipAddress: '',
      manualOrder: false,
      manualOrderEnabled: false,
      deviceId: '',
      lastLogin: '',
      isActive: true,
      isTradeLock: false,
      deleteTrade: false,
      deleteTradeEnabled: false
    }

    setSelectedUserForDetails(placeholderUser)
  }

  // Calculate stats
  const stats = useMemo(() => ({
    total: cfMarginUsers.length,
  }), [cfMarginUsers])

  // Filter Panel - Hide when opened from UserPositionsPanel (when username/userId is passed)
  const isOpenedFromPanel = username || userId
  
  const filters = (
    <div className="space-y-4 p-4">
      {/* Only show Username selector when not opened from UserPositionsPanel */}
      {!isOpenedFromPanel && (
        <SearchableSelect
          label="Username :"
          items={userOptions}
          selectedId={selectedUserId || 0}
          onSelect={(id) => setSelectedUserId(Number(id))}
          placeholder="Search user..."
        />
      )}
      
      {/* Only show Exchange selector when not opened from UserPositionsPanel */}
      {!isOpenedFromPanel && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Exchange :
          </label>
          <select
            value={selectedExchange}
            onChange={(e) => setSelectedExchange(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-gray-100"
          >
            {exchanges.map((ex) => (
              <option key={ex.id || ex.name} value={ex.name}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Only show Refresh button when not opened from UserPositionsPanel */}
      {!isOpenedFromPanel && (
        <button
          onClick={() => {
            // Refresh CF Margin users data
            const refreshCFMarginData = async () => {
              try {
                setLoading(true)
                const cfMarginPayload = {
                  userId: loggedInUserId,
                  requestTimestamp: ''
                }
                
                const cfMarginResponse = await authFetchPost(
                  API_ENDPOINTS.OMS.CF_MARGIN_USERS || '/oms/cfMargin/users',
                  cfMarginPayload
                )
                const cfMarginResult = await cfMarginResponse.json()
                
                if (cfMarginResult?.responseCode === '0' && Array.isArray(cfMarginResult.data)) {
                  setAllCFMarginUsers(cfMarginResult.data)
                  setCFMarginUsers(cfMarginResult.data)
                  toast.success('CF Margin users refreshed')
                } else {
                  toast.error(cfMarginResult?.responseMessage || 'Failed to refresh CF Margin users')
                }
              } catch (error) {
                toast.error('Failed to refresh CF Margin users')
                console.error(error)
              } finally {
                setLoading(false)
              }
            }
            refreshCFMarginData()
          }}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm transition disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      )}
    </div>
  )

  // Render with FilterLayout when standalone, without when opened from panel
  const content = (
    <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
        
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase className="w-7 h-7 text-blue-500" />
              CF Margin Users
            </h1>
            <div className="flex gap-4">
              <div className="w-32 text-center">
                <div className="text-xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total Users</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto scrollbar-thin">
          {initialLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : cfMarginUsers.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">No users found</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters</p>
              </div>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 border-b-2 border-blue-100 dark:border-blue-900">
                <tr>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Username</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Parent Username</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {cfMarginUsers.map((user: any, index) => (
                  <tr key={user.userId || user.id || index} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewPositions(user)}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                    <td className="px-6 py-4 text-left font-semibold text-slate-900 dark:text-slate-100">
                      <span
                        className="text-blue-600 underline cursor-pointer hover:text-blue-800 transition-colors"
                        onClick={(e) => handleUserNameClick(e, user.userName || user.username, user.userId || user.id)}
                      >
                        {user.userName || user.username}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-left text-slate-600 dark:text-slate-400">
                      {user.parentUserName || user.parentUsername || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      {/* CF Margin Positions Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-800 px-8 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-white">
                CF Margin Positions - {selectedUser.userName || selectedUser.username}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedUser(null)
                  setModalPositions([])
                }}
                className="text-white hover:bg-blue-500/20 p-2 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto">
              {modalLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
                </div>
              ) : modalPositions.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">No positions found</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">This user has no CF margin positions</p>
                  </div>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 border-b-2 border-blue-100 dark:border-blue-900">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Exchange</th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Position</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Avg Price</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">CMP</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">P&L</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Margin</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">CF Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {modalPositions.map((pos, index) => (
                      <tr key={index} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 text-left">
                          <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded border border-purple-200 uppercase">
                            {pos.exchange}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-left font-semibold text-slate-900 dark:text-slate-100">
                          {pos.symbol}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-bold text-sm ${pos.position === 'BUY' ? 'text-blue-600' : 'text-red-600'}`}>
                            {pos.position}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          {pos.quantity}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm text-slate-600 dark:text-slate-400">
                          ₹{pos.averagePrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm text-slate-600 dark:text-slate-400">
                          ₹{pos.cmp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className={`px-6 py-4 text-right font-mono text-sm font-bold rounded-lg ${
                          pos.pnl > 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' :
                          pos.pnl < 0 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' :
                          'text-slate-600 dark:text-slate-400'
                        }`}>
                          ₹{pos.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm text-slate-600 dark:text-slate-400">
                          ₹{pos.margin.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-sm text-slate-600 dark:text-slate-400">
                          {pos.cfMargin.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {selectedUserForDetails && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-[9999]" onClick={() => setSelectedUserForDetails(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col border border-gray-200/50 overflow-hidden" style={{ width: '98vw', height: '96vh', maxWidth: '1800px' }} onClick={(e) => e.stopPropagation()}>
            <UserDetailsModal
              user={selectedUserForDetails}
              onClose={() => setSelectedUserForDetails(null)}
              onToggle={() => { }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )

  // Return with or without FilterLayout based on isOpenedFromPanel
  return isOpenedFromPanel ? (
    content
  ) : (
    <FilterLayout
      filters={filters}
      filterWidthClass="w-[350px]"
      storageKey="cfMarginUsers:showFilters"
    >
      {content}
    </FilterLayout>
  )
}

export default CFMarginOnUsers
