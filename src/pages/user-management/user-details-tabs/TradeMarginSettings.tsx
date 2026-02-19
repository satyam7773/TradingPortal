import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import FilterLayout from '../../../components/FilterLayout';
import userManagementService from '../../../services/userManagementService';

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
  updatedDate?: string;
}

const TradeMarginSettings: React.FC<any> = ({ user, userDetails, onRefresh }) => {
  const [selectedExchange, setSelectedExchange] = useState<string>('NSE');
  const [marginInput, setMarginInput] = useState<string>('');
  const [cfMarginInput, setCfMarginInput] = useState<string>('');
  const [minVolumeInput, setMinVolumeInput] = useState<string>('');
  const [volumeStepInput, setVolumeStepInput] = useState<string>('');
  const [marginData, setMarginData] = useState<TradeMarginItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  
  // Parse exchanges from userDetails
  const availableExchanges = React.useMemo(() => {
    const exchangesStr = userDetails?.userInfo?.exchanges || 'NSE';
    return exchangesStr.split(',').map((ex: string) => ex.trim()).filter(Boolean);
  }, [userDetails]);

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
    if (!marginInput.trim() && !cfMarginInput.trim() && !minVolumeInput.trim() && !volumeStepInput.trim()) {
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

    // Apply to selected items
    const updatedData = marginData.map((item, idx) => {
      if (selectedItems.has(idx)) {
        return {
          ...item,
          margin: marginInput ? parseFloat(marginInput) : item.margin,
          cfMargin: cfMarginInput ? parseFloat(cfMarginInput) : item.cfMargin,
          minVolume: minVolumeInput ? parseFloat(minVolumeInput) : item.minVolume,
          volumeStep: volumeStepInput ? parseFloat(volumeStepInput) : item.volumeStep,
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

      const selectedTradeMargins = Array.from(selectedItems).map((idx) => {
        const item = marginData[idx];
        return {
          instrumentId: item.instrumentId,
          margin: item.margin,
          marginPercentage: item.marginPercentage,
          cfMargin: item.cfMargin,
          minVolume: item.minVolume,
          volumeStep: item.volumeStep,
        };
      });

      // Build the request payload
      const payload = {
        userId: Number(loggedInUserId),
        requestTimestamp: Date.now().toString(),
        data: {
          userId: Number(userDetails?.id || user?.id),
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
      } else {
        toast.error(response?.responseMessage || 'Failed to update trade margin settings');
      }
    } catch (error: any) {
      console.error('❌ Error updating trade margin settings:', error);
      toast.error(error?.message || 'Failed to update trade margin settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateToAllUsers = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one script to update');
      return;
    }

    toast('Update to all users functionality to be implemented');
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === marginData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(marginData.map((_, idx) => idx)));
    }
  };

  const toggleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  return (
    <FilterLayout
      storageKey="tradeMarginSettings:showFilters"
      filterWidthClass="lg:w-[25%]"
      filters={
        <div className="space-y-3 p-4">
          <div className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Filter</div>
          
          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300 block">Exchange :</label>
            <select
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              {availableExchanges.map((exchange: string) => (
                <option key={exchange} value={exchange}>
                  {exchange}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300 block">Margin (%) :</label>
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

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-semibold text-sm hover:brightness-105 transition"
            >
              Apply
            </button>
            <button
              onClick={handleUpdate}
              className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded font-semibold text-sm hover:brightness-105 transition"
            >
              Update
            </button>
          </div>

          <button
            onClick={handleUpdateToAllUsers}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:brightness-105 transition"
          >
            Update to All Users
          </button>
        </div>
      }
    >
      {/* Right content - Table */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-300">Loading...</div>
        ) : (
          <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl border border-gray-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto tabs-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800">
                  <tr className="text-left text-xs text-slate-700 dark:text-slate-200">
                    <th className="px-3 py-3 min-w-[80px]">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === marginData.length && marginData.length > 0}
                        onChange={toggleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-3 min-w-[150px]">Script Name</th>
                    <th className="px-3 py-3 min-w-[120px]">Lot Size</th>
                    <th className="px-3 py-3 min-w-[130px]">Margin %</th>
                    <th className="px-3 py-3 min-w-[120px]">CF Margin</th>
                    <th className="px-3 py-3 min-w-[130px]">Min Volume</th>
                    <th className="px-3 py-3 min-w-[130px]">Volume Step</th>
                    <th className="px-3 py-3 min-w-[150px]">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {marginData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No margin settings found for {selectedExchange}
                      </td>
                    </tr>
                  ) : (
                    marginData.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(idx)}
                            onChange={() => toggleSelectItem(idx)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.scripName || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.lotSize != null ? Number(item.lotSize) : '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.margin != null ? Number(item.margin).toFixed(2) : '-'}%</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.cfMargin != null ? Number(item.cfMargin).toFixed(2) : '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.minVolume != null ? Number(item.minVolume) : '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{item.volumeStep != null ? Number(item.volumeStep) : '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {item.expiry ? new Date(item.expiry).toLocaleDateString() : '-'}
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
