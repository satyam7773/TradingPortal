import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus, X, Bell, Clock, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import FilterLayout from '../../components/FilterLayout';
import { API_ENDPOINTS } from '../../config/apiConfig';

interface AdminMessage {
  id: number;
  start_date: string;
  end_date: string;
  message: string;
}

interface AdminMessagesResponse {
  responseCode: string;
  responseMessage: string;
  data: AdminMessage[];
}

const AdminMessages: React.FC = () => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [formMessage, setFormMessage] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  const userData = localStorage.getItem('userData');
  const user = userData ? JSON.parse(userData) : null;
  const loggedInUserId = user?.userId || 31;
  const userRoleId = user?.roleId;

  // Role-based access control
  const isAdminOnly = userRoleId === 1 || userRoleId === 2; // Strict Admin - can create/edit/delete
  const isAdminOrMaster = userRoleId === 1 || userRoleId === 2 || userRoleId === 3; // Admin + Master - can view
  const isClient = userRoleId === 4; // Client - can view

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = `${API_ENDPOINTS.SETTINGS.ADMIN_MESSAGES}?all=${showAll ? 'yes' : 'no'}`;
      const response = await fetch(endpoint);
      const res: AdminMessagesResponse = await response.json();

      if (res?.responseCode === '0' && Array.isArray(res.data)) {
        setMessages(res.data);
      } else {
        toast.error(res?.responseMessage || 'Failed to fetch messages');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [showAll]);

  // Load messages on mount and when showAll changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Handle form submission
  const handleSaveMessage = async () => {
    if (!formMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (!formStartDate) {
      toast.error('Please select a start date');
      return;
    }
    if (!formEndDate) {
      toast.error('Please select an end date');
      return;
    }

    // Validate dates
    const startDate = new Date(formStartDate);
    const endDate = new Date(formEndDate);
    if (startDate > endDate) {
      toast.error('Start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        userId: loggedInUserId,
        data: {
          message: formMessage.trim(),
          start_date: formStartDate,
          end_date: formEndDate,
          ...(editingId && { id: editingId })
        }
      };

      const response = await fetch(API_ENDPOINTS.SETTINGS.SAVE_ADMIN_MESSAGE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const res = await response.json();

      if (res?.responseCode === '0') {
        toast.success(res?.responseMessage || 'Message saved successfully');
        resetForm();
        setShowModal(false);
        await fetchMessages();
      } else {
        toast.error(res?.responseMessage || 'Failed to save message');
      }
    } catch (error) {
      console.error('Error saving message:', error);
      toast.error('Failed to save message');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (message: AdminMessage) => {
    setEditingId(message.id);
    setFormMessage(message.message);
    setFormStartDate(message.start_date);
    setFormEndDate(message.end_date);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        userId: loggedInUserId,
        data: {
          id: id,
          message: '', // Empty message to indicate deletion
          start_date: '',
          end_date: ''
        }
      };

      const response = await fetch(API_ENDPOINTS.SETTINGS.SAVE_ADMIN_MESSAGE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const res = await response.json();

      if (res?.responseCode === '0') {
        toast.success('Message deleted successfully');
        await fetchMessages();
      } else {
        toast.error(res?.responseMessage || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormMessage('');
    setFormStartDate('');
    setFormEndDate('');
    setEditingId(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  // Check if message is active today
  const isActiveToday = (message: AdminMessage) => {
    const today = new Date().toISOString().split('T')[0];
    return message.start_date <= today && message.end_date >= today;
  };

  return (
    <FilterLayout
      storageKey="adminMessages:showFilters"
      filterWidthClass="lg:w-[18%]"
      filters={
        <div className="space-y-6 p-6">
          {/* Filter Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Message Filter</label>
            </div>
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 border border-slate-200/50 dark:border-slate-700/50">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="radio"
                    name="messageFilter"
                    checked={!showAll}
                    onChange={() => setShowAll(false)}
                    className="w-4 h-4 cursor-pointer accent-blue-600"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Active Today</span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">Currently active messages</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="radio"
                    name="messageFilter"
                    checked={showAll}
                    onChange={() => setShowAll(true)}
                    className="w-4 h-4 cursor-pointer accent-blue-600"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">All Messages</span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">View all messages</span>
                </div>
              </label>
            </div>
          </div>

          {/* New Message Button - Admin Only */}
          {isAdminOnly && (
            <button
              onClick={handleOpenModal}
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-semibold text-sm transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              <span>New Message</span>
            </button>
          )}

          {/* Message Count */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200/50 dark:border-blue-700/50">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{messages.length}</div>
            <div className="text-xs text-blue-700/70 dark:text-blue-300/70 font-medium mt-1">{showAll ? 'Total Messages' : 'Active Today'}</div>
          </div>
        </div>
      }
    >
      {/* Main Content */}
      <div className="p-6 flex flex-col h-full gap-4">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200/50 dark:border-green-700/50 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Active Messages</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{messages.filter(m => isActiveToday(m)).length}</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 rounded-lg p-4 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              <Clock className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Total Messages</div>
              <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{messages.length}</div>
            </div>
          </div>
        </div>

        {/* Table Container */}
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 mx-auto mb-4 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-4 border-blue-300 border-t-blue-100 animate-spin"></div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
                <Bell className="w-8 h-8 text-slate-400 dark:text-slate-600" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No messages found</p>
              <button
                onClick={handleOpenModal}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold text-sm"
              >
                Create your first message →
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 z-10 border-b border-slate-200 dark:border-slate-600">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2">
                        <Bell className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Message</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Start Date</span>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">End Date</span>
                    </th>
                    <th className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Status</span>
                    </th>
                    {isAdminOnly && (
                      <th className="px-6 py-4 text-center">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                  {messages.map((message, index) => {
                    const active = isActiveToday(message);
                    return (
                      <tr key={message.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all duration-200 group">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${active ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                            <p className="text-sm text-slate-900 dark:text-slate-100 font-medium max-w-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-normal">
                              {message.message}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                            {new Date(message.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                            {new Date(message.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {active ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 dark:from-green-900/40 dark:to-emerald-900/40 dark:text-green-400 border border-green-200/50 dark:border-green-700/50">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Inactive
                            </span>
                          )}
                        </td>
                        {isAdminOnly && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                onClick={() => handleEdit(message)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 dark:hover:bg-blue-500/20 transition-all duration-200 text-xs font-bold uppercase tracking-wide hover:scale-110 active:scale-95"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(message.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/20 transition-all duration-200 text-xs font-bold uppercase tracking-wide hover:scale-110 active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modern Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-800 px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {editingId ? '✏️ Edit Message' : '📝 Create Message'}
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Message Input */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Message
                </label>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Enter the message text that will be displayed to users..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 resize-none transition-all duration-200 font-medium text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Maximum 500 characters recommended</p>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200 font-medium text-sm"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    <Clock className="w-4 h-4 text-blue-600" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200 font-medium text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 px-8 py-6 flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-all duration-200 uppercase text-sm tracking-wide hover:border-slate-400 dark:hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMessage}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold transition-all duration-200 uppercase text-sm tracking-wide shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 active:scale-95"
              >
                {loading ? '⏳ Saving...' : editingId ? '✓ Update' : '✓ Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FilterLayout>
  );
};

export default AdminMessages;
