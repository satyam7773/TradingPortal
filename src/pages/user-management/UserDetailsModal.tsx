import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { tabLoaders } from './user-details-tabs';
import UserDetailsTab from './UserDetailsTab';
import { createPortal } from 'react-dom';
import { User, Edit, X, Shield, Settings, Clock, MoreHorizontal, Lock, Share2 } from 'lucide-react';
import { userManagementService } from '../../services';
import toast from 'react-hot-toast';
import ChangePassword from './user-details-tabs/ChangePassword';
import SharingDetails from './user-details-tabs/SharingDetails';
import AddCredits from './user-details-tabs/AddCredits';

interface UserData {
  id: string;
  username: string;
  name: string;
  type: 'Client' | 'Master' | 'Admin';
  parent: string;
  credit: number;
  balance: number;
  sharing: number | null;
  parentCredits?: number;
  bet: boolean;
  closeOut: boolean;
  margin: boolean;
  status: boolean;
  creditLimit: boolean;
  creditBasedMargin: boolean;
  betEnabled: boolean;
  closeOutEnabled: boolean;
  marginEnabled: boolean;
  statusEnabled: boolean;
  creditLimitEnabled: boolean;
  creditBasedMarginEnabled: boolean;
  createdDate: string;
  ipAddress: string;
  deviceId: string;
  lastLogin: string;
}

interface UserDetailsModalProps {
  user: UserData | null;
  onClose: () => void;
  onToggle: (userId: string, field: 'bet' | 'closeOut' | 'margin' | 'status' | 'creditLimit' | 'creditBasedMargin') => void;
  depth?: number; // Track nesting depth for z-index
}

// API Response Types
interface UserProfile {
  userId: number;
  username: string;
  roleId: number;
  balance: number;
  credits: number;
}

interface UserInfo {
  username: string;
  name: string;
  remarks: string;
  createdAt: string;
  lastLoginDate: string;
  ipAddress: string | null;
  exchanges: string;
  allowedExchanges: Array<{
    name: string;
    turnover: boolean;
    lot: boolean;
    groupId: any;
  }>;
  highLowTradeLimit: string;
  changePasswordFirstLogin: boolean;
  brkSharing: number | null;
  pnlSharing: number | null;
}

interface ToggleSetting {
  toggle: string;
  value: boolean;
  toggleEnabled: boolean;
}

interface UserSettings {
  userInfo: ToggleSetting[];
  menus: Array<{
    menuIcon: string | null;
    name: string;
    ctaText: string;
  }>;
}

interface ChildUser {
  userId: number;
  name: string;
  username: string;
  roleId: number;
  parentId: number;
  balance: number;
  credits: number;
  isBlocked: boolean;
  brkSharing: number | null;
  parentCredits?: number;
  addMaster: boolean;
  createdAt: number | null;
  ipAddress: string | null;
  deviceId: string | null;
  lastLoginDate: number | null;
  city: string | null;
  userSettingsToggles: ToggleSetting[];
  parentName: string;
  parentUsername: string;
}

interface UserDetailsResponse {
  userProfile: UserProfile;
  userInfo: UserInfo;
  userSettings: UserSettings;
  userList: ChildUser[];
}

const ToggleSwitch = ({ enabled, onClick, size = 'sm', disabled = false }: { enabled: boolean; onClick: () => void; size?: 'xs' | 'sm'; disabled?: boolean }) => {
  const sizeClasses = size === 'xs' ? 'w-8 h-5' : 'w-10 h-6';
  const dotClasses = size === 'xs' ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <div 
      onClick={disabled ? undefined : onClick}
      className={`${sizeClasses} ${
        disabled
          ? 'bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 opacity-50 cursor-not-allowed'
          : enabled 
          ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25 cursor-pointer hover:scale-105' 
          : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 cursor-pointer hover:scale-105'
      } rounded-full flex items-center transition-all duration-300`}
    >
      <div 
        className={`${dotClasses} bg-white rounded-full transform transition-all duration-300 ml-0.5 shadow-md ${
          enabled ? 'translate-x-3.5' : 'translate-x-0'
        }`}
      ></div>
    </div>
  );
};

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, onClose, onToggle, depth = 0 }) => {
  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // activeTab is a string so we can use dynamic menu names as top-level tabs
  const [activeTab, setActiveTab] = useState<string>('details');
  const [selectedChildUser, setSelectedChildUser] = useState<UserData | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [actionMenuUserId, setActionMenuUserId] = useState<string | null>(null);
  const [selectedUserForPasswordChange, setSelectedUserForPasswordChange] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForSharingDetails, setSelectedUserForSharingDetails] = useState<any>(null);
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [selectedUserForAddCredits, setSelectedUserForAddCredits] = useState<any>(null);
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const [creditTransType, setCreditTransType] = useState<'Credit' | 'Debit'>('Credit');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);
  const [creditError, setCreditError] = useState('');
  const actionMenuRef = React.useRef<HTMLDivElement>(null);
  const actionMenuButtonRefs = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});
  // removed activeMenuName; we use activeTab for dynamic menu tabs

  // Convert menu `name` (camelCase or snake_case) to PascalCase component name
  const toPascalCase = (s: string) => {
    if (!s) return '';
    return s
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
      .replace(/(^\w)/, (m) => m.toUpperCase());
  };

  // Lazy-load the active menu component (if available under user-details-tabs)
  const LazyMenuComponent = React.useMemo(() => {
    if (!userDetails) return null;
    const menu = userDetails.userSettings?.menus?.find((m) => m.name === activeTab);
    if (!menu) return null;
    const compName = toPascalCase(menu.name);
    const loader = tabLoaders[compName]
    if (!loader) return null
    return React.lazy(loader)
  }, [userDetails, activeTab]);

  // Map setting toggle name to API type values
  const mapSettingKeyToType = (toggleName: string): string => {
    const keyMap: Record<string, string> = {
      'status': 'status',
      'closeOnly': 'closeOnly',
      'bet': 'bet',
      'freshStopLoss': 'freshStopLoss',
      'marginSquareOff': 'marginSquareOff',
    };
    return keyMap[toggleName] || toggleName;
  };

  // Handle toggle settings API call
  const handleToggleSetting = useCallback(async (toggleName: string, currentValue: boolean) => {
    if (!userDetails) return;

    try {
      const settingType = mapSettingKeyToType(toggleName);
      const targetUserId = userDetails.userProfile.userId;
      const newValue = !currentValue;

      // Get logged-in user ID from localStorage
      const userDataStr = localStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const loggedInUserId = userData?.userId || 2;

      console.log(`🔄 Toggling ${settingType} for user ${targetUserId}:`, { oldValue: currentValue, newValue });

      const response = await userManagementService.toggleUserSettings({
        userId: loggedInUserId,
        requestTimestamp: Date.now().toString(),
        data: {
          userId: targetUserId,
          type: settingType,
          value: newValue,
        },
      });

      console.log('📦 Toggle Settings Response:', response);

      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        const successMsg = response?.responseMessage || `${toggleName} updated successfully`;
        toast.success(successMsg);
        // Update local state
        if (userDetails.userSettings.userInfo) {
          setUserDetails({
            ...userDetails,
            userSettings: {
              ...userDetails.userSettings,
              userInfo: userDetails.userSettings.userInfo.map(setting =>
                setting.toggle === toggleName
                  ? { ...setting, value: newValue }
                  : setting
              ),
            },
          });
        }
        console.log('✅ Setting toggled successfully');
      } else {
        const errorMsg = response?.responseMessage || 'Failed to update setting';
        toast.error(errorMsg);
        console.error('❌ API Error:', errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.responseMessage || error.message || 'Failed to update setting';
      console.error('❌ Error toggling setting:', error);
      toast.error(errorMsg);
    }
  }, [userDetails]);

  // Handle child user toggle with API call
  const handleChildUserToggle = useCallback(async (childUserId: string, field: 'bet' | 'closeOut' | 'margin' | 'status' | 'creditLimit' | 'creditBasedMargin') => {
    try {
      const fieldToApiType: Record<string, string> = {
        'bet': 'bet',
        'closeOut': 'closeOnly',
        'margin': 'marginSquareOff',
        'status': 'status',
        'creditLimit': 'creditLimit',
        'creditBasedMargin': 'creditBasedMargin'
      };

      const apiType = fieldToApiType[field];
      const childUser = userDetails?.userList?.find((u) => u.userId.toString() === childUserId);
      if (!childUser) return;

      // Map field to toggle name
      const fieldToToggleName: Record<string, string> = {
        'bet': 'bet',
        'closeOut': 'closeOnly',
        'margin': 'marginSquareOff',
        'status': 'status',
        'creditLimit': 'creditLimit',
        'creditBasedMargin': 'creditBasedMargin'
      };

      const toggleName = fieldToToggleName[field];
      const toggleSetting = childUser.userSettingsToggles?.find(t => t.toggle === toggleName);
      const currentValue = field === 'creditLimit' ? !childUser.isBlocked : (toggleSetting?.value ?? false);
      const newValue = !currentValue;

      const userDataStr = localStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const loggedInUserId = userData?.userId || 2;

      console.log(`🔄 Toggling child user ${field}:`, { oldValue: currentValue, newValue });

      const response = await userManagementService.toggleUserSettings({
        userId: loggedInUserId,
        requestTimestamp: Date.now().toString(),
        data: {
          userId: Number(childUserId),
          type: apiType,
          value: newValue,
        },
      });

      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        toast.success(response?.responseMessage || 'Setting updated successfully');
        
        // Update local state
        if (userDetails) {
          setUserDetails({
            ...userDetails,
            userList: userDetails.userList.map((u) =>
              u.userId.toString() === childUserId
                ? {
                    ...u,
                    isBlocked: field === 'creditLimit' ? !newValue : u.isBlocked,
                    userSettingsToggles: u.userSettingsToggles?.map(toggle =>
                      toggle.toggle === toggleName
                        ? { ...toggle, value: newValue }
                        : toggle
                    ) || []
                  }
                : u
            ),
          });
        }
        console.log('✅ Child user setting toggled successfully');
      } else {
        toast.error(response?.responseMessage || 'Failed to update setting');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.responseMessage || error.message || 'Failed to update setting';
      console.error('❌ Error:', error);
      toast.error(errorMsg);
    }
  }, [userDetails]);

  // Cleanup nested modal when parent closes
  useEffect(() => {
    return () => {
      setSelectedChildUser(null);
    };
  }, []);

  // Fetch user details from API - extract to stable callback so child tabs can request refresh
  const fetchUserDetails = useCallback(async (targetUser?: UserData) => {
    if (!user && !targetUser) return;
    const u = targetUser || user!
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching user details for userId:', u.id);
      const response = await userManagementService.fetchUserDetails(parseInt(u.id));
      console.log('📦 User Details Response:', response);

      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        setUserDetails(response.data);
        console.log('✅ User details loaded successfully');
      } else {
        const errorMsg = response?.responseMessage || 'Failed to fetch user details';
        setError(errorMsg);
        console.error('❌ API Error:', errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.responseMessage || err.message || 'Failed to fetch user details';
      setError(errorMsg);
      console.error('❌ Error fetching user details:', err);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  // Close action menu when clicking outside (for clicks outside the modal)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOutsideMenu = actionMenuRef.current && !actionMenuRef.current.contains(target);
      const clickedOutsideButton = actionMenuUserId && 
        actionMenuButtonRefs.current[actionMenuUserId] && 
        !actionMenuButtonRefs.current[actionMenuUserId]?.contains(target);
      
      if (clickedOutsideMenu && clickedOutsideButton) {
        setActionMenuPosition(null);
        setActionMenuUserId(null);
      }
    };
    
    if (actionMenuPosition) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [actionMenuPosition, actionMenuUserId]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddCreditsModal) {
          setShowAddCreditsModal(false);
          setSelectedUserForAddCredits(null);
        } else if (showSharingModal) {
          setShowSharingModal(false);
          setSelectedUserForSharingDetails(null);
        } else if (showPasswordModal) {
          setShowPasswordModal(false);
          setSelectedUserForPasswordChange(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showAddCreditsModal, showSharingModal, showPasswordModal, onClose]);

  if (!user) return null;

  // Helper function to map roleId to user type
  const getRoleType = (roleId: number): 'Client' | 'Master' | 'Admin' => {
    switch (roleId) {
      case 1: return 'Admin';
      case 2: return 'Admin';
      case 3: return 'Master';
      case 4: return 'Client';
      default: return 'Client';
    }
  };

  // Transform child user from API to UserData format
  const transformChildUser = (apiUser: ChildUser): UserData => {
    // Extract toggle values from userSettingsToggles array
    const getToggleValue = (toggleName: string): boolean => {
      const toggle = apiUser.userSettingsToggles?.find(t => t.toggle === toggleName);
      return toggle?.value ?? false;
    };

    // Extract toggleEnabled values
    const getToggleEnabled = (toggleName: string): boolean => {
      const toggle = apiUser.userSettingsToggles?.find(t => t.toggle === toggleName);
      return toggle?.toggleEnabled ?? false;
    };

    // Format dates
    const formatDate = (timestamp: number | null): string => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleString();
    };

    return {
      id: apiUser.userId.toString(),
      username: apiUser.username,
      name: apiUser.name,
      type: getRoleType(apiUser.roleId),
      parent: apiUser.parentUsername || `Parent-${apiUser.parentId}`,
      credit: apiUser.credits,
      balance: apiUser.balance,
      sharing: apiUser.brkSharing,
      parentCredits: apiUser.parentCredits,
      bet: getToggleValue('bet'),
      closeOut: getToggleValue('closeOnly'),
      margin: getToggleValue('marginSquareOff'),
      status: getToggleValue('status'),
      creditLimit: !apiUser.isBlocked,
      creditBasedMargin: getToggleValue('creditBasedMargin'),
      betEnabled: getToggleEnabled('bet'),
      closeOutEnabled: getToggleEnabled('closeOnly'),
      marginEnabled: getToggleEnabled('marginSquareOff'),
      statusEnabled: getToggleEnabled('status'),
      creditLimitEnabled: true,
      creditBasedMarginEnabled: getToggleEnabled('creditBasedMargin'),
      createdDate: formatDate(apiUser.createdAt),
      ipAddress: apiUser.ipAddress || 'N/A',
      deviceId: apiUser.deviceId || 'N/A',
      lastLogin: formatDate(apiUser.lastLoginDate)
    };
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Master': return 'bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md';
      case 'Client': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md';
      case 'Admin': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md';
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-emerald-500 font-bold text-lg';
    if (balance < 0) return 'text-red-500 font-bold text-lg';
    return 'text-gray-500 font-semibold';
  };
  

  const mainModal = createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md animate-fadeIn" 
      style={{ zIndex: 10000 + depth * 1000 }} 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200/50 dark:border-slate-700/50 overflow-hidden transform transition-all duration-300 animate-slideUp"
        style={{ width: '98vw', height: '96vh', maxWidth: '1800px' }}
      >
        {/* Modal Header - Compact */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user.username}</h2>
              <p className="text-blue-100 text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                User Profile Details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 backdrop-blur-xl border border-white/30 hover:rotate-90 transform group"
          >
            <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Tabs */}
        {userDetails && (
          <div className="tabs-scrollbar flex gap-2 px-6 pt-3 bg-white/80 dark:bg-slate-800/90 border-b border-gray-200/50 dark:border-slate-700/50 overflow-x-auto flex-nowrap">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'details'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              User Details
            </button>
            <button
              onClick={() => setActiveTab('userList')}
              className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'userList'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <User className="w-4 h-4" />
              User List ({userDetails.userList.length})
            </button>
            <button
              onClick={() => setActiveTab('positions')}
              className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'positions'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              Positions
            </button>
            <button
              onClick={() => setActiveTab('trades')}
              className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'trades'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              Trades
            </button>
            <button
              onClick={() => setActiveTab('deletedTrades')}
              className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'deletedTrades'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              Deleted Trades
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              Settings
            </button>
            {/* Dynamic menu tabs (promote quick actions to top-level tabs) */}
            {userDetails.userSettings?.menus?.map((menu) => (
              <button
                key={menu.name}
                onClick={() => setActiveTab(menu.name)}
                className={`px-4 py-2 rounded-t-lg font-semibold text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === menu.name
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {menu.ctaText}
              </button>
            ))}
          </div>
        )}

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          {(() => {
            if (loading) {
              return (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-purple-200 dark:border-purple-900 border-b-purple-600 dark:border-b-purple-400 rounded-full animate-spin animation-delay-150"></div>
                  </div>
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Loading...</p>
                </div>
              );
            }

            if (error) {
              return (
                <div className="flex flex-col items-center justify-center h-full gap-4 animate-fadeIn">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-2xl flex items-center justify-center shadow-lg border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400 mb-1">Error Loading Data</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-semibold shadow-lg text-sm"
                  >
                    Close
                  </button>
                </div>
              );
            }

            if (!userDetails) return null;

            return (
              <>
                {/* User Details Tab */}
                {activeTab === 'details' && (
                  <UserDetailsTab user={user} userDetails={userDetails} getTypeColor={getTypeColor} />
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="animate-fadeIn">
                    <div className="lg:col-span-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-3 border border-gray-200/50 dark:border-slate-700/50 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                          <Settings className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Settings & Permissions</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        {userDetails.userSettings.userInfo.map((setting) => (
                          <div key={setting.toggle} className={`flex justify-between items-center bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-700/50 dark:to-slate-600/50 p-2 rounded-lg border border-gray-200/50 dark:border-slate-600/50 transition-all duration-200 ${
                            setting.toggleEnabled ? 'hover:border-indigo-300 dark:hover:border-indigo-500' : 'opacity-60'
                          }`}>
                            <span className={`font-semibold text-xs capitalize ${
                              setting.toggleEnabled ? 'text-slate-700 dark:text-slate-300' : 'text-gray-400 dark:text-gray-500'
                            }`}>{setting.toggle}</span>
                            <ToggleSwitch 
                              enabled={setting.value} 
                              size="xs"
                              disabled={!setting.toggleEnabled}
                              onClick={() => handleToggleSetting(setting.toggle, setting.value)}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Quick Actions were promoted to top-level tabs (menu names). */}
                    </div>
                  </div>
                )}

                {/* Dynamic Menu Tab (each menu from userSettings.menus becomes a top-level tab) */}
                {userDetails.userSettings?.menus?.some((m) => m.name === activeTab) && (
                  <div className="animate-fadeIn">
                    <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-lg border border-gray-200 dark:border-slate-700">
                      {LazyMenuComponent ? (
                        <Suspense fallback={<div className="py-8 text-center">Loading...</div>}>
                          {/* @ts-ignore - dynamic lazy component */}
                          <LazyMenuComponent user={user} userDetails={userDetails} onClose={onClose} onToggle={onToggle} onRefresh={fetchUserDetails} />
                        </Suspense>
                      ) : (
                        <div className="text-sm text-gray-600">No component available for this menu.</div>
                      )}
                    </div>
                  </div>
                )}

                {/* User List Tab */}
                {activeTab === 'userList' && userDetails.userList && userDetails.userList.length > 0 && (
                  <div className="animate-fadeIn">
                    <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden h-full flex flex-col">
                      <div className="overflow-x-auto overflow-y-auto flex-1">
                        <table className="min-w-[1500px] w-full table-fixed">
                          <colgroup>
                            <col style={{width: '60px'}} />
                            <col style={{width: '140px'}} />
                            <col style={{width: '140px'}} />
                            <col style={{width: '90px'}} />
                            <col style={{width: '100px'}} />
                            <col style={{width: '90px'}} />
                            <col style={{width: '100px'}} />
                            <col style={{width: '90px'}} />
                            <col style={{width: '60px'}} />
                            <col style={{width: '70px'}} />
                            <col style={{width: '70px'}} />
                            <col style={{width: '70px'}} />
                            <col style={{width: '70px'}} />
                            <col style={{width: '150px'}} />
                            <col style={{width: '140px'}} />
                            <col style={{width: '160px'}} />
                            <col style={{width: '150px'}} />
                          </colgroup>
                          <thead>
                            <tr className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 border-b border-gray-200/50 dark:border-slate-600/50">
                              <th className="text-center px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">⋯</th>
                              <th className="text-left px-4 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Username</th>
                              <th className="text-left px-4 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Name</th>
                              <th className="text-center px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Type</th>
                              <th className="text-left px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Parent</th>
                              <th className="text-right px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Credit</th>
                              <th className="text-right px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Balance</th>
                              <th className="text-right px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Share%</th>
                              <th className="text-center px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Bet</th>
                              <th className="text-center px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Close</th>
                              <th className="text-center px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Margin</th>
                              <th className="text-center px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Status</th>
                              <th className="text-center px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">C.Margin</th>
                              <th className="text-left px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Created</th>
                              <th className="text-left px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">IP Address</th>
                              <th className="text-left px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Device ID</th>
                              <th className="text-left px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Last Login</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
                            {userDetails.userList.map((childUser) => {
                              const transformedUser = transformChildUser(childUser);
                              return (
                                <tr 
                                  key={childUser.userId}
                                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200 h-12"
                                >
                                  {/* Action Buttons - FIRST COLUMN */}
                                  <td className="px-2 py-2 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200"
                                        onClick={() => setSelectedChildUser(transformedUser)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      
                                      <div className="relative">
                                        <button 
                                          ref={(el) => {
                                            if (transformedUser.id) {
                                              actionMenuButtonRefs.current[transformedUser.id] = el;
                                            }
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                            if (actionMenuUserId === transformedUser.id) {
                                              setActionMenuPosition(null);
                                              setActionMenuUserId(null);
                                            } else {
                                              setActionMenuUserId(transformedUser.id);
                                              setActionMenuPosition({ x: rect.right, y: rect.bottom });
                                            }
                                          }}
                                          className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200"
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Username - Clickable */}
                                  <td className="px-4 py-2">
                                    <div 
                                      className="flex items-center gap-2 cursor-pointer"
                                      onClick={() => setSelectedChildUser(transformedUser)}
                                    >
                                      <span className="font-semibold text-slate-800 dark:text-white text-sm truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{childUser.username}</span>
                                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${transformedUser.status ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                                    </div>
                                  </td>

                                  {/* Name */}
                                  <td className="px-4 py-2">
                                    <span className="text-slate-700 dark:text-slate-300 text-sm truncate">{childUser.name}</span>
                                  </td>

                                  {/* Type */}
                                  <td className="px-2 py-2 text-center">
                                    <span className={`${getTypeColor(transformedUser.type)} text-xs px-2 py-1 inline-block`}>
                                      {transformedUser.type}
                                    </span>
                                  </td>

                                  {/* Parent */}
                                  <td className="px-2 py-2">
                                    <span className="text-slate-500 dark:text-slate-400 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-center block truncate">
                                      {transformedUser.parent}
                                    </span>
                                  </td>

                                  {/* Credit */}
                                  <td className="px-2 py-2 text-right">
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedUserForAddCredits(childUser);
                                        setShowAddCreditsModal(true);
                                        setCreditTransType('Credit');
                                        setCreditAmount('');
                                        setCreditNote('');
                                        setCreditError('');
                                      }}
                                      className="font-semibold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                                    >
                                      {childUser.credits != null ? childUser.credits.toLocaleString() : '-'}
                                    </span>
                                  </td>

                                  {/* Balance */}
                                  <td className="px-2 py-2 text-right">
                                    <span className={`${getBalanceColor(childUser.balance || 0)} text-sm font-semibold`}>
                                      {(childUser.balance || 0).toFixed(2)}
                                    </span>
                                  </td>

                                  {/* Sharing */}
                                  <td className="px-2 py-2 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">
                                        {childUser.brkSharing !== null ? childUser.brkSharing.toFixed(1) : '0.0'}%
                                      </span>
                                      <div className="w-8 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                                          style={{ width: `${childUser.brkSharing || 0}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Bet Toggle */}
                                  <td className="px-2 py-2 text-center">
                                    <ToggleSwitch enabled={transformedUser.bet} onClick={() => handleChildUserToggle(transformedUser.id, 'bet')} size="xs" disabled={!transformedUser.betEnabled} />
                                  </td>

                                  {/* Close Out Toggle */}
                                  <td className="px-2 py-2 text-center">
                                    <ToggleSwitch enabled={transformedUser.closeOut} onClick={() => handleChildUserToggle(transformedUser.id, 'closeOut')} size="xs" disabled={!transformedUser.closeOutEnabled} />
                                  </td>

                                  {/* Margin Toggle */}
                                  <td className="px-2 py-2 text-center">
                                    <ToggleSwitch enabled={transformedUser.margin} onClick={() => handleChildUserToggle(transformedUser.id, 'margin')} size="xs" disabled={!transformedUser.marginEnabled} />
                                  </td>

                                  {/* Status Toggle */}
                                  <td className="px-2 py-2 text-center">
                                    <ToggleSwitch enabled={transformedUser.status} onClick={() => handleChildUserToggle(transformedUser.id, 'status')} size="xs" disabled={!transformedUser.statusEnabled} />
                                  </td>

                                  {/* Credit Based Margin Toggle */}
                                  <td className="px-2 py-2 text-center">
                                    <ToggleSwitch enabled={transformedUser.creditBasedMargin} onClick={() => handleChildUserToggle(transformedUser.id, 'creditBasedMargin')} size="xs" disabled={!transformedUser.creditBasedMarginEnabled} />
                                  </td>

                                  {/* Created Date */}
                                  <td className="px-2 py-2">
                                    <span className="text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">
                                      {transformedUser.createdDate || 'N/A'}
                                    </span>
                                  </td>

                                  {/* IP Address */}
                                  <td className="px-2 py-2">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-center">
                                      <span className="text-blue-700 dark:text-blue-300 text-xs font-mono block truncate">{transformedUser.ipAddress || 'N/A'}</span>
                                    </div>
                                  </td>

                                  {/* Device ID */}
                                  <td className="px-2 py-2">
                                    <div className="bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded text-center">
                                      <span className="text-purple-700 dark:text-purple-300 text-xs font-mono block truncate" title={transformedUser.deviceId || 'N/A'}>
                                        {transformedUser.deviceId && transformedUser.deviceId !== 'N/A' && transformedUser.deviceId.length > 15 
                                          ? `${transformedUser.deviceId.substring(0, 15)}...` 
                                          : transformedUser.deviceId || 'N/A'}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Last Login */}
                                  <td className="px-2 py-2">
                                    <span className="text-emerald-700 dark:text-emerald-300 text-xs whitespace-nowrap">
                                      {transformedUser.lastLogin || 'N/A'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Positions Tab */}
                {activeTab === 'positions' && (
                  <div className="animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <p className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">Positions</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Coming soon...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trades Tab */}
                {activeTab === 'trades' && (
                  <div className="animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <p className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">Trades</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Coming soon...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deleted Trades Tab */}
                {activeTab === 'deletedTrades' && (
                  <div className="animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <p className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">Deleted Trades</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Coming soon...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>,
    document.body
  );

  // Action Menu Portal
  const actionMenuPortal = actionMenuPosition && actionMenuUserId && createPortal(
    <div 
      ref={actionMenuRef}
      className="fixed w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-2xl overflow-hidden"
      style={{
        left: `100px`,
        top: `${actionMenuPosition.y + 8}px`,
        zIndex: 10000 + depth * 1000 + 50
      }}
    >
      <button 
        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
        onClick={() => {
          const user = userDetails?.userList?.find((u: any) => u.userId.toString() === actionMenuUserId);
          if (user) {
            setSelectedUserForPasswordChange(user);
            setShowPasswordModal(true);
            setActionMenuPosition(null);
            setActionMenuUserId(null);
          }
        }}
      >
        <span>📝</span> Change Password
      </button>
      <button 
        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-slate-700"
        onClick={() => {
          const user = userDetails?.userList?.find((u: any) => u.userId.toString() === actionMenuUserId);
          if (user) {
            setSelectedUserForSharingDetails(user);
            setShowSharingModal(true);
            setActionMenuPosition(null);
            setActionMenuUserId(null);
          }
        }}
      >
        <span>📊</span> Share Details
      </button>
      <button 
        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-slate-700"
        onClick={() => {
          const apiUser = userDetails?.userList?.find((u: any) => u.userId.toString() === actionMenuUserId);
          if (apiUser) {
            const user = transformChildUser(apiUser);
            setSelectedUserForAddCredits(user);
            setShowAddCreditsModal(true);
            // Clear all form values when opening modal
            setCreditTransType('Credit');
            setCreditAmount('');
            setCreditNote('');
            setCreditError('');
            setActionMenuPosition(null);
            setActionMenuUserId(null);
          }
        }}
      >
        <span>💰</span> Add Credit
      </button>
      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-slate-700">
        <span>💰</span> Account Limit
      </button>
      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-slate-700">
        <span>👤</span> Create User
      </button>
      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-slate-700">
        <span>📈</span> Carry Forward Margin
      </button>
      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-slate-700">
        <span>📊</span> Exchangewise Interest %
      </button>
    </div>,
    document.body
  );

  // Change Password Modal Portal
  const changePasswordModal = showPasswordModal && selectedUserForPasswordChange && createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center" 
      style={{ zIndex: 10000 + depth * 1000 + 100 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setShowPasswordModal(false);
          setSelectedUserForPasswordChange(null);
        }
      }}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">Change Password</h2>
          <button 
            onClick={() => {
              setShowPasswordModal(false);
              setSelectedUserForPasswordChange(null);
            }}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <ChangePassword 
            user={selectedUserForPasswordChange}
            userDetails={userDetails}
            onRefresh={async () => {
              const userDataStr = localStorage.getItem('userData');
              const userData = userDataStr ? JSON.parse(userDataStr) : null;
              const currentUserId = userData?.userId || 2;
              if (userDetails?.userProfile?.userId && user) {
                await fetchUserDetails(user);
              }
              setShowPasswordModal(false);
              setSelectedUserForPasswordChange(null);
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );

  // Sharing Details Modal Portal
  const sharingDetailsModal = showSharingModal && selectedUserForSharingDetails && createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center" 
      style={{ zIndex: 10000 + depth * 1000 + 100 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setShowSharingModal(false);
          setSelectedUserForSharingDetails(null);
        }
      }}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">Sharing Details</h2>
          <button 
            onClick={() => {
              setShowSharingModal(false);
              setSelectedUserForSharingDetails(null);
            }}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <SharingDetails 
            user={selectedUserForSharingDetails}
            userDetails={userDetails}
            onRefresh={async () => {
              const userDataStr = localStorage.getItem('userData');
              const userData = userDataStr ? JSON.parse(userDataStr) : null;
              const currentUserId = userData?.userId || 2;
              if (userDetails?.userProfile?.userId && user) {
                await fetchUserDetails(user);
              }
              setShowSharingModal(false);
              setSelectedUserForSharingDetails(null);
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );

  // Add Credits Modal Portal
  const addCreditsModal = showAddCreditsModal && selectedUserForAddCredits && createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md animate-fadeIn" 
      style={{ zIndex: 10000 + depth * 1000 + 100 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setShowAddCreditsModal(false);
        }
      }}
    >
      <div 
        className="bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/50 dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-900 rounded-2xl shadow-2xl flex flex-col border border-gray-200/50 dark:border-slate-700/50 overflow-hidden transform transition-all duration-300 animate-slideUp"
        style={{ width: '90vw', height: 'auto', maxWidth: '550px', maxHeight: '85vh' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-lg">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Credit/Debit Entry</h2>
              <p className="text-emerald-100 text-xs">
                {selectedUserForAddCredits.username}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddCreditsModal(false)}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 backdrop-blur-xl border border-white/30 hover:rotate-90 transform group"
          >
            <X className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          <div className="space-y-5">
            {/* Credit/Debit Radio Buttons */}
            <div className="flex items-center justify-center gap-6 bg-white/80 dark:bg-slate-700/50 p-3 rounded-xl">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  checked={creditTransType === 'Credit'}
                  onChange={() => setCreditTransType('Credit')}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Credit (Add Fund)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  checked={creditTransType === 'Debit'}
                  onChange={() => setCreditTransType('Debit')}
                  className="w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Debit (Withdrawal)</span>
              </label>
            </div>
            
            {/* Amount Input */}
            <div className="bg-white/80 dark:bg-slate-700/50 p-4 rounded-xl">
              <label className="block text-center text-sm font-bold mb-3 text-gray-700 dark:text-gray-200">Amount</label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => {
                  setCreditAmount(e.target.value);
                  setCreditError('');
                }}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-b-2 border-emerald-500 dark:border-emerald-400 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-300 text-center text-xl font-semibold text-gray-900 dark:text-white rounded-t-lg transition-colors"
                placeholder="0.00"
              />
              <label className="block text-center text-xs text-gray-500 dark:text-gray-400 mt-3 mb-2">Add note</label>
              <textarea
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                placeholder="Optional note..."
              />
              {!creditAmount && (
                <p className="text-center text-red-500 dark:text-red-400 text-xs mt-2 font-medium">Please enter Amount</p>
              )}
            </div>
            
            {/* User Info */}
            <div className="bg-white/80 dark:bg-slate-700/50 p-4 rounded-xl space-y-4">
              <div>
                <p className="text-xs font-bold mb-2 text-gray-600 dark:text-gray-300 text-center">User</p>
                <p className="text-center text-base font-bold mb-3 text-gray-900 dark:text-white">{selectedUserForAddCredits?.username}</p>
                <div className="flex justify-around items-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Current</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{(selectedUserForAddCredits?.credit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">New</p>
                    <p className={`text-base font-bold ${(
                      creditTransType === 'Credit' 
                        ? (selectedUserForAddCredits?.credit || 0) + (Number(creditAmount) || 0)
                        : (selectedUserForAddCredits?.credit || 0) - (Number(creditAmount) || 0)
                    ) < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {(
                        creditTransType === 'Credit' 
                          ? (selectedUserForAddCredits?.credit || 0) + (Number(creditAmount) || 0)
                          : (selectedUserForAddCredits?.credit || 0) - (Number(creditAmount) || 0)
                      ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Parent User Info */}
              <div className="border-t border-gray-200 dark:border-slate-600 pt-3">
                <p className="text-xs font-bold mb-2 text-gray-600 dark:text-gray-300 text-center">Parent User</p>
                <p className="text-center text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">{selectedUserForAddCredits?.parent}</p>
                <div className="flex justify-around items-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Current</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{(selectedUserForAddCredits?.parentCredits || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">New</p>
                    <p className={`text-sm font-bold ${(
                      creditTransType === 'Credit' 
                        ? (selectedUserForAddCredits?.parentCredits || 0) - (Number(creditAmount) || 0)
                        : (selectedUserForAddCredits?.parentCredits || 0) + (Number(creditAmount) || 0)
                    ) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {(
                        creditTransType === 'Credit' 
                          ? (selectedUserForAddCredits?.parentCredits || 0) - (Number(creditAmount) || 0)
                          : (selectedUserForAddCredits?.parentCredits || 0) + (Number(creditAmount) || 0)
                      ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <button
              onClick={async () => {
                const enteredAmount = Number(creditAmount);
                if (!creditAmount || enteredAmount <= 0) {
                  setCreditError('Please enter Amount');
                  return;
                }
                
                setIsSubmittingCredit(true);
                setCreditError('');
                try {
                  const payload = {
                    amount: enteredAmount,
                    userId: Number(selectedUserForAddCredits.id),
                    comments: creditNote || '',
                    type: creditTransType === 'Credit' ? 'CREDIT' as const : 'DEBIT' as const
                  };
                  const operatorUserId = userDetails?.userProfile?.userId;
                  const res = await userManagementService.manageCredits(payload, operatorUserId);
                  const code = String(res?.responseCode ?? res?.data?.responseCode ?? '');
                  const message = res?.responseMessage ?? res?.data?.responseMessage ?? 'Operation completed';
                  
                  if (code === '0' || code === '1000') {
                    // Update the selected user's credit immediately
                    const newCreditValue = creditTransType === 'Credit' 
                      ? (selectedUserForAddCredits?.credit || 0) + enteredAmount
                      : (selectedUserForAddCredits?.credit || 0) - enteredAmount;
                    
                    setSelectedUserForAddCredits({
                      ...selectedUserForAddCredits,
                      credit: newCreditValue
                    });
                    
                    // Update child user list in userDetails
                    if (userDetails) {
                      setUserDetails({
                        ...userDetails,
                        userList: userDetails.userList.map((u: any) =>
                          u.userId.toString() === selectedUserForAddCredits.id
                            ? { ...u, credits: newCreditValue }
                            : u
                        ),
                      });
                    }
                    
                    toast.success(message);
                    
                    // Refetch user details to get latest data
                    if (user) {
                      await fetchUserDetails(user);
                    }
                    
                    // Clear form and close modal
                    setCreditAmount('');
                    setCreditNote('');
                    setCreditTransType('Credit');
                    setCreditError('');
                    setShowAddCreditsModal(false);
                  } else {
                    setCreditError(message);
                    toast.error(message);
                  }
                } catch (err: any) {
                  const errorMsg = err?.response?.data?.responseMessage || 'Failed to process request';
                  setCreditError(errorMsg);
                  toast.error(errorMsg);
                } finally {
                  setIsSubmittingCredit(false);
                }
              }}
              disabled={!creditAmount || Number(creditAmount) <= 0 || isSubmittingCredit}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transition-all transform hover:scale-[1.02]"
            >
              {isSubmittingCredit ? 'Submitting...' : 'Submit'}
            </button>
            
            {/* Error Message */}
            {creditError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 -mt-2">
                <p className="text-red-600 dark:text-red-400 text-sm font-medium text-center">{creditError}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  // Render nested modal for child user recursively
  return (
    <>
      {mainModal}
      {actionMenuPortal}
      {changePasswordModal}
      {sharingDetailsModal}
      {addCreditsModal}
      {selectedChildUser && (
        <UserDetailsModal 
          user={selectedChildUser}
          onClose={() => setSelectedChildUser(null)}
          onToggle={onToggle}
          depth={depth + 1}
        />
      )}
    </>
  );
};

export default UserDetailsModal;
