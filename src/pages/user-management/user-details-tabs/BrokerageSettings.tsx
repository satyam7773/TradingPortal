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
  callputBrokeragePerLot?: number;
  callputBrokeragePerLotFlag?: boolean;
  callputBrokerageTurnover?: number;
  callputBrokerageTurnoverFlag?: boolean;
}

const BrokerageSettings: React.FC<any> = ({ user, userDetails, onRefresh }) => {
  const [selectedExchange, setSelectedExchange] = useState<string>('NSE');
  const [settingType, setSettingType] = useState<string>('TURNOVER WISE SETTING');
  const [brokerageData, setBrokerageData] = useState<BrokerageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [allowedExchanges, setAllowedExchanges] = useState<string[]>([]);
  const [loadingExchanges, setLoadingExchanges] = useState(false);
  const [isForAllUsers, setIsForAllUsers] = useState(false);
  const prevSettingTypeRef = React.useRef<string>('TURNOVER WISE SETTING');

  // Filter fields for Turnover Wise Setting
  const [brokeragePerLac, setBrokeragePerLac] = useState<string>('');

  // Filter fields for Symbol Wise Setting
  const [brokerageRs, setBrokerageRs] = useState<string>('');

  // Filter fields for Callput brokerage
  const [callputBrokeragePerLac, setCallputBrokeragePerLac] = useState<string>('');
  const [callputBrokerageRs, setCallputBrokerageRs] = useState<string>('');
  const isInitializedRef = React.useRef<boolean>(false);

  // Fetch allowed exchanges based on datatype (TURNOVER or LOT)
  const fetchAllowedExchanges = async (datatype: string) => {
    try {
      setLoadingExchanges(true);
      const response = await userManagementService.fetchBrokerageExchanges(
        Number(user?.id),
        datatype
      );

      const exchangesArray = Array.isArray(response) 
        ? response 
        : (Array.isArray(response?.data) ? response.data : null);

      if (Array.isArray(exchangesArray) && exchangesArray.length > 0) {
        setAllowedExchanges(exchangesArray);
        const firstExchange = exchangesArray[0];
        setSelectedExchange(firstExchange);
        await fetchBrokerageSettingsForExchange(firstExchange);
      } else {
        setAllowedExchanges([]);
        setBrokerageData([]); 
      }
    } catch (error: any) {
      toast.error(error?.message || `Failed to fetch allowed exchanges`);
      setAllowedExchanges([]);
    } finally {
      setLoadingExchanges(false);
    }
  };

  useEffect(() => {
    if (prevSettingTypeRef.current !== settingType) {
      setBrokerageData([]);
      setSelectedItems(new Set());
      prevSettingTypeRef.current = settingType;
      const datatype = settingType === 'TURNOVER WISE SETTING' ? 'TURNOVER' : 'PER_LOT';
      fetchAllowedExchanges(datatype);
    }
  }, [settingType]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      const datatype = settingType === 'TURNOVER WISE SETTING' ? 'TURNOVER' : 'PER_LOT';
      fetchAllowedExchanges(datatype);
    }
  }, []);

  const fetchBrokerageSettingsForExchange = async (exchange: string) => {
    try {
      setLoading(true);
      const response = await userManagementService.fetchBrokerageSettings(
        Number(user?.id),
        exchange
      );

      if (response?.data && Array.isArray(response.data)) {
        const mappedData = response.data.map((item: any) => ({
          exchange: exchange, 
          instrumentId: item.instrumentId || 0, 
          script: item.scripName || '', 
          scripName: item.scripName || '', 
          lotSize: item.lotSize || item.brokeragePerLot || 0, 
          brokerageRs: item.brokeragePerLot || 0, 
          parentBrokerageRs: item.parentBrokeragePerLot || 0, 
          brokeragePerLotFlag: item.brokeragePerLotFlag || false,
          brokerageTurnoverFlag: item.brokerageTurnoverFlag || false,
          turnoverWiseBrokerage: item.brokerageTurnoverFlag ? item.brokerageTurnover : null,
          parentTurnoverWiseBrokerage: item.parentBrokerageTurnover || 0,
          callputBrokeragePerLot: item.callputBrokeragePerLot || 0,
          callputBrokeragePerLotFlag: item.callputBrokeragePerLotFlag || false,
          callputBrokerageTurnover: item.callputBrokerageTurnover || 0,
          callputBrokerageTurnoverFlag: item.callputBrokerageTurnoverFlag || false
        }));
        setBrokerageData(mappedData);
      } else {
        setBrokerageData([]);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to fetch brokerage settings');
      setBrokerageData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeChange = (exchange: string) => {
    setSelectedExchange(exchange);
    fetchBrokerageSettingsForExchange(exchange);
  };

  const handleApply = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one script to apply');
      return;
    }

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

      // Generic Validation for Turnover
      for (const idx of Array.from(selectedItems)) {
        const item = brokerageData[idx];
        const parentLimit = item.parentTurnoverWiseBrokerage || 0;
        if (brokerageValue < parentLimit) {
          toast.error(`Value for ${item.script} cannot be less than parent brokerage (${parentLimit.toFixed(2)})`);
          return;
        }
      }

      let callputValue: number | undefined;
      if (selectedExchange === 'CALLPUT' && callputBrokeragePerLac.trim()) {
        callputValue = parseFloat(callputBrokeragePerLac);
        if (isNaN(callputValue)) {
          toast.error('Please enter a valid number for Callput Brk Rs. 1/Lac');
          return;
        }
      }

      const updatedData = brokerageData.map((item, idx) => {
        if (selectedItems.has(idx)) {
          const updated: any = {
            ...item,
            turnoverWiseBrokerage: brokerageValue,
            brokerageRs: 0,
            brokerageTurnoverFlag: true,
            brokeragePerLotFlag: false,
          };
          
          if (selectedExchange === 'CALLPUT') {
            if (callputValue !== undefined) {
              updated.callputBrokerageTurnover = callputValue;
              updated.callputBrokerageTurnoverFlag = true;
            } else {
              updated.callputBrokerageTurnover = 0;
              updated.callputBrokerageTurnoverFlag = false;
            }
            updated.callputBrokeragePerLot = 0;
            updated.callputBrokeragePerLotFlag = false;
          }
          return updated;
        }
        return item;
      });

      setBrokerageData(updatedData);
      toast.success(`Applied Brk Rs. 1/Lac value to ${selectedItems.size} scripts`);
    } else {
      if (!brokerageRs.trim()) {
        toast.error('Please enter Brk (Rs.) value');
        return;
      }

      const brokerageValue = parseFloat(brokerageRs);
      if (isNaN(brokerageValue)) {
        toast.error('Please enter a valid number for Brk (Rs.)');
        return;
      }

      // Generic Validation for Per Lot
      for (const idx of Array.from(selectedItems)) {
        const item = brokerageData[idx];
        const parentLimit = item.parentBrokerageRs || 0;
        if (brokerageValue < parentLimit) {
          toast.error(`Value for ${item.script} cannot be less than parent brokerage (${parentLimit.toFixed(2)})`);
          return;
        }
      }

      let callputValue: number | undefined;
      if (selectedExchange === 'CALLPUT' && callputBrokerageRs.trim()) {
        callputValue = parseFloat(callputBrokerageRs);
        if (isNaN(callputValue)) {
          toast.error('Please enter a valid number for Callput Brk (Rs.)');
          return;
        }
      }

      const updatedData = brokerageData.map((item, idx) => {
        if (selectedItems.has(idx)) {
          const updated: any = {
            ...item,
            brokerageRs: brokerageValue,
            turnoverWiseBrokerage: 0,
            brokeragePerLotFlag: true,
            brokerageTurnoverFlag: false,
          };
          
          if (selectedExchange === 'CALLPUT') {
            if (callputValue !== undefined) {
              updated.callputBrokeragePerLot = callputValue;
              updated.callputBrokeragePerLotFlag = true;
            } else {
              updated.callputBrokeragePerLot = 0;
              updated.callputBrokeragePerLotFlag = false;
            }
            updated.callputBrokerageTurnover = 0;
            updated.callputBrokerageTurnoverFlag = false;
          }
          return updated;
        }
        return item;
      });

      setBrokerageData(updatedData);
      toast.success(`Applied Brk (Rs.) value to ${selectedItems.size} scripts`);
    }
  };

  const handleUpdate = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one script to update');
      return;
    }

    // Final safety check against parent limits
    for (const idx of Array.from(selectedItems)) {
      const item = brokerageData[idx];
      if (settingType === 'TURNOVER WISE SETTING') {
        const currentVal = item.turnoverWiseBrokerage || 0;
        const parentLimit = item.parentTurnoverWiseBrokerage || 0;
        if (currentVal < parentLimit) {
          toast.error(`Update blocked: ${item.script} brokerage is below parent limit.`);
          return;
        }
      } else {
        const currentVal = item.brokerageRs || 0;
        const parentLimit = item.parentBrokerageRs || 0;
        if (currentVal < parentLimit) {
          toast.error(`Update blocked: ${item.script} brokerage is below parent limit.`);
          return;
        }
      }
    }

    try {
      setLoading(true);
      const userDataStr = localStorage.getItem('userData');
      const storedUserData = userDataStr ? JSON.parse(userDataStr) : null;
      const loggedInUserId = storedUserData?.userId || user?.id;

      const selectedBrokerages = Array.from(selectedItems).map((idx) => {
        const item = brokerageData[idx];
        const payload: any = {
          instrumentId: item.instrumentId || 2,
          brokeragePerLot: item.brokerageRs || 0,
          brokeragePerLotFlag: item.brokeragePerLotFlag,
          brokerageTurnoverFlag: item.brokerageTurnoverFlag,
          brokerageTurnover: item.turnoverWiseBrokerage || 0,
        };
        
        if (selectedExchange === 'CALLPUT') {
          payload.callputBrokeragePerLot = item.callputBrokeragePerLot || 0;
          payload.callputBrokeragePerLotFlag = item.callputBrokeragePerLotFlag || false;
          payload.callputBrokerageTurnover = item.callputBrokerageTurnover || 0;
          payload.callputBrokerageTurnoverFlag = item.callputBrokerageTurnoverFlag || false;
        }
        return payload;
      });

      const payload = {
        userId: Number(loggedInUserId), 
        requestTimestamp: Date.now().toString(),
        data: {
          userId: Number(userDetails?.id || user?.id), 
          brokerages: selectedBrokerages
        }
      };

      const response = await userManagementService.updateBrokerageSettings(payload, isForAllUsers);
      if (response?.responseCode === '0') {
        toast.success(`Updated ${selectedItems.size} scripts successfully`);
        setSelectedItems(new Set());
      } else {
        toast.error(response?.responseMessage || 'Failed to update brokerage settings');
      }
    } catch (error: any) {
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

    // Safety check for update all users
    for (const idx of Array.from(selectedItems)) {
      const item = brokerageData[idx];
      if (settingType === 'TURNOVER WISE SETTING') {
        const currentVal = item.turnoverWiseBrokerage || 0;
        const parentLimit = item.parentTurnoverWiseBrokerage || 0;
        if (currentVal < parentLimit) {
          toast.error(`${item.script} is below parent limit. Correct before updating all users.`);
          return;
        }
      } else {
        const currentVal = item.brokerageRs || 0;
        const parentLimit = item.parentBrokerageRs || 0;
        if (currentVal < parentLimit) {
          toast.error(`${item.script} is below parent limit. Correct before updating all users.`);
          return;
        }
      }
    }

    try {
      setLoading(true);
      const userDataStr = localStorage.getItem('userData');
      const storedUserData = userDataStr ? JSON.parse(userDataStr) : null;
      const loggedInUserId = storedUserData?.userId || user?.id;

      const selectedBrokerages = Array.from(selectedItems).map((idx) => {
        const item = brokerageData[idx];
        const payload: any = {
          instrumentId: item.instrumentId || 2,
          brokeragePerLot: item.brokerageRs || 0,
          brokeragePerLotFlag: item.brokeragePerLotFlag,
          brokerageTurnoverFlag: item.brokerageTurnoverFlag,
          brokerageTurnover: item.turnoverWiseBrokerage || 0,
        };
        
        if (selectedExchange === 'CALLPUT') {
          payload.callputBrokeragePerLot = item.callputBrokeragePerLot || 0;
          payload.callputBrokeragePerLotFlag = item.callputBrokeragePerLotFlag || false;
          payload.callputBrokerageTurnover = item.callputBrokerageTurnover || 0;
          payload.callputBrokerageTurnoverFlag = item.callputBrokerageTurnoverFlag || false;
        }
        return payload;
      });

      const payload = {
        userId: Number(loggedInUserId), 
        requestTimestamp: Date.now().toString(),
        data: {
          userId: Number(userDetails?.id || user?.id), 
          brokerages: selectedBrokerages
        }
      };

      const response = await userManagementService.updateBrokerageSettings(payload, true);
      if (response?.responseCode === '0') {
        toast.success(`Updated ${selectedItems.size} scripts for all users successfully`);
        setSelectedItems(new Set());
        setBrokeragePerLac('');
        setBrokerageRs('');
        setCallputBrokeragePerLac('');
        setCallputBrokerageRs('');
      } else {
        toast.error(response?.responseMessage || 'Failed to update brokerage settings for all users');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update brokerage settings for all users');
    } finally {
      setLoading(false);
    }
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
          {selectedExchange === 'CALLPUT' && (
            <th className="px-3 py-3 min-w-[200px]">Callput Turnover Brk ( Rs. per 1/Lac )</th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
        {brokerageData.length === 0 ? (
          <tr>
            <td colSpan={selectedExchange === 'CALLPUT' ? 6 : 5} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
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
              {selectedExchange === 'CALLPUT' && (
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                  {item.callputBrokerageTurnover != null ? Number(item.callputBrokerageTurnover).toFixed(2) : '-'}
                </td>
              )}
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
          {/* {selectedExchange === 'CALLPUT' && (
            <th className="px-3 py-3 min-w-[150px]">Callput Brk (Rs.)</th>
          )} */}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
        {brokerageData.length === 0 ? (
          <tr>
            <td colSpan={selectedExchange === 'CALLPUT' ? 7 : 6} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
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
              {/* {selectedExchange === 'CALLPUT' && (
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                  {item.callputBrokeragePerLot != null ? Number(item.callputBrokeragePerLot).toFixed(2) : '-'}
                </td>
              )} */}
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
            <>
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
              {selectedExchange === 'CALLPUT' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 dark:text-slate-300 block">Callput Brk Rs. 1/Lac :</label>
                  <input
                    type="text"
                    value={callputBrokeragePerLac}
                    onChange={(e) => setCallputBrokeragePerLac(e.target.value)}
                    placeholder="Enter value"
                    className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </>
          ) : (
            <>
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
              {/* {selectedExchange === 'CALLPUT' && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 dark:text-slate-300 block">Callput Brk (Rs.) :</label>
                  <input
                    type="text"
                    value={callputBrokerageRs}
                    onChange={(e) => setCallputBrokerageRs(e.target.value)}
                    placeholder="Enter value"
                    className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>
              )} */}
            </>
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
      <div className="p-4 space-y-3">
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