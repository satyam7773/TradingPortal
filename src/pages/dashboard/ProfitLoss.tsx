import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { X, Briefcase, Search } from 'lucide-react'
import FilterLayout from '../../components/FilterLayout'
import userManagementService from '../../services/userManagementService'

// --- Interfaces ---
interface PnLData {
  userId: number
  username: string
  realisedPnl?: number
  m2m?: number
  total?: number
}

const ProfitLoss: React.FC = () => {
  const getLoggedInUserId = (): number => {
    const userDataStr = localStorage.getItem('userData')
    const userData = userDataStr ? JSON.parse(userDataStr) : null
    return userData?.userId || 31
  }

  const loggedInUserId = getLoggedInUserId()
  const [userFilterType, setUserFilterType] = useState<'ALL' | 'SINGLE'>('ALL')
  const [selectedUserId, setSelectedUserId] = useState<number | string>(loggedInUserId)
  const [pnlData, setPnlData] = useState<PnLData[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const [selectedModalUserId, setSelectedModalUserId] = useState<number | null>(null)
  const [modalData, setModalData] = useState<PnLData[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  const handleView = async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setLoading(true)
    try {
      const targetUserId = userFilterType === 'SINGLE' ? Number(selectedUserId) : loggedInUserId
      const response = await userManagementService.fetchProfitAndLoss(targetUserId)
      if (response?.responseCode === '0') {
        setPnlData(response.data || [])
      }
    } catch (error) {
      setPnlData([])
    } finally {
      if (!isSilentRefresh) setLoading(false)
    }
  }

  const fetchModalPnL = async (userId: number) => {
    setModalLoading(true)
    try {
      const response = await userManagementService.fetchProfitAndLoss(userId)
      if (response?.responseCode === '0') {
        setModalData(response.data || [])
      }
    } catch (error) {
      setModalData([])
    } finally {
      setModalLoading(false)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(() => {
        handleView(true)
        if (selectedModalUserId) fetchModalPnL(selectedModalUserId)
      }, 10000)
    }
    return () => clearInterval(interval)
  }, [autoRefresh, selectedUserId, userFilterType, selectedModalUserId])

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const usersResponse = await userManagementService.fetchOwnUsers(loggedInUserId)
        if (usersResponse?.responseCode === '0') setUsers(usersResponse.data || [])
        await handleView()
      } catch (e) { console.error(e) }
    }
    loadInitialData()
  }, [])

  const calculateTotals = (data: PnLData[]) => ({
    realised: data.reduce((sum, item) => sum + (item.realisedPnl || 0), 0),
    m2m: data.reduce((sum, item) => sum + (item.m2m || 0), 0),
    total: data.reduce((sum, item) => sum + (item.total || 0), 0),
  })

  const totals = calculateTotals(pnlData)
  const modalTotals = calculateTotals(modalData)

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="profitloss:showFilters"
          filterWidthClass="lg:w-[22%]"
          filters={
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Username :</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedUserId(val);
                    setUserFilterType('SINGLE');
                  }}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500"
                >
                  {users.map(u => <option key={u.userId} value={u.userId}>{u.userName}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">Auto Refresh</label>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 italic">Every 10s</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={autoRefresh} onChange={() => setAutoRefresh(!autoRefresh)} />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => handleView()} disabled={loading} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition">View</button>
                <button onClick={() => setPnlData([])} className="flex-1 px-4 py-2 bg-slate-700 text-white rounded font-semibold text-sm transition">Clear</button>
              </div>
            </div>
          }
        >
          <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
            <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-8 h-8 text-blue-500" /> P&L Report
                </h1>
                <div className="grid grid-cols-3 gap-6">
                  <SummaryItem label="Realised" value={totals.realised} color="emerald" />
                  <SummaryItem label="M2M" value={totals.m2m} color="blue" />
                  <SummaryItem label="Net Total" value={totals.total} color="emerald" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? <div className="h-full flex items-center justify-center animate-pulse text-slate-500">Loading...</div> : (
                <PnLTable data={pnlData} onUserClick={(userId) => {
                  setSelectedModalUserId(userId);
                  fetchModalPnL(userId);
                }} />
              )}
            </div>
          </div>
        </FilterLayout>
      </div>

      {/* MODAL SECTION - ABSOLUTE POSITIONED */}
      {selectedModalUserId && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md overflow-hidden flex justify-center">
          
          {/* Modal Container: absolute + top-[150px] + left-1/2 -translateX-1/2 */}
          <div className="absolute top-[150px] left-1/2 -translate-x-1/2 bg-[#0b1221] w-[95%] max-w-6xl flex flex-col rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.6)] border border-slate-800 animate-in slide-in-from-top-10 duration-500 h-fit max-h-[calc(100vh-200px)]">
            
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-10 py-7 border-b border-slate-800/60 bg-[#0f172a]">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  <Search className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Sub-User Detail Report</h2>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mt-1">Live Portfolio Breakdown</p>
                </div>
              </div>
              <button onClick={() => setSelectedModalUserId(null)} className="group p-2 hover:bg-red-500/10 rounded-xl transition-all">
                <X className="w-7 h-7 text-slate-500 group-hover:text-red-400" />
              </button>
            </div>
            
            {/* Summary */}
            <div className="flex-shrink-0 px-10 py-10 bg-[#0b1221]">
                <div className="flex justify-end gap-16">
                    <SummaryItem label="Realised" value={modalTotals.realised} color="emerald" size="xl" />
                    <SummaryItem label="M2M" value={modalTotals.m2m} color="blue" size="xl" />
                    <SummaryItem label="Net Total" value={modalTotals.total} color="emerald" size="xl" />
                </div>
            </div>

            {/* Content with padding to fix "crossed" UI */}
            <div className="flex-1 overflow-y-auto px-6 pb-12 pt-8 bg-[#0f172a]/20 min-h-[300px]">
                {modalLoading ? (
                   <div className="h-64 flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                      <p className="text-slate-500 text-[10px] tracking-widest font-black uppercase">Synchronizing</p>
                   </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-slate-800/40 bg-[#0b1221]/50 overflow-hidden">
                    <PnLTable data={modalData} isDark={true} isSticky={true} />
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
    blue: isPositive ? 'text-blue-400' : 'text-red-400'
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
  <table className="w-full border-separate border-spacing-y-2">
    <thead className={`${isSticky ? 'sticky top-0 z-20' : ''} bg-[#0f172a] text-slate-500 text-[11px] uppercase tracking-widest font-bold shadow-sm`}>
      <tr>
        <th className="px-6 py-3 text-left">Username</th>
        <th className="px-6 py-3 text-right">Realised P&L</th>
        <th className="px-6 py-3 text-right">M2M P&L</th>
        <th className="px-6 py-3 text-right">Total P&L</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-800/50">
      {data.map((p, idx) => (
        <tr key={idx} className="group hover:bg-slate-800/40 transition-all duration-200">
          <td className="px-6 py-5 text-left">
            <button 
              onClick={() => onUserClick?.(p.userId)}
              className={`font-bold tracking-wide ${isDark ? 'text-slate-300 group-hover:text-blue-400' : 'text-blue-600'}`}
            >
              {p.username || 'Unknown'}
            </button>
          </td>
          <td className={`px-6 py-5 text-right font-mono font-bold ${(p.realisedPnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(p.realisedPnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
          <td className={`px-6 py-5 text-right font-mono font-bold ${(p.m2m || 0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
            {(p.m2m || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
          <td className="px-6 py-5 text-right">
            <span className={`px-4 py-1.5 rounded-lg font-mono font-bold ${(p.total || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {(p.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default ProfitLoss;