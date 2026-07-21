import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import FilterLayout from '../../components/FilterLayout';
import toast from 'react-hot-toast';
import userManagementService from '../../services/userManagementService';
import SearchableSelect from '../../components/ui/SearchableSelect';
import UserDetailsModal from '../user-management/UserDetailsModal';

interface SummaryData {
    date: string;
    username: string;
    userId?: number;
    particular: string;
    quantity: number;
    side: string;
    price: number;
    type: string;
    amount: number;
    closing: number;
    openQty: string;
}

interface UserData {
    id: string;
    username: string;
    name: string;
    isActive: boolean;
}

let lastClickTime = 0;
let lastProcessedId: number | null = null;

const getMondayOfCurrentWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    d.setDate(diff);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
};

const AccountSummary: React.FC = () => {
    // Initialize dates - from Monday of current week, to today
    const today = new Date().toLocaleDateString('en-CA');
    const monday = getMondayOfCurrentWeek();

    const [filters, setFilters] = useState({
        fromDate: monday,
        toDate: today,
        selectedUserId: 0,
        pnl: true,
        brk: true,
        other: false
    });

    const [summaryData, setSummaryData] = useState<SummaryData[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const pageSize = 10;

    // Get logged in user ID
    const userDataStr = localStorage.getItem('userData');
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    const loggedInUserId = userData?.userId;

    const userOptions = useMemo(() => [
        ...users.map(u => ({ id: u.userId, name: u.userName }))
    ], [users]);

    // Fetch account summary data
    const handleFetchSummary = async (page: number = 0, currentFilters?: typeof filters) => {
        if (!loggedInUserId) {
            toast.error('User not logged in');
            return;
        }

        setLoading(true);
        try {
            const filtersToUse = currentFilters || filters;

            const targetUserId = filtersToUse.selectedUserId || loggedInUserId;
            const payload: any = {
                userId: targetUserId,
                requestTimestamp: '',
                data: {
                    from: filtersToUse.fromDate,
                    to: filtersToUse.toDate,
                    userId: targetUserId,
                    page: page,
                    brokerage: filtersToUse.brk,
                    pnl: filtersToUse.pnl,
                    other: filtersToUse.other
                }
            };

            const response = await fetch('https://api-staging.rivoplus.live/reports/accountSummary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result?.responseCode === '0') {
                const summaryList = Array.isArray(result.data) ? result.data : [];
                setSummaryData(summaryList);
                const totalSize = summaryList.length;
                setTotalRecords(totalSize);
                setTotalPages(Math.ceil(totalSize / pageSize));
                setCurrentPage(page);
            } else {
                setSummaryData([]);
                if (result?.responseMessage) toast.error(result.responseMessage);
            }
        } catch (error) {
            toast.error('Error fetching account summary');
            setSummaryData([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && newPage < totalPages) {
            handleFetchSummary(newPage);
        }
    };

    // Load initial metadata
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setInitialLoading(true);

                // Fetch users
                const usersResponse = await userManagementService.fetchOwnUsers(loggedInUserId);
                if (usersResponse?.responseCode === '0' && Array.isArray(usersResponse.data)) {
                    setUsers(usersResponse.data);
                }
            } catch (error) {
                toast.error('Failed to load metadata');
            } finally {
                setInitialLoading(false);
            }
        };

        loadInitialData();
    }, []);

    const handleFilterChange = (field: string, value: any) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            fromDate: monday,
            toDate: today,
            selectedUserId: 0,
            pnl: true,
            brk: true,
            other: false
        });
        setSummaryData([]);
    };

    const handleUserNameClick = (e: React.MouseEvent, username: string, userId?: number) => {
        e.preventDefault();
        e.stopPropagation();

        const currentTime = Date.now();

        if (!userId || userId === 0 || (lastProcessedId === userId && currentTime - lastClickTime < 800)) {
            return;
        }

        const userDataStr = localStorage.getItem('userData');
        const loggedInUser = userDataStr ? JSON.parse(userDataStr) : null;
        if (loggedInUser?.roleId === 4) return;

        lastClickTime = currentTime;
        lastProcessedId = userId;

        const placeholderUser: UserData = {
            id: userId.toString(),
            username: username,
            name: username,
            isActive: true
        };

        setSelectedUser(placeholderUser);
    };

    // Get paginated data
    const paginatedData = useMemo(() => {
        const startIndex = currentPage * pageSize;
        return summaryData.slice(startIndex, startIndex + pageSize);
    }, [summaryData, currentPage]);

    return (
        <>
        <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
            <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
                <FilterLayout
                    header={(
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                                    <BarChart3 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                        Account Summary
                                    </h1>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{summaryData.length} transactions found</p>
                                </div>
                            </div>
                        </div>
                    )}
                    filters={(
                        <div className="space-y-4 p-4">
                            {/* From Date */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">From</label>
                                <input
                                    type="date"
                                    value={filters.fromDate}
                                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* To Date */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">To</label>
                                <input
                                    type="date"
                                    value={filters.toDate}
                                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Username */}
                            <SearchableSelect
                                label="Username :"
                                items={userOptions}
                                selectedId={filters.selectedUserId}
                                onSelect={(userId) => handleFilterChange('selectedUserId', Number(userId))}
                                placeholder="Search user..."
                            />

                            {/* Checkboxes */}
                            <div className="border-t border-gray-200 dark:border-slate-600 pt-4 mt-4">
                                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase">Show Types</h3>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.pnl}
                                            onChange={(e) => handleFilterChange('pnl', e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">P/L</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.brk}
                                            onChange={(e) => handleFilterChange('brk', e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Brk</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filters.other}
                                            onChange={(e) => handleFilterChange('other', e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Other</span>
                                    </label>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => handleFetchSummary()}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 text-sm font-semibold shadow-lg disabled:opacity-60"
                                >
                                    {loading ? 'Loading...' : 'View'}
                                </button>
                                <button
                                    onClick={handleClearFilters}
                                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-all duration-200 text-sm font-semibold"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}
                >
                    <div className="flex-1 overflow-auto flex flex-col">
                        <div className="flex-1 bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl">
                            <div className="overflow-x-auto h-full">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-slate-100 to-blue-100 dark:from-slate-700 dark:to-slate-600 border-b border-gray-200/50 dark:border-slate-600/50">
                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Date</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Username</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Particular</th>
                                            <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Qty</th>
                                            <th className="text-center px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Buy/Sell</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Price</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Type</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Amount</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Closing</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Open Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
                                        {paginatedData.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="px-4 py-12 text-center">
                                                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                                    <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
                                                </td>
                                            </tr>
                                        ) : paginatedData.map((row, index) => {
                                            const sideColorClass = row.side === 'BUY'
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-red-600 dark:text-red-400';
                                            const sideBgClass = row.side === 'BUY'
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                                : 'bg-red-100 dark:bg-red-900/30';
                                            const typeColorClass = row.type === 'Profit/Loss'
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : row.type === 'Brokerage'
                                                    ? 'text-orange-600 dark:text-orange-400'
                                                    : 'text-slate-600 dark:text-slate-400';

                                            return (
                                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <td className="text-left px-4 py-3 text-xs text-slate-900 dark:text-white whitespace-nowrap">
                                                        {
                                                            row.date ? new Date(row.date).toLocaleString() : '-'
                                                        }
                                                    </td>
                                                    <td className="text-left px-4 py-3 text-xs whitespace-nowrap">
                                                        <span
                                                            className="text-sm font-semibold text-blue-600 underline cursor-pointer hover:text-blue-800 transition-colors dark:text-blue-400 dark:hover:text-blue-300"
                                                            onClick={(e) => handleUserNameClick(e, row.username, row.userId)}
                                                        >
                                                            {row.username}
                                                        </span>
                                                    </td>
                                                    <td className="text-left px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                                                        {row.particular}
                                                    </td>
                                                    <td className="text-center px-4 py-3 text-xs text-slate-900 dark:text-white whitespace-nowrap">
                                                        {row.quantity}
                                                    </td>
                                                    <td className="text-center px-4 py-3 text-xs whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded-full font-semibold ${sideBgClass} ${sideColorClass}`}>
                                                            {row.side}
                                                        </span>
                                                    </td>
                                                    <td className="text-right px-4 py-3 text-xs text-slate-900 dark:text-white whitespace-nowrap">
                                                        ₹{row.price?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className={`text-left px-4 py-3 text-xs font-semibold whitespace-nowrap ${typeColorClass}`}>
                                                        {row.type}
                                                    </td>
                                                    <td className={`text-right px-4 py-3 text-xs font-semibold whitespace-nowrap ${
                                                        row.amount >= 0
                                                            ? 'text-blue-600 dark:text-blue-400'
                                                            : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        ₹{row.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className={`text-right px-4 py-3 text-xs font-semibold whitespace-nowrap ${
                                                        row.closing >= 0
                                                            ? 'text-blue-600 dark:text-blue-400'
                                                            : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        ₹{row.closing?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="text-left px-4 py-3 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                        {row.openQty}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200/50 dark:border-slate-600/50 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                    Showing <span className="font-semibold text-slate-900 dark:text-white">{currentPage * pageSize + 1}</span> to{' '}
                                    <span className="font-semibold text-slate-900 dark:text-white">{Math.min((currentPage + 1) * pageSize, totalRecords)}</span> of{' '}
                                    <span className="font-semibold text-slate-900 dark:text-white">{totalRecords}</span> results
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 0 || loading}
                                        className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 transition shadow-sm inline-flex items-center gap-2"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Previous
                                    </button>
                                    <span className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                        Page {currentPage + 1} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage >= totalPages - 1 || loading}
                                        className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 transition shadow-sm inline-flex items-center gap-2"
                                    >
                                        Next <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </FilterLayout>
            </div>
        </div>

        {selectedUser && createPortal(
            <div className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-[9999]" onClick={() => setSelectedUser(null)}>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl flex flex-col border border-gray-200/50 overflow-hidden" style={{ width: '98vw', height: '96vh', maxWidth: '1800px' }} onClick={(e) => e.stopPropagation()}>
                    <UserDetailsModal
                        user={selectedUser}
                        onClose={() => setSelectedUser(null)}
                        onToggle={() => { }}
                    />
                </div>
            </div>,
            document.body
        )}
        </>
    );
};

export default AccountSummary;
