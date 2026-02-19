import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, User, MoreHorizontal, Settings, Edit, X } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAppSelector } from '../../hooks/reduxHooks';
import { useTabs } from '../../hooks/useTabs';
import { userManagementService } from '../../services';
import toast from 'react-hot-toast';
import UserDetailsModal from './UserDetailsModal';
import ChangePassword from './user-details-tabs/ChangePassword';
import SharingDetails from './user-details-tabs/SharingDetails';
import AddCredits from './user-details-tabs/AddCredits';
import { navigateWithScrollToTop } from '../../utils/navigation';

interface UserData {
  id: string;
  username: string;
  name: string;
  type: 'Client' | 'Master' | 'Admin';
  parent: string;
  parentName: string;
  credit: number;
  balance: number;
  parentCredits: number;
  sharing: number | null;
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

interface ToggleSetting {
  toggle: string;
  value: boolean;
  toggleEnabled: boolean;
}

interface ApiUser {
  userId: number;
  name: string;
  username: string;
  roleId: number;
  parentId: number;
  balance: number;
  credits: number;
  parentCredits: number;
  isBlocked: boolean;
  brkSharing: number | null;
  pnlSharing: number | null;
  addMaster: boolean;
  createdAt: number | string | null;
  ipAddress: string | null;
  deviceId: string | null;
  lastLoginDate: number | string | null;
  city: string | null;
  userSettingsToggles: ToggleSetting[];
  parentName: string;
  parentUsername: string;
}

const UserList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
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
  const [actionMenuPosition, setActionMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [actionMenuUserId, setActionMenuUserId] = useState<string | null>(null);
  const { user: loggedInUser } = useAppSelector(state => state.auth);
  const { addTab, tabs, removeTab } = useTabs();

  // Function to refetch user list
  const refetchUserList = useCallback(async () => {
    try {
      const response = await userManagementService.getUserList();
      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        const apiUsers: ApiUser[] = response.data?.userList || [];
        const transformedUsers = apiUsers.map(transformApiUser);
        setUsers(transformedUsers);
        // Update cache
        sessionStorage.setItem('userListCache', JSON.stringify(transformedUsers));
        sessionStorage.setItem('userListCacheTime', Date.now().toString());
      }
    } catch (error: any) {
      // Error refreshing user list
    }
  }, []);

  const getRoleType = (roleId: number): 'Client' | 'Master' | 'Admin' => {
    switch (roleId) {
      case 1: return 'Admin';
      case 2: return 'Admin';
      case 3: return 'Master';
      case 4: return 'Client';
      default: return 'Client';
    }
  };

  const transformApiUser = (apiUser: ApiUser): UserData => {
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
    const formatDate = (timestamp: number | string | null): string => {
      if (!timestamp) return 'N/A';
      const numTimestamp = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
      return new Date(numTimestamp).toLocaleString();
    };

    return {
      id: apiUser.userId.toString(),
      username: apiUser.username,
      name: apiUser.name,
      type: getRoleType(apiUser.roleId),
      parent: apiUser.parentUsername || `Parent-${apiUser.parentId}`,
      parentName: apiUser.parentName || apiUser.parentUsername || 'N/A',
      credit: apiUser.credits,
      balance: apiUser.balance,
      parentCredits: apiUser.parentCredits || 0,
      sharing: apiUser.pnlSharing,
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
      creditLimitEnabled: true, // creditLimit doesn't have toggleEnabled in API
      creditBasedMarginEnabled: getToggleEnabled('creditBasedMargin'),
      createdDate: formatDate(apiUser.createdAt),
      ipAddress: apiUser.ipAddress || 'N/A',
      deviceId: apiUser.deviceId || 'N/A',
      lastLogin: formatDate(apiUser.lastLoginDate)
    };
  };

  useEffect(() => {
    // Clear cache when logged-in user changes (logout/login with different user)
    const storedUserId = localStorage.getItem('userId');
    const currentLoggedInUserId = loggedInUser?.userId || storedUserId;
    
    // Check if we have a cached userId and it differs from current user
    const cachedUserId = sessionStorage.getItem('cachedUserId');
    
    if (!currentLoggedInUserId) {
      // No user logged in (logout detected) - clear all caches
      sessionStorage.removeItem('userListCache');
      sessionStorage.removeItem('userListCacheTime');
      sessionStorage.removeItem('cachedUserId');
      setUsers([]);
    } else if (cachedUserId && cachedUserId !== String(currentLoggedInUserId)) {
      // User has changed - clear all caches
      sessionStorage.removeItem('userListCache');
      sessionStorage.removeItem('userListCacheTime');
      sessionStorage.removeItem('cachedUserId');
    } else if (currentLoggedInUserId && !cachedUserId) {
      // Store current user ID for future comparison
      sessionStorage.setItem('cachedUserId', String(currentLoggedInUserId));
    }
  }, [loggedInUser]);

  useEffect(() => {
    // Check if we have cached data
    const cachedData = sessionStorage.getItem('userListCache');
    const cacheTimestamp = sessionStorage.getItem('userListCacheTime');
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    if (cachedData && cacheTimestamp) {
      const age = Date.now() - parseInt(cacheTimestamp);
      if (age < CACHE_DURATION) {
        const cachedUsers = JSON.parse(cachedData);
        // Validate cache structure - check if it has the correct fields including sharing from pnlSharing and parentCredits
        const isValidCache = cachedUsers.length === 0 || (
          cachedUsers[0].hasOwnProperty('betEnabled') && 
          cachedUsers[0].hasOwnProperty('statusEnabled') &&
          cachedUsers[0].hasOwnProperty('sharing') &&
          cachedUsers[0].hasOwnProperty('parentCredits')
        );
        
        if (isValidCache) {
          setUsers(cachedUsers);
          setLoading(false);
          return;
        } else {
          sessionStorage.removeItem('userListCache');
          sessionStorage.removeItem('userListCacheTime');
        }
      }
    }
    const fetchUserList = async () => {
      setLoading(true);
      try {
        const response = await userManagementService.getUserList();
        if (response?.responseCode === '0' || response?.responseCode === '1000') {
          const apiUsers: ApiUser[] = response.data?.userList || [];
          const transformedUsers = apiUsers.map(transformApiUser);
          setUsers(transformedUsers);
          // Cache the data
          sessionStorage.setItem('userListCache', JSON.stringify(transformedUsers));
          sessionStorage.setItem('userListCacheTime', Date.now().toString());
        } else {
          toast.error(response?.responseMessage || 'Failed to fetch user list');
          setUsers([]);
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.responseMessage || error.message || 'Failed to fetch user list';
        toast.error(errorMessage);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserList();
  }, []);

  useEffect(() => {
    const username = searchParams.get('username');
    if (username) {
      setSearchTerm(username);
    }
  }, [searchParams]);

  // Clear cache when UserList UI tab is closed
  useEffect(() => {
    return () => {
      // Check if UserList tab still exists in the tabs array
      const userListTabExists = tabs.some(tab => tab.path === '/dashboard/user-list');
      
      if (!userListTabExists) {
        sessionStorage.removeItem('userListCache');
        sessionStorage.removeItem('userListCacheTime');
      }
    };
  }, [tabs]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenActionMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSharingModal) {
          setShowSharingModal(false);
          setSelectedUserForSharingDetails(null);
        } else if (showPasswordModal) {
          setShowPasswordModal(false);
          setSelectedUserForPasswordChange(null);
        } else if (showAddCreditsModal) {
          setShowAddCreditsModal(false);
          setSelectedUserForAddCredits(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showSharingModal, showPasswordModal, showAddCreditsModal]);

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.name.toLowerCase().includes(searchLower) ||
      user.type.toLowerCase().includes(searchLower) ||
      user.parent.toLowerCase().includes(searchLower) ||
      user.ipAddress.toLowerCase().includes(searchLower) ||
      user.deviceId.toLowerCase().includes(searchLower) ||
      user.createdDate.toLowerCase().includes(searchLower) ||
      user.lastLogin.toLowerCase().includes(searchLower) ||
      user.credit.toString().includes(searchLower) ||
      user.balance.toString().includes(searchLower) ||
      (user.sharing !== null && user.sharing.toString().includes(searchLower))
    );
  });

  const displayUsers = filteredUsers;

  const handleToggle = useCallback(async (userId: string, field: 'bet' | 'closeOut' | 'margin' | 'status' | 'creditLimit' | 'creditBasedMargin') => {
    try {
      // Map field names to API type values
      const fieldToApiType: Record<string, string> = {
        'bet': 'bet',
        'closeOut': 'closeOnly',
        'margin': 'marginSquareOff',
        'status': 'status',
        'creditLimit': 'creditLimit',
        'creditBasedMargin': 'creditBasedMargin'
      };

      const apiType = fieldToApiType[field];
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const currentValue = user[field];
      const newValue = !currentValue;

      // Get logged-in user ID from localStorage
      const userDataStr = localStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const loggedInUserId = userData?.userId || 2;

      const response = await userManagementService.toggleUserSettings({
        userId: loggedInUserId,
        requestTimestamp: Date.now().toString(),
        data: {
          userId: Number(userId),
          type: apiType,
          value: newValue,
        },
      });

      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        const successMsg = response?.responseMessage || 'Setting updated successfully';
        toast.success(successMsg);
        
        // Update local state
        setUsers(prevUsers =>
          prevUsers.map(u =>
            u.id === userId
              ? { ...u, [field]: newValue }
              : u
          )
        );
        
        // Refetch user list to get updated data
        await refetchUserList();
      } else {
        const errorMsg = response?.responseMessage || 'Failed to update setting';
        toast.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.responseMessage || error.message || 'Failed to update setting';
      toast.error(errorMsg);
    }
  }, [users]);

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

  const renderUserListContent = () => (
    <>
      <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 px-6 py-5 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {loggedInUser?.username || 'User Management'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm ? (
                    <>
                      {displayUsers.length} of {users.length} users 
                      {displayUsers.length === 0 && (
                        <span className="text-red-500 ml-1">(no matches found)</span>
                      )}
                    </>
                  ) : (
                    <>{users.length} total users</>
                  )}
                </p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
                <span className="text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
                  {users.filter(u => u.status === true).length} Active
                </span>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-full">
                <span className="text-orange-700 dark:text-orange-400 text-sm font-semibold">
                  {users.filter(u => u.type === 'Master').length} Masters
                </span>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
                <span className="text-blue-700 dark:text-blue-400 text-sm font-semibold">
                  {users.filter(u => u.type === 'Client').length} Clients
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by username, name, type, IP, device..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 py-2.5 w-80 bg-white/70 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm transition-all duration-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            <button 
              onClick={() => {
                addTab({
                  title: 'Create User',
                  path: '/dashboard/create-user',
                  icon: Plus
                })
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105">
              <Plus className="w-4 h-4" />
              Add User
            </button>
            {/* <button className="p-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white transition-all duration-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl">
              <Settings className="w-5 h-5" />
            </button> */}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 pb-8 overflow-auto">
        <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden h-full flex flex-col">
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-[1500px] w-full table-fixed">
              <colgroup>
                <col style={{width: '100px'}} />
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
                  <th className="text-center px-2 py-3 font-bold text-slate-700 dark:text-slate-300 text-xs whitespace-nowrap">Action</th>
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
                {loading ? (
                  <tr>
                    <td colSpan={17} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
                      </div>
                    </td>
                  </tr>
                ) : displayUsers.length === 0 && searchTerm ? (
                  <tr>
                    <td colSpan={17} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">No users found</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Try adjusting your search term "{searchTerm}"
                          </p>
                        </div>
                        <button
                          onClick={() => setSearchTerm('')}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          Clear Search
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : displayUsers.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">No users available</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Start by creating a new user
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200 h-12"
                  >
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">

                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            try {
                              const editPath = `/dashboard/create-user?mode=edit&userId=${user.id}`;
                              console.log('🔍 Edit clicked for user:', user.id, 'Path:', editPath);
                              
                              // Close all existing edit tabs first
                              const editTabsToClose = tabs.filter(tab => tab.path.includes('/dashboard/create-user?mode=edit'));
                              console.log('📋 Closing existing edit tabs:', editTabsToClose.length);
                              editTabsToClose.forEach(tab => removeTab(tab.id));
                              
                              // Fetch user details and cache them
                              console.log('📥 Fetching user details for userId:', user.id);
                              const apiResponse = await userManagementService.fetchUserDetails(Number(user.id));
                              const apiData = apiResponse?.data || {};
                              console.log('✅ User details fetched:', apiData);
                              
                              // Patch/flatten the API response for the edit form
                              const editingUserData = {
                                userId: apiData.userProfile?.userId,
                                username: apiData.userProfile?.username || apiData.userInfo?.username,
                                roleId: apiData.userProfile?.roleId,
                                balance: apiData.userProfile?.balance,
                                credit: apiData.userProfile?.credits,
                                name: apiData.userInfo?.name,
                                remark: apiData.userInfo?.remarks,
                                createdAt: apiData.userInfo?.createdAt,
                                lastLoginDate: apiData.userInfo?.lastLoginDate,
                                ipAddress: apiData.userInfo?.ipAddress,
                                exchanges: apiData.userInfo?.exchanges,
                                allowedExchanges: apiData.userInfo?.allowedExchanges,
                                highLowTradeLimit: apiData.userInfo?.highLowTradeLimit,
                                pnlSharing: apiData.userInfo?.pnlSharing,
                                brkSharing: apiData.userInfo?.brkSharing,
                                addMaster: apiData.userInfo?.addMaster,
                                settings: apiData.userSettings?.settings,
                                menus: apiData.userSettings?.menus,
                              };
                              
                              console.log('📝 Adding tab for edit user:', user.username);
                              addTab({
                                title: `Edit ${user.username}`,
                                path: editPath,
                                icon: Edit,
                                cacheData: {
                                  formData: {
                                    isEditing: true,
                                    editingUserId: user.id,
                                    editingUsername: user.username,
                                    editingUserData
                                  }
                                }
                              });
                              
                              navigateWithScrollToTop(navigate, editPath);
                              navigateWithScrollToTop(navigate, editPath);
                            } catch (err) {
                              console.error('❌ Error in edit handler:', err);
                              toast.error('Error fetching user details.');
                            }
                          }}
                          className="inline-flex items-center justify-center p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200">
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              if (openActionMenu === user.id) {
                                setOpenActionMenu(null);
                                setActionMenuPosition(null);
                                setActionMenuUserId(null);
                              } else {
                                setActionMenuUserId(user.id);
                                setActionMenuPosition({ x: rect.right, y: rect.bottom });
                                setOpenActionMenu(user.id);
                              }
                            }}
                            className="inline-flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedUser(user)}>
                        <span className="font-semibold text-slate-800 dark:text-white text-sm truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{user.username}</span>
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-slate-700 dark:text-slate-300 text-sm truncate">{user.name}</span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className={`${getTypeColor(user.type)} text-xs px-2 py-1 inline-block`}>{user.type}</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-slate-500 dark:text-slate-400 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-center block truncate">{user.parent}</span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserForAddCredits(user);
                          setShowAddCreditsModal(true);
                          // Clear all form values when opening modal
                          setCreditTransType('Credit');
                          setCreditAmount('');
                          setCreditNote('');
                          setCreditError('');
                        }}
                        className="font-semibold text-slate-800 dark:text-white text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors"
                      >
                        {user.credit != null ? user.credit.toLocaleString() : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span className={`${getBalanceColor(user.balance)} text-sm font-semibold`}>{user.balance != null ? user.balance.toFixed(2) : '-'}</span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">{user.sharing !== null && user.sharing !== undefined ? user.sharing.toFixed(1) : '0.0'}%</span>
                        <div className="w-8 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" style={{ width: `${user.sharing || 0}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <ToggleSwitch enabled={user.bet} onClick={() => handleToggle(user.id, 'bet')} size="xs" disabled={!user.betEnabled} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <ToggleSwitch enabled={user.closeOut} onClick={() => handleToggle(user.id, 'closeOut')} size="xs" disabled={!user.closeOutEnabled} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <ToggleSwitch enabled={user.margin} onClick={() => handleToggle(user.id, 'margin')} size="xs" disabled={!user.marginEnabled} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <ToggleSwitch enabled={user.status} onClick={() => handleToggle(user.id, 'status')} size="xs" disabled={!user.statusEnabled} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <ToggleSwitch enabled={user.creditBasedMargin} onClick={() => handleToggle(user.id, 'creditBasedMargin')} size="xs" disabled={!user.creditBasedMarginEnabled} />
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">{user.createdDate}</span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-center">
                        <span className="text-blue-700 dark:text-blue-300 text-xs font-mono block truncate">{user.ipAddress}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded text-center">
                        <span className="text-purple-700 dark:text-purple-300 text-xs font-mono block truncate" title={user.deviceId}>
                          {user.deviceId.length > 15 ? `${user.deviceId.substring(0, 15)}...` : user.deviceId}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-emerald-700 dark:text-emerald-300 text-xs whitespace-nowrap">{user.lastLogin}</span>
                    </td>
                    {/* <td className="px-2 py-2 text-center">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          if (openActionMenu === user.id) {
                            setOpenActionMenu(null);
                            setActionMenuPosition(null);
                            setActionMenuUserId(null);
                          } else {
                            setActionMenuUserId(user.id);
                            setActionMenuPosition({ x: rect.left, y: rect.bottom });
                            setOpenActionMenu(user.id);
                          }
                        }}
                        className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td> */}
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {renderUserListContent()}
      </div>

      <UserDetailsModal 
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onToggle={handleToggle}
      />

      {/* Change Password Modal */}
      {showPasswordModal && selectedUserForPasswordChange && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-50 animate-fadeIn" 
          style={{ zIndex: 99999 }} 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowPasswordModal(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200/50 dark:border-slate-700/50 overflow-hidden transform transition-all duration-300 animate-slideUp"
            style={{ width: '98vw', height: '96vh', maxWidth: '600px' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 px-6 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Change Password</h2>
                  <p className="text-pink-100 text-xs">
                    User: {selectedUserForPasswordChange.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 backdrop-blur-xl border border-white/30 hover:rotate-90 transform group"
              >
                <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
              <ChangePassword 
                user={selectedUserForPasswordChange}
                userDetails={selectedUserForPasswordChange}
                onClose={() => setShowPasswordModal(false)}
                onRefresh={async () => {
                  await refetchUserList();
                  setShowPasswordModal(false);
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sharing Details Modal */}
      {showSharingModal && selectedUserForSharingDetails && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-50 animate-fadeIn" 
          style={{ zIndex: 99999 }} 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowSharingModal(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200/50 dark:border-slate-700/50 overflow-hidden transform transition-all duration-300 animate-slideUp"
            style={{ width: '98vw', height: '96vh', maxWidth: '900px' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 px-6 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Sharing Details</h2>
                  <p className="text-cyan-100 text-xs">
                    User: {selectedUserForSharingDetails.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSharingModal(false)}
                className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 backdrop-blur-xl border border-white/30 hover:rotate-90 transform group"
              >
                <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
              <SharingDetails 
                user={selectedUserForSharingDetails}
                userDetails={selectedUserForSharingDetails}
                onClose={() => setShowSharingModal(false)}
                onRefresh={async () => {
                  await refetchUserList();
                  setShowSharingModal(false);
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Credits Modal */}
      {showAddCreditsModal && selectedUserForAddCredits && createPortal(
        <div 
          className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-50 animate-fadeIn" 
          style={{ zIndex: 99999 }} 
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
                    placeholder="Enter amount..."
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
                    <p className="text-center text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">{selectedUserForAddCredits?.parentName || 'N/A'}</p>
                    <div className="flex justify-around items-center">
                      <div className="text-center">
                        <p className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">Current</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {(selectedUserForAddCredits?.parentCredits || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">New</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {(creditTransType === 'Credit'
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
                      
                      const res = await userManagementService.manageCredits(payload);
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
                        
                        // Update local users state immediately
                        setUsers(prevUsers =>
                          prevUsers.map(u =>
                            u.id === selectedUserForAddCredits.id
                              ? { ...u, credit: newCreditValue }
                              : u
                          )
                        );
                        
                        toast.success(message);
                        
                        // Refetch user list to get latest data from server
                        await refetchUserList();
                        
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
      )}

      {/* Action Menu Portal */}
      {openActionMenu && actionMenuPosition && actionMenuUserId && createPortal(
        <div 
          className="fixed w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-2xl z-[99999] overflow-hidden"
          style={{
            left: `${actionMenuPosition.x}px`,
            top: `${actionMenuPosition.y + 8}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const user = users.find(u => u.id === actionMenuUserId);
              if (user) {
                setSelectedUserForPasswordChange(user);
                setShowPasswordModal(true);
              }
              setOpenActionMenu(null);
              setActionMenuPosition(null);
              setActionMenuUserId(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
            <span>📝</span> Change Password
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const user = users.find(u => u.id === actionMenuUserId);
              if (user) {
                setSelectedUserForSharingDetails(user);
                setShowSharingModal(true);
              }
              setOpenActionMenu(null);
              setActionMenuPosition(null);
              setActionMenuUserId(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-slate-700">
            <span>📊</span> Share Details
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const user = users.find(u => u.id === actionMenuUserId);
              if (user) {
                setSelectedUserForAddCredits(user);
                setShowAddCreditsModal(true);
                // Clear all form values when opening modal
                setCreditTransType('Credit');
                setCreditAmount('');
                setCreditNote('');
                setCreditError('');
              }
              setOpenActionMenu(null);
              setActionMenuPosition(null);
              setActionMenuUserId(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-slate-700">
            <span>💰</span> Add Credit
          </button>
          <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-slate-700">
            <span>📋</span> Account Limit
          </button>
          <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-slate-700">
            <span>📈</span> Carry Forward Margin
          </button>
          <button className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-gray-200 dark:border-slate-700">
            <span>📊</span> Exchangewise Interest %
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

export default UserList;
