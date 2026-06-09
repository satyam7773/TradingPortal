import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, ArrowLeft } from 'lucide-react';
import FilterLayout from '../../components/FilterLayout';
import userManagementService from '../../services/userManagementService';

const Settlement: React.FC = () => {
 
  const [opening, setOpening] = useState<'WITH' | 'WITHOUT'>('WITHOUT');
  
  // Main Data State
  const [mainData, setMainData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Stack State for Modal Drill-down
  const [modalUserStack, setModalUserStack] = useState<number[]>([]);
  const [modalData, setModalData] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const activeModalUserId = modalUserStack.length > 0 ? modalUserStack[modalUserStack.length - 1] : null;

  const getMondayOfCurrentWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0]; // Simple YYYY-MM-DD
  };

  const [dates, setDates] = useState({
    from: getMondayOfCurrentWeek(),
    to: new Date().toISOString().split('T')[0]
  });

  // --- Fetch Logic ---
  const handleView = async () => {
    setLoading(true);
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const response = await userManagementService.fetchSettlement({
        from: dates.from, to: dates.to, opening, searchUserId: userData?.userId
      }, userData?.userId);
      if (response?.responseCode === '0') setMainData(response.data);
      else toast.error("Failed to load settlement");
    } catch { toast.error("Error connecting to server"); }
    finally { setLoading(false); }
  };

  const fetchModalData = async (userId: number) => {
    setModalLoading(true);
    try {
      const response = await userManagementService.fetchSettlement({
        from: dates.from, to: dates.to, opening, searchUserId: userId
      }, userId);
      if (response?.responseCode === '0') setModalData(response.data);
      else toast.error("Failed to load sub-user data");
    } catch { toast.error("Error connecting to server"); }
    finally { setModalLoading(false); }
  };

  useEffect(() => { handleView(); }, []);
  useEffect(() => { if (activeModalUserId) fetchModalData(activeModalUserId); }, [activeModalUserId]);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full mt-5">
        <FilterLayout
          storageKey="settlement:showFilters"
          filterWidthClass="lg:w-[22%]"
          filters={
            <div className="space-y-4 p-4">
              <input type="date" value={dates.from} onChange={e => setDates({...dates, from: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
              <input type="date" value={dates.to} onChange={e => setDates({...dates, to: e.target.value})} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
              <div className="flex gap-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                <label><input type="radio" checked={opening === 'WITHOUT'} onChange={() => setOpening('WITHOUT')} /> Without</label>
                <label><input type="radio" checked={opening === 'WITH'} onChange={() => setOpening('WITH')} /> With</label>
              </div>
              <button onClick={handleView} className="w-full py-2 bg-orange-500 text-white rounded font-bold text-sm">View</button>
            </div>
          }
        >
          <div className="h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 shadow-lg p-6 overflow-hidden">
             {loading ? <div>Loading...</div> : mainData && (
                <SettlementTable data={mainData} onUserClick={(id) => setModalUserStack([id])} />
             )}
          </div>
        </FilterLayout>
      </div>

      {/* --- REUSABLE MODAL (Consistent with ProfitLoss UI) --- */}
      {activeModalUserId && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex justify-center pt-[12%]">
          <div className="w-[95%] max-w-6xl bg-[#0b1221] rounded-3xl border border-slate-800 shadow-[0_0_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[80vh] animate-in slide-in-from-top-10">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-4">
                {modalUserStack.length > 1 && (
                  <button onClick={() => setModalUserStack(prev => prev.slice(0, -1))} className="p-2 bg-slate-800 rounded-xl text-white"><ArrowLeft /></button>
                )}
                <h2 className="text-xl font-bold text-white">Sub-User Breakdown</h2>
              </div>
              <button onClick={() => setModalUserStack([])}><X className="text-slate-500 hover:text-white" /></button>
            </div>

            {/* Modal Filter Bar */}
            <div className="px-6 py-4 bg-[#0f172a] border-b border-slate-800 flex items-center gap-6">
              <input type="date" value={dates.from} onChange={e => setDates({...dates, from: e.target.value})} className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm border border-slate-700" />
              <input type="date" value={dates.to} onChange={e => setDates({...dates, to: e.target.value})} className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm border border-slate-700" />
              <button onClick={() => activeModalUserId && fetchModalData(activeModalUserId)} className="px-4 py-1.5 bg-orange-500 text-white text-sm font-bold rounded">View</button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {modalLoading ? <div className="text-white">Loading...</div> : modalData && (
                <SettlementTable data={modalData} onUserClick={(id) => setModalUserStack(prev => [...prev, id])} isDark />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SettlementTable = ({ data, onUserClick, isDark = false }: any) => (
  <div className="flex gap-4 h-full">
    {['profit', 'loss'].map(key => (
      <div key={key} className="flex-1 bg-slate-800/50 rounded-xl overflow-hidden border border-slate-700 flex flex-col">
        <div className={`p-3 text-center font-bold text-white ${key === 'profit' ? 'bg-green-600' : 'bg-red-600'}`}>{key.toUpperCase()}</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <tbody>
              {data[key]?.map((item: any, i: number) => (
                <tr key={i} onClick={() => item.userId && onUserClick(item.userId)} className="cursor-pointer hover:bg-slate-700 border-b border-slate-700">
                  <td className="p-3 text-slate-300">{item.username}</td>
                  <td className="p-3 text-right font-bold text-white">{item.total?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ))}
  </div>
);

export default Settlement;