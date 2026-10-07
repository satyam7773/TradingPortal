import { useState } from 'react';
import userManagementService from '../services/userManagementService';

export const useUserDetailsModal = () => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  const handleUserNameClick = async (e: React.MouseEvent, username: string, userId?: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🖱️ handleUserNameClick called:", { username, userId });

    const userData = localStorage.getItem('userData');
    const loggedInUser = userData ? JSON.parse(userData) : null;
    
    // Don't open for client logins
    if (loggedInUser?.roleId === 4) {
      console.log("⚠️ Skipping - logged in user is client (roleId=4)");
      return;
    }

    setIsLoadingUser(true);
    try {
      let finalUser: any = null;
      
      if (userId) {
        try {
          console.log("📥 Fetching user details for userId:", userId);
          const apiResponse = await userManagementService.fetchUserDetails(userId);
          
          console.log("📦 API Response received:", apiResponse);
          
          if (apiResponse?.data) {
            const apiData = apiResponse.data;
            const apiUser = apiData.userProfile;
            const userInfo = apiData.userInfo;
            const userSettings = apiData.userSettings;

            // Extract toggle values from userSettingsToggles array
            const getToggleValue = (toggleName: string): boolean => {
              const toggle = userSettings?.togglingSettingsToggles?.find((t: any) => t.toggle === toggleName);
              return toggle?.value ?? false;
            };

            // Extract toggleEnabled values
            const getToggleEnabled = (toggleName: string): boolean => {
              const toggle = userSettings?.togglingSettingsToggles?.find((t: any) => t.toggle === toggleName);
              return toggle?.toggleEnabled ?? false;
            };

            // Format dates
            const formatDate = (timestamp: number | string | null): string => {
              if (!timestamp) return 'N/A';
              const numTimestamp = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
              return new Date(numTimestamp).toLocaleString();
            };

            // Format user data
            finalUser = {
              id: apiUser?.userId?.toString() || '',
              username: apiUser?.username || username,
              name: userInfo?.name || username,
              type: apiUser?.roleId === 1 ? 'Admin' : apiUser?.roleId === 2 ? 'Master' : apiUser?.roleId === 3 ? 'Super Master' : 'Client',
              parent: userInfo?.parentUsername || `Parent-${userInfo?.parentId}`,
              credit: apiUser?.credits || 0,
              balance: apiUser?.balance || 0,
              sharing: userInfo?.pnlSharing || null,
              bet: getToggleValue('bet'),
              closeOut: getToggleValue('closeOnly'),
              margin: getToggleValue('marginSquareOff'),
              status: getToggleValue('status'),
              creditLimit: getToggleValue('creditLimit'),
              creditBasedMargin: getToggleValue('creditBasedMargin'),
              betEnabled: getToggleEnabled('bet'),
              closeOutEnabled: getToggleEnabled('closeOnly'),
              marginEnabled: getToggleEnabled('marginSquareOff'),
              statusEnabled: getToggleEnabled('status'),
              creditLimitEnabled: getToggleEnabled('creditLimit'),
              creditBasedMarginEnabled: getToggleEnabled('creditBasedMargin'),
              createdDate: formatDate(userInfo?.createdDate),
              ipAddress: userInfo?.ipAddress || '-',
              manualOrder: getToggleValue('manualOrder'),
              manualOrderEnabled: getToggleEnabled('manualOrder'),
              deviceId: userInfo?.deviceId || '-',
              lastLogin: formatDate(userInfo?.lastLogin),
              isActive: apiUser?.isActive ?? true,
              isTradeLock: apiUser?.isTradeLock ?? false,
              deleteTrade: getToggleValue('deleteTrade'),
              deleteTradeEnabled: getToggleEnabled('deleteTrade')
            };
          }
        } catch (error) {
          console.error('Failed to fetch user details:', error);
        }
      }

      // If we got user details from API, use them; otherwise create placeholder
      if (!finalUser) {
        finalUser = {
          id: username,
          username: username,
          name: username,
          type: 'Client',
          parent: '',
          credit: 0,
          balance: 0,
          sharing: null,
          bet: false,
          closeOut: false,
          margin: false,
          status: false,
          creditLimit: false,
          creditBasedMargin: false,
          betEnabled: false,
          closeOutEnabled: false,
          marginEnabled: false,
          statusEnabled: false,
          creditLimitEnabled: false,
          creditBasedMarginEnabled: false,
          createdDate: '',
          ipAddress: '',
          manualOrder: false,
          manualOrderEnabled: false,
          deviceId: '',
          lastLogin: '',
          isActive: true,
          isTradeLock: false,
          deleteTrade: false,
          deleteTradeEnabled: false
        };
      }

      setSelectedUser(finalUser);
      console.log("✅ setSelectedUser called with:", { finalUser, hasData: !!finalUser });
    } catch (error) {
      console.error('Error in handleUserNameClick:', error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  return {
    selectedUser,
    setSelectedUser,
    isLoadingUser,
    handleUserNameClick
  };
};
