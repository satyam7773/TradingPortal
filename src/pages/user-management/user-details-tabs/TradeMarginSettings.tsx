import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import FilterLayout from '../../../components/FilterLayout';
import userManagementService from '../../../services/userManagementService';
import { useSorting } from '../../../hooks/useSorting';

interface TradeMarginItem {
  exchange: string;
  scripName: string;
  instrumentId: number;
  lotSize: number;
  margin: number;
  marginPercentage: boolean;
  cfMargin: number;
  minVolume: number;
  volumeStep: number;
  expiry: number;
  callputMargin?: number;
  callputMarginPercentage?: boolean;
  updatedDate?: string;
}

const TradeMarginSettings: React.FC<any> = ({ user, userDetails, onRefresh }) => {
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [marginTypeFilter, setMarginTypeFilter] = useState<string>('percentage'); // percentage, amount
  const [scriptNameSearch, setScriptNameSearch] = useState<string>('');

  // Get the viewed user's roleId to check if they're a Master or Admin
  // This shows "Update to All Users" only if the USER BEING VIEWED is a Master/Admin, not the logged-in user
  const userRoleId = React.useMemo(() => {
    const roleId = userDetails?.userProfile?.roleId;
    console.log('🔍 [TradeMarginSettings] User (being viewed) roleId:', roleId, 'User object:', user, 'userDetails:', userDetails?.userProfile);
    return roleId || null; // roleId: 1,2=Admin, 3=Master, 4=Client
  }, [userDetails, user]);
  const [marginInput, setMarginInput] = useState<string>('');
  const [cfMarginInput, setCfMarginInput] = useState<string>('');
  const [minVolumeInput, setMinVolumeInput] = useState<string>('');
  const [volumeStepInput, setVolumeStepInput] = useState<string>('');
  const [callputMarginInput, setCallputMarginInput] = useState<string>('');
  const [updateAllUsersCheckbox, setUpdateAllUsersCheckbox] = useState(false);
  const [marginData, setMarginData] = useState<TradeMarginItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set()); // Store instrumentId, not index
  
  // Extract allowed exchanges from userDetails
  const allowedExchanges = React.useMemo(() => {
    const exchanges = userDetails?.userInfo?.allowedExchanges || [];
    return Array.isArray(exchanges) ? exchanges.map((ex: any) => ex.name) : [];
  }, [userDetails]);

  // Set first exchange as default when allowed exchanges are loaded
  useEffect(() => {
    if (allowedExchanges.length > 0 && !selectedExchange) {
      setSelectedExchange(allowedExchanges[0]);
    }
  }, [allowedExchanges, selectedExchange]);

  // Fetch margin settings when exchange changes
  useEffect(() => {
    if (user?.id && selectedExchange) {
      fetchMarginSettings();
    }
  }, [user?.id, selectedExchange]);

  const fetchMarginSettings = async () => {
    try {
      setLoading(true);
      const response = await userManagementService.fetchTradeMarginSettings(
        Number(user?.id),
        selectedExchange
      );
      
      if (response?.data) {
        setMarginData(response.data);
      } else {
        setMarginData([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch trade margin settings:', error);
      toast.error(error?.message || 'Failed to fetch margin settings');
      setMarginData([]);
      // Refresh user list to show latest values
      if (onRefresh) {
        onRefresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    // Check if any items are selected
    if (selectedItems.size === 0) {
      toast.error('Please select at least one script to apply');
      return;
    }

    // Check if values are entered
    if (!marginInput.trim() && !cfMarginInput.trim() && !minVolumeInput.trim() && !volumeStepInput.trim() && !callputMarginInput.trim()) {
      toast.error('Please enter at least one value');
      return;
    }

    // Validate numeric values
    if (marginInput && isNaN(parseFloat(marginInput))) {
      toast.error('Please enter a valid number for Margin');
      return;
    }
    if (cfMarginInput && isNaN(parseFloat(cfMarginInput))) {
      toast.error('Please enter a valid number for CF Margin');
      return;
    }
    if (minVolumeInput && isNaN(parseFloat(minVolumeInput))) {
      toast.error('Please enter a valid number for Min Volume');
      return;
    }
    if (volumeStepInput && isNaN(parseFloat(volumeStepInput))) {
      toast.error('Please enter a valid number for Volume Step');
      return;
    }
    if (callputMarginInput && isNaN(parseFloat(callputMarginInput))) {
      toast.error('Please enter a valid number for Callput Margin');
      return;
    }

    // Apply to selected items
    const updatedData = marginData.map((item) => {
      if (selectedItems.has(item.instrumentId)) {
        return {
          ...item,
          margin: marginInput ? parseFloat(marginInput) : item.margin,
          cfMargin: cfMarginInput ? parseFloat(cfMarginInput) : item.cfMargin,
          minVolume: minVolumeInput ? parseFloat(minVolumeInput) : item.minVolume,
          volumeStep: volumeStepInput ? parseFloat(volumeStepInput) : item.volumeStep,
          callputMargin: callputMarginInput ? parseFloat(callputMarginInput) : item.callputMargin,
          callputMarginPercentage: callputMarginInput ? true : item.callputMarginPercentage,
        };
      }
      return item;
    });

    setMarginData(updatedData);
    toast.success(`Applied values to ${selectedItems.size} scripts`);
  };

  const handleUpdate = async () => {
    // Check if any items are selected
    if (selectedItems.size === 0) {
      toast.error('Please select at least one script to update');
      return;
    }

    try {
      setLoading(true);

      const userDataStr = localStorage.getItem('userData');
      const storedUserData = userDataStr ? JSON.parse(userDataStr) : null;
      const loggedInUserId = storedUserData?.userId || user?.id;

      const selectedTradeMargins = Array.from(selectedItems).map((instrumentId) => {
        const item = marginData.find(m => m.instrumentId === instrumentId);
        if (!item) return null;
        
        const payload: any = {
          instrumentId: item.instrumentId,
          margin: item.margin,
          marginPercentage: item.marginPercentage,
          cfMargin: item.cfMargin,
          minVolume: item.minVolume,
          volumeStep: item.volumeStep,
        };
        
        // Add callput fields if exchange is CALLPUT
        if (selectedExchange === 'CALLPUT' && item.callputMargin !== undefined) {
          payload.callputMargin = item.callputMargin;
          payload.callputMarginPercentage = item.callputMarginPercentage || true;
        }
        
        return payload;
      }).filter(p => p !== null);

      // Build the request payload
      const payload = {
        userId: Number(loggedInUserId),
        requestTimestamp: Date.now().toString(),
        data: {
          userId: Number(userDetails?.id || user?.id),
          updateAllUsers: updateAllUsersCheckbox,
          tradeMargins: selectedTradeMargins
        }
      };

      console.log('📤 Sending update request:', payload);

      const response = await userManagementService.updateTradeMarginSettings(payload);
      console.log('response', response);
      
      if (response?.responseCode === '0') {
        toast.success(`Updated ${selectedItems.size} scripts successfully`);

        // Refresh the data after successful update
        console.log('🔄 Refreshing trade margin data...');
        await fetchMarginSettings();

        // Clear selection after update
        setSelectedItems(new Set());
        
        // Clear form inputs
        setMarginInput('');
        setCfMarginInput('');
        setMinVolumeInput('');
        setVolumeStepInput('');
        setCallputMarginInput('');
        setUpdateAllUsersCheckbox(false);
      } else if (response?.responseCode === '1032') {
        // Specific validation error for parent margin
        toast.error(response?.responseMessage || 'Trade Margin cannot be less than parent trade margin');
        console.warn('⚠️ Validation Error - Parent Margin:', response?.responseMessage);
        // Refresh to show latest server values
        try {
          await fetchMarginSettings();
        } catch (err) {
          console.error('Failed to refresh after validation error:', err);
        }
        if (onRefresh) {
          onRefresh();
        }
      } else {
        toast.error(response?.responseMessage || 'Failed to update trade margin settings');
        // Refresh to show latest server values on any error
        try {
          await fetchMarginSettings();
        } catch (err) {
          console.error('Failed to refresh after error:', err);
        }
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error: any) {
      console.error('❌ Error updating trade margin settings:', error);
      toast.error(error?.message || 'Failed to update trade margin settings');
      // Refresh user list to show latest values
      if (onRefresh) {
        onRefresh();
      }
    } finally {
      setLoading(false);
    }
  };



  const toggleSelectAll = () => {
    if (selectedItems.size === filteredMarginData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredMarginData.map((item) => item.instrumentId)));
    }
  };

  const toggleSelectItem = (instrumentId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(instrumentId)) {
      newSelected.delete(instrumentId);
    } else {
      newSelected.add(instrumentId);
    }
    setSelectedItems(newSelected);
  };

  // Filter marginData based on marginTypeFilter and scriptNameSearch
  const filteredMarginData = React.useMemo(() => {
    let filtered = marginData;

    // Filter by margin type
    if (marginTypeFilter === 'percentage') {
      filtered = filtered.filter(item => item.marginPercentage === true);
    } else if (marginTypeFilter === 'amount') {
      filtered = filtered.filter(item => item.marginPercentage === false);
    }

    // Filter by script name
    if (scriptNameSearch.trim()) {
      filtered = filtered.filter(item => 
        item.scripName.toLowerCase().includes(scriptNameSearch.toLowerCase())
      );
    }

    return filtered;
  }, [marginData, marginTypeFilter, scriptNameSearch]);

  // Sorting hook
  const { sortColumn, sortDirection, handleSort, sortedData: sortedMarginData, getSortIcon } = useSorting({ data: filteredMarginData });

  return (
    <FilterLayout
      storageKey="tradeMarginSettings:showFilters"
      filterWidthClass="lg:w-[16%]"
      filters={
        <div className="space-y-3 p-4">
          <div className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Filter</div>
          
          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300 block">Exchange :</label>
            <select
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
              disabled={allowedExchanges.length === 0}
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {allowedExchanges.length === 0 ? (
                <option>No exchanges available</option>
              ) : (
                allowedExchanges.map((exchange: string) => (
                  <option key={exchange} value={exchange}>
                    {exchange}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300 block">Search Script Name :</label>
            <input
              type="text"
              value={scriptNameSearch}
              onChange={(e) => setScriptNameSearch(e.target.value)}
              placeholder="Search script..."
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300 block">Margin Type :</label>
            <select
              value={marginTypeFilter}
              onChange={(e) => setMarginTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="amount">Amount (Rs)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300 block">Margin (Rs/%) :</label>
            <input
              type="text"
              value={marginInput}
              onChange={(e) => setMarginInput(e.target.value)}
              placeholder="Enter value"
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300 block">CF Margin :</label>
            <input
              type="text"
              value={cfMarginInput}
              onChange={(e) => setCfMarginInput(e.target.value)}
              placeholder="Enter value"
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300 block">Min Volume :</label>
            <input
              type="text"
              value={minVolumeInput}
              onChange={(e) => setMinVolumeInput(e.target.value)}
              placeholder="Enter value"
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300 block">Volume Step :</label>
            <input
              type="text"
              value={volumeStepInput}
              onChange={(e) => setVolumeStepInput(e.target.value)}
              placeholder="Enter value"
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>

          {selectedExchange === 'CALLPUT' && (
            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300 block">Callput Margin (Rs/%) :</label>
              <input
                type="text"
                value={callputMarginInput}
                onChange={(e) => setCallputMarginInput(e.target.value)}
                placeholder="Enter value"
                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {userRoleId !== null && userRoleId !== 4 && (
              <div className="w-full space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={updateAllUsersCheckbox}
                    onChange={(e) => setUpdateAllUsersCheckbox(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-300">Update All Users</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleApply}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm hover:brightness-105 transition"
                  >
                    Apply
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm hover:brightness-105 transition"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
            {(userRoleId === null || userRoleId === 4) && (
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleApply}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm hover:brightness-105 transition"
                >
                  Apply
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm hover:brightness-105 transition"
                >
                  Update
                </button>
              </div>
            )}
          </div>
        </div>
      }
    >
      {/* Right content - Table */}
      <div className="p-4 h-full overflow-y-auto tabs-scrollbar flex flex-col">
        {loading ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-300">Loading...</div>
        ) : (
          <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl border border-gray-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden flex flex-col h-full">
            <div className="overflow-x-auto overflow-y-auto tabs-scrollbar flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800">
                  <tr className="text-left text-xs text-slate-700 dark:text-slate-200">
                    <th className="px-3 py-3 min-w-[80px]">
                      <input
                        type="checkbox"
                        checked={sortedMarginData.length > 0 && selectedItems.size === sortedMarginData.length}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3 min-w-[150px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition" onClick={() => handleSort('scripName')}>
                      <div className="flex items-center gap-2">Script Name {getSortIcon('scripName')}</div>
                    </th>
                    <th className="px-3 py-3 min-w-[120px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition" onClick={() => handleSort('lotSize')}>
                      <div className="flex items-center gap-2">Lot Size {getSortIcon('lotSize')}</div>
                    </th>
                    <th className="px-3 py-3 min-w-[130px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition" onClick={() => handleSort('margin')}>
                      <div className="flex items-center gap-2">Margin {getSortIcon('margin')}</div>
                    </th>
                    <th className="px-3 py-3 min-w-[120px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition" onClick={() => handleSort('cfMargin')}>
                      <div className="flex items-center gap-2">CF Margin {getSortIcon('cfMargin')}</div>
                    </th>
                    <th className="px-3 py-3 min-w-[130px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition" onClick={() => handleSort('minVolume')}>
                      <div className="flex items-center gap-2">Min Volume {getSortIcon('minVolume')}</div>
                    </th>
                    <th className="px-3 py-3 min-w-[130px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition" onClick={() => handleSort('volumeStep')}>
                      <div className="flex items-center gap-2">Volume Step {getSortIcon('volumeStep')}</div>
                    </th>
                    {selectedExchange === 'CALLPUT' && (
                      <th className="px-3 py-3 min-w-[150px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition" onClick={() => handleSort('callputMargin')}>
                        <div className="flex items-center gap-2">Callput Margin {getSortIcon('callputMargin')}</div>
                      </th>
                    )}
                    <th className="px-3 py-3 min-w-[150px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition" onClick={() => handleSort('expiry')}>
                      <div className="flex items-center gap-2">Expiry Date {getSortIcon('expiry')}</div>
                    </th>
                    <th className="px-3 py-3 min-w-[150px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition" onClick={() => handleSort('updatedDate')}>
                      <div className="flex items-center gap-2">Updated Date {getSortIcon('updatedDate')}</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {sortedMarginData.length === 0 ? (
                    <tr>
                      <td colSpan={selectedExchange === 'CALLPUT' ? 10 : 9} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No margin settings found for {selectedExchange}
                      </td>
                    </tr>
                  ) : (
                    sortedMarginData.map((item) => (
                      <tr
                        key={item.instrumentId}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.instrumentId)}
                            onChange={() => toggleSelectItem(item.instrumentId)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.scripName || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.lotSize != null ? Number(item.lotSize) : '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.marginPercentage ? '' : 'Rs '}{item.margin != null ? Number(item.margin).toFixed(2) : '-'}{item.marginPercentage ? '%' : ''}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.cfMargin != null ? Number(item.cfMargin).toFixed(2) : '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.minVolume != null ? Number(item.minVolume) : '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.volumeStep != null ? Number(item.volumeStep) : '-'}</td>
                        {selectedExchange === 'CALLPUT' && (
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.callputMargin != null ? (item.callputMarginPercentage ? '' : 'Rs ') + Number(item.callputMargin).toFixed(2) + (item.callputMarginPercentage ? '%' : '') : '-'}</td>
                        )}
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {item.expiry ? new Date(item.expiry).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                          }) : '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {item.updatedDate ? new Date(item.updatedDate).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
                          }) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </FilterLayout>
  );
};

export default TradeMarginSettings;
