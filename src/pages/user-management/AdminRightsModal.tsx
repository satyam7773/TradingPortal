import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { userManagementService } from '../../services';

interface UserData {
  id: string;
  username: string;
  name?: string;
  type?: string;
  [key: string]: any;
}

interface AdminRight {
  toggleLabel: string;
  toggle: string;
  toggleEnabled: boolean;
  value: boolean;
}

interface AdminRightsModalProps {
  isOpen: boolean;
  user: UserData;
  onClose: () => void;
  onSave?: () => void;
}

const AdminRightsModal: React.FC<AdminRightsModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave
}) => {
  const [adminRights, setAdminRights] = useState<AdminRight[]>([]);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch admin rights on modal open
  useEffect(() => {
    if (isOpen && user) {
      fetchAdminRights();
    }
  }, [user?.id, isOpen]);

  const fetchAdminRights = async () => {
    try {
      setIsLoading(true);
      const response = await userManagementService.fetchAdminRights(Number(user.id));
      
      if (Array.isArray(response)) {
        setAdminRights(response);
        // Initialize toggle states
        const states: Record<string, boolean> = {};
        response.forEach(right => {
          states[right.toggle] = right.value;
        });
        setToggleStates(states);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.responseMessage || error.message || 'Failed to fetch admin rights';
      toast.error(errorMsg);
      console.error('Error fetching admin rights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (toggle: string, currentValue: boolean) => {
    try {
      setIsSaving(true);
      
      // Get logged-in user ID from localStorage
      const userDataStr = localStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const loggedInUserId = userData?.userId || 1;
      
      const newValue = !currentValue;
      
      // Map toggle name to API type
      const typeMapping: Record<string, string> = {
        'manualOrder': 'manualOrder',
        'deleteTrade': 'deleteTrade',
        'pendingToSuccess': 'pendingToSuccess'
      };

      const payload = {
        userId: loggedInUserId,
        requestTimestamp: Date.now().toString(),
        data: {
          userId: Number(user.id),
          type: typeMapping[toggle] || toggle,
          value: newValue,
        },
      };

      const response = await userManagementService.toggleUserSettings(payload);
      
      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        setToggleStates(prev => ({
          ...prev,
          [toggle]: newValue
        }));
        toast.success(`${toggle} updated successfully!`);
      } else {
        const errorMsg = response?.responseMessage || 'Failed to update admin right';
        toast.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.responseMessage || error.message || 'Failed to update admin right';
      toast.error(errorMsg);
      console.error('Error toggling admin right:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-50 animate-fadeIn" 
      style={{ zIndex: 99999 }} 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200/50 dark:border-slate-700/50 overflow-hidden transform transition-all duration-300 animate-slideUp"
        style={{ width: '90vw', maxWidth: '600px', maxHeight: '85vh' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-lg">
              <span className="text-lg">👤</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Admin Rights</h2>
              <p className="text-blue-100 text-xs">
                User: {user.username}
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

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading admin rights...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {adminRights.length > 0 ? (
                adminRights.map((right) => (
                  <div
                    key={right.toggle}
                    onClick={() => right.toggleEnabled && handleToggle(right.toggle, toggleStates[right.toggle] || false)}
                    className={`flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800/50 rounded-xl transition-all duration-200 group ${
                      right.toggleEnabled 
                        ? 'hover:shadow-md cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white transition-all ${
                        toggleStates[right.toggle]
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/40' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        {right.toggle === 'manualOrder' && '📝'}
                        {right.toggle === 'deleteTrade' && '🗑️'}
                        {right.toggle === 'pendingToSuccess' && '✅'}
                      </div>
                      <div>
                        <p className={`font-bold text-sm transition-colors ${
                          right.toggleEnabled
                            ? 'text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            : 'text-gray-500 dark:text-gray-500'
                        }`}>
                          {right.toggleLabel}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {!right.toggleEnabled ? 'Not Available' : toggleStates[right.toggle] ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Toggle Switch */}
                    <div className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 ml-4 flex-shrink-0 ${
                      toggleStates[right.toggle]
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ml-0.5 ${
                        toggleStates[right.toggle] ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white/80 dark:bg-slate-700/50 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30 text-center">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    No admin rights available for this user
                  </p>
                </div>
              )}

              {/* Info Card */}
              {adminRights.length > 0 && (
                <div className="bg-white/80 dark:bg-slate-700/50 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">STATUS</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {Object.values(toggleStates).filter(v => v).length} of {adminRights.length} rights enabled for {user.username}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 flex gap-3 p-4 bg-gray-50 dark:bg-slate-700/30 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
          <button
            onClick={() => {
              onSave?.();
              onClose();
            }}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AdminRightsModal;
