import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import userManagementService from '../../services/userManagementService';

interface IntradaySquareOffModalProps {
  isOpen: boolean;
  user: any;
  onClose: () => void;
  onSave?: (exchanges: Record<string, boolean>) => Promise<void> | void;
}

const IntradaySquareOffModal: React.FC<IntradaySquareOffModalProps> = ({ 
  isOpen, 
  user, 
  onClose,
  onSave 
}) => {
  const [intradayExchanges, setIntradayExchanges] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchExchanges();
    }
  }, [isOpen]);

  const fetchExchanges = async () => {
    try {
      setIsLoading(true);
      const response = await userManagementService.fetchExchanges();
      
      if (Array.isArray(response)) {
        // Transform exchange array to Record<string, boolean>
        // Initialize with the intraDaySquareOff value from API
        const exchangesMap: Record<string, boolean> = {};
        response.forEach((exchange) => {
          exchangesMap[exchange.name] = exchange.intraDaySquareOff || false;
        });
        setIntradayExchanges(exchangesMap);
      } else {
        toast.error('Failed to load exchanges');
      }
    } catch (error: any) {
      console.error('Error fetching exchanges:', error);
      toast.error('Failed to load exchanges');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (onSave) {
        await onSave(intradayExchanges);
      }
      toast.success('Intraday SquareOff settings saved successfully');
      onClose();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !user) return null;

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
        style={{ width: '98vw', height: '96vh', maxWidth: '500px' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Intraday SquareOff</h2>
            <p className="text-cyan-100 text-xs">
              User: {user.username || user.name}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 backdrop-blur-xl border border-white/30 hover:rotate-90 transform group disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 dark:border-blue-500 border-t-blue-500 dark:border-t-blue-300 mx-auto"></div>
                <p className="mt-4 text-slate-700 dark:text-slate-300 font-medium">Loading exchanges...</p>
              </div>
            </div>
          ) : Object.keys(intradayExchanges).length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-600 dark:text-slate-400">No exchanges available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.keys(intradayExchanges).map((exchange) => (
                <div 
                  key={exchange}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 hover:shadow-md transition-shadow"
                >
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{exchange}</span>
                  <button
                    onClick={() => setIntradayExchanges(prev => ({
                      ...prev,
                      [exchange]: !prev[exchange]
                    }))}
                    disabled={isSaving}
                    className={`w-12 h-6 rounded-full transition-all ${
                      intradayExchanges[exchange]
                        ? 'bg-blue-600'
                        : 'bg-gray-300 dark:bg-slate-600'
                    } disabled:opacity-50`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-lg transition-transform transform ${
                        intradayExchanges[exchange] ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 px-6 py-4 flex gap-3 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IntradaySquareOffModal;
