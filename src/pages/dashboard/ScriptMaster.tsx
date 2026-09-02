import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Eye } from 'lucide-react';
import FilterLayout from '../../components/FilterLayout';
import userManagementService from '../../services/userManagementService';
import DownloadReport from '../../components/DownloadReport';
import { useDownloadReport } from '../../hooks/useDownloadReport';

interface ScriptMaster {
  instrumentId: number;
  scripName: string;
  lotSize: number;
  expiry: string;
  tradeAttributeDisplay: string;
  tradeAttribute: string;
  allowTradeDisplay: string;
  allowTrade: string;
  reverseDelay: number;
  updatedDate: string;
  exchange?: string;
}

interface TradeAttributeOptions {
  [key: string]: string;
}

interface AllowTradeOptions {
  [key: string]: string;
}

interface ScriptMasterProps {
  username?: string;
  userId?: string;
  roleId?: string;
  user?: any; // userDetails from modal
}

const ScriptMaster: React.FC<ScriptMasterProps> = ({ username, userId: propsUserId, roleId, user: userDetails }) => {
  const [scripts, setScripts] = useState<ScriptMaster[]>([]);
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [exchangesLoading, setExchangesLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  const [tradeAttribute, setTradeAttribute] = useState('');
  const [allowTrade, setAllowTrade] = useState('');
  const [reverseDelay, setReverseDelay] = useState('');
  const [updateToAll, setUpdateToAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedScript, setSelectedScript] = useState<ScriptMaster | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updatedUsers, setUpdatedUsers] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  
  const [tradeAttributeOptions, setTradeAttributeOptions] = useState<TradeAttributeOptions>({});
  const [allowTradeOptions, setAllowTradeOptions] = useState<AllowTradeOptions>({});
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Get user data from props (modal mode) OR localStorage (dashboard mode)
  const userData = localStorage.getItem('userData');
  const loggedInUser = userData ? JSON.parse(userData) : null;
  const adminUserId = loggedInUser?.userId; // Admin making the request
  const targetUserId = propsUserId || adminUserId; // User to update for (target user)
  
  // Initialize download report hook
  const downloadReport = useDownloadReport({
    apiEndpoint: 'https://api-staging.rivoplus.live/user/portal/fetchScripMasterSettings/download',
    filename: 'ScriptMasterSettings'
  });
  
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

  // Fetch dropdown options
  const fetchDropdownOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const [tradeAttrsRes, allowTradesRes] = await Promise.all([
        fetch('https://api-staging.rivoplus.live/user/portal/tradeAttributes'),
        fetch('https://api-staging.rivoplus.live/user/portal/allowTrade')
      ]);

      const tradeAttrsData = await tradeAttrsRes.json();
      const allowTradesData = await allowTradesRes.json();

      if (tradeAttrsData?.responseCode === '0') {
        setTradeAttributeOptions(tradeAttrsData.data || {});
      }
      if (allowTradesData?.responseCode === '0') {
        setAllowTradeOptions(allowTradesData.data || {});
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  // Fetch exchanges
  const fetchExchanges = useCallback(async () => {
    if (!adminUserId) return [];
    
    setExchangesLoading(true);
    setExchanges([]);
    setScripts([]);
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
      const allScripts: ScriptMaster[] = [];
      
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

        const response = await fetch('https://api-staging.rivoplus.live/user/portal/fetchScripMasterSettings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const res = await response.json();
        
        if (res?.responseCode === '0' && res?.data) {
          const scriptsWithExchange = res.data.map((s: any) => ({
            ...s,
            exchange: exchange
          }));
          allScripts.push(...scriptsWithExchange);
        }
      }

      setScripts(allScripts);
      setSelectedIds(new Set());
      setTradeAttribute('');
      setAllowTrade('');
      setReverseDelay('');
    } catch (error) {
      toast.error('Failed to fetch scripts');
    } finally {
      setLoading(false);
    }
  }, [adminUserId, targetUserId]);

  // Initialize on mount
  useEffect(() => {
    const initializeData = async () => {
      if (exchangesLoadedRef.current || !adminUserId) return;
      exchangesLoadedRef.current = true;
      
      await fetchDropdownOptions();
      const loadedExchanges = await fetchExchanges();
      if (loadedExchanges?.length > 0) {
        await fetchScripts([loadedExchanges[0]]);
      }
    };
    
    initializeData();
  }, [adminUserId, fetchExchanges, fetchScripts, fetchDropdownOptions]);

  // Fetch when exchange changes
  useEffect(() => {
    if (selectedExchange) {
      fetchScripts([selectedExchange]);
    }
  }, [selectedExchange, fetchScripts]);

  const handleDownloadReport = async (format: 'pdf' | 'excel') => {
    if (!selectedExchange) {
      toast.error('Please select an exchange');
      return;
    }
    if (scripts.length === 0) {
      toast.error('No scripts to download');
      return;
    }
    try {
      setIsDownloading(true);
      await downloadReport.download(format, {
        userId: adminUserId,
        requestTimestamp: new Date().getTime().toString(),
        data: {
          userId: targetUserId,
          exchange: selectedExchange
        }
      }, { pdf: format === 'pdf' });
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(scripts.map(s => s.instrumentId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectScript = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleApply = () => {
    if (selectedIds.size === 0) return toast.error('Select at least one script');
    
    const hasValues = tradeAttribute || allowTrade || reverseDelay;
    if (!hasValues) return toast.error('Please enter at least one value');

    setScripts(prev => prev.map(s => {
      if (selectedIds.has(s.instrumentId)) {
        return {
          ...s,
          ...(tradeAttribute && {
            tradeAttribute: tradeAttribute,
            tradeAttributeDisplay: tradeAttributeOptions[tradeAttribute] || tradeAttribute
          }),
          ...(allowTrade && {
            allowTrade: allowTrade,
            allowTradeDisplay: allowTradeOptions[allowTrade] || allowTrade
          }),
          ...(reverseDelay && { reverseDelay: parseInt(reverseDelay) })
        };
      }
      return s;
    }));

    toast.success(`Applied to ${selectedIds.size} script(s)`);
  };

  const handleUpdate = async () => {
    if (selectedIds.size === 0) return toast.error('Select scripts to update');
    
    const hasValues = tradeAttribute || allowTrade || reverseDelay;
    if (!hasValues) return toast.error('Please enter at least one value');

    setLoading(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];

      // Get unique exchanges from selected scripts
      const scriptsByExchange = scripts
        .filter(s => selectedIds.has(s.instrumentId) && s.exchange)
        .reduce((acc: any, s) => {
          const exchange = s.exchange!; // Non-null assertion since we filtered above
          if (!acc[exchange]) acc[exchange] = [];
          acc[exchange].push(s);
          return acc;
        }, {});

      for (const exchange of Object.keys(scriptsByExchange)) {
        const scripMasters = scriptsByExchange[exchange].map((s: any) => ({
          ...s,
          ...(tradeAttribute && {
            tradeAttribute: tradeAttribute,
            tradeAttributeDisplay: tradeAttributeOptions[tradeAttribute] || tradeAttribute
          }),
          ...(allowTrade && {
            allowTrade: allowTrade,
            allowTradeDisplay: allowTradeOptions[allowTrade] || allowTrade
          }),
          ...(reverseDelay && { reverseDelay: parseInt(reverseDelay) })
        }));

        const payload = {
          userId: adminUserId, // Admin making request
          requestTimestamp: new Date().getTime().toString(),
          data: {
            userId: targetUserId, // Target user to update for
            updateAllUsers: updateToAll,
            exchange: exchange,
            scripMasters: scripMasters
          }
        };

        const response = await fetch('https://api-staging.rivoplus.live/user/portal/updateScripMasterSettings', {
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
        setTradeAttribute('');
        setAllowTrade('');
        setReverseDelay('');
        setUpdateToAll(false);
        setSelectedIds(new Set());
      } else if (successCount > 0 && errorCount > 0) {
        toast.success(`Updated ${successCount} exchange(s)`);
        // Show each error message
        errorMessages.forEach((msg) => {
          toast.error(msg);
        });
        await fetchScripts([selectedExchange]);
        setTradeAttribute('');
        setAllowTrade('');
        setReverseDelay('');
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

  const handleViewUpdatedUsers = async (script: ScriptMaster) => {
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

      const response = await fetch('https://api-staging.rivoplus.live/user/portal/viewScripMasterUpdatedUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

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
      storageKey="scriptMaster:showFilters"
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

          <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Search :</label>
          <input 
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            type="text"
            placeholder="Search scripts..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />

          <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block mt-4">Trade Attribute Settings</label>
          
          <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Trade Attribute :</label>
          <select
            value={tradeAttribute}
            onChange={(e) => setTradeAttribute(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">Select</option>
            {Object.entries(tradeAttributeOptions).map(([key, value]) => (
              <option key={key} value={key}>{value}</option>
            ))}
          </select>

          <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Allow Trade? :</label>
          <div className="space-y-2">
            {Object.entries(allowTradeOptions).map(([key, value]) => (
              <label key={key} className="flex items-center text-sm">
                <input
                  type="radio"
                  name="allowTrade"
                  value={key}
                  checked={allowTrade === key}
                  onChange={(e) => setAllowTrade(e.target.value)}
                  className="rounded cursor-pointer"
                />
                <span className="ml-3 text-slate-700 dark:text-slate-300">{value}</span>
              </label>
            ))}
          </div>

          <button 
            onClick={handleApply}
            disabled={loading}
            className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded font-semibold text-sm transition-colors"
          >
            Save
          </button>

          <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block mt-4">Trade Delay</label>

          <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Reverse Delay (Min) :</label>
          <input 
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            type="number" 
            placeholder="Enter delay"
            value={reverseDelay}
            onChange={e => setReverseDelay(e.target.value)}
          />

          <div className="flex gap-2 pt-2">
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
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-semibold text-sm transition-colors"
            >
              Update
            </button>
          </div>

          {/* Download Section */}
          <div className="border-t border-gray-200 dark:border-slate-600 pt-4 mt-4">
            <DownloadReport
              onDownload={handleDownloadReport}
              isDisabled={isDownloading || scripts.length === 0 || !selectedExchange}
              label="Download Report"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-3">
            <input 
              type="checkbox"
              checked={updateToAll}
              onChange={(e) => setUpdateToAll(e.target.checked)}
              className="rounded cursor-pointer"
            />
            <span>Update To All</span>
          </label>
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
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3">Exchange</th>
                  <th className="px-4 py-3">Script</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3 text-right">LotSize</th>
                  <th className="px-4 py-3">Trade Attribute</th>
                  <th className="px-4 py-3">Allow Trade</th>
                  <th className="px-4 py-3 text-right">Reverse Delay (Min)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {scripts
                  .filter(script => 
                    searchTerm === '' || 
                    script.scripName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (script.exchange && script.exchange.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No scripts found
                    </td>
                  </tr>
                ) : (
                  scripts
                    .filter(script => 
                      searchTerm === '' || 
                      script.scripName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (script.exchange && script.exchange.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map(s => (
                      <tr key={s.instrumentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <input 
                            type="checkbox"
                            checked={selectedIds.has(s.instrumentId)}
                            onChange={() => handleSelectScript(s.instrumentId)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.exchange || '-'}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.scripName}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{s.expiry}</td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                          {s.lotSize.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{s.tradeAttributeDisplay}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{s.allowTradeDisplay}</td>
                        <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{s.reverseDelay}</td>
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
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Updated At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {updatedUsers.map((user, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{user.userName}</td>
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

export default ScriptMaster;
