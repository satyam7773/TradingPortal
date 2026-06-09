import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import userManagementService from '../../../services/userManagementService';

interface GroupItem {
  id: number;
  groupName: string;
  isActive: boolean;
  selected: boolean;
}

interface ScriptSetting {
  quantityGroupId: number;
  scriptName: string;
  lotSize: number;
  qtyMax: number;
  breakupQty: number;
}

const ScriptQuantityModal: React.FC<{ groupId: number; userId: number; exchangeId: number; exchangeName: string; onClose: () => void }> = 
({ groupId, userId, exchangeId, exchangeName, onClose }) => {
  const [data, setData] = useState<ScriptSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const isSpecialExchange = ['NSE', 'SGX', 'OTHERS'].includes(exchangeName);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await userManagementService.fetchScriptQuantitySettings(userId, exchangeId, groupId);
        if (res?.responseCode === "0") setData(res.data);
      } catch { toast.error("Failed to load settings"); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [groupId, userId, exchangeId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="font-bold text-lg">Script Settings ({exchangeName})</h2>
          <button onClick={onClose} className="text-xl hover:text-red-500">✕</button>
        </div>
        <div className="overflow-auto p-4">
          {loading ? <p>Loading...</p> : (
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <th className="p-2 text-left">Script</th>
                  <th className="p-2 text-right">Lot Size</th>
                  <th className="p-2 text-right">{isSpecialExchange ? "Qty Max" : "Qty Lot"}</th>
                  <th className="p-2 text-right">{isSpecialExchange ? "Breakup Qty" : "Breakup Lot"}</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.quantityGroupId} className="border-b dark:border-slate-700">
                    <td className="p-2">{item.scriptName}</td>
                    <td className="p-2 text-right">{item.lotSize.toFixed(2)}</td>
                    <td className="p-2 text-right">{item.qtyMax.toFixed(2)}</td>
                    <td className="p-2 text-right">{item.breakupQty.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const GroupQuantitySettings: React.FC<{ user: any }> = ({ user }) => {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedExchangeId, setSelectedExchangeId] = useState<number>(0);
  const [viewModal, setViewModal] = useState<number | null>(null);

  const isUserRole = user.type === 'Client'; // Or 'Client' depending on your data
  // const loggedInUserId = 31;

  const userData = localStorage.getItem('userData')
      const userr = userData ? JSON.parse(userData) : null
      const loggedInUserId = userr?.userId

  useEffect(() => {
    const init = async () => {
      try {
        const res: any = await userManagementService.getExchanges(Number(user.id));
        if (Array.isArray(res) && res.length > 0) {
          setExchanges(res);
          setSelectedExchangeId(res[1]?.exchangeId || res[0]?.exchangeId);
        }
      } catch (e) { toast.error("Failed to load exchanges"); }
    };
    init();
  }, [user.id]);

  const fetchGroups = useCallback(async () => {
    if (selectedExchangeId === 0 || !user?.id) return;
    setLoading(true);
    try {
      const res = await userManagementService.fetchUserGroups(loggedInUserId, Number(user.id), selectedExchangeId);
      if (res?.responseCode === '0') {
        setGroups(res.data);
        setSelectedGroupIds(new Set(res.data.filter((g: any) => g.selected).map((g: any) => g.id)));
      }
    } catch (e) { toast.error("Failed to load groups"); }
    finally { setLoading(false); }
  }, [selectedExchangeId, user?.id]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleToggleGroup = (groupId: number) => {
    const next = new Set(selectedGroupIds);
    
    if (isUserRole) {
      // Logic for 'user' type: only one allowed at all times
      next.clear();
      next.add(groupId);
    } else {
      // Logic for others: min 1, max all
      if (next.has(groupId)) {
        if (next.size <= 1) {
          toast.error("At least one group must be selected.");
          return;
        }
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
    }
    setSelectedGroupIds(next);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await userManagementService.addOrUpdateGroupUser(
        loggedInUserId, Number(user.id), selectedExchangeId, Array.from(selectedGroupIds)
      );
      if (res?.responseCode === '0') {
        toast.success("Groups updated successfully");
        await fetchGroups();
      } else { toast.error(res?.responseMessage || "Update failed"); }
    } catch (e) { toast.error("An error occurred"); }
    finally { setLoading(false); }
  };

  const selectedExchangeName = exchanges.find(e => e.exchangeId === selectedExchangeId)?.name || '';

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700">
      <div className="mb-4 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold mb-1 text-slate-600 dark:text-slate-400">Exchange</label>
          <select value={selectedExchangeId} onChange={(e) => setSelectedExchangeId(Number(e.target.value))} className="w-full p-2 border rounded text-sm dark:bg-slate-700">
            {exchanges.map((ex) => <option key={ex.exchangeId} value={ex.exchangeId}>{ex.name}</option>)}
          </select>
        </div>
        <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700">
          {loading ? 'Saving...' : 'Update'}
        </button>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700">
          <tr>
            <th className="p-2 text-left">Select</th>
            <th className="p-2 text-left">Group</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-center">View</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id} className="border-b dark:border-slate-700">
              <td className="p-2">
                <input type="checkbox" checked={selectedGroupIds.has(group.id)} onChange={() => handleToggleGroup(group.id)} />
              </td>
              <td className="p-2">{group.groupName}</td>
              <td className="p-2"><span className={`px-2 py-1 rounded text-xs ${group.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{group.isActive ? 'Active' : 'Inactive'}</span></td>
              <td className="p-2 text-center">
                <button onClick={() => setViewModal(group.id)} className="text-blue-600 hover:text-blue-800">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {viewModal && (
        <ScriptQuantityModal 
          groupId={viewModal} 
          userId={Number(user.id)} 
          exchangeId={selectedExchangeId}
          exchangeName={selectedExchangeName}
          onClose={() => setViewModal(null)} 
        />
      )}
    </div>
  );
};

export default GroupQuantitySettings;