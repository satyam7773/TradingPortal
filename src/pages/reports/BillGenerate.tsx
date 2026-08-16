import React, { useState, useEffect, useMemo } from 'react';
import FilterLayout from '../../components/FilterLayout';
import SearchableSelect from '../../components/ui/SearchableSelect';
import userManagementService from '../../services/userManagementService';
import toast from 'react-hot-toast';

const BillGenerate: React.FC = () => {
    const getMondayOfCurrentWeek = () => {
        const d = new Date();
        // Get current day (0=Sun, 1=Mon, ..., 6=Sat)
        const day = d.getDay();

        // Subtract days to get to Monday (if Sunday, subtract 6)
        const diff = d.getDate() - (day === 0 ? 6 : day - 1);
        d.setDate(diff);

        // Format manually to YYYY-MM-DD in local time
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-11
        const dayOfMonth = String(d.getDate()).padStart(2, '0');

        return `${year}-${month}-${dayOfMonth}`;
    };

    // Use it in your state:
    const [fromDate, setFromDate] = useState(getMondayOfCurrentWeek);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);


    const [userId, setUserId] = useState<number>(0);
    const [select, setSelect] = useState<'PDF' | 'EXCEL'>('PDF');
    const [pdfType, setPdfType] = useState<'REGULAR' | 'ADVANCE' | null>('REGULAR');
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {

                const userData = localStorage.getItem('userData')
                const user = userData ? JSON.parse(userData) : null
                const loggedInUserId = user?.userId
                const resp = await userManagementService.fetchOwnUsersforBillGenerate(loggedInUserId);
                if (resp?.data) setUsers(resp.data);
            } catch (error) {
                toast.error('Failed to load users');
            }
        };
        fetchUsers();
    }, []);

    // Memoize users for SearchableSelect to ensure consistency
    const userOptions = useMemo(() =>
        users.map(u => ({ id: u.id || u.userId, name: u.name || u.userName })),
        [users]
    );

    const handleDownload = async (isPreview: boolean = false) => {
        // 1. Validation
        if (!userId || userId === 0) {
            toast.error('Please select a user before generating the report.');
            return;
        }

        try {
            const payload = {
                fromDate,
                toDate,
                userId: Number(userId),
                select,
                pdfType: select === 'PDF' ? pdfType : null
            };

            const response = await userManagementService.generateBillingReport(payload);

            if (response?.responseCode === '0') {
                const byteCharacters = atob(response.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], {
                    type: select === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                });
                const url = URL.createObjectURL(blob);

                if (isPreview && select === 'PDF') {
                    window.open(url, '_blank');
                } else {
                    const downloadLink = document.createElement("a");
                    downloadLink.href = url;


                    // Replace it with this logic:
                    const extension = select === 'EXCEL' ? 'xlsx' : 'pdf';
                    downloadLink.download = `Bill_${fromDate}_${toDate}.${extension}`;

                    downloadLink.click();
                }
                toast.success(isPreview ? 'Opening preview...' : 'Download started');
            } else {
                toast.error(response?.responseMessage || 'Failed to generate report');
            }
        } catch (e) {
            toast.error('Error connecting to server');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
            <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
                <FilterLayout
                    storageKey="bill:showFilters"
                    filterWidthClass="lg:w-[16%]"
                    filters={
                        <div className="space-y-4 p-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">From :</label>
                                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">To :</label>
                                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500" />
                            </div>

                            <SearchableSelect
                                label="Username :"
                                items={userOptions}
                                selectedId={userId}
                                onSelect={(id) => setUserId(Number(id))}
                                placeholder="Search user..."
                            />

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Select :</label>
                                <select value={select} onChange={(e) => setSelect(e.target.value as 'PDF' | 'EXCEL')} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500">
                                    <option value="PDF">PDF</option>
                                    <option value="EXCEL">EXCEL</option>
                                </select>
                            </div>

                            {select === 'PDF' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">PDF Type :</label>
                                    <select value={pdfType || ''} onChange={(e) => setPdfType(e.target.value as 'REGULAR' | 'ADVANCE')} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500">
                                        <option value="REGULAR">Regular Report</option>
                                        <option value="ADVANCE">Advance Report</option>
                                    </select>
                                </div>
                            )}
                            {/* <div className="flex gap-2 pt-2">
                                <button onClick={handleDownload} className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition shadow-md">Submit</button>
                            </div> */}

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => handleDownload(true)}
                                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold text-sm transition shadow-md"
                                >
                                    Preview
                                </button>
                                <button
                                    onClick={() => handleDownload(false)}
                                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition shadow-md"
                                >
                                    Download
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
                        <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 backdrop-blur-sm">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Bill Generate</h1>
                        </div>
                        <div className="flex-1 p-8 text-slate-500 dark:text-slate-400">
                            Please select your criteria from the filters to generate and download billing reports.
                        </div>
                    </div>
                </FilterLayout>
            </div>
        </div>
    );
};

export default BillGenerate;