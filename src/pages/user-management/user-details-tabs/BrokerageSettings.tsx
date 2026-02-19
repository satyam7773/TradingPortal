import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import FilterLayout from '../../../components/FilterLayout';
import userManagementService from '../../../services/userManagementService';

interface BrokerageItem {
  instrumentId?: number;
  exchange: string;
  script: string;
  scripName?: string;
  lotSize: number;
  brokerageRs?: number;
  parentBrokerageRs?: number;
  turnoverWiseBrokerage?: number | null;
  parentTurnoverWiseBrokerage?: number | null;
  brokeragePerLotFlag?: boolean;
  brokerageTurnoverFlag?: boolean;
}

const BrokerageSettings: React.FC<any> = ({ user, userDetails, onRefresh }) => {
  const [selectedExchange, setSelectedExchange] = useState<string>('NSE');
  const [settingType, setSettingType] = useState<string>('TURNOVER WISE SETTING');
  const [brokerageData, setBrokerageData] = useState<BrokerageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [allowedExchanges, setAllowedExchanges] = useState<string[]>([]);
  const [loadingExchanges, setLoadingExchanges] = useState(false);

  // Filter fields for Turnover Wise Setting
  const [brokeragePerLac, setBrokeragePerLac] = useState<string>('');

  // Filter fields for Symbol Wise Setting
  const [brokerageRs, setBrokerageRs] = useState<string>('');

  // Fetch allowed exchanges based on datatype (TURNOVER or LOT)
  const fetchAllowedExchanges = async (datatype: string) => {
    try {
      setLoadingExchanges(true);
      console.log(`📥 Fetching allowed exchanges for ${datatype} with userId=${user?.id}...`);

      const response = await userManagementService.fetchBrokerageExchanges(
        Number(user?.id),
        datatype
      );

      console.log(`📦 Raw response:`, response);
      console.log(`📦 Response type:`, typeof response);
      console.log(`📦 Response keys:`, Object.keys(response || {}));
      console.log(`📦 Response.data:`, response?.data);
      console.log(`📦 Response.data type:`, typeof response?.data);
      console.log(`📦 Is response.data an array?`, Array.isArray(response?.data));
      console.log(`📦 Response as direct array?`, Array.isArray(response));

      // Check if response itself is an array (since service returns response.data)
      let exchangesArray;
      if (Array.isArray(response)) {
        console.log(`✅ Response IS the array directly`);
        exchangesArray = response;
      } else if (Array.isArray(response?.data)) {
        console.log(`✅ Response.data IS the array`);
        exchangesArray = response.data;
      } else {
        console.log(`❌ Neither response nor response.data is an array`);
        exchangesArray = null;
      }

      if (Array.isArray(exchangesArray) && exchangesArray.length > 0) {
        console.log(`✅ Allowed exchanges for ${datatype}:`, exchangesArray);
        setAllowedExchanges(exchangesArray);

        // Set first exchange as default and fetch brokerage settings for it
        const firstExchange = exchangesArray[0];
        console.log(`🔄 Setting first exchange as default:`, firstExchange);
        setSelectedExchange(firstExchange);

        // Call fetchBrokerageSettings with the first exchange
        await fetchBrokerageSettingsForExchange(firstExchange);
      } else {
        console.warn('No exchanges found. Response was:', response);
        setAllowedExchanges([]);
      }
    } catch (error: any) {
      console.error(`❌ Failed to fetch allowed exchanges:`, error);
      toast.error(error?.message || `Failed to fetch allowed exchanges`);
      setAllowedExchanges([]);
    } finally {
      setLoadingExchanges(false);
    }
  };

  // Fetch allowed exchanges when component mounts or setting type changes
  useEffect(() => {
    // Clear brokerage data when switching tabs so fresh data can be loaded
    setBrokerageData([]);
    setSelectedItems(new Set());

    const datatype = settingType === 'TURNOVER WISE SETTING' ? 'TURNOVER' : 'PER_LOT';
    fetchAllowedExchanges(datatype);
  }, [settingType, user?.id]);

  // Fetch brokerage settings for a specific exchange
  const fetchBrokerageSettingsForExchange = async (exchange: string) => {
    try {
      setLoading(true);
      console.log(`📥 Fetching brokerage settings for ${exchange}...`);
      const response = await userManagementService.fetchBrokerageSettings(
        Number(user?.id),
        exchange
      );

      if (response?.data && Array.isArray(response.data)) {
        // Map API response to BrokerageItem interface and add selected exchange
        const mappedData = response.data.map((item: any) => ({
          exchange: exchange, // Selected exchange name
          instrumentId: item.instrumentId || 0, // Default to 2 if not provided
          script: item.scripName || '', // scripName maps to script column
          scripName: item.scripName || '', // Keep scripName as is
          lotSize: item.lotSize || item.brokeragePerLot || 0, // lotSize from API
          brokerageRs: item.brokeragePerLot || 0, // Turnover-wise brokerage
          parentBrokerageRs: item.parentBrokerageTurnover || 0, // Parent turnover-wise brokerage
          brokeragePerLotFlag: item.brokeragePerLotFlag || false,
          brokerageTurnoverFlag: item.brokerageTurnoverFlag || false,
          turnoverWiseBrokerage: item.brokerageTurnoverFlag ? item.brokerageTurnover : null,
          parentTurnoverWiseBrokerage: item.brokerageTurnoverFlag ? item.parentBrokerageTurnover : null
        }));
        console.log(`✅ Brokerage data loaded for ${exchange}:`, mappedData);
        setBrokerageData(mappedData);
      } else {
        setBrokerageData([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch brokerage settings:', error);
      toast.error(error?.message || 'Failed to fetch brokerage settings');
      setBrokerageData([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle exchange change when user manually selects a different exchange
  const handleExchangeChange = (exchange: string) => {
    console.log(`🔄 User changed exchange to: ${exchange}`);
    setSelectedExchange(exchange);
    fetchBrokerageSettingsForExchange(exchange);
  };

  const handleApply = async () => {
    // Check if any items are selected
    if (selectedItems.size === 0) {
      toast.error('Please select at least one script to apply');
      return;
    }

    // Check if values are entered
    if (settingType === 'TURNOVER WISE SETTING') {
      if (!brokeragePerLac.trim()) {
        toast.error('Please enter Brk Rs. 1/Lac value');
        return;
      }

      const brokerageValue = parseFloat(brokeragePerLac);
      if (isNaN(brokerageValue)) {
        toast.error('Please enter a valid number for Brk Rs. 1/Lac');
        return;
      }

      // Apply to selected items
      const updatedData = brokerageData.map((item, idx) => {
        if (selectedItems.has(idx)) {
          return {
            ...item,
            turnoverWiseBrokerage: brokerageValue,
            brokerageRs: brokerageValue,
          };
        }
        return item;
      });

      setBrokerageData(updatedData);
      toast.success(`Applied Brk Rs. 1/Lac value to ${selectedItems.size} scripts`);
    } else {
      // SYMBOL WISE SETTING
      if (!brokerageRs.trim()) {
        toast.error('Please enter Brk (Rs.) value');
        return;
      }

      const brokerageValue = parseFloat(brokerageRs);

      if (isNaN(brokerageValue)) {
        toast.error('Please enter a valid number for Brk (Rs.)');
        return;
      }

      // Apply to selected items
      const updatedData = brokerageData.map((item, idx) => {
        if (selectedItems.has(idx)) {
          return {
            ...item,
            brokerageRs: brokerageValue,
          };
        }
        return item;
      });
      console.log('updatedData',updatedData)

      setBrokerageData(updatedData);
      toast.success(`Applied Brk (Rs.) value to ${selectedItems.size} scripts`);
    }
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

      const selectedBrokerages = Array.from(selectedItems).map((idx) => {
        const item = brokerageData[idx];
        
        return {
          instrumentId: item.instrumentId || 2,
          brokeragePerLot: item.brokerageRs || 0,
          brokeragePerLotFlag: item.brokeragePerLotFlag,
          brokerageTurnoverFlag: item.brokerageTurnoverFlag,
          brokerageTurnover: item.turnoverWiseBrokerage || 0,
        };
      });

      // Build the request payload
      const payload = {
        userId: Number(loggedInUserId), // Logged-in user (parent level)
        requestTimestamp: Date.now().toString(),
        data: {
          userId: Number(userDetails?.id || user?.id), // User whose settings are being updated
          brokerages: selectedBrokerages
        }
      };

      console.log('📤 Sending update request:', payload);

      const response = await userManagementService.updateBrokerageSettings(payload);
      console.log('response',response)
      if (response?.responseCode === '0') {
        toast.success(`Updated ${selectedItems.size} scripts successfully`);

        // Refresh the data after successful update
        console.log('🔄 Refreshing brokerage data...');
        await fetchBrokerageSettingsForExchange(selectedExchange);

        // Clear selection after update
        setSelectedItems(new Set());
      } else {
        toast.error(response?.responseMessage || 'Failed to update brokerage settings');
      }
    } catch (error: any) {
      console.error('❌ Error updating brokerage settings:', error);
      toast.error(error?.message || 'Failed to update brokerage settings');
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
    if (selectedItems.size === brokerageData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(brokerageData.map((_, idx) => idx)));
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

  const renderTurnoverWiseTable = () => (
    <table className="w-full text-sm">
      <thead className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800">
        <tr className="text-left text-xs text-slate-700 dark:text-slate-200">
          <th className="px-3 py-3 min-w-[80px]">
            <input
              type="checkbox"
              checked={selectedItems.size === brokerageData.length && brokerageData.length > 0}
              onChange={toggleSelectAll}
              className="cursor-pointer"
            />
          </th>
          <th className="px-3 py-3 min-w-[100px]">Exchange</th>
          <th className="px-3 py-3 min-w-[150px]">Script</th>
          <th className="px-3 py-3 min-w-[200px]">Turnover Wise Brk ( Rs. per 1/Lac )</th>
          <th className="px-3 py-3 min-w-[200px]">Parent Turnover Wise Brk ( Rs. per 1/Lac )</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
        {brokerageData.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No brokerage settings found for {selectedExchange}
            </td>
          </tr>
        ) : (
          brokerageData.map((item, idx) => (
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
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.exchange || '-'}</td>
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.script || '-'}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {item.turnoverWiseBrokerage != null ? Number(item.turnoverWiseBrokerage).toFixed(2) : '-'}
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {item.parentTurnoverWiseBrokerage != null ? Number(item.parentTurnoverWiseBrokerage).toFixed(2) : '-'}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const renderSymbolWiseTable = () => (
    <table className="w-full text-sm">
      <thead className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800">
        <tr className="text-left text-xs text-slate-700 dark:text-slate-200">
          <th className="px-3 py-3 min-w-[80px]">
            <input
              type="checkbox"
              checked={selectedItems.size === brokerageData.length && brokerageData.length > 0}
              onChange={toggleSelectAll}
              className="cursor-pointer"
            />
          </th>
          <th className="px-3 py-3 min-w-[100px]">Exchange</th>
          <th className="px-3 py-3 min-w-[150px]">Script</th>
          <th className="px-3 py-3 min-w-[150px]">Brk (Rs.)</th>
          <th className="px-3 py-3 min-w-[150px]">Parent Brk (Rs.)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
        {brokerageData.length === 0 ? (
          <tr>
            <td colSpan={6} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No brokerage settings found for {selectedExchange}
            </td>
          </tr>
        ) : (
          brokerageData.map((item, idx) => (
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
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.exchange || '-'}</td>
              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{item.script || '-'}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {item.brokerageRs != null ? Number(item.brokerageRs).toFixed(2) : '-'}
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {item.parentBrokerageRs != null ? Number(item.parentBrokerageRs).toFixed(2) : '-'}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <FilterLayout
      storageKey="brokerageSettings:showFilters"
      filterWidthClass="lg:w-[25%]"
      filters={
        <div className="space-y-3 p-4">
          <div className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-200">Filter</div>

          <div className="space-y-1">
            <label className="text-xs text-slate-600 dark:text-slate-300 block">Exchange :</label>
            <select
              value={selectedExchange}
              onChange={(e) => handleExchangeChange(e.target.value)}
              disabled={loadingExchanges || allowedExchanges.length === 0}
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingExchanges ? (
                <option>Loading exchanges...</option>
              ) : allowedExchanges.length > 0 ? (
                allowedExchanges.map((exchange: string) => (
                  <option key={exchange} value={exchange}>
                    {exchange}
                  </option>
                ))
              ) : (
                <option>No exchanges available</option>
              )}
            </select>
          </div>

          {settingType === 'TURNOVER WISE SETTING' ? (
            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300 block">Brk Rs. 1/Lac :</label>
              <input
                type="text"
                value={brokeragePerLac}
                onChange={(e) => setBrokeragePerLac(e.target.value)}
                placeholder="Enter value"
                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs text-slate-600 dark:text-slate-300 block">Brk (Rs.) :</label>
              <input
                type="text"
                value={brokerageRs}
                onChange={(e) => setBrokerageRs(e.target.value)}
                placeholder="Enter value"
                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
          )}

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
      {/* Right content - Tabs and Table */}
      <div className="p-4 space-y-3">
        {/* Tab Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setSettingType('TURNOVER WISE SETTING')}
            className={`px-6 py-2 rounded font-semibold text-sm transition ${settingType === 'TURNOVER WISE SETTING'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:brightness-95'
              }`}
          >
            TURNOVER WISE SETTING
          </button>
          <button
            onClick={() => setSettingType('SYMBOL WISE SETTING')}
            className={`px-6 py-2 rounded font-semibold text-sm transition ${settingType === 'SYMBOL WISE SETTING'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:brightness-95'
              }`}
          >
            SYMBOL WISE SETTING
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8 text-slate-600 dark:text-slate-300">Loading...</div>
        ) : (
          <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl border border-gray-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto tabs-scrollbar">
              {settingType === 'TURNOVER WISE SETTING' ? renderTurnoverWiseTable() : renderSymbolWiseTable()}
            </div>
          </div>
        )}
      </div>
    </FilterLayout>
  );
};

export default BrokerageSettings;
