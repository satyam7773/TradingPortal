import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import FilterLayout from "../../../components/FilterLayout";
import userManagementService from "../../../services/userManagementService";

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
  const [selectedExchange, setSelectedExchange] = useState<string>("NSE");
  const [settingType, setSettingType] = useState<string>(
    "TURNOVER WISE SETTING",
  );
  const [brokerageData, setBrokerageData] = useState<BrokerageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [allowedExchanges, setAllowedExchanges] = useState<string[]>([]);
  const [loadingExchanges, setLoadingExchanges] = useState(false);
  const [isForAllUsers, setIsForAllUsers] = useState(false);
  const prevSettingTypeRef = React.useRef<string>("TURNOVER WISE SETTING");

  const [brokeragePerLac, setBrokeragePerLac] = useState<string>("");
  const [brokerageRs, setBrokerageRs] = useState<string>("");
  const [callputBrokeragePerLac, setCallputBrokeragePerLac] =
    useState<string>("");
  const [callputBrokerageRs, setCallputBrokerageRs] = useState<string>("");
  const isInitializedRef = React.useRef<boolean>(false);

  const clearInputs = () => {
    setBrokeragePerLac("");
    setBrokerageRs("");
    setCallputBrokeragePerLac("");
    setCallputBrokerageRs("");
  };

  const fetchAllowedExchanges = async (datatype: string) => {
    try {
      setLoadingExchanges(true);
      const response = await userManagementService.fetchBrokerageExchanges(
        Number(user?.id),
        datatype,
      );
      const exchangesArray = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : null;
      if (Array.isArray(exchangesArray) && exchangesArray.length > 0) {
        setAllowedExchanges(exchangesArray);
        setSelectedExchange(exchangesArray[0]);
        await fetchBrokerageSettingsForExchange(exchangesArray[0]);
      } else {
        setAllowedExchanges([]);
        setBrokerageData([]);
      }
    } catch (error: any) {
      toast.error(error?.message || `Failed to fetch allowed exchanges`);
    } finally {
      setLoadingExchanges(false);
    }
  };

  useEffect(() => {
    if (prevSettingTypeRef.current !== settingType) {
      setBrokerageData([]);
      setSelectedItems(new Set());
      prevSettingTypeRef.current = settingType;
      fetchAllowedExchanges(
        settingType === "TURNOVER WISE SETTING" ? "TURNOVER" : "PER_LOT",
      );
    }
  }, [settingType]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      fetchAllowedExchanges(
        settingType === "TURNOVER WISE SETTING" ? "TURNOVER" : "PER_LOT",
      );
    }
  }, []);

  const fetchBrokerageSettingsForExchange = async (exchange: string) => {
    try {
      setLoading(true);
      const response = await userManagementService.fetchBrokerageSettings(
        Number(user?.id),
        exchange,
      );
      if (response?.data && Array.isArray(response.data)) {
        setBrokerageData(
          response.data.map((item: any) => ({
            exchange: exchange,
            instrumentId: item.instrumentId || 0,
            script: item.scripName || "",
            scripName: item.scripName || "",
            lotSize: item.lotSize,
            brokerageRs: item.brokeragePerLot || 0,
            parentBrokerageRs: item.parentBrokeragePerLot || 0,
            brokeragePerLotFlag: item.brokeragePerLotFlag,
            brokerageTurnoverFlag: item.brokerageTurnoverFlag,
            turnoverWiseBrokerage: item.brokerageTurnoverFlag
              ? item.brokerageTurnover
              : null,
            parentTurnoverWiseBrokerage: item.parentBrokerageTurnover,
            callputBrokeragePerLot: item.callputBrokeragePerLot,
            callputBrokeragePerLotFlag:
              item.callputBrokeragePerLotFlag || false,
            callputBrokerageTurnover: item.callputBrokerageTurnover || 0,
            callputBrokerageTurnoverFlag:
              item.callputBrokerageTurnoverFlag || false,
          })),
        );
      } else {
        setBrokerageData([]);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to fetch brokerage settings");
    } finally {
      setLoading(false);
    }
  };

const handleApply = () => {
    if (selectedItems.size === 0)
      return toast.error("Please select at least one script");

    // Prepare values to check
    const isTurnover = settingType === "TURNOVER WISE SETTING";
    const isCallput = selectedExchange === "CALLPUT";
    
    // Get the new value from the input
    const newValue = parseFloat(isTurnover 
      ? (isCallput ? callputBrokeragePerLac : brokeragePerLac) 
      : (isCallput ? callputBrokerageRs : brokerageRs));

    if (isNaN(newValue)) return toast.error("Please enter a valid numeric value");

    // Validation Loop
    for (const idx of Array.from(selectedItems)) {
      const item = brokerageData[idx];
      
      // Determine the parent limit based on type
      let parentLimit = 0;
      if (isTurnover) {
        parentLimit = isCallput ? 0 : (item.parentTurnoverWiseBrokerage || 0); 
        // Note: Check if your API provides parentTurnover for Callput if needed
      } else {
        parentLimit = isCallput ? 0 : (item.parentBrokerageRs || 0);
      }

      if (newValue < parentLimit) {
        toast.error(`Value for ${item.script} cannot be less than parent brokerage (${parentLimit.toFixed(2)})`);
        return; // Stop applying if any item fails
      }
    }

    // Apply if validation passes
    const updatedData = brokerageData.map((item, idx) => {
      if (!selectedItems.has(idx)) return item;
      const updated = { ...item };
      if (isTurnover) {
        if (isCallput) {
          updated.callputBrokerageTurnover = newValue;
          updated.callputBrokerageTurnoverFlag = true;
        } else {
          updated.turnoverWiseBrokerage = newValue;
        }
      } else {
        if (isCallput) {
          updated.callputBrokeragePerLot = newValue;
          updated.callputBrokeragePerLotFlag = true;
        } else {
          updated.brokerageRs = newValue;
        }
      }
      return updated;
    });

    setBrokerageData(updatedData);
    toast.success("Applied successfully");
  };

  const handleUpdate = async (isAll = false) => {
    if (selectedItems.size === 0) return toast.error("Please select items");
    try {
      setLoading(true);
      const selectedBrokerages = Array.from(selectedItems).map((idx) => {
        const item = brokerageData[idx];
        return {
          instrumentId: item.instrumentId,
          callputBrokeragePerLot: item.callputBrokeragePerLot,
          callputBrokeragePerLotFlag: item.callputBrokeragePerLotFlag,
          callputBrokerageTurnover: item.callputBrokerageTurnover,
          callputBrokerageTurnoverFlag: item.callputBrokerageTurnoverFlag,
          brokeragePerLot: item.brokerageRs,
          brokeragePerLotFlag: item.brokeragePerLotFlag,
          brokerageTurnoverFlag: item.brokerageTurnoverFlag,
          brokerageTurnover: item.turnoverWiseBrokerage,
        }

      });


      const userData = localStorage.getItem('userData')
      const userr = userData ? JSON.parse(userData) : null
      const loggedInUserId = userr?.userId

      const response = await userManagementService.updateBrokerageSettings(
        {
          userId: Number(loggedInUserId),
          data: {
            userId: Number(userDetails?.id || user?.id),
            brokerages: selectedBrokerages,
          },
        },
        isAll,
      );
      if (response?.responseCode === "0") {
        toast.success(isAll ? "Updated all users" : "Updated successfully");
        setSelectedItems(new Set());
        clearInputs();
      } else toast.error(response?.responseMessage || "Failed");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FilterLayout
      storageKey="brokerageSettings:showFilters"
      filterWidthClass="lg:w-[25%]"
      filters={
        <div className="space-y-3 p-4">
          <label className="text-xs text-slate-600 dark:text-slate-300 block">
            Exchange :
          </label>
          <select
            value={selectedExchange}
            onChange={(e) => {
              setSelectedExchange(e.target.value);
              fetchBrokerageSettingsForExchange(e.target.value);
            }}
            className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            {allowedExchanges.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>

          {settingType === "TURNOVER WISE SETTING" ? (
            selectedExchange !== "CALLPUT" ? (
              <div className="space-y-1">
                <label className="text-xs text-slate-600 block">
                  Brk Rs. 1/Lac :
                </label>
                <input
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                  placeholder="Enter value"
                  value={brokeragePerLac}
                  onChange={(e) => setBrokeragePerLac(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-xs text-slate-600 block">
                  Callput Brk Rs. 1/Lac :
                </label>
                <input
                  className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                  placeholder="Enter value"
                  value={callputBrokeragePerLac}
                  onChange={(e) => setCallputBrokeragePerLac(e.target.value)}
                />
              </div>
            )
          ) : selectedExchange !== "CALLPUT" ? (
            <div className="space-y-1">
              <label className="text-xs text-slate-600 block">
                Brk (Rs.) :
              </label>
              <input
                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                placeholder="Enter value"
                value={brokerageRs}
                onChange={(e) => setBrokerageRs(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs text-slate-600 block">
                Callput Brk (Rs.) :
              </label>
              <input
                className="w-full px-3 py-2 rounded border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                placeholder="Enter value"
                value={callputBrokerageRs}
                onChange={(e) => setCallputBrokerageRs(e.target.value)}
              />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-semibold text-sm"
            >
              Apply
            </button>
            <button
              onClick={() => handleUpdate(false)}
              className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded font-semibold text-sm"
            >
              Update
            </button>
          </div>
          <button
            onClick={() => handleUpdate(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm"
          >
            Update All Users
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSettingType("TURNOVER WISE SETTING")}
            className={`px-6 py-2 rounded font-semibold text-sm ${settingType === "TURNOVER WISE SETTING" ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-slate-700"}`}
          >
            TURNOVER WISE SETTING
          </button>
          <button
            onClick={() => setSettingType("SYMBOL WISE SETTING")}
            className={`px-6 py-2 rounded font-semibold text-sm ${settingType === "SYMBOL WISE SETTING" ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-slate-700"}`}
          >
            SYMBOL WISE SETTING
          </button>
        </div>
        <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl border border-gray-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800">
              <tr className="text-left text-xs text-slate-700 dark:text-slate-200">
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={brokerageData.length > 0 && selectedItems.size === brokerageData.length}
                    onChange={(e) =>
                      setSelectedItems(
                        e.target.checked
                          ? new Set(brokerageData.map((_, i) => i))
                          : new Set(),
                      )
                    }
                  />
                </th>
                <th className="px-3 py-3">Exchange</th>
                <th className="px-3 py-3">Script</th>

                {/* Column 1: Main Brokerage */}
                <th className="px-3 py-3">
                  {selectedExchange === "CALLPUT"
                    ? (settingType === "TURNOVER WISE SETTING" ? "Callput Turnover Brk" : "Callput Brk (Rs.)")
                    : (settingType === "TURNOVER WISE SETTING" ? "Turnover Brk" : "Brk (Rs.)")
                  }
                </th>

                {/* Column 2: Parent Brokerage (Always visible) */}
                <th className="px-3 py-3">Parent Brk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {brokerageData.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(idx)}
                      onChange={() => {
                        const s = new Set(selectedItems);
                        s.has(idx) ? s.delete(idx) : s.add(idx);
                        setSelectedItems(s);
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">{item.exchange}</td>
                  <td className="px-3 py-2">{item.script}</td>

                  {/* Cell 1: Main Brokerage Data */}
                  <td className="px-3 py-2">
                    {selectedExchange === "CALLPUT"
                      ? (settingType === "TURNOVER WISE SETTING" ? item.callputBrokerageTurnover : item.callputBrokeragePerLot)?.toFixed(2)
                      : (settingType === "TURNOVER WISE SETTING" ? item.turnoverWiseBrokerage : item.brokerageRs)?.toFixed(2)
                    }
                  </td>

                  {/* Cell 2: Parent Brokerage Data (Always visible) */}
                  <td className="px-3 py-2">
                    {settingType === "TURNOVER WISE SETTING"
                      ? item.parentTurnoverWiseBrokerage?.toFixed(2)
                      : item.parentBrokerageRs?.toFixed(2)
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FilterLayout>
  );
};

export default BrokerageSettings;
