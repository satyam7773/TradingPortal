import React, { useState, useEffect } from 'react';
import { IndianRupee, Activity, TrendingUp, Clock, User, Edit2, Save, X, Network } from 'lucide-react';
import toast from 'react-hot-toast';
import { userManagementService } from '../../services';

interface UserProfile {
  userId: number;
  username: string;
  credits: number;
  balance: number;
  roleId: number;
}

interface UserInfo {
  name: string;
  remarks?: string;
  ipAddress: string;
  createdAt: string;
  lastLoginDate: string;
  allowedExchanges?: Array<{ name: string }>;
}

interface UserDetailsResponse {
  userProfile: UserProfile;
  userInfo: UserInfo;
  [key: string]: any;
} 

interface UserDetailsTabProps {
  user: any;
  userDetails: UserDetailsResponse;
  getTypeColor: (type: string) => string;
}

// Exchange data
const exchangeData = [
  { 
    key: 'nse', 
    name: 'NSE', 
    fullName: 'National Stock Exchange',
    color: 'bg-blue-500'
  },
  { 
    key: 'mcx', 
    name: 'MCX', 
    fullName: 'Multi Commodity Exchange',
    color: 'bg-purple-500'
  },
  { 
    key: 'sgx', 
    name: 'SGX', 
    fullName: 'Singapore Exchange',
    color: 'bg-purple-500'
  },
  { 
    key: 'cds', 
    name: 'CDS', 
    fullName: 'Currency Derivatives',
    color: 'bg-orange-500'
  },
  { 
    key: 'callput', 
    name: 'CALLPUT', 
    fullName: 'Options Trading',
    color: 'bg-indigo-500'
  }
]

// Format date utility
const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  
  let dateObj;
  
  // Check if it's a numeric timestamp (number or string of digits)
  if (typeof date === 'number') {
    dateObj = new Date(date);
  } else if (typeof date === 'string') {
    // Try to parse as numeric timestamp string first
    if (/^\d+$/.test(date.trim())) {
      dateObj = new Date(parseInt(date, 10));
    } else {
      // Try to parse as ISO string or other date format
      dateObj = new Date(date);
    }
  } else {
    return String(date);
  }
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  try {
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    return 'Invalid date';
  }
};

const UserDetailsTab: React.FC<UserDetailsTabProps> = ({ user, userDetails, getTypeColor }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [parentUserConfig, setParentUserConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(false);
  
  // State for editable fields
  const [editedName, setEditedName] = useState(userDetails.userInfo.name);
  const [editedMobile, setEditedMobile] = useState(user?.mobile || '');
  const [editedCity, setEditedCity] = useState(user?.city || '');
  const [editedRemarks, setEditedRemarks] = useState(userDetails.userInfo.remarks || '');
  const [editedPnlSharing, setEditedPnlSharing] = useState(
    user?.pnlSharing || user?.sharing || (userDetails as any)?.userInfo?.pnlSharing || 0
  );
  const [editedBrokerageSharing, setEditedBrokerageSharing] = useState(
    user?.brokeragePercentage || user?.brkSharing || (userDetails as any)?.userInfo?.brkSharing || 0
  );
  const [editedAutoSquareOff, setEditedAutoSquareOff] = useState(user?.marginSquareOff || user?.autoSquareOff || false);
  const [editedAddMaster, setEditedAddMaster] = useState(
    user?.addMaster || (userDetails as any)?.userInfo?.addMaster || false
  );
  
  // Parse allowed exchanges
  const parseAllowedExchanges = () => {
    // Try multiple sources for allowed exchanges
    const exchanges = user?.allowedExchanges || userDetails?.userInfo?.allowedExchanges;
    
    if (!exchanges) return {};
    
    const obj: any = {};
    const exchangesList = Array.isArray(exchanges) ? exchanges : 
                          typeof exchanges === 'string' ? 
                          exchanges.split(',').map((e: string) => ({ name: e.trim() })) : [];
    
    exchangesList.forEach((ex: any) => {
      const name = ex?.name || ex;
      const key = String(name).toLowerCase();
      if (exchangeData.find(e => e.key === key)) {
        obj[key] = true;
      }
    });
    return obj;
  };

  const [editedAllowedExchanges, setEditedAllowedExchanges] = useState<Record<string, boolean>>(parseAllowedExchanges());

  // Parse high/low trade limit
  const parseHighLowTradeLimit = () => {
    // Try multiple sources for high/low trade limit
    const tradeLimits = user?.highLowTradeLimit || (userDetails as any)?.userInfo?.highLowTradeLimit || user?.high_low_trade_limit;
    
    if (!tradeLimits) return {};
    
    const obj: any = {};
    
    // Handle array of objects with 'name' property
    if (Array.isArray(tradeLimits)) {
      tradeLimits.forEach((ex: any) => {
        const name = ex?.name || ex;
        const key = String(name).toLowerCase();
        if (exchangeData.find(e => e.key === key)) {
          obj[key] = true;
        }
      });
    } else if (typeof tradeLimits === 'string') {
      // Handle comma-separated string
      tradeLimits.split(',').forEach((key: string) => {
        const cleanKey = key.trim().toLowerCase();
        if (exchangeData.find(e => e.key === cleanKey)) {
          obj[cleanKey] = true;
        }
      });
    }
    
    return obj;
  };

  const [editedHighLowTradeLimit, setEditedHighLowTradeLimit] = useState<Record<string, boolean>>(parseHighLowTradeLimit());

  // Fetch parent user's config to get sharing limits
  useEffect(() => {
    const fetchParentUserConfig = async () => {
      try {
        setConfigLoading(true);
        const userDataStr = localStorage.getItem('userData');
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        const parentUserId = userData?.userId || 2;

        const config = await userManagementService.fetchUserConfig(parentUserId);
        setParentUserConfig(config);
      } catch (error) {
        console.error('❌ Error fetching parent user config:', error);
        // Set default values if fetch fails
        setParentUserConfig({
          pnlSharing: 100,
          brokeragePercentage: 100
        });
      } finally {
        setConfigLoading(false);
      }
    };

    fetchParentUserConfig();
  }, []);

  // Sync state with props when userDetails changes
  useEffect(() => {
    setEditedName(userDetails.userInfo.name);
    setEditedRemarks(userDetails.userInfo.remarks || '');
    setEditedPnlSharing(user?.pnlSharing || user?.sharing || (userDetails as any)?.userInfo?.pnlSharing || 0);
    setEditedBrokerageSharing(user?.brokeragePercentage || user?.brkSharing || (userDetails as any)?.userInfo?.brkSharing || 0);
    setEditedAddMaster(user?.addMaster || (userDetails as any)?.userInfo?.addMaster || false);
    setEditedAllowedExchanges(parseAllowedExchanges());
    setEditedHighLowTradeLimit(parseHighLowTradeLimit());
  }, [userDetails, user]);

  const isMaster = userDetails.userProfile.roleId === 3;
  const isClient = userDetails.userProfile.roleId === 4;

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditedName(userDetails.userInfo.name);
    setEditedMobile(user?.mobile || '');
    setEditedCity(user?.city || '');
    setEditedRemarks(userDetails.userInfo.remarks || '');
    setEditedPnlSharing(user?.pnlSharing || user?.sharing || (userDetails as any)?.userInfo?.pnlSharing || 0);
    setEditedBrokerageSharing(user?.brokeragePercentage || user?.brkSharing || (userDetails as any)?.userInfo?.brkSharing || 0);
    setEditedAutoSquareOff(user?.marginSquareOff || user?.autoSquareOff || false);
    setEditedAddMaster(user?.addMaster || (userDetails as any)?.userInfo?.addMaster || false);
    setEditedAllowedExchanges(parseAllowedExchanges());
    setEditedHighLowTradeLimit(parseHighLowTradeLimit());
  };

  const handleSave = async () => {
    try {
      setIsUpdating(true);
      
      // Get parent user ID from localStorage
      const userDataStr = localStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const parentUserId = userData?.userId || 2;

      // Prepare allowed exchanges array
      const allowedExchanges = Object.entries(editedAllowedExchanges)
        .filter(([key, isEnabled]) => isEnabled)
        .map(([key]) => ({
          name: key.toUpperCase(),
          turnover: false,
          lot: false,
          groupId: null
        }));

      // Prepare high/low trade limit
      const highLowTradeLimit = Object.entries(editedHighLowTradeLimit)
        .filter(([key, isEnabled]) => isEnabled)
        .map(([key]) => key.toUpperCase())
        .join(',');

      const updatePayload: any = {
        name: editedName,
        mobile: editedMobile,
        city: editedCity,
        remarks: editedRemarks,
        allowedExchanges,
      };

      // Add master-only fields
      if (isMaster) {
        updatePayload.pnlSharing = editedPnlSharing;
        updatePayload.brkSharing = editedBrokerageSharing;
        updatePayload.highLowTradeLimit = highLowTradeLimit;
        updatePayload.addMaster = editedAddMaster;
      }

      // Add client-only fields
      if (isClient) {
        updatePayload.marginSquareOff = editedAutoSquareOff;
      }

      const response = await userManagementService.editUserDetails(
        parentUserId,
        userDetails.userProfile.userId,
        updatePayload
      );

      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        toast.success('User details updated successfully!');
        setIsEditMode(false);
      } else {
        toast.error(response?.responseMessage || 'Failed to update user details');
      }
    } catch (error: any) {
      console.error('❌ Error updating user:', error);
      const errorMsg = error?.response?.data?.responseMessage || error.message || 'Failed to update user details';
      toast.error(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Edit Button */}
      <div className="flex justify-end mb-4">
        {!isEditMode ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
          >
            <Edit2 className="w-4 h-4" />
            Edit Details
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Top Stats Row - Compact */}
      <div className="grid grid-cols-3 gap-3" style={{ pointerEvents: 'auto' }}>
        {/* Credits Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-3 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-full text-left">
          <div className="flex items-center justify-between mb-1">
            <IndianRupee className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-emerald-100 text-xs font-medium mb-0.5">Credits</p>
          <span className="text-xl font-bold hover:text-emerald-100 transition-colors inline-block">
            ₹{userDetails.userProfile.credits.toLocaleString()}
          </span>
        </div>

        {/* Balance Card */}
        <div className={`rounded-xl p-3 text-white shadow-lg transform hover:scale-105 transition-all duration-200 ${
          userDetails.userProfile.balance >= 0 
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
            : 'bg-gradient-to-br from-red-500 to-pink-600'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <Activity className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-blue-100 text-xs font-medium mb-0.5">Balance</p>
          <p className="text-xl font-bold">₹{userDetails.userProfile.balance.toFixed(2)}</p>
        </div>

        {/* Net Amount Card */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-3 text-white shadow-lg transform hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between mb-1">
            <TrendingUp className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-purple-100 text-xs font-medium mb-0.5">Net Amount</p>
          <p className="text-xl font-bold">₹{(userDetails.userProfile.credits + userDetails.userProfile.balance).toFixed(2)}</p>
        </div>
      </div>

      {/* Main Content - Redesigned */}
      <div className="space-y-4">
        {/* Edit Mode Indicator */}
        {isEditMode && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg p-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Edit mode enabled - Make changes and click Save</span>
          </div>
        )}

        {/* Personal Information Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Personal Information</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Basic user details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wide">Name</label>
              {isEditMode ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={isUpdating}
                />
              ) : (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-800 dark:text-white font-medium">
                  {userDetails.userInfo.name}
                </div>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wide">Mobile Number</label>
              {isEditMode ? (
                <input
                  type="text"
                  value={editedMobile}
                  onChange={(e) => setEditedMobile(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={isUpdating}
                />
              ) : (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-800 dark:text-white font-medium">
                  {user?.mobile || 'N/A'}
                </div>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wide">City</label>
              {isEditMode ? (
                <input
                  type="text"
                  value={editedCity}
                  onChange={(e) => setEditedCity(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  disabled={isUpdating}
                />
              ) : (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-800 dark:text-white font-medium">
                  {user?.city || 'N/A'}
                </div>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wide">Remarks</label>
              {isEditMode ? (
                <textarea
                  value={editedRemarks}
                  onChange={(e) => setEditedRemarks(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  rows={3}
                  disabled={isUpdating}
                />
              ) : (
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-800 dark:text-white font-medium">
                  {userDetails.userInfo.remarks || 'N/A'}
                </div>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium block mb-1">Username</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{userDetails.userProfile.username}</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium block mb-1">User ID</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">#{userDetails.userProfile.userId}</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium block mb-1">IP Address</span>
              <span className="text-sm font-bold font-mono text-slate-800 dark:text-white">{userDetails.userInfo.ipAddress || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Allowed Exchanges & Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Allowed Exchanges */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <Network className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Allowed Exchanges</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Trading access</p>
              </div>
            </div>

            {!isEditMode ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(editedAllowedExchanges)
                  .filter(([_, enabled]) => enabled)
                  .map(([key]) => {
                    const exchange = exchangeData.find(e => e.key === key);
                    return exchange ? (
                      <span key={key} className={`px-3 py-1.5 ${exchange.color} text-white text-xs font-bold rounded-full shadow-md`}>
                        {exchange.name}
                      </span>
                    ) : null;
                  })}
                {Object.entries(editedAllowedExchanges).filter(([_, enabled]) => enabled).length === 0 && (
                  <span className="text-xs text-slate-500 italic">No exchanges allowed</span>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {exchangeData
                  .filter(exchange => Object.keys(editedAllowedExchanges).length === 0 || editedAllowedExchanges.hasOwnProperty(exchange.key))
                  .map((exchange) => (
                  <label key={exchange.key} className="relative flex items-center p-3 bg-surface-secondary border-2 border-border-primary rounded-lg cursor-pointer hover:border-blue-500 transition-all"
                    style={{
                      borderColor: editedAllowedExchanges[exchange.key] ? '#3b82f6' : undefined,
                      backgroundColor: editedAllowedExchanges[exchange.key] ? 'rgba(59, 130, 246, 0.1)' : undefined
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={editedAllowedExchanges[exchange.key] || false}
                      onChange={(e) =>
                        setEditedAllowedExchanges({
                          ...editedAllowedExchanges,
                          [exchange.key]: e.target.checked
                        })
                      }
                      className="sr-only peer"
                      disabled={isUpdating}
                    />
                    <div className="flex items-center gap-2 w-full">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${editedAllowedExchanges[exchange.key] ? 'bg-blue-500 border-blue-500' : 'border-border-primary bg-surface-tertiary'}`}>
                        {editedAllowedExchanges[exchange.key] && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-text-primary">{exchange.name}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Activity & Account Info */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Activity & Account</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Timeline information</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-r-lg">
                <div>
                  <p className="text-xs text-orange-700 dark:text-orange-300 font-semibold">Account Created</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{formatDate(userDetails.userInfo.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start justify-between p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded-r-lg">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-300 font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Last Login
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{formatDate(userDetails.userInfo.lastLoginDate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Master Only Section - P&L, Brokerage, Exchanges & High Trade Limit */}
                {isMaster && (
          <div className="space-y-4">
            {/* Partnership Share Detail */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Partnership Share</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">P&L and brokerage settings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* P&L Sharing */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">P&L Sharing (%)</label>
                  {isEditMode ? (
                    <>
                      <input
                        type="number"
                        value={editedPnlSharing === 0 ? '' : editedPnlSharing}
                        onChange={(e) => setEditedPnlSharing(e.target.value === '' ? 0 : Number(e.target.value))}
                        min="0"
                        max="100"
                        placeholder="Enter P&L sharing"
                        className={`w-full h-12 px-4 py-3 bg-surface-secondary border-2 rounded-lg text-text-primary font-medium focus:ring-2 transition-all ${
                          editedPnlSharing > (parentUserConfig?.pnlSharing || 100)
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-border-primary focus:ring-purple-500 focus:border-purple-500'
                        }`}
                      />
                      {editedPnlSharing > (parentUserConfig?.pnlSharing || 100) && (
                        <div className="mt-1 text-xs text-red-400">Cannot exceed available P&L sharing of {(parentUserConfig?.pnlSharing || 100).toFixed(2)}</div>
                      )}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-surface-secondary rounded-lg p-3 border border-border-primary">
                          <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide font-semibold">Our</p>
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{(parentUserConfig?.pnlSharing || 100).toFixed(2)}</p>
                        </div>
                        <div className="bg-surface-secondary rounded-lg p-3 border border-border-primary">
                          <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide font-semibold">Remaining</p>
                          <p className={`text-lg font-bold ${editedPnlSharing > (parentUserConfig?.pnlSharing || 100) ? 'text-red-600 dark:text-red-400' : 'text-text-primary'}`}>{((parentUserConfig?.pnlSharing || 100) - editedPnlSharing).toFixed(2)}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-slate-800 dark:text-white font-bold text-lg border-2 border-purple-200 dark:border-purple-900/50">
                      {editedPnlSharing}%
                    </div>
                  )}
                </div>

                {/* Brokerage Sharing */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">BRK Sharing (%)</label>
                  {isEditMode ? (
                    <>
                      <input
                        type="number"
                        value={editedBrokerageSharing === 0 ? '' : editedBrokerageSharing}
                        onChange={(e) => setEditedBrokerageSharing(e.target.value === '' ? 0 : Number(e.target.value))}
                        min="0"
                        max="100"
                        placeholder="Enter brokerage sharing"
                        className={`w-full h-12 px-4 py-3 bg-surface-secondary border-2 rounded-lg text-text-primary font-medium focus:ring-2 transition-all ${
                          editedBrokerageSharing > (parentUserConfig?.brokeragePercentage || 100)
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : 'border-border-primary focus:ring-purple-500 focus:border-purple-500'
                        }`}
                      />
                      {editedBrokerageSharing > (parentUserConfig?.brokeragePercentage || 100) && (
                        <div className="mt-1 text-xs text-red-400">Cannot exceed available brokerage of {(parentUserConfig?.brokeragePercentage || 100).toFixed(2)}</div>
                      )}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-surface-secondary rounded-lg p-3 border border-border-primary">
                          <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide font-semibold">Our</p>
                          <p className="text-lg font-bold text-pink-600 dark:text-pink-400">{(parentUserConfig?.brokeragePercentage || 100).toFixed(2)}</p>
                        </div>
                        <div className="bg-surface-secondary rounded-lg p-3 border border-border-primary">
                          <p className="text-xs text-text-secondary mb-1 uppercase tracking-wide font-semibold">Remaining</p>
                          <p className={`text-lg font-bold ${editedBrokerageSharing > (parentUserConfig?.brokeragePercentage || 100) ? 'text-red-600 dark:text-red-400' : 'text-text-primary'}`}>{((parentUserConfig?.brokeragePercentage || 100) - editedBrokerageSharing).toFixed(2)}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg text-slate-800 dark:text-white font-bold text-lg border-2 border-pink-200 dark:border-pink-900/50">
                      {editedBrokerageSharing}%
                    </div>
                  )}
                </div>
              </div>

              {/* Add Master Checkbox - Only for Master users */}
              {isMaster && isEditMode && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editedAddMaster || false}
                      onChange={(e) => setEditedAddMaster(e.target.checked)}
                      className="w-5 h-5 text-brand-primary bg-surface-secondary border-2 border-border-primary rounded focus:ring-brand-primary focus:ring-2"
                    />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Allow Creating Master Accounts</p>
                      <p className="text-xs text-text-secondary">Enable this user to create master accounts</p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* High Trade Limit */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">High Trade Limit</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Set trading limits on exchanges</p>
                </div>
              </div>

              {!isEditMode ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(editedHighLowTradeLimit)
                    .filter(([_, enabled]) => enabled)
                    .map(([key]) => {
                      const exchange = exchangeData.find(e => e.key === key);
                      return exchange ? (
                        <span key={key} className={`px-3 py-1.5 ${exchange.color} text-white text-xs font-bold rounded-full shadow-md`}>
                          {exchange.name}
                        </span>
                      ) : null;
                    })}
                  {Object.entries(editedHighLowTradeLimit).filter(([_, enabled]) => enabled).length === 0 && (
                    <span className="text-xs text-slate-500 italic">No high trade limits applied</span>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {exchangeData
                    .filter(exchange => Object.keys(editedHighLowTradeLimit).length === 0 || editedHighLowTradeLimit.hasOwnProperty(exchange.key))
                    .map((exchange) => (
                    <label key={`high-${exchange.key}`} className="relative flex items-center p-3 bg-surface-secondary border-2 border-border-primary rounded-lg cursor-pointer hover:border-emerald-500 transition-all"
                      style={{
                        borderColor: editedHighLowTradeLimit[exchange.key] ? '#10b981' : undefined,
                        backgroundColor: editedHighLowTradeLimit[exchange.key] ? 'rgba(16, 185, 129, 0.1)' : undefined
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editedHighLowTradeLimit[exchange.key] || false}
                        onChange={(e) =>
                          setEditedHighLowTradeLimit({
                            ...editedHighLowTradeLimit,
                            [exchange.key]: e.target.checked
                          })
                        }
                        className="sr-only peer"
                        disabled={isUpdating}
                      />
                      <div className="flex items-center gap-2 w-full">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${editedHighLowTradeLimit[exchange.key] ? 'bg-emerald-500 border-emerald-500' : 'border-border-primary bg-surface-tertiary'}`}>
                          {editedHighLowTradeLimit[exchange.key] && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-text-primary">{exchange.name}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Client Only Section */}
        {isClient && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Auto Square Off</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Automatic position closing</p>
              </div>
            </div>
            {isEditMode ? (
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editedAutoSquareOff}
                  onChange={(e) => setEditedAutoSquareOff(e.target.checked)}
                  className="sr-only peer"
                  disabled={isUpdating}
                />
                <div className="relative w-12 h-7 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            ) : (
              <span className={`px-4 py-2 rounded-full text-xs font-bold ${editedAutoSquareOff ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                {editedAutoSquareOff ? 'Enabled' : 'Disabled'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetailsTab;
