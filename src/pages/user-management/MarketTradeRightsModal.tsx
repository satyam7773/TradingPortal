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

interface MarketTradeRightsModalProps {
  isOpen: boolean;
  user: UserData;
  onClose: () => void;
  onSave?: () => void;
}

const MarketTradeRightsModal: React.FC<MarketTradeRightsModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave
}) => {
  const [isMarketTradeEnabled, setIsMarketTradeEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize toggle state from user's isTradeLock value
  useEffect(() => {
    if (user && isOpen) {
      // isTradeLock: true means trading is locked (disabled), so isMarketTradeEnabled is false
      // isTradeLock: false means trading is allowed (enabled), so isMarketTradeEnabled is true
      const tradeEnabled = !(user.isTradeLock ?? false);
      setIsMarketTradeEnabled(tradeEnabled);
    }
  }, [user?.id, user?.isTradeLock, isOpen]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Get logged-in user ID from localStorage
      const userDataStr = localStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const loggedInUserId = userData?.userId || 1;
      
      const payload = {
        userId: loggedInUserId,
        requestTimestamp: Date.now(),
        data: {
          userId: Number(user.id),
          isTradeLock: !isMarketTradeEnabled // When enabled=true, isTradeLock=false (not locked)
        }
      };
      
      const response = await userManagementService.updateMarketTradeRights(payload);
      
      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        toast.success('Market Trade Rights updated successfully!');
        console.log(`Market Trade Rights updated for ${user.username}:`, {
          marketTradeEnabled: isMarketTradeEnabled,
          isTradeLock: !isMarketTradeEnabled
        });
        onSave?.();
        onClose();
      } else {
        const errorMsg = response?.responseMessage || 'Failed to update market trade rights';
        toast.error(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.responseMessage || error.message || 'Failed to update market trade rights';
      toast.error(errorMsg);
      console.error('Error updating market trade rights:', error);
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
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-lg">
              <span className="text-lg">📊</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Market Trade Rights</h2>
              <p className="text-purple-100 text-xs">
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="space-y-4">
            {/* Master Toggle Card */}
            <div 
              onClick={() => setIsMarketTradeEnabled(!isMarketTradeEnabled)}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-800/50 rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white transition-all ${
                  isMarketTradeEnabled 
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/40' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  🎯
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Enable Market Trading
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {isMarketTradeEnabled ? 'Market trading is enabled for this user' : 'Market trading is disabled for this user'}
                  </p>
                </div>
              </div>
              
              {/* Master Toggle Switch */}
              <div className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 ml-4 flex-shrink-0 ${
                isMarketTradeEnabled
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ml-0.5 ${
                  isMarketTradeEnabled ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-white/80 dark:bg-slate-700/50 p-4 rounded-xl border border-purple-200 dark:border-purple-800/30">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">STATUS</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {isMarketTradeEnabled 
                  ? `${user.username} can trade in all available markets` 
                  : `${user.username} cannot trade in any markets`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 flex gap-3 p-4 bg-gray-50 dark:bg-slate-700/30 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Saving...
              </>
            ) : (
              '✓ Save Rights'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MarketTradeRightsModal;
