import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import userManagementService from '../../../services/userManagementService';

interface GroupOption {
  groupId: number;
  groupName: string;
  selected?: boolean;
}

interface ReplaceGroupModalProps {
  isOpen: boolean;
  groupName: string;
  selectedUserCount: number;
  loggedInUserId: number;
  targetUserId: number;
  exchangeId: number;
  selectedUserIds: number[];
  onClose: () => void;
  onConfirm: (newGroupId: number) => void;
}

const ReplaceGroupModal: React.FC<ReplaceGroupModalProps> = ({
  isOpen,
  groupName,
  selectedUserCount,
  loggedInUserId,
  targetUserId,
  exchangeId,
  selectedUserIds,
  onClose,
  onConfirm,
}) => {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedGroupId(null); // Clear previous selection
      fetchGroupsDropdown();
    }
  }, [isOpen, loggedInUserId, targetUserId, exchangeId]);

  const fetchGroupsDropdown = async () => {
    setLoading(true);
    try {
      const res = await userManagementService.fetchGroupsDropdown(
        loggedInUserId,
        targetUserId,
        exchangeId,
      );
      if (res?.responseCode === '0') {
        setGroups(res.data || []);
        // Pre-select the first group with selected=true or the first group
        const defaultGroup = res.data?.find((g: any) => g.selected) || res.data?.[0];
        if (defaultGroup) {
          setSelectedGroupId(defaultGroup.groupId);
        }
      } else {
        toast.error('Failed to load groups');
      }
    } catch (error) {
      console.error('Error fetching groups dropdown:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedGroupId) {
      toast.error('Please select a group');
      return;
    }
    onConfirm(selectedGroupId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md shadow-2xl border dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="font-bold text-lg">
            Replace For :- {groupName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Select Group.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Selected Users: {selectedUserCount}
            </p>
          </div>

          {loading ? (
            <p className="text-center text-gray-500">Loading groups...</p>
          ) : (
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Group :
              </label>
              <select
                value={selectedGroupId || ''}
                onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                className="w-full p-3 border-2 border-blue-500 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-slate-700 dark:text-white dark:border-blue-400"
              >
                <option value="">Select a group...</option>
                {groups.map((group) => (
                  <option key={group.groupId} value={group.groupId}>
                    {group.groupName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedGroupId || loading}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplaceGroupModal;
