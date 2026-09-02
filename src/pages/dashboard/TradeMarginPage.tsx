import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import userManagementService from '../../services/userManagementService';
import TradeMarginSettings from '../user-management/user-details-tabs/TradeMarginSettings';

interface UserOption {
  id: number;
  name: string;
}

const TradeMarginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Check if userId is provided in URL params (e.g., from Reports menu)
  const userIdFromParams = useMemo(() => {
    const id = searchParams.get('userId');
    return id ? parseInt(id) : null;
  }, [searchParams]);

  // Check if opened from Reports menu using sessionStorage
  const isFromReports = useMemo(() => {
    const flag = sessionStorage.getItem('tradeMarginFromReports') === 'true';
    return flag;
  }, []);

  const loggedInUserId = useMemo(() => {
    const userDataStr = localStorage.getItem('userData');
    return userDataStr ? JSON.parse(userDataStr).userId : null;
  }, []);

  // Clear the sessionStorage flag on mount so it only applies for this navigation
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('tradeMarginFromReports');
    };
  }, []);

  // Fetch users list ONLY when NOT accessed from Reports menu
  useEffect(() => {
    if (userIdFromParams || isFromReports) {
      // If userId or fromReports is in URL params, skip users list
      setInitialLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        setInitialLoading(true);
        const response = await userManagementService.fetchOwnUsers(loggedInUserId);
        
        if (response?.responseCode === '0' && Array.isArray(response.data)) {
          const userOptions = response.data.map((u: any) => ({
            id: u.userId,
            name: u.userName
          }));
          setUsers(userOptions);
          
          // Find and set logged-in user as default
          const loggedInUserOption = userOptions.find((u: UserOption) => u.id === loggedInUserId);
          if (loggedInUserOption) {
            setSelectedUser(loggedInUserOption);
          } else if (userOptions.length > 0) {
            // Fallback to first user if logged-in user not found
            setSelectedUser(userOptions[0]);
          }
        }
      } catch (error: any) {
        toast.error(error?.message || 'Failed to fetch users');
      } finally {
        setInitialLoading(false);
      }
    };

    if (loggedInUserId && !userIdFromParams && !isFromReports) {
      fetchUsers();
    }
  }, [loggedInUserId, userIdFromParams, isFromReports]);

  // If userId or fromReports is provided, use that user directly
  useEffect(() => {
    if (userIdFromParams) {
      setSelectedUser({ id: userIdFromParams, name: '' });
      setInitialLoading(false);
    } else if (isFromReports) {
      // When from Reports, use logged in user from localStorage
      if (loggedInUserId) {
        setSelectedUser({ id: loggedInUserId, name: '' });
        // Also set userDetails from localStorage data
        try {
          const userDataStr = localStorage.getItem('userData');
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            setUserDetails(userData);
          }
        } catch (error) {
          console.error('Error reading user data:', error);
        }
      }
      setInitialLoading(false);
    }
  }, [userIdFromParams, isFromReports, loggedInUserId]);

  // Fetch user details when selected user changes
  useEffect(() => {
    const fetchUserDetailsData = async () => {
      if (!selectedUser) return;

      try {
        setLoading(true);
        const response = await userManagementService.fetchUserDetails(selectedUser.id);

        if (response?.responseCode === '0' && response?.data) {
          setUserDetails(response.data);
        } else {
          toast.error('Failed to fetch user details');
          setUserDetails(null);
        }
      } catch (error: any) {
        toast.error(error?.message || 'Failed to fetch user details');
        setUserDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetailsData();
  }, [selectedUser, loggedInUserId]);

  const handleRefresh = async () => {
    // Refresh user details
    if (selectedUser) {
      try {
        setLoading(true);
        const response = await userManagementService.fetchUserDetails(selectedUser.id);

        if (response?.responseCode === '0' && response?.data) {
          setUserDetails(response.data);
          toast.success('User details refreshed');
        }
      } catch (error: any) {
        toast.error(error?.message || 'Failed to refresh user details');
      } finally {
        setLoading(false);
      }
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-500 border-t-blue-500 dark:border-t-blue-300"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Trade Margin Settings Content */}
      <div className="flex-1 overflow-hidden">
        {selectedUser && userDetails ? (
          <TradeMarginSettings
            user={{ id: selectedUser.id, name: selectedUser.name }}
            userDetails={userDetails}
            onRefresh={handleRefresh}
          />
        ) : selectedUser ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-500 border-t-blue-500 dark:border-t-blue-300 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading user details...</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-600 dark:text-slate-400 text-lg">Please select a user to view trade margin settings</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeMarginPage;
