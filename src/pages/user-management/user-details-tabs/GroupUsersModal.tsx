import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import userManagementService from '../../../services/userManagementService';

interface GroupUser {
  userId: number;
  userName: string;
  parentUserName: string;
}

interface GroupUsersModalProps {
  isOpen: boolean;
  groupId: number;
  groupName: string;
  parentId: number;
  onClose: () => void;
  onReplaceClick: (selectedUsers: number[]) => void;
}

const GroupUsersModal: React.FC<GroupUsersModalProps> = ({
  isOpen,
  groupId,
  groupName,
  parentId,
  onClose,
  onReplaceClick,
}) => {
  const [users, setUsers] = useState<GroupUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSelectedUserIds(new Set()); // Clear previous selections
      fetchGroupUsers();
    }
  }, [isOpen, groupId, parentId]);

  const fetchGroupUsers = async () => {
    setLoading(true);
    try {
      const res = await userManagementService.fetchGroupUsers(groupId, parentId);
      if (res?.responseCode === '0') {
        setUsers(res.data || []);
      } else {
        toast.error('Failed to load group users');
      }
    } catch (error) {
      console.error('Error fetching group users:', error);
      toast.error('Failed to load group users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (userId: number) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelectedUserIds(next);
  };

  const handleSelectAll = () => {
    setSelectedUserIds(new Set(users.map(u => u.userId)));
  };

  const handleDeselectAll = () => {
    setSelectedUserIds(new Set());
  };

  const handleReplace = () => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one user');
      return;
    }
    onReplaceClick(Array.from(selectedUserIds));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border dark:border-slate-700">
        {/* Header */}
        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg">🔴 {groupName} (Total Users: {users.length})</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500">No users assigned to this group</p>
          ) : (
            <div>
              {/* Action Buttons */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                >
                  Deselect All
                </button>
                <span className="ml-auto text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Selected: {selectedUserIds.size}
                </span>
              </div>

              {/* Users Table */}
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.size === users.length && users.length > 0}
                        onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                      />
                    </th>
                    <th className="p-2 text-left">Username</th>
                    <th className="p-2 text-left">Parent User</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.userId}
                      className={`border-b dark:border-slate-700 ${
                        selectedUserIds.has(user.userId) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(user.userId)}
                          onChange={() => handleToggleUser(user.userId)}
                        />
                      </td>
                      <td className="p-2">
                        <a href="#" className="text-blue-600 hover:underline">
                          {user.userName}
                        </a>
                      </td>
                      <td className="p-2">{user.parentUserName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-700 flex gap-2 flex-shrink-0 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleReplace}
            disabled={selectedUserIds.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            Replace Group For Selected({selectedUserIds.size})
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupUsersModal;
