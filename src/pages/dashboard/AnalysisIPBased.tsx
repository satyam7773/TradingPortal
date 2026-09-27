import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { X, ArrowLeft, Eye } from 'lucide-react';
import FilterLayout from '../../components/FilterLayout';
import userManagementService from '../../services/userManagementService';
import UserDetailsModal from '../user-management/UserDetailsModal';
import { useSorting } from '../../hooks/useSorting';

interface UserData {
  id: string;
  username: string;
  name: string;
  type: string;
  parent: string;
  credit: number;
  balance: number;
  sharing: any;
  bet: boolean;
  closeOut: boolean;
  margin: boolean;
  status: boolean;
  creditLimit: boolean;
  creditBasedMargin: boolean;
  betEnabled: boolean;
  closeOutEnabled: boolean;
  marginEnabled: boolean;
  statusEnabled: boolean;
  creditLimitEnabled: boolean;
  creditBasedMarginEnabled: boolean;
  createdDate: string;
  ipAddress: string;
  manualOrder: boolean;
  manualOrderEnabled: boolean;
  deviceId: string;
  lastLogin: string;
  isActive: boolean;
  isTradeLock: boolean;
  deleteTrade: boolean;
  deleteTradeEnabled: boolean;
  [key: string]: any;
}

let lastClickTime = 0;
let lastProcessedId: number | string | null = null;

const AnalysisIPBased: React.FC = () => {
  const [dates, setDates] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState<'IP' | 'Device'>('IP');
  const [username, setUsername] = useState('');

  const [mainData, setMainData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalStack, setModalStack] = useState<any[]>([]);
  const [modalData, setModalData] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const handleUserNameClick = (e: React.MouseEvent, username: string, userId: number | string | undefined | null) => {
    e.preventDefault();
    e.stopPropagation();

    // Accept both numeric and string IDs
    if (!userId) {
      console.warn('⚠️ No userId provided');
      return;
    }

    const currentTime = Date.now();

    if (lastProcessedId === userId && currentTime - lastClickTime < 800) {
      console.log('⏱️ Debounce - ignoring rapid click');
      return;
    }

    const userDataStr = localStorage.getItem('userData');
    const loggedInUser = userDataStr ? JSON.parse(userDataStr) : null;
    if (loggedInUser?.roleId === 4) {
      console.log('❌ Client role cannot open user details');
      return;
    }

    lastClickTime = currentTime;
    lastProcessedId = userId;

    const placeholderUser: any = {
      id: userId.toString(),
      username: username,
      name: username,
      type: 'Client',
      parent: '',
      credit: 0,
      balance: 0,
      sharing: null,
      bet: false,
      closeOut: false,
      margin: false,
      status: false,
      creditLimit: false,
      creditBasedMargin: false,
      betEnabled: false,
      closeOutEnabled: false,
      marginEnabled: false,
      statusEnabled: false,
      creditLimitEnabled: false,
      creditBasedMarginEnabled: false,
      createdDate: '',
      ipAddress: '',
      manualOrder: false,
      manualOrderEnabled: false,
      deviceId: '',
      lastLogin: '',
      isActive: true,
      isTradeLock: false,
      deleteTrade: false,
      deleteTradeEnabled: false
    };

    console.log('✅ Opening UserDetailsModal for:', { username, userId, placeholderUser });
    setSelectedUser(placeholderUser);
  };

  const handleView = async () => {
    setLoading(true);
    try {
      const response = await userManagementService.fetchIPDeviceSummary({
        fromDate: dates.from,
        toDate: dates.to,
        username: username || null,
        type: reportType
      });
      console.log('📊 Analysis Response:', response);
      
      if (response?.responseCode === '0') {
        setMainData(response.data || []);
      } else {
        toast.error("Failed to load analysis data");
        console.error('Invalid response structure:', response);
      }
    } catch (error) {
      toast.error("Error connecting to server");
      console.error('API Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModalData = async (ipOrDevice: string) => {
    setModalLoading(true);
    try {
      const payload: any = {
        fromDate: dates.from,
        toDate: dates.to,
        type: reportType,
        username: username || null
      };
      
      if (reportType === 'IP') {
        payload.ipAddress = ipOrDevice;
      } else {
        payload.deviceId = ipOrDevice;
      }

      const response = await userManagementService.fetchIPDeviceDetails(payload);
      console.log('📊 Details Response:', response);
      
      if (response?.responseCode === '0') {
        setModalData(response.data || []);
      } else {
        toast.error("Failed to load details");
        console.error('Invalid response structure:', response);
      }
    } catch (error) {
      toast.error("Error connecting to server");
      console.error('API Error:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const openModal = (ipOrDevice: string) => {
    setModalStack([ipOrDevice]);
    fetchModalData(ipOrDevice);
  };

  useEffect(() => {
    handleView();
  }, []);

  return (
    <>
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full mt-5">
        <FilterLayout 
          storageKey="analysis:ipbased:showFilters" 
          filterWidthClass="lg:w-[16%]" 
          filters={
            <div className="space-y-4 p-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">From Date :</label>
                <input 
                  type="date" 
                  value={dates.from} 
                  onChange={e => setDates({...dates, from: e.target.value})} 
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">To Date :</label>
                <input 
                  type="date" 
                  value={dates.to} 
                  onChange={e => setDates({...dates, to: e.target.value})} 
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Report Type :</label>
                <select 
                  value={reportType} 
                  onChange={e => setReportType(e.target.value as 'IP' | 'Device')} 
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                >
                  <option value="IP">IP Basis</option>
                  <option value="Device">Device Basis</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Username (Optional) :</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  placeholder="Leave blank for all"
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" 
                />
              </div>
              <button 
                onClick={handleView} 
                disabled={loading}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-bold text-sm transition disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'View'}
              </button>
            </div>
          }
        >
          <div className="h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 shadow-lg p-6 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-slate-600 dark:text-slate-400">Loading...</div>
              </div>
            ) : (
              <AnalysisTable 
                data={mainData} 
                reportType={reportType}
                onRowClick={(ipOrDevice: string) => openModal(ipOrDevice)}
              />
            )}
          </div>
        </FilterLayout>
      </div>

      {/* Details Modal */}
      {modalStack.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center pt-[12%]">
          <div className="w-full max-w-4xl bg-[#0b1221] rounded-3xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {reportType === 'IP' ? 'IP' : 'Device'} Details - {modalStack[0]}
                </h2>
              </div>
              <button 
                onClick={() => setModalStack([])} 
                className="p-2 hover:bg-slate-800 rounded-xl transition"
              >
                <X className="text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-[#0b1221]">
              {modalLoading ? (
                <div className="text-white text-center p-10">Loading...</div>
              ) : (
                <DetailsTable 
                  data={modalData}
                  reportType={reportType}
                  onUserClick={handleUserNameClick}
                />
              )}
            </div>
          </div>
        </div>
      )}
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

const AnalysisTable: React.FC<{
  data: any[];
  reportType: 'IP' | 'Device';
  onRowClick: (ipOrDevice: string) => void;
}> = ({ data, reportType, onRowClick }) => {
  const { sortColumn, sortDirection, handleSort, sortedData, getSortIcon } = useSorting({ data });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto scrollbar-thin">
      <table className="w-full text-sm text-slate-700 dark:text-slate-300">
        <thead className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 sticky top-0 z-10 border-b border-gray-200/50 dark:border-slate-600/50">
          <tr>
            <th className="p-3 text-center">Action</th>
            <th className="p-3 text-left cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('executionDate')}>
              <div className="flex items-center gap-2">Execution Time {getSortIcon('executionDate')}</div>
            </th>
            {reportType === 'IP' ? (
              <th className="p-3 text-left cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('ipAddress')}>
                <div className="flex items-center gap-2">IP Address {getSortIcon('ipAddress')}</div>
              </th>
            ) : (
              <th className="p-3 text-left cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('deviceId')}>
                <div className="flex items-center gap-2">Device ID {getSortIcon('deviceId')}</div>
              </th>
            )}
            <th className="p-3 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition" onClick={() => handleSort('usersCount')}>
              <div className="flex items-center justify-center gap-2">Users Count {getSortIcon('usersCount')}</div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
          {sortedData?.map((item: any, i: number) => (
            <tr 
              key={i} 
              className="hover:bg-blue-50 dark:hover:bg-slate-700 transition"
            >
              <td className="p-3 text-center">
                <button
                  onClick={() => onRowClick(reportType === 'IP' ? item.ipAddress : item.deviceId)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition"
                >
                  <Eye size={14} />
                  View
                </button>
              </td>
              <td className="p-3">{item.executionDate}</td>
              <td className="p-3">
                {reportType === 'IP' ? item.ipAddress : item.deviceId || 'N/A'}
              </td>
              <td className="p-3 text-center">{item.usersCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {(!sortedData || sortedData.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-500 dark:text-slate-400">No data available</div>
        </div>
      )}
    </div>
  );
};

const DetailsTable: React.FC<{
  data: any[];
  reportType?: 'IP' | 'Device';
  onUserClick?: (e: React.MouseEvent, username: string, userId: number | string | undefined) => void;
}> = ({ data, reportType = 'IP', onUserClick }) => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto scrollbar-thin">
      <table className="w-full text-sm text-slate-300">
        <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-700">
          <tr>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Parent User</th>
            <th className="p-3 text-left">
              {reportType === 'IP' ? 'IP Address' : 'Device ID'}
            </th>
          </tr>
        </thead>
        <tbody>
          {data?.map((item: any, i: number) => {
            // Debug: log the item structure to see available fields
            if (i === 0) console.log('📋 API Response Item Structure:', item);
            
            return (
            <tr 
              key={i}
              className="hover:bg-slate-700 border-b border-slate-700 transition"
            >
              <td 
                className="p-3 transition text-blue-400 cursor-pointer hover:underline"
                onClick={(e) => {
                  if (item.userId) {
                    console.log('👤 Clicking user:', { name: item.name, userId: item.userId });
                    onUserClick?.(e, item.name, item.userId);
                  }
                }}
              >
                {item.name}
              </td>
              <td 
                className={`p-3 transition ${item.parentUser ? 'text-blue-400 cursor-pointer hover:underline' : 'text-slate-400 cursor-default'}`}
                onClick={(e) => {
                  if (item.parentUser && item.parentUserId) {
                    console.log('👤 Clicking parent user:', { parentUser: item.parentUser, parentUserId: item.parentUserId });
                    onUserClick?.(e, item.parentUser, item.parentUserId);
                  }
                }}
              >
                {item.parentUser || '-'}
              </td>
              <td className="p-3">
                {reportType === 'IP' ? item.ipAddress : item.deviceId || 'N/A'}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      {(!data || data.length === 0) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-400">No users found</div>
        </div>
      )}
    </div>
  );
};

export default AnalysisIPBased;
