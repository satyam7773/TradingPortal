import React, { useState, useEffect, useRef, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { X, Briefcase, Search, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import FilterLayout from '../../components/FilterLayout'
import SearchableSelect from '../../components/ui/SearchableSelect'
import userManagementService from '../../services/userManagementService'
import { withTabCache, CacheContextProps } from '../../hoc/withTabCache'
import DownloadReport from '../../components/DownloadReport'
import { useSorting } from '../../hooks/useSorting'
import UserDetailsModal from '../user-management/UserDetailsModal'
import { useTheme } from '../../contexts/ThemeContext'
import { API_ENDPOINTS } from '../../config/apiConfig'
import { useDownloadReport } from '../../hooks/useDownloadReport'

// --- Interfaces ---
interface TradeAccountData {
  username: string
  parentUser: string
  pl: number
  brokerage: number
  balance: number
  m2mPnl: number
  netPnl: number
  credit: number
  equity: number
  marginUsed: number
  freeMargin: number
  marginLevel: number
  userId?: number
  parentUserId?: number
  roleId?: number
}

interface TradeAccountPageProps extends CacheContextProps {}

const TradeAccountPage: React.FC<TradeAccountPageProps> = ({ cacheData, apiData, onCacheSave, isRestoringCache }) => {
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
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  // ROLE DEFINITIONS
  const isAdminOrMaster = roleId === 1 || roleId === 2 || roleId === 3

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
      console.log('✅ [TradeAccount] Initializing from cache:', cacheData)
      cacheLoggedRef.current = true
    }
  }, [cacheData])

  const [userFilterType, setUserFilterType] = useState<'ALL' | 'SINGLE'>(initialFilters.userFilterType)
  const [selectedUserId, setSelectedUserId] = useState<number | string>(initialFilters.selectedUserId)
  
  // Tables and Summary State
  const [tradeAccountData, setTradeAccountData] = useState<TradeAccountData[]>(apiData?.tradeAccountData || [])
  const [tradeAccountTotals, setTradeAccountTotals] = useState(apiData?.tradeAccountTotals || {
    pl: 0,
    brokerage: 0,
    balance: 0,
    m2mPnl: 0,
    netPnl: 0,
    credit: 0,
    equity: 0,
    marginUsed: 0,
    freeMargin: 0,
    marginLevel: 0
  })
  
  const [users, setUsers] = useState<any[]>([])
  
  // Initialize download hook
  const downloadReport = useDownloadReport({
    apiEndpoint: API_ENDPOINTS.REPORTS.TRADE_ACCOUNT_DOWNLOAD,
    filename: 'TradeAccount',
    onBeforeDownload: () => setIsDownloading(true),
    onAfterDownload: () => setIsDownloading(false)
  })
  
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
  const [isDownloading, setIsDownloading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const cacheTimerRef = useRef<any>(null)
  const cacheInitializedRef = useRef(false)
  const metadataLoadedRef = useRef(false)

  // Fetch initial data only if cache doesn't exist
  useEffect(() => {
    if (!cacheInitializedRef.current && !cacheData) {
      console.log('📡 [TradeAccount] No cache found, fetching initial data...')
      handleView()
      cacheInitializedRef.current = true
    }
  }, [])

  // Handle cache data changes (when switching back to this tab with cache)
  useEffect(() => {
    if (cacheData && !cacheInitializedRef.current) {
      console.log('🔄 [TradeAccount] Cache found, initializing from cache')
      cacheInitializedRef.current = true
      
      // Restore table data if available
      if (apiData?.tradeAccountData) {
        console.log('📊 [TradeAccount] Restoring cached table data')
        setTradeAccountData(apiData.tradeAccountData)
        setTradeAccountTotals(apiData.tradeAccountTotals || {
          pl: 0,
          brokerage: 0,
          balance: 0,
          m2mPnl: 0,
          netPnl: 0,
          credit: 0,
          equity: 0,
          marginUsed: 0,
          freeMargin: 0,
          marginLevel: 0
        })
      }
    }
  }, [cacheData, apiData])

  // Calculate totals from trade account data
  const calculateTotals = (data: TradeAccountData[]) => {
    if (!data || data.length === 0) {
      return {
        pl: 0,
        brokerage: 0,
        balance: 0,
        m2mPnl: 0,
        netPnl: 0,
        credit: 0,
        equity: 0,
        marginUsed: 0,
        freeMargin: 0,
        marginLevel: 0
      }
    }

    return {
      pl: data.reduce((sum, item) => sum + (item.pl || 0), 0),
      brokerage: data.reduce((sum, item) => sum + (item.brokerage || 0), 0),
      balance: data.reduce((sum, item) => sum + (item.balance || 0), 0),
      m2mPnl: data.reduce((sum, item) => sum + (item.m2mPnl || 0), 0),
      netPnl: data.reduce((sum, item) => sum + (item.netPnl || 0), 0),
      credit: data.reduce((sum, item) => sum + (item.credit || 0), 0),
      equity: data.reduce((sum, item) => sum + (item.equity || 0), 0),
      marginUsed: data.reduce((sum, item) => sum + (item.marginUsed || 0), 0),
      freeMargin: data.reduce((sum, item) => sum + (item.freeMargin || 0), 0),
      marginLevel: data.reduce((sum, item) => sum + (item.marginLevel || 0), 0)
    }
  }

  const handleView = async (isSilentRefresh = false): Promise<void> => {
    if (!isSilentRefresh) setLoading(true)
    try {
      const targetUserId = userFilterType === 'SINGLE' ? Number(selectedUserId) : loggedInUserId
      
      const response = await fetch(API_ENDPOINTS.REPORTS.TRADE_ACCOUNT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: loggedInUserId,
          data: {
            userId: targetUserId
          }
        })
      })

      const result = await response.json()
      if (result?.responseCode === '0') {
        const data = Array.isArray(result.data) ? result.data : []
        setTradeAccountData(data)
        setTradeAccountTotals(calculateTotals(data))
      } else {
        toast.error(result?.responseMessage || 'Failed to fetch trade account data')
        setTradeAccountData([])
        setTradeAccountTotals(calculateTotals([]))
      }
    } catch (error) {
      if (!isSilentRefresh) {
        console.error('Error fetching trade account data:', error)
        toast.error('Error fetching trade account data')
        setTradeAccountData([])
        setTradeAccountTotals(calculateTotals([]))
      }
    } finally {
      if (!isSilentRefresh) setLoading(false)
    }
  }

  const handleUserClick = (userId: number) => {
    const user = users.find(u => u.userId === userId)
    if (user) {
      setSelectedUser({
        id: user.userId.toString(),
        username: user.userName,
        name: user.name,
        type: user.roleId === 3 ? 'Master' : user.roleId === 4 ? 'Client' : 'Admin'
      })
    }
  }

  // Auto-refresh polling interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleView(true)
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh, userFilterType, selectedUserId])

  useEffect(() => {
    // Only load metadata once per session
    if (metadataLoadedRef.current) return

    const loadInitialData = async () => {
      try {
        const usersResponse = await userManagementService.fetchOwnUsers(loggedInUserId)
        if (usersResponse?.responseCode === '0') setUsers(usersResponse.data || [])
        metadataLoadedRef.current = true
      } catch (e) { console.error(e) }
    }
    loadInitialData()
  }, [])

  // Restore from cache if available
  useEffect(() => {
    if (cacheData && isRestoringCache) {
      console.log('🔄 [TradeAccount] Restoring from cache:', cacheData)
      setUserFilterType(cacheData.userFilterType ?? 'ALL')
      setSelectedUserId(cacheData.selectedUserId ?? loggedInUserId)
      setAutoRefresh(cacheData.autoRefresh ?? false)
      
      if (apiData?.tradeAccountData) {
        console.log('📊 [TradeAccount] Restoring cached table data')
        setTradeAccountData(apiData.tradeAccountData || [])
        setTradeAccountTotals(apiData.tradeAccountTotals || calculateTotals([]))
      }
      
      console.log('✅ [TradeAccount] Cache restored successfully')
    }
  }, [isRestoringCache, cacheData, apiData, loggedInUserId])

  // Save filters to cache whenever they change
  useEffect(() => {
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    
    cacheTimerRef.current = setTimeout(() => {
      const filters = {
        userFilterType,
        selectedUserId,
        autoRefresh
      }
      console.log('💾 [TradeAccount] Saving filters to cache')
      onCacheSave(filters, { tradeAccountData, tradeAccountTotals })
    }, 500)
    
    return () => {
      if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    }
  }, [userFilterType, selectedUserId, autoRefresh, tradeAccountData, tradeAccountTotals, onCacheSave])

  // Clear all filters
  const handleClearFilters = () => {
    console.log('🗑️ [TradeAccount] Clearing all filters')
    setTradeAccountData([])
    setTradeAccountTotals(calculateTotals([]))
    setUserFilterType('ALL')
    setSelectedUserId(loggedInUserId)
  }

  const handleDownloadReport = async (format: 'pdf' | 'excel') => {
    if (tradeAccountData.length === 0) {
      toast.error('No trade account data to download')
      return
    }
    try {
      const targetUserId = userFilterType === 'SINGLE' ? Number(selectedUserId) : loggedInUserId
      
      await downloadReport.download(format, {
        userId: loggedInUserId,
        requestTimestamp: new Date().getTime().toString(),
        data: {
          userId: targetUserId
        }
      }, { pdf: format === 'pdf' })
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="tradeaccount:showFilters"
          filterWidthClass="lg:w-[16%]"
          filters={
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                {/* {selectedUserId && selectedUserId !== loggedInUserId && (
                  <button
                    onClick={() => {
                      setSelectedUserId(loggedInUserId);
                      setUserFilterType('ALL');
                    }}
                    className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition float-right mb-2"
                  >
                    Clear
                  </button>
                )} */}
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
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 italic">Every 5s</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={autoRefresh} onChange={() => setAutoRefresh(!autoRefresh)} />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => handleView()} disabled={loading} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition">View</button>
                <button onClick={handleClearFilters} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded font-semibold text-sm transition">Clear</button>
              </div>

              {/* Download Section */}
              <div className="border-t border-gray-200 dark:border-slate-600 pt-4 mt-4">
                <DownloadReport
                  onDownload={handleDownloadReport}
                  isDisabled={isDownloading || tradeAccountData.length === 0}
                  label="Download Report"
                />
              </div>
            </div>
          }
        >
          <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
            <div className="flex-shrink-0 px-6 py-3 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-blue-500" /> Trade Account Report
                </h1>
                <div className="grid grid-cols-10 gap-2">
                  <SummaryItem label="P/L" value={tradeAccountTotals.pl} color="emerald" size="sm" />
                  <SummaryItem label="Brokerage" value={tradeAccountTotals.brokerage} color="blue" size="sm" />
                  <SummaryItem label="Balance" value={tradeAccountTotals.balance} color="blue" size="sm" />
                  <SummaryItem label="M2M PnL" value={tradeAccountTotals.m2mPnl} color="emerald" size="sm" />
                  <SummaryItem label="Net PnL" value={tradeAccountTotals.netPnl} color="emerald" size="sm" />
                  <SummaryItem label="Credit" value={tradeAccountTotals.credit} color="blue" size="sm" />
                  <SummaryItem label="Equity" value={tradeAccountTotals.equity} color="emerald" size="sm" />
                  <SummaryItem label="Margin Used" value={tradeAccountTotals.marginUsed} color="blue" size="sm" />
                  <SummaryItem label="Free Margin" value={tradeAccountTotals.freeMargin} color="emerald" size="sm" />
                  <SummaryItem label="Margin Level" value={tradeAccountTotals.marginLevel} color="blue" size="sm" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? <div className="h-full flex items-center justify-center animate-pulse text-slate-500">Loading...</div> : (
                <TradeAccountTable data={tradeAccountData} onUserClick={handleUserClick} isDark={isDark} />
              )}
            </div>
          </div>
        </FilterLayout>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onToggle={async () => {}}
        />
      )}
    </div>
  )
}

// --- Sub-Components ---

const SummaryItem = ({ label, value, color, size = "lg" }: any) => {
  const isPositive = (value || 0) >= 0;
  const colorMap: any = {
    emerald: isPositive ? 'text-emerald-400' : 'text-red-400',
    blue: isPositive ? 'text-blue-400' : 'text-red-400'
  };
  
  const sizeClasses = size === 'sm' ? 'text-xs' : size === 'xl' ? 'text-3xl' : 'text-lg';
  const labelSizeClasses = size === 'sm' ? 'text-[8px]' : 'text-[10px]';
  const mtClasses = size === 'sm' ? 'mt-0.5' : 'mt-1';

  return (
    <div className="flex flex-col items-end">
      <div className={`font-mono font-bold tracking-tighter ${sizeClasses} ${colorMap[color]}`}>
        ₹{(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className={`${labelSizeClasses} uppercase tracking-[0.2em] font-bold text-slate-300 dark:text-slate-200 ${mtClasses}`}>
        {label}
      </div>
    </div>
  );
};

const TradeAccountTable = ({
  data,
  onUserClick,
  isDark = false,
  isSticky = false
}: {
  data: TradeAccountData[],
  onUserClick?: (id: number) => void,
  isDark?: boolean,
  isSticky?: boolean
}) => {
  const { sortColumn, sortDirection, handleSort, sortedData, getSortIcon } = useSorting({ data });

  return (
  <table className="w-full border-collapse">
    <thead className={`${isSticky ? 'sticky top-0 z-20' : ''} bg-[#0f172a] text-slate-500 text-[10px] uppercase tracking-widest font-bold shadow-sm`}>
      <tr>
        <th className="px-4 py-2 text-left cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('username')}>
          <div className="flex items-center gap-2">Username {getSortIcon('username')}</div>
        </th>
        <th className="px-4 py-2 text-left cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('parentUser')}>
          <div className="flex items-center gap-2">Parent User {getSortIcon('parentUser')}</div>
        </th>
        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('pl')}>
          <div className="flex items-center justify-center gap-2">P/L {getSortIcon('pl')}</div>
        </th>
        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('brokerage')}>
          <div className="flex items-center justify-center gap-2">Brk {getSortIcon('brokerage')}</div>
        </th>
        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('balance')}>
          <div className="flex items-center justify-center gap-2">Balance {getSortIcon('balance')}</div>
        </th>
        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('m2mPnl')}>
          <div className="flex items-center justify-center gap-2">M2M P/L {getSortIcon('m2mPnl')}</div>
        </th>
        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('netPnl')}>
          <div className="flex items-center justify-center gap-2">Net P/L {getSortIcon('netPnl')}</div>
        </th>
        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('credit')}>
          <div className="flex items-center justify-center gap-2">Credit {getSortIcon('credit')}</div>
        </th>
        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('equity')}>
          <div className="flex items-center justify-center gap-2">Equity {getSortIcon('equity')}</div>
        </th>
        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('marginUsed')}>
          <div className="flex items-center justify-center gap-2">Margin Used {getSortIcon('marginUsed')}</div>
        </th>
        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('freeMargin')}>
          <div className="flex items-center justify-center gap-2">Free Margin {getSortIcon('freeMargin')}</div>
        </th>
        <th className="px-4 py-2 text-center cursor-pointer hover:bg-slate-700 transition" onClick={() => handleSort('marginLevel')}>
          <div className="flex items-center justify-center gap-2">Margin % {getSortIcon('marginLevel')}</div>
        </th>
      </tr>
    </thead>
    <tbody>
      {sortedData.length === 0 ? (
        <tr>
          <td colSpan={12} className="px-4 py-10 text-center text-xs text-slate-500 uppercase tracking-wider">
            No trade account data found
          </td>
        </tr>
      ) : (
        sortedData.map((account, idx) => (
          <tr key={idx} className={`group transition-all duration-200 hover:bg-slate-700/30 dark:hover:bg-slate-700/50 ${idx % 2 === 0 ? 'bg-slate-800/10 dark:bg-slate-900/30' : 'bg-slate-800/5 dark:bg-transparent'}`}>
            <td className="px-4 py-2.5 text-left">
              {onUserClick ? (
                <button
                  onClick={() => onUserClick(account?.userId)}
                  className={`font-bold tracking-wide text-left text-sm ${isDark ? 'text-slate-300 group-hover:text-blue-400 hover:underline' : 'text-blue-600 hover:underline'}`}
                >
                  {account.username || 'Unknown'}
                </button>
              ) : (
                <span className={`font-bold tracking-wide text-sm ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                  {account.username || 'Unknown'}
                </span>
              )}
            </td>
            <td className={`px-4 py-2.5 text-left text-sm`}>
              {onUserClick && account.parentUserId ? (
                <button
                  onClick={() => onUserClick(account.parentUserId || 0)}
                  className={`font-bold tracking-wide text-left text-sm ${isDark ? 'text-slate-300 group-hover:text-blue-400' : 'text-blue-600'} hover:underline`}
                >
                  {account.parentUser || 'Unknown'}
                </button>
              ) : (
                <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {account.parentUser || '-'}
                </span>
              )}
            </td>
            <td className={`px-4 py-2.5 text-center font-mono font-bold text-sm ${(account.pl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(account.pl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className={`px-4 py-2.5 text-center font-mono font-bold text-sm ${(account.brokerage || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(account.brokerage || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className={`px-4 py-2.5 text-center font-mono font-bold text-sm ${(account.balance || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(account.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className={`px-4 py-2.5 text-center font-mono font-bold text-sm ${(account.m2mPnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(account.m2mPnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className={`px-4 py-2.5 text-center font-mono font-bold text-sm ${(account.netPnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(account.netPnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className={`px-4 py-2.5 text-center font-mono font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>
              {(account.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="px-4 py-2.5 text-center">
              <span className={`px-3 py-1 rounded-lg font-mono font-bold text-sm ${(account.equity || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {(account.equity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </td>
            <td className={`px-4 py-2.5 text-center font-mono font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>
              {(account.marginUsed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className={`px-4 py-2.5 text-center font-mono font-bold text-sm ${(account.freeMargin || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(account.freeMargin || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className={`px-4 py-2.5 text-center font-mono font-bold text-sm ${(account.marginLevel || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {(account.marginLevel || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
  );
};

export default withTabCache(TradeAccountPage, { title: 'Trade Account' })
