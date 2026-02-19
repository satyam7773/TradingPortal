import React, { useState, useEffect } from 'react';
import { Share2, TrendingUp, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { userManagementService } from '../../../services';

interface SharingDetailsProps {
  user: any
  userDetails: any
  onClose?: () => void
  onRefresh?: (targetUser?: any) => Promise<any>
}

interface SharingUser {
  userId: number
  username: string
  roleId: number
  roleName: string
  pnlSharing: number
  name: string
  parentId: number
  isActive: boolean
  isBlocked: boolean
  brkSharing: number
}

const SharingDetails: React.FC<SharingDetailsProps> = ({ user, userDetails, onClose, onRefresh }) => {
  const [sharingData, setSharingData] = useState<SharingUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSharingDetails();
  }, [user?.id]);

  const fetchSharingDetails = async () => {
    try {
      setLoading(true);
      const searchUserId = user?.id || user?.userId || userDetails?.userId;
      const response = await userManagementService.fetchSharingDetails(searchUserId);
      
      if (response?.responseCode === '0' || response?.responseCode === '1000') {
        setSharingData(response.data || []);
      } else {
        toast.error(response?.responseMessage || 'Failed to load sharing details');
      }
    } catch (error: any) {
      console.error('Error fetching sharing details:', error);
      toast.error(error?.message || 'Failed to load sharing details');
    } finally {
      setLoading(false);
    }
  };

  // Group users by role hierarchy: Admin -> Masters -> Client
  const admin = sharingData.find(u => u.roleId === 2 || u.userId === null);
  const masters = sharingData.filter(u => u.roleId === 3);
  const client = sharingData.find(u => u.roleId === 4);

  const renderUserCard = (user: SharingUser, label: string, showValue: boolean = true) => (
    <div className="flex flex-col items-center">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
        {label}
      </div>
      <div className="bg-white dark:bg-slate-700 rounded-lg px-4 py-2 border-2 border-slate-200 dark:border-slate-600 min-w-[120px] text-center">
        <div className="text-sm font-semibold text-slate-800 dark:text-white">
          {user.name}
        </div>
        {user.username && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            ({user.username})
          </div>
        )}
        {showValue && (
          <div className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
            {user.pnlSharing.toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  );

  const renderBrkUserCard = (user: SharingUser, label: string, showValue: boolean = true) => (
    <div className="flex flex-col items-center">
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
        {label}
      </div>
      <div className="bg-white dark:bg-slate-700 rounded-lg px-4 py-2 border-2 border-slate-200 dark:border-slate-600 min-w-[120px] text-center">
        <div className="text-sm font-semibold text-slate-800 dark:text-white">
          {user.name}
        </div>
        {user.username && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            ({user.username})
          </div>
        )}
        {showValue && (
          <div className="mt-1 text-lg font-bold text-purple-600 dark:text-purple-400">
            {user.brkSharing.toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-600 dark:text-slate-300">Loading sharing details...</span>
        </div>
      </div>
    );
  }

  if (!sharingData || sharingData.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-500 dark:text-slate-400 text-sm">
          No sharing details available
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* P & L Sharing Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 border-2 border-blue-200 dark:border-slate-600">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">P & L Sharing</h3>
        </div>

        <div className="overflow-x-auto pb-4 tabs-scrollbar">
          <div className="flex items-center justify-start gap-8 min-w-max px-4">
          {/* Admin */}
          {admin && renderUserCard(admin, 'Admin')}

          {/* Arrow */}
          {masters.length > 0 && (
            <div className="text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          )}

          {/* Masters */}
          {masters.map((master, idx) => (
            <React.Fragment key={master.userId}>
              {renderUserCard(master, `Master (${master.username})`)}
              {idx < masters.length - 1 && (
                <div className="text-slate-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Arrow to Client */}
          {client && masters.length > 0 && (
            <div className="text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          )}

          {/* Client */}
          {client && renderUserCard(client, `Master (${client.username})`)}
        </div>
        </div>
      </div>

      {/* Brk Sharing Section */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 border-2 border-purple-200 dark:border-slate-600">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Brk Sharing</h3>
        </div>

        <div className="overflow-x-auto pb-4 tabs-scrollbar">
          <div className="flex items-center justify-start gap-8 min-w-max px-4">
          {/* Admin */}
          {admin && renderBrkUserCard(admin, 'Admin')}

          {/* Arrow */}
          {masters.length > 0 && (
            <div className="text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          )}

          {/* Masters */}
          {masters.map((master, idx) => (
            <React.Fragment key={master.userId}>
              {renderBrkUserCard(master, `Master (${master.username})`)}
              {idx < masters.length - 1 && (
                <div className="text-slate-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Arrow to Client */}
          {client && masters.length > 0 && (
            <div className="text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          )}

          {/* Client */}
          {client && renderBrkUserCard(client, `Master (${client.username})`)}
        </div>
        </div>
      </div>
    </div>
  );
};

export default SharingDetails;
