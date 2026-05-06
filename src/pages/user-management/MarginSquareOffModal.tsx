import React, { useState, useEffect } from 'react';
import { X, Percent } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import userManagementService from '../../services/userManagementService';

interface MarginSquareOffModalProps {
  isOpen: boolean;
  user: any;
  onClose: () => void;
}

const MarginSquareOffModal: React.FC<MarginSquareOffModalProps> = ({ 
  isOpen, 
  user, 
  onClose 
}) => {
  const [percentage, setPercentage] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCurrentValue();
    }
  }, [isOpen]);

  const fetchCurrentValue = async () => {
    try {
      setIsLoading(true);
      const userId = user?.id || user?.userId;
      const response = await userManagementService.fetchAutoSquareOff(userId);
      
      if (response?.responseCode === "0") {
        setPercentage(response.data?.autoSquareOffPercent?.toString() || '0');
      }
    } catch (error) {
      console.error('Error fetching auto square off:', error);
      toast.error('Failed to load margin settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const userId = user?.id || user?.userId;
      const response = await userManagementService.updateAutoSquareOff(userId, parseFloat(percentage));

      if (response?.responseCode === "0") {
        toast.success('Margin Square Off updated successfully');
        onClose();
      } else {
        toast.error(response?.responseMessage || 'Update failed');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !user) return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-[99999] animate-fadeIn" 
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200/50 dark:border-slate-700/50 overflow-hidden transform transition-all duration-300 animate-slideUp"
        style={{ width: '98vw', height: '96vh', maxWidth: '500px' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* DESIGN MATCH: Header Gradient and Styling */}
        <div className="relative bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-lg">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Margin SquareOff</h2>
              <p className="text-rose-100 text-xs">
                User: {user.username || user.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 backdrop-blur-xl border border-white/30 hover:rotate-90 transform group disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* DESIGN MATCH: Content Background and Loading */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-rose-50/30 to-orange-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-6 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-200 dark:border-rose-500 border-t-rose-600 mx-auto shadow-lg"></div>
                <p className="mt-4 text-slate-700 dark:text-slate-300 font-medium animate-pulse uppercase text-xs tracking-widest">Loading Settings...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info Card */}
              <div className="p-4 bg-white dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 shadow-sm flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 tracking-wide uppercase text-[10px]">Default Cash Margin</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">100.000%</span>
              </div>

              {/* Input Card */}
              <div className="p-6 bg-white dark:bg-slate-700 rounded-2xl border-2 border-rose-500 dark:border-rose-500/50 shadow-xl transition-all">
                <label className="block text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-3">Update Cash Margin (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 px-4 py-4 rounded-xl text-2xl font-black text-slate-900 dark:text-white text-right focus:outline-none border border-transparent focus:border-rose-500 transition-all"
                    placeholder="0.00"
                    autoFocus
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</div>
                </div>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/50">
                <p className="text-[11px] text-orange-700 dark:text-orange-400 font-medium leading-relaxed italic">
                  Note: Square off will be triggered automatically when the MTM loss reaches the specified percentage of the available cash margin.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* DESIGN MATCH: Footer Styling */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 px-6 py-5 flex gap-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
          >
            {isSaving ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MarginSquareOffModal;