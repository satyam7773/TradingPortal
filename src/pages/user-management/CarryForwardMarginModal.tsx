import React, { useState, useEffect } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import userManagementService from '../../services/userManagementService';

interface CarryForwardMarginModalProps {
    isOpen: boolean;
    user: any;
    onClose: () => void;
    onSave?: (exchanges: Record<string, boolean>) => Promise<void> | void;
}

const CarryForwardMarginModal: React.FC<CarryForwardMarginModalProps> = ({
    isOpen,
    user,
    onClose,
    onSave
}) => {
    const [marginExchanges, setMarginExchanges] = useState<Record<string, boolean>>({});
    const [exchangeData, setExchangeData] = useState<any[]>([]);
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
            const userId = user?.id || user?.userId;
            const response = await userManagementService.fetchExchanges(userId);

            console.log('📡 API Response:', response);

            // Handle the raw array response directly
            if (Array.isArray(response)) {
                setExchangeData(response);
                const exchangesMap: Record<string, boolean> = {};
                response.forEach((exchange: any) => {
                    // Binding to 'cfMargin' field
                    exchangesMap[exchange.name] = exchange.cfMargin || false;
                });
                setMarginExchanges(exchangesMap);
            }

            else {
                toast.error('Unexpected data format from server');
            }
        } catch (error: any) {
            console.error('❌ Error fetching exchanges:', error);
            toast.error('Failed to load exchanges');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            // Construct the payload exactly like the curl requirement
            const updatedExchanges = exchangeData.map((exchange) => ({
                name: exchange.name,
                turnover: exchange.turnover ?? true,
                lot: exchange.lot ?? false,
                groupId: exchange.groupId || 0,
                groupName: exchange.groupName || null,
                intraDaySquareOff: exchange.intraDaySquareOff ?? false,
                cfMargin: marginExchanges[exchange.name] ?? false,
            }));

            const userId = user?.id || user?.userId;
            const result = await userManagementService.updateCarryForwardMargin(userId, updatedExchanges);

            // Check for successful response code
            if (result && result.responseCode === "0") {
                toast.success('Carry Forward Margin updated successfully');
                if (onSave) await onSave(marginExchanges);
                onClose();
            } else {
                toast.error(result?.responseMessage || 'Update failed');
            }
        } catch (error: any) {
            console.error('❌ Error saving settings:', error);
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !user) return null;

    return createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-50 animate-fadeIn"
            style={{ zIndex: 99999 }}
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200/50 dark:border-slate-700/50 overflow-hidden transform transition-all duration-300 animate-slideUp"
                style={{ width: '98vw', height: 'auto', maxHeight: '90vh', maxWidth: '450px' }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-900 px-6 py-5 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">CF Margin Rights</h2>
                            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider">
                                User: {user.username || user.name}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={isSaving} className="text-white hover:bg-white/10 rounded-full p-1 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 px-6 py-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent shadow-lg"></div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Syncing Data...</p>
                        </div>
                    ) : exchangeData.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 font-medium">
                            No exchange configuration found.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {exchangeData.map((exchange) => (
                                <div
                                    key={exchange.name}
                                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-300 transition-colors"
                                >
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                                        {exchange.name}
                                    </span>
                                    <button
                                        onClick={() => setMarginExchanges(prev => ({ ...prev, [exchange.name]: !prev[exchange.name] }))}
                                        disabled={isSaving}
                                        className={`w-12 h-6 rounded-full transition-all duration-300 relative shadow-inner ${marginExchanges[exchange.name] ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all transform shadow-md ${marginExchanges[exchange.name] ? 'translate-x-7' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                    <button onClick={onClose} disabled={isSaving} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving || isLoading} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-indigo-600/30 transition-all">
                        {isSaving ? 'Saving...' : 'Update Rights'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CarryForwardMarginModal;