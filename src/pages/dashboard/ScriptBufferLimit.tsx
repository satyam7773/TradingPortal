import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Eye } from 'lucide-react';
import FilterLayout from '../../components/FilterLayout';
import userManagementService from '../../services/userManagementService';

interface ScriptBuffer {
  instrumentId: number;
  scripName: string;
  exchange: string;
  parentBufferAmount: number;
  bufferAmount: number;
  updatedDate: string;
}

interface FetchScriptBufferResponse {
  responseCode: string;
  responseMessage: string;
  data: ScriptBuffer[];
}

interface ScriptBufferLimitProps {
  username?: string;
  userId?: string;
  roleId?: string;
  user?: any; // userDetails from modal
}

const ScriptBufferLimit: React.FC<ScriptBufferLimitProps> = ({ username, userId: propsUserId, roleId, user: userDetails }) => {
  const [scripts, setScripts] = useState<ScriptBuffer[]>([]);
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [exchangesLoading, setExchangesLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  const [bufferAmount, setBufferAmount] = useState('');
  const [updateToAll, setUpdateToAll] = useState(false);
  const [selectedScript, setSelectedScript] = useState<ScriptBuffer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updatedUsers, setUpdatedUsers] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Get user data from props (modal mode) OR localStorage (dashboard mode)
  const userData = localStorage.getItem('userData');
  const loggedInUser = userData ? JSON.parse(userData) : null;
  const adminUserId = loggedInUser?.userId; // Admin making the request
  const targetUserId = propsUserId || adminUserId; // User to update for (target user)
  
  // In modal mode, use allowed exchanges from userDetails
  const allowedExchanges = React.useMemo(() => {
    const exList = userDetails?.userInfo?.allowedExchanges || [];
    return exList
      .map((ex: any) => (typeof ex === 'object' && ex.name ? ex.name : ex))
      .filter((ex: any) => ex);
  }, [userDetails]);

  // Ref to track if we've already loaded exchanges
  const exchangesLoadedRef = React.useRef(false);

  // Helper to format Date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Fetch exchanges
  const fetchExchanges = useCallback(async () => {
    if (!adminUserId) return [];
    
    setExchangesLoading(true);
    setExchanges([]); // Clear exchanges first
    setScripts([]); // Clear scripts
    try {
      // If in modal mode with userDetails, use those exchanges
      if (allowedExchanges.length > 0) {
        setExchanges(allowedExchanges);
        if (allowedExchanges.length > 0) {
          setSelectedExchange(allowedExchanges[0]);
        }
        return allowedExchanges;
      }

      // Otherwise fetch from service (dashboard mode)
      const exchangeData = await userManagementService.getExchanges(adminUserId);
      
      if (exchangeData && Array.isArray(exchangeData)) {
        const exchangeNames = exchangeData.map((ex: any) => ex.name);
        setExchanges(exchangeNames);
        // Set first exchange as selected
        if (exchangeNames.length > 0) {
          setSelectedExchange(exchangeNames[0]);
        }
        return exchangeNames;
      } else {
        toast.error('Failed to load exchanges');
        return [];
      }
    } catch (error) {
      const defaultExchanges = ['NSE', 'BSE', 'MCX', 'NFO'];
      setExchanges(defaultExchanges);
      setSelectedExchange(defaultExchanges[0]);
      return defaultExchanges;
    } finally {
      setExchangesLoading(false);
    }
  }, [adminUserId, allowedExchanges]);

  // Fetch scripts
  const fetchScripts = useCallback(async (exchangesToFetch?: string[]) => {
    if (!adminUserId || !targetUserId) return;

    setLoading(true);
    try {
      const allScripts: ScriptBuffer[] = [];
      
      if (!exchangesToFetch || exchangesToFetch.length === 0) {
        setLoading(false);
        return;
      }

      for (const exchange of exchangesToFetch) {
        const payload = {
          userId: adminUserId, // Admin making request
          requestTimestamp: new Date().getTime().toString(),
          data: {
            userId: targetUserId, // Target user to update for
            exchange: exchange
          }
        };

        const response = await fetch('https://api-staging.rivoplus.live/user/portal/fetchScripBufferSettings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) continue;

        const res: FetchScriptBufferResponse = await response.json();
        
        if (res?.responseCode === '0' && Array.isArray(res.data)) {
          allScripts.push(...res.data);
        }
      }

      setScripts(allScripts);
      setSelectedIds(new Set());
      
      if (allScripts.length === 0) {
        toast.error('No scripts found for selected exchange(s)');
      }
    } catch (error) {
      toast.error('Failed to load script buffer settings');
    } finally {
      setLoading(false);
    }
  }, [adminUserId, targetUserId]);

  // Load exchanges and scripts on mount
  useEffect(() => {
    const initializeData = async () => {
      if (exchangesLoadedRef.current || !adminUserId) return;
      
      exchangesLoadedRef.current = true;
      
      // First: Fetch exchanges
      const loadedExchanges = await fetchExchanges();
      
      // Then: Fetch scripts using ONLY the first exchange to get all data
      if (loadedExchanges && loadedExchanges.length > 0) {
        await fetchScripts([loadedExchanges[0]]);
      }
    };
    
    initializeData();
  }, [adminUserId, fetchExchanges, fetchScripts]); // Only depend on adminUserId - ref guard prevents re-runs

  // Refetch scripts when selectedExchange changes (but only after exchanges are loaded)
  useEffect(() => {
    if (exchanges.length > 0 && selectedExchange && exchangesLoadedRef.current) {
      // Only fetch from the selected exchange
      fetchScripts([selectedExchange]);
    }
  }, [selectedExchange]);

  const handleApply = () => {
    if (selectedIds.size === 0) return toast.error('Select at least one script');
    if (!bufferAmount) return toast.error('Please enter buffer amount');

    const newBufferAmount = parseFloat(bufferAmount);

    setScripts(prev => prev.map(s => {
      if (selectedIds.has(s.instrumentId)) {
        return { ...s, bufferAmount: newBufferAmount };
      }
      return s;
    }));
    
    toast.success(`Applied to ${selectedIds.size} script(s)`);
  };

  const handleUpdate = async () => {
    if (selectedIds.size === 0) return toast.error('Select scripts to update');
    if (!bufferAmount) return toast.error('Please enter buffer amount');

    setLoading(true);
    try {
      // Get unique exchanges from selected scripts
      const scriptsByExchange = scripts
        .filter(s => selectedIds.has(s.instrumentId))
        .reduce((acc: any, s) => {
          if (!acc[s.exchange]) acc[s.exchange] = [];
          acc[s.exchange].push(s);
          return acc;
        }, {});

      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];

      // Update for each exchange that has selected scripts
      for (const exchange of Object.keys(scriptsByExchange)) {
        const scripBuffers = scriptsByExchange[exchange].map((s: any) => ({
          ...s,
          bufferAmount: parseFloat(bufferAmount)
        }));

        const payload = {
          userId: adminUserId, // Admin making request
          requestTimestamp: new Date().getTime().toString(),
          data: {
            userId: targetUserId, // Target user to update for
            updateAllUsers: updateToAll,
            exchange: exchange,
            scripBuffers: scripBuffers
          }
        };

        const response = await fetch('https://api-staging.rivoplus.live/user/portal/updateScripBufferSettings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const res = await response.json();
        
        if (res?.responseCode === '0') {
          successCount++;
        } else {
          errorCount++;
          // Capture API error message
          if (res?.responseMessage) {
            errorMessages.push(`${exchange}: ${res.responseMessage}`);
          }
        }
      }

      // Show result
      if (successCount > 0 && errorCount === 0) {
        toast.success(`Updated successfully for ${successCount} exchange(s)`);
        await fetchScripts([selectedExchange]);
        setBufferAmount('');
        setUpdateToAll(false);
        setSelectedIds(new Set());
      } else if (successCount > 0 && errorCount > 0) {
        toast.success(`Updated ${successCount} exchange(s)`);
        // Show each error message
        errorMessages.forEach((msg) => {
          toast.error(msg);
        });
        await fetchScripts([selectedExchange]);
        setBufferAmount('');
        setUpdateToAll(false);
        setSelectedIds(new Set());
      } else {
        // All failed - show error messages
        if (errorMessages.length > 0) {
          errorMessages.forEach((msg) => {
            toast.error(msg);
          });
        } else {
          toast.error('Failed to update any exchange');
        }
      }
    } catch (error) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (script: ScriptBuffer) => {
    setSelectedScript(script);
    setShowModal(true);
    setModalLoading(true);
    setUpdatedUsers([]);
    
    try {
      const payload = {
        userId: adminUserId,
        requestTimestamp: new Date().getTime().toString(),
        data: {
          instrumentId: script.instrumentId
        }
      };
      
      const response = await fetch('https://api-staging.rivoplus.live/user/portal/viewScripBufferUpdatedUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const res = await response.json();
      if (res?.responseCode === '0' && Array.isArray(res.data)) {
        setUpdatedUsers(res.data);
      }
    } catch (error) {
      toast.error('Failed to load updated users');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <FilterLayout
      storageKey="scriptBufferLimit:showFilters"
      filterWidthClass="lg:w-[16%]"
      filters={
        <div className="space-y-3 p-4">
          <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Exchange :</label>
          <select 
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-700"
            value={selectedExchange}
            onChange={(e) => setSelectedExchange(e.target.value)}
            disabled={exchangesLoading || exchanges.length === 0 || loading}
          >
            {exchanges.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>

          <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Buffer Amount :</label>
          <input 
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            type="number" 
            placeholder="Enter Amount"
            value={bufferAmount}
            onChange={e => setBufferAmount(e.target.value)}
          />

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-3">
            <input 
              type="checkbox"
              checked={updateToAll}
              onChange={(e) => setUpdateToAll(e.target.checked)}
              className="rounded cursor-pointer"
            />
            <span>Update To All</span>
          </label>

          <div className="flex gap-2 pt-4">
            <button 
              onClick={handleApply}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded font-semibold text-sm transition-colors"
            >
              Apply
            </button>
            <button 
              onClick={handleUpdate}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded font-semibold text-sm transition-colors"
            >
              Update
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col overflow-hidden flex-1">
        {loading && scripts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading scripts...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
            <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-700 dark:text-slate-200 font-semibold">
                <th className="px-4 py-3 w-8">
                  <input 
                    type="checkbox"
                    checked={selectedIds.size === scripts.length && scripts.length > 0}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(scripts.map(s => s.instrumentId)) : new Set())}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3">Exchange</th>
                <th className="px-4 py-3">Script</th>
                <th className="px-4 py-3 text-right">Parent Buffer Amount</th>
                <th className="px-4 py-3 text-right">Own Buffer Amount</th>
                <th className="px-4 py-3 text-right text-xs">Updated At</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {scripts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No scripts found
                  </td>
                </tr>
              ) : (
                scripts.map(s => (
                  <tr key={s.instrumentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <input 
                        type="checkbox"
                        checked={selectedIds.has(s.instrumentId)}
                        onChange={() => {
                          const next = new Set(selectedIds);
                          next.has(s.instrumentId) ? next.delete(s.instrumentId) : next.add(s.instrumentId);
                          setSelectedIds(next);
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.exchange}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.scripName}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      {s.parentBufferAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                      {s.bufferAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 text-xs">
                      {formatDate(s.updatedDate)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetails(s)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
            </div>
        )}
      </div>

      {/* Updated Users Modal */}
      {showModal && selectedScript && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Updated Users</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {selectedScript.scripName} • {selectedScript.exchange}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Loading users...</p>
                  </div>
                </div>
              ) : updatedUsers.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400">No users have updated this script</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">Username</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Buffer Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Updated At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {updatedUsers.map((user, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{user.username}</td>
                          <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-semibold">
                            {parseFloat(user.bufferAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 text-xs">
                            {formatDate(user.updatedDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </FilterLayout>
  );
};

export default ScriptBufferLimit;
