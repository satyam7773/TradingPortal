import React, { useState, useEffect, useRef, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { X, Briefcase, Search, ArrowLeft } from 'lucide-react'
import FilterLayout from '../../components/FilterLayout'
import SearchableSelect from '../../components/ui/SearchableSelect'
import userManagementService from '../../services/userManagementService'
import marketWatchService from '../../services/marketWatchService'
import { withTabCache, CacheContextProps } from '../../hoc/withTabCache'

// --- Interfaces ---
interface PnLData {
  userId: number
  username: string
  roleId?: number
  realisedPnl?: number
  m2m?: number
  total?: number
}

interface PnLPageProps extends CacheContextProps {}

const ProfitLossPage: React.FC<PnLPageProps> = ({ cacheData, apiData, onCacheSave, isRestoringCache }) => {
  const getLoggedInUserId = (): number => {
    const userDataStr = localStorage.getItem('userData')
    const userData = userDataStr ? JSON.parse(userDataStr) : null
    return userData?.userId;
  }

  const getRoleId = (): number | null => {
    const userDataStr = localStorage.getItem('userData')
    const userData = userDataStr ? JSON.parse(userDataStr) : null
    return userData?.roleId || null
  }

  const loggedInUserId = getLoggedInUserId()
  const roleId = getRoleId()
  
  // ROLE DEFINITIONS
  const isAdminOnly = roleId === 1 || roleId === 2 // Strict Admin
  const isAdminOrMaster = roleId === 1 || roleId === 2 || roleId === 3 // Admin + Master
  const isClient = roleId === 4

  // Initialize state with cache if available
  const initializeFilterState = () => {
    if (cacheData) {
      return cacheData
    }
    return {
      userFilterType: 'ALL' as 'ALL' | 'SINGLE',
      selectedUserId: loggedInUserId,
      autoRefresh: false
    }
  }

  const initialFilters = initializeFilterState()
  const cacheLoggedRef = React.useRef(false)
  
  // Log cache found once
  useEffect(() => {
    if (cacheData && !cacheLoggedRef.current) {
      console.log('✅ [ProfitLoss] Initializing from cache:', cacheData)
      cacheLoggedRef.current = true
    }
  }, [cacheData])

  const [userFilterType, setUserFilterType] = useState<'ALL' | 'SINGLE'>(initialFilters.userFilterType)
  const [selectedUserId, setSelectedUserId] = useState<number | string>(initialFilters.selectedUserId)
  
  // Tables and Summary State splits
  const [pnlTableData, setPnlTableData] = useState<PnLData[]>(apiData?.pnlTableData || [])
  const [pnlTotals, setPnlTotals] = useState(apiData?.pnlTotals || { realised: 0, m2m: 0, total: 0 })
  
  const [users, setUsers] = useState<any[]>([])
  
  // Memoized user options for the SearchableSelect
  const userOptions = useMemo(
    () => users.map((u) => ({
      id: u.userId,
      name: u.userName
    })),
    [users]
  )
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(initialFilters.autoRefresh)

  const cacheTimerRef = useRef<any>(null)
  const cacheInitializedRef = useRef(false)
  const metadataLoadedRef = useRef(false)

  // Fetch initial data only if cache doesn't exist
  useEffect(() => {
    if (!cacheInitializedRef.current && !cacheData) {
      console.log('📡 [ProfitLoss] No cache found, fetching initial data...')
      handleView()
      cacheInitializedRef.current = true
    }
  }, []) // Only run once on mount

  // Handle cache data changes (when switching back to this tab with cache)
  useEffect(() => {
    if (cacheData && !cacheInitializedRef.current) {
      console.log('🔄 [ProfitLoss] Cache found, initializing from cache')
      cacheInitializedRef.current = true
      
      // Restore table data if available
      if (apiData?.pnlTableData) {
        console.log('📊 [ProfitLoss] Restoring cached table data')
        setPnlTableData(apiData.pnlTableData)
        setPnlTotals(apiData.pnlTotals || { realised: 0, m2m: 0, total: 0 })
      }
    }
  }, [cacheData, apiData])

  // --- Modal Navigation Stack ---
  const [modalUserStack, setModalUserStack] = useState<number[]>([])
  const [modalTableData, setModalTableData] = useState<PnLData[]>([])
  const [modalTotals, setModalTotals] = useState({ realised: 0, m2m: 0, total: 0 })
  const [modalLoading, setModalLoading] = useState(false)

  const activeModalUserId = modalUserStack.length > 0 ? modalUserStack[modalUserStack.length - 1] : null

  const stateRef = useRef({ activeModalUserId, userFilterType, selectedUserId })
  useEffect(() => {
    stateRef.current = { activeModalUserId, userFilterType, selectedUserId }
  }, [activeModalUserId, userFilterType, selectedUserId])

  // Process data to separate the "TOTAL" object from table rows
  const processPnLResponse = (rawData: PnLData[]) => {
    if (!rawData || rawData.length === 0) {
      return { tableRows: [], totals: { realised: 0, m2m: 0, total: 0 } }
    }

    const firstElement = rawData[0]
    if (firstElement && firstElement.username === 'TOTAL') {
      return {
        tableRows: rawData.slice(1),
        totals: {
          realised: firstElement.realisedPnl || 0,
          m2m: firstElement.m2m || 0,
          total: firstElement.total || 0
        }
      }
    }

    // Fallback if "TOTAL" isn't the first element or missing
    const tableRows = rawData.filter(item => item.username !== 'TOTAL')
    const totalItem = rawData.find(item => item.username === 'TOTAL')
    
    return {
      tableRows,
      totals: {
        realised: totalItem?.realisedPnl || tableRows.reduce((s, i) => s + (i.realisedPnl || 0), 0),
        m2m: totalItem?.m2m || tableRows.reduce((s, i) => s + (i.m2m || 0), 0),
        total: totalItem?.total || tableRows.reduce((s, i) => s + (i.total || 0), 0),
      }
    }
  }

  const handleView = async (isSilentRefresh = false): Promise<void> => {
    if (!isSilentRefresh) setLoading(true)
    try {
      const targetUserId = stateRef.current.userFilterType === 'SINGLE' ? Number(stateRef.current.selectedUserId) : loggedInUserId
      const response = await userManagementService.fetchProfitAndLoss(targetUserId)
      if (response?.responseCode === '0') {
        const { tableRows, totals } = processPnLResponse(response.data || [])
        setPnlTableData(tableRows)
        setPnlTotals(totals)
      }
    } catch (error) {
      if (!isSilentRefresh) {
        setPnlTableData([])
        setPnlTotals({ realised: 0, m2m: 0, total: 0 })
      }
    } finally {
      if (!isSilentRefresh) setLoading(false)
    }
  }

  const fetchModalPnL = async (userId: number, isSilentRefresh = false) => {
    if (!isSilentRefresh) setModalLoading(true)
    try {
      const response = await userManagementService.fetchProfitAndLoss(userId)
      if (response?.responseCode === '0') {
        const { tableRows, totals } = processPnLResponse(response.data || [])
        setModalTableData(tableRows)
        setModalTotals(totals)
      }
    } catch (error) {
      if (!isSilentRefresh) {
        setModalTableData([])
        setModalTotals({ realised: 0, m2m: 0, total: 0 })
      }
    } finally {
      if (!isSilentRefresh) setModalLoading(false)
    }
  }

  const handleDrillDown = (userId: number) => {
    setModalUserStack(prevStack => [...prevStack, userId])
  }

  const handleGoBack = () => {
    setModalUserStack(prevStack => prevStack.slice(0, -1))
  }

  const handleCloseModal = () => {
    setModalUserStack([])
    setModalTableData([])
    setModalTotals({ realised: 0, m2m: 0, total: 0 })
  }

  useEffect(() => {
    if (activeModalUserId !== null) {
      fetchModalPnL(activeModalUserId, false)
    }
  }, [activeModalUserId])

  // Auto-refresh polling interval (5 seconds for non-Client users)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleView(true)
      if (stateRef.current.activeModalUserId) {
        fetchModalPnL(stateRef.current.activeModalUserId, true)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  useEffect(() => {
    // Only load metadata once per session, not on every tab switch
    if (metadataLoadedRef.current) return

    const loadInitialData = async () => {
      try {
        const usersResponse = await userManagementService.fetchOwnUsers(loggedInUserId)
        if (usersResponse?.responseCode === '0') setUsers(usersResponse.data || [])
        metadataLoadedRef.current = true // Mark as loaded
      } catch (e) { console.error(e) }
    }
    loadInitialData()
  }, [])

  // Restore from cache if available
  useEffect(() => {
    if (cacheData && isRestoringCache) {
      console.log('� [ProfitLoss] Restoring from cache:', cacheData)
      setUserFilterType(cacheData.userFilterType ?? 'ALL')
      setSelectedUserId(cacheData.selectedUserId ?? loggedInUserId)
      setAutoRefresh(cacheData.autoRefresh ?? false)
      
      // Restore cached data if available
      if (apiData?.pnlTableData) {
        console.log('📊 [ProfitLoss] Restoring cached table data')
        setPnlTableData(apiData.pnlTableData || [])
        setPnlTotals(apiData.pnlTotals || { realised: 0, m2m: 0, total: 0 })
      }
      
      console.log('✅ [ProfitLoss] Cache restored successfully, skipping API calls')
    }
  }, [isRestoringCache, cacheData, apiData, loggedInUserId])

  // Save filters to cache whenever they change (debounced)
  useEffect(() => {
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    
    cacheTimerRef.current = setTimeout(() => {
      const filters = {
        userFilterType,
        selectedUserId,
        autoRefresh
      }
      console.log('💾 [ProfitLoss] Saving filters to cache')
      onCacheSave(filters, { pnlTableData, pnlTotals })
    }, 500)
    
    return () => {
      if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    }
  }, [userFilterType, selectedUserId, autoRefresh, pnlTableData, pnlTotals, onCacheSave])

  // Setup MTM live socket subscription (ONLY for Clients)
  useEffect(() => {
    let mtmUnsubscribe: (() => void) | null = null

    const setupMTMSubscription = async () => {
      // Only setup MTM subscription for Clients (roleId === 4)
      if (!isClient) {
        console.log(`⏭️  Skipping MTM subscription - User role is not Client (roleId: ${roleId})`)
        return
      }

      if (!loggedInUserId) {
        console.log('❌ No logged-in user, skipping MTM subscription')
        return
      }

      try {
        // Connect to socket if not already connected
        if (!marketWatchService.isConnected()) {
          console.log('🔌 Socket not connected, attempting to connect...')
          await marketWatchService.connect()
        }

        const userIdStr = loggedInUserId.toString()
        console.log(`📊 Setting up MTM subscription for CLIENT user: ${userIdStr}`)

        // Subscribe to MTM updates
        mtmUnsubscribe = marketWatchService.subscribeToMTM(userIdStr, (mtmData) => {
          console.log('📊 MTM Live Update Received:', mtmData, 'Type:', typeof mtmData)
          
          // Handle different MTM data formats from socket
          if (mtmData === null || mtmData === undefined) {
            console.log('⚠️ Empty MTM data received')
            return
          }

          // Case 1: Data is a simple number (just M2M value)
          if (typeof mtmData === 'number') {
            console.log(`💰 Updating M2M to: ${mtmData}`)
            setPnlTotals((prev: any) => ({ ...prev, m2m: mtmData, total: prev.realised + mtmData }))
            console.log('✅ M2M value updated from live socket')
            return
          }

          // Case 2: Data is an object with m2m, realised, etc
          if (typeof mtmData === 'object' && !Array.isArray(mtmData)) {
            const { m2m, realised } = mtmData
            if (m2m !== undefined || realised !== undefined) {
              setPnlTotals((prev: any) => {
                const newRealised = realised !== undefined ? realised : prev.realised
                const newM2M = m2m !== undefined ? m2m : prev.m2m
                const newTotal = newRealised + newM2M
                console.log(`💰 Updating totals - Realised: ${newRealised}, M2M: ${newM2M}, Total: ${newTotal} (realised + m2m)`)
                return {
                  realised: newRealised,
                  m2m: newM2M,
                  total: newTotal
                }
              })
              console.log('✅ Totals updated from live socket')
              return
            }
          }

          // Case 3: Data is an array (existing format with detailed rows)
          if (Array.isArray(mtmData)) {
            const { tableRows, totals } = processPnLResponse(mtmData)
            setPnlTableData(tableRows)
            setPnlTotals(totals)
            console.log('✅ P&L data updated from live socket:', totals)
            return
          }

          console.warn('⚠️ Unknown MTM data format:', mtmData)
        })
      } catch (error) {
        console.error('❌ Error setting up MTM subscription:', error)
      }
    }

    setupMTMSubscription()

    // Cleanup on unmount
    return () => {
      if (mtmUnsubscribe) {
        console.log('🧹 Cleaning up MTM subscription')
        mtmUnsubscribe()
      }
    }
  }, [loggedInUserId, isClient, roleId])

  // Clear all filters
  const handleClearFilters = () => {
    console.log('🗑️ [ProfitLoss] Clearing all filters')
    setPnlTableData([])
    setPnlTotals({ realised: 0, m2m: 0, total: 0 })
    setUserFilterType('ALL')
    setSelectedUserId(loggedInUserId)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="profitloss:showFilters"
          filterWidthClass="lg:w-[16%]"
          filters={
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                {selectedUserId && selectedUserId !== loggedInUserId && (
                  <button
                    onClick={() => {
                      setSelectedUserId(loggedInUserId);
                      setUserFilterType('ALL');
                    }}
                    className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition float-right mb-2"
                  >
                    Clear
                  </button>
                )}
                <SearchableSelect
                  label="Username :"
                  items={userOptions}
                  selectedId={selectedUserId}
                  onSelect={(id) => {
                    setSelectedUserId(id);
                    setUserFilterType('SINGLE');
                  }}
                  placeholder="Search username..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">Auto Refresh</label>
                {isClient ? (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <span className="text-[10px] text-green-700 dark:text-green-300 font-semibold">✓ Live Data Enabled</span>
                    <span className="text-[9px] text-green-600 dark:text-green-400 italic">Real-time updates via socket</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-500 italic">Every 5s</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={autoRefresh} onChange={() => setAutoRefresh(!autoRefresh)} />
                      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => handleView()} disabled={loading} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition">View</button>
                <button onClick={handleClearFilters} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded font-semibold text-sm transition">Clear</button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
            <div className="flex-shrink-0 px-6 py-3 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-7 h-7 text-blue-500" /> P&L Report
                </h1>
                <div className="grid grid-cols-3 gap-8">
                  <SummaryItem label="Realised" value={pnlTotals.realised} color="emerald" />
                  <SummaryItem label="M2M" value={pnlTotals.m2m} color="blue" />
                  <SummaryItem label="Net Total" value={pnlTotals.total} color="emerald" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? <div className="h-full flex items-center justify-center animate-pulse text-slate-500">Loading...</div> : (
                <PnLTable data={pnlTableData} onUserClick={handleDrillDown} />
              )}
            </div>
          </div>
        </FilterLayout>
      </div>

      {/* RECURSIVE MODAL SECTION */}
      {activeModalUserId !== null && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md overflow-hidden flex justify-center">
          <div className="absolute top-[150px] left-1/2 -translate-x-1/2 bg-[#0b1221] w-[95%] max-w-6xl flex flex-col rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.6)] border border-slate-800 animate-in slide-in-from-top-10 duration-500 h-fit max-h-[calc(100vh-200px)]">

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-10 py-7 border-b border-slate-800/60 bg-[#0f172a]">
              <div className="flex items-center gap-5">
                {modalUserStack.length > 1 && (
                  <button 
                    onClick={handleGoBack} 
                    className="p-2 mr-1 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all text-slate-300"
                    title="Back to previous user"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <Search className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Sub-User Detail Report</h2>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-1">
                    Level {modalUserStack.length} Portfolio Breakdown
                  </p>
                </div>
              </div>
              <button onClick={handleCloseModal} className="group p-2 hover:bg-red-500/10 rounded-xl transition-all">
                <X className="w-7 h-7 text-slate-500 group-hover:text-red-400" />
              </button>
            </div>

            {/* Summary */}
            <div className="flex-shrink-0 px-10 py-6 bg-[#0b1221]">
              <div className="flex justify-end gap-16">
                <SummaryItem label="Realised" value={modalTotals.realised} color="emerald" size="xl" />
                <SummaryItem label="M2M" value={modalTotals.m2m} color="blue" size="xl" />
                <SummaryItem label="Net Total" value={modalTotals.total} color="emerald" size="xl" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-12 pt-8 bg-[#0f172a]/20 min-h-[300px]">
              {modalLoading && modalTableData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-slate-500 text-[10px] tracking-widest font-black uppercase">Synchronizing</p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-800/40 bg-[#0b1221]/50 overflow-hidden">
                  <PnLTable data={modalTableData} isDark={true} isSticky={true} onUserClick={handleDrillDown} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Sub-Components ---

const SummaryItem = ({ label, value, color, size = "lg" }: any) => {
  const isPositive = (value || 0) >= 0;
  const colorMap: any = {
    emerald: isPositive ? 'text-emerald-400' : 'text-red-400',
    blue: isPositive ? 'text-green-400' : 'text-red-400'
  };

  return (
    <div className="flex flex-col items-end">
      <div className={`font-mono font-bold tracking-tighter ${size === 'xl' ? 'text-3xl' : 'text-lg'} ${colorMap[color]}`}>
        ₹{(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mt-1">
        {label}
      </div>
    </div>
  );
};

// Dynamic Role Badge component using roleId mappings
const UserRoleTag = ({ roleId }: { roleId?: number }) => {
  if (!roleId) return null;

  const badgeConfig: Record<number, { text: string; classes: string }> = {
    1: { text: 'SA', classes: 'bg-red-500/10 text-red-500 dark:bg-red-400/20 dark:text-red-400 border-red-500/20' },
    2: { text: 'A', classes: 'bg-blue-500/10 text-blue-500 dark:bg-blue-400/20 dark:text-blue-400 border-blue-500/20' },
    3: { text: 'M', classes: 'bg-amber-500/10 text-amber-500 dark:bg-amber-400/20 dark:text-amber-400 border-amber-500/20' },
    4: { text: 'C', classes: 'bg-purple-500/10 text-purple-500 dark:bg-purple-400/20 dark:text-purple-400 border-purple-500/20' },
  };

  const currentBadge = badgeConfig[roleId];
  if (!currentBadge) return null;

  return (
    <span className={`ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-black tracking-wide rounded border ${currentBadge.classes}`}>
      {currentBadge.text}
    </span>
  );
};

const PnLTable = ({
  data,
  onUserClick,
  isDark = false,
  isSticky = false
}: {
  data: PnLData[],
  onUserClick?: (id: number) => void,
  isDark?: boolean,
  isSticky?: boolean
}) => (
  <table className="w-full border-collapse">
    <thead className={`${isSticky ? 'sticky top-0 z-20' : ''} bg-[#0f172a] text-slate-500 text-[10px] uppercase tracking-widest font-bold shadow-sm`}>
      <tr>
        <th className="px-6 py-2 text-left">Username</th>
        <th className="px-6 py-2 text-right">Realised P&L</th>
        <th className="px-6 py-2 text-right">M2M P&L</th>
        <th className="px-6 py-2 text-right">Total P&L</th>
      </tr>
    </thead>
    <tbody>
      {data.length === 0 ? (
        <tr>
          <td colSpan={4} className="px-6 py-10 text-center text-xs text-slate-500 uppercase tracking-wider">
            No dynamic positions found
          </td>
        </tr>
      ) : (
        data.map((p, idx) => (
          <tr key={idx} className={`group transition-all duration-200 border-b border-slate-400 dark:border-slate-500 hover:bg-slate-700/30 dark:hover:bg-slate-700/50 ${idx % 2 === 0 ? 'bg-slate-800/10 dark:bg-slate-900/30' : 'bg-slate-800/5 dark:bg-transparent'}`}>
            <td className="px-6 py-2.5 text-left">
              <div className="flex items-center gap-2">
                {onUserClick ? (
                  <button
                    onClick={() => onUserClick(p.userId)}
                    className={`font-bold tracking-wide text-left text-sm ${isDark ? 'text-slate-300 group-hover:text-blue-400' : 'text-blue-600'}`}
                  >
                    {p.username || 'Unknown'}
                  </button>
                ) : (
                  <span className={`font-bold tracking-wide text-sm ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    {p.username || 'Unknown'}
                  </span>
                )}
                <UserRoleTag roleId={p.roleId} />
              </div>
            </td>
            <td className={`px-6 py-2.5 text-right font-mono font-bold text-sm ${(p.realisedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(p.realisedPnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
            <td className={`px-6 py-2.5 text-right font-mono font-bold text-sm ${(p.m2m || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(p.m2m || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
            <td className="px-6 py-2.5 text-right">
              <span className={`px-3 py-1 rounded-lg font-mono font-bold text-sm ${(p.total || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {(p.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
);

export default withTabCache(ProfitLossPage, { title: 'Profit & Loss' })
