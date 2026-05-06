import React, { useState, useEffect } from 'react';
import { X, BarChart2, Clock, Activity } from 'lucide-react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import userManagementService from '../../services/userManagementService';

interface DurationRank {
    id: number;
    title: string;
    count: number;
}

interface TradeDurationRankModalProps {
    isOpen: boolean;
    user: any;
    onClose: () => void;
}

const TradeDurationRankModal: React.FC<TradeDurationRankModalProps> = ({ isOpen, user, onClose }) => {
    const [durations, setDurations] = useState<DurationRank[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) fetchDurationRank();
    }, [isOpen]);

    const fetchDurationRank = async () => {
        try {
            setIsLoading(true);
            const userId = user?.id || user?.userId;
            const response = await userManagementService.fetchTradeDurationRank(userId);

            const result = response?.data ? response.data : response;

            if (result && result.responseCode === "0" && Array.isArray(result.data)) {
                // The actual data array is result.data
                const sortedData = [...result.data].sort((a, b) => a.id - b.id);
                setDurations(sortedData);
            } else if (Array.isArray(result)) {
                // Fallback: If the service returns the array directly
                setDurations([...result].sort((a, b) => a.id - b.id));
            } else {
                console.error("Data structure mismatch or error code:", result?.responseCode);
            }
        } catch (error) {
            console.error('Duration Rank Error:', error);
            toast.error('Connection error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !user) return null;

    const totalTrades = durations.reduce((acc, curr) => acc + curr.count, 0);

    return createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-[99999] animate-fadeIn">
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200/50 dark:border-slate-700/50 overflow-hidden transform transition-all duration-300 animate-slideUp"
                style={{ width: '98vw', height: 'auto', maxHeight: '90vh', maxWidth: '500px' }}
            >
                {/* Header - Purple/Indigo theme to match Analytics */}
                <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-lg">
                            <Activity className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-tight">Trade Duration Analytics</h2>
                            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest opacity-80">
                                User: {user.username || user.name}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 px-6 py-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Fetching Analytics...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary Card */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between shadow-sm">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Trades Tracked</span>
                                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{totalTrades}</span>
                            </div>

                            {/* Duration List */}
                            <div className="space-y-3">
                                {durations.map((item) => {
                                    const percent = totalTrades > 0 ? (item.count / totalTrades) * 100 : 0;
                                    return (
                                        <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-indigo-400">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-start gap-2">
                                                    <Clock size={14} className="text-indigo-500 mt-1 flex-shrink-0" />
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">{item.title}</span>
                                                </div>
                                                <span className="text-sm font-black text-slate-900 dark:text-white">{item.count}</span>
                                            </div>
                                            {/* Visual Bar */}
                                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                    >
                        Close Report
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TradeDurationRankModal;