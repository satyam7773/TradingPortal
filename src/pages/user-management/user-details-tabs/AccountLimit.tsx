import React, { useState, useEffect } from 'react';
import { X, Lock, Edit2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { userManagementService } from '../../../services';
import { createPortal } from 'react-dom';

interface AccountLimitData {
  accountLimit: boolean | null;
  toggleEnabled?: boolean | null;
  addMaster: boolean;
  parentUserName?: string | null;
  parentInfo?: AccountLimitData | null;
  master: {
    total: number;
    occupied: number;
    created: number;
    remaining: number;
  };
  client: {
    total: number;
    occupied: number;
    created: number;
    remaining: number;
  };
}

interface ParentLimitInfo {
  username: string;
  limit: AccountLimitData;
}

const AccountLimit: React.FC<any> = ({ user, userDetails, onClose, onRefresh }) => {
  const [accountLimitData, setAccountLimitData] = useState<AccountLimitData | null>(null);
  const [parentLimitInfo, setParentLimitInfo] = useState<ParentLimitInfo | null>(null);
  const [showParentModal, setShowParentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [addMaster, setAddMaster] = useState(false);
  const [masterLimit, setMasterLimit] = useState('');
  const [clientLimit, setClientLimit] = useState('');
  const [masterOccupied, setMasterOccupied] = useState(0);
  const [clientOccupied, setClientOccupied] = useState(0);
  const [masterCreated, setMasterCreated] = useState(0);
  const [clientCreated, setClientCreated] = useState(0);
  const [masterTotal, setMasterTotal] = useState(0);
  const [clientTotal, setClientTotal] = useState(0);
  const [masterRemaining, setMasterRemaining] = useState(0);
  const [clientRemaining, setClientRemaining] = useState(0);

  useEffect(() => {
    fetchAccountLimit();
  }, [user?.id, user?.userId]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showParentModal) {
          setShowParentModal(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [showParentModal, onClose]);

  const fetchAccountLimit = async () => {
    try {
      setLoading(true);
      const searchUserId = user?.id || user?.userId;
      const response = await userManagementService.fetchAccountLimit(searchUserId);
      
      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        const data = response.data;
        setAccountLimitData(data);
        setLimitEnabled(data?.accountLimit || false);
        setAddMaster(data?.addMaster || false);
        setMasterLimit(data?.master?.total?.toString() || '');
        setClientLimit(data?.client?.total?.toString() || '');
        setMasterOccupied(data?.master?.occupied || 0);
        setClientOccupied(data?.client?.occupied || 0);
        setMasterCreated(data?.master?.created || 0);
        setClientCreated(data?.client?.created || 0);
        setMasterTotal(data?.master?.total || 0);
        setClientTotal(data?.client?.total || 0);
        setMasterRemaining(data?.master?.remaining || 0);
        setClientRemaining(data?.client?.remaining || 0);
        console.log('✅ Account limit loaded:', data);
      } else {
        toast.error(response?.responseMessage || 'Failed to load account limit');
      }
    } catch (error: any) {
      console.error('Error fetching account limit:', error);
      toast.error(error?.message || 'Failed to load account limit');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Only validate fields if limit is enabled
      if (limitEnabled && (!masterLimit || !clientLimit)) {
        toast.error('Please fill in all required fields');
        return;
      }

      setIsSaving(true);
      const userId = user?.id || user?.userId;
      
      console.log('💾 Saving account limit:', {
        userId,
        accountLimit: limitEnabled,
        masterAccountLimit: limitEnabled ? parseInt(masterLimit) : 0,
        clientAccountLimit: limitEnabled ? parseInt(clientLimit) : 0
      });

      const response = await userManagementService.updateAccountLimit({
        userId: Number(userId),
        accountLimit: limitEnabled,
        masterAccountLimit: limitEnabled ? parseInt(masterLimit) : 0,
        clientAccountLimit: limitEnabled ? parseInt(clientLimit) : 0
      });

      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        toast.success('Account limit updated successfully');
        if (onRefresh) await onRefresh();
      } else {
        toast.error(response?.responseMessage || 'Failed to update account limit');
      }
    } catch (error: any) {
      console.error('Error saving account limit:', error);
      toast.error(error?.message || 'Failed to save account limit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewParentLimitInfo = () => {
    const parentInfo = accountLimitData?.parentInfo || null;
    setParentLimitInfo({
      username: accountLimitData?.parentUserName || user?.parent || 'Parent User',
      limit: parentInfo || { 
        accountLimit: null,
        toggleEnabled: null,
        addMaster: false,
        parentUserName: null,
        parentInfo: null,
        master: { total: 0, occupied: 0, created: 0, remaining: 0 }, 
        client: { total: 0, occupied: 0, created: 0, remaining: 0 } 
      }
    });
    setShowParentModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Main Content Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Limit Toggle Section */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 p-8 border-b border-gray-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">Enable Account Limit</label>
                <p className="text-xs text-slate-500 dark:text-slate-400">Control whether this user has account limits</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="limit"
                    checked={limitEnabled}
                    onChange={() => setLimitEnabled(true)}
                    className="w-5 h-5 accent-green-500"
                  />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-green-600 transition">On</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="limit"
                    checked={!limitEnabled}
                    onChange={() => setLimitEnabled(false)}
                    className="w-5 h-5 accent-red-500"
                  />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-red-600 transition">Off</span>
                </label>
              </div>
            </div>
          </div>

          {/* Limits Content */}
          <div className="p-8 space-y-8">
            {/* Masters Section */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6 border-2 border-orange-200 dark:border-orange-700/30">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Masters Allocation</h3>
              </div>

              <div className="grid grid-cols-[1fr,2fr,1fr] gap-4">
                {/* Editable Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Total Limit</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={masterLimit}
                      onChange={(e) => setMasterLimit(e.target.value)}
                      placeholder="Enter limit"
                      disabled={!limitEnabled || !addMaster}
                      className={`w-full px-4 py-3 border-2 rounded-lg font-semibold focus:outline-none transition ${
                        !limitEnabled || !addMaster
                          ? 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-800 border-orange-300 dark:border-orange-600 text-slate-800 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
                      }`}
                    />
                    {limitEnabled && addMaster ? (
                      <Edit2 className="absolute right-3 top-3 w-4 h-4 text-orange-400" />
                    ) : (
                      <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Occupied Field with Details */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Occupied</label>
                  <div className="relative">
                    <div className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-lg cursor-not-allowed flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 font-semibold text-sm">
                        Occupied {masterOccupied} + Created {masterCreated} = {masterOccupied + masterCreated}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remaining Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Remaining</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={masterRemaining}
                      disabled
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 font-semibold cursor-not-allowed"
                    />
                    <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Clients Section */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-6 border-2 border-cyan-200 dark:border-cyan-700/30">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Clients Allocation</h3>
              </div>

              <div className="grid grid-cols-[1fr,2fr,1fr] gap-4">
                {/* Editable Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Total Limit</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={clientLimit}
                      onChange={(e) => setClientLimit(e.target.value)}
                      placeholder="Enter limit"
                      disabled={!limitEnabled}
                      className={`w-full px-4 py-3 border-2 rounded-lg font-semibold focus:outline-none transition ${
                        !limitEnabled 
                          ? 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-white dark:bg-slate-800 border-cyan-300 dark:border-cyan-600 text-slate-800 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200'
                      }`}
                    />
                    {limitEnabled ? (
                      <Edit2 className="absolute right-3 top-3 w-4 h-4 text-cyan-400" />
                    ) : (
                      <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Occupied Field with Details */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Occupied</label>
                  <div className="relative">
                    <div className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-lg cursor-not-allowed flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400 font-semibold text-sm">
                        Occupied {clientOccupied} + Created {clientCreated} = {clientOccupied + clientCreated}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remaining Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">Remaining</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={clientRemaining}
                      disabled
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-400 font-semibold cursor-not-allowed"
                    />
                    <Lock className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Parent Limit Info Link */}
            <button
              onClick={handleViewParentLimitInfo}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-sm underline transition-colors flex items-center gap-1"
            >
              📊 Parent Limit Info
            </button>
          </div>

          {/* Action Buttons */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 px-8 py-6 flex gap-4 justify-end border-t border-gray-200 dark:border-slate-600">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Parent Limit Info Modal */}
      {showParentModal && parentLimitInfo && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center" 
          style={{ zIndex: 99999 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowParentModal(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-blue-200 dark:border-slate-700"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Parent Limit Info</h2>
              <button
                onClick={() => setShowParentModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 font-semibold">User: {parentLimitInfo.username}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-700 dark:to-slate-600">
                    <th className="border border-gray-300 dark:border-slate-600 px-4 py-3 text-left text-slate-700 dark:text-slate-300 font-bold">Info</th>
                    <th className="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-bold">Master</th>
                    <th className="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300 font-bold">Client</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-blue-50 dark:hover:bg-slate-700 transition">
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Total Limit</td>
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300">{parentLimitInfo.limit.master.total}</td>
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300">{parentLimitInfo.limit.client.total}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 dark:hover:bg-slate-700 transition">
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Created</td>
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300">{parentLimitInfo.limit.master.created}</td>
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300">{parentLimitInfo.limit.client.created}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 dark:hover:bg-slate-700 transition">
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Occupied</td>
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300">{parentLimitInfo.limit.master.occupied}</td>
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300">{parentLimitInfo.limit.client.occupied}</td>
                  </tr>
                  <tr className="hover:bg-blue-50 dark:hover:bg-slate-700 transition">
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">Remaining</td>
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300">{parentLimitInfo.limit.master.remaining}</td>
                    <td className="border border-gray-300 dark:border-slate-600 px-4 py-3 text-center text-slate-700 dark:text-slate-300">{parentLimitInfo.limit.client.remaining}</td>
                  </tr>
                </tbody>
              </table>
              <button
                onClick={() => setShowParentModal(false)}
                className="w-full mt-6 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AccountLimit;
