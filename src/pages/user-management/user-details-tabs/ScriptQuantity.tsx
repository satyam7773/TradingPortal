import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import FilterLayout from '../../../components/FilterLayout';
import userManagementService from '../../../services/userManagementService';

const ScriptQuantitySettings: React.FC<{ user: any; groupId: number }> = ({ user, groupId }) => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  const [qtyMax, setQtyMax] = useState('');
  const [breakup, setBreakup] = useState('');

  const isSpecial = ['NSE', 'SGX', 'OTHERS'].includes(selectedExchange?.name || '');

  // Helper to format Date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  useEffect(() => {
    const init = async () => {
      try {
        const res = await userManagementService.getExchanges(Number(user.id));
        if (Array.isArray(res) && res.length > 0) {
          setExchanges(res);
          setSelectedExchange(res[0]);
        }
      } catch { toast.error("Failed to load exchanges"); }
    };
    init();
  }, [user.id]);

  const fetchScripts = useCallback(async () => {
    if (!selectedExchange?.exchangeId || selectedExchange.groupId === undefined) return;
    setLoading(true);
    try {
      const res = await userManagementService.fetchScriptQuantitySettings(
        user.id, selectedExchange.exchangeId, selectedExchange.groupId
      );
      if (res?.responseCode === "0") {
        setScripts(res.data);
        setSelectedIds(new Set());
      }
    } catch { toast.error("Failed to load scripts"); }
    finally { setLoading(false); }
  }, [user.id, selectedExchange]);

  useEffect(() => { fetchScripts(); }, [fetchScripts]);

  const handleApply = () => {
    if (selectedIds.size === 0) return toast.error("Select at least one script");
    if (!qtyMax || !breakup) return toast.error("Please enter values to apply");

    const newQty = parseFloat(qtyMax);
    const newBreakup = parseFloat(breakup);

    let hasError = false;
    scripts.forEach(s => {
      if (selectedIds.has(s.quantityGroupId)) {
        if (newQty > s.qtyMax || newBreakup > s.breakupQty) {
          toast.error(`Value for ${s.scriptName} cannot exceed current limit (${s.qtyMax}/${s.breakupQty})`);
          hasError = true;
        }
      }
    });

    if (hasError) return;

    setScripts(prev => prev.map(s => {
      if (selectedIds.has(s.quantityGroupId)) {
        return { ...s, qtyMax: newQty, breakupQty: newBreakup };
      }
      return s;
    }));
    toast.success("Applied locally to selection");
  };

  const handleUpdate = async () => {
    if (selectedIds.size === 0) return toast.error("Select scripts to update");
    setLoading(true);
    try {
      const payload = {
        userId: user.id,
        groupId: selectedExchange.groupId,
        exchangeId: selectedExchange.exchangeId,
        quantityGroupIds: Array.from(selectedIds),
        qtyMax: parseFloat(qtyMax || '0'),
        breakUpQuantity: parseFloat(breakup || '0')
      };
      const res = await userManagementService.updateScriptQuantity(payload);
      if (res?.responseCode === "0") {
        toast.success("Updated successfully");
        fetchScripts();
      } else { toast.error(res?.responseMessage || "Update failed"); }
    } catch { toast.error("Update failed"); }
    finally { setLoading(false); }
  };

  return (
    <FilterLayout
      storageKey="scriptQty:showFilters"
      filterWidthClass="lg:w-[25%]"
      filters={
        <div className="space-y-3 p-4">
          <label className="text-xs text-slate-600 block">Exchange :</label>
          <select className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
            value={selectedExchange?.exchangeId || ''}
            onChange={(e) => setSelectedExchange(exchanges.find(ex => ex.exchangeId === Number(e.target.value)))}
          >
            {exchanges.map(ex => <option key={ex.exchangeId} value={ex.exchangeId}>{ex.name}</option>)}
          </select>

          <label className="text-xs text-slate-600 block">{isSpecial ? "Qty Max :" : "Lot Max :"}</label>
          <input className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800" 
            type="number" placeholder="Enter Value" onChange={e => setQtyMax(e.target.value)} />
            
          <label className="text-xs text-slate-600 block">{isSpecial ? "Breakup Qty :" : "Breakup Lot :"}</label>
          <input className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800" 
            type="number" placeholder="Enter Value" onChange={e => setBreakup(e.target.value)} />

          <div className="flex gap-2 pt-2">
            <button onClick={handleApply} className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-semibold text-sm">Apply</button>
            <button onClick={handleUpdate} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded font-semibold text-sm">Update</button>
          </div>
        </div>
      }
    >
      <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl border border-gray-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800">
            <tr className="text-left text-xs text-slate-700 dark:text-slate-200">
              <th className="px-3 py-3"><input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? new Set(scripts.map(s => s.quantityGroupId)) : new Set())} /></th>
              <th className="px-3 py-3">Script</th>
              <th className="px-3 py-3 text-right">Lot Size</th>
              <th className="px-3 py-3 text-right">{isSpecial ? "Qty Max" : "Lot Max"}</th>
              <th className="px-3 py-3 text-right">{isSpecial ? "Breakup Qty" : "Breakup Lot"}</th>
              <th className="px-3 py-3 text-right">Updated At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
            {scripts.map(s => (
              <tr key={s.quantityGroupId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                <td className="px-3 py-2"><input type="checkbox" checked={selectedIds.has(s.quantityGroupId)} onChange={() => {
                  const next = new Set(selectedIds);
                  next.has(s.quantityGroupId) ? next.delete(s.quantityGroupId) : next.add(s.quantityGroupId);
                  setSelectedIds(next);
                }} /></td>
                <td className="px-3 py-2">{s.scriptName}</td>
                <td className="px-3 py-2 text-right">{s.lotSize}</td>
                <td className="px-3 py-2 text-right">{s.qtyMax.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{s.breakupQty.toFixed(2)}</td>
                <td className="px-3 py-2 text-right text-slate-500">{formatDate(s.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FilterLayout>
  );
};

export default ScriptQuantitySettings;