import React, { useState, useEffect, useMemo } from 'react';
import FilterLayout from '../../components/FilterLayout';
import SearchableSelect from '../../components/ui/SearchableSelect';
import userManagementService from '../../services/userManagementService';
import toast from 'react-hot-toast';

const Settlement: React.FC = () => {
  const [dates, setDates] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [opening, setOpening] = useState<'WITH' | 'WITHOUT'>('WITH');
  const [userId, setUserId] = useState<number>(0);
  const [users, setUsers] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userData = localStorage.getItem('userData');
        const user = userData ? JSON.parse(userData) : null;
        const resp = await userManagementService.fetchOwnUsers(user?.userId);
        if (resp?.data) setUsers([{ id: 0, name: 'All Users' }, ...resp.data]);
      } catch (error) { toast.error('Failed to load users'); }
    };
    fetchUsers();
  }, []);

  const userOptions = useMemo(() =>
    users.map(u => ({ id: u.id || u.userId, name: u.name || u.userName })),
    [users]
  );

  const handleView = async () => {
    setLoading(true);

    try {
      const userData = localStorage.getItem("userData");
      const storedUserData = userData ? JSON.parse(userData) : null;
      const loggedInUserId = storedUserData?.userId

      const response = await userManagementService.fetchSettlement({
        from: dates.from,
        to: dates.to,
        opening
      }, loggedInUserId);

      if (response?.responseCode === '0') setData(response.data);
      else toast.error("Failed to load settlement");
    } catch { toast.error("Error connecting to server"); }
    finally { setLoading(false); }
  };

  const TableSection = ({ title, items, summary, headerColor }: {
    title: string,
    items: any[],
    summary: any,
    headerColor: string
  }) => (
    <div className="flex-1 bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg overflow-hidden flex flex-col">
      <div className={`p-3 text-center font-bold text-white ${headerColor}`}>{title}</div>
      <div className="overflow-auto scrollbar-thin flex-1">
        <table className="w-full text-sm">
          <thead className="bg-slate-100/50 dark:bg-slate-700/50 sticky top-0">
            <tr>
              <th className="p-2 text-left">Username</th>
              <th className="p-2 text-right">P/L</th>
              <th className="p-2 text-right">Brk</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {items?.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="p-2 truncate">{item.username}</td>
                <td className="p-2 text-right">{item.pnl.toLocaleString()}</td>
                <td className="p-2 text-right">{item.brokerage.toLocaleString()}</td>
                <td className="p-2 text-right font-bold">{item.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 dark:bg-slate-900 font-bold border-t-2 border-slate-300 dark:border-slate-600">
            <tr>
              <td className="p-2">Net Total</td>
              <td className="p-2 text-right">{summary?.totalPnl?.toLocaleString()}</td>
              <td className="p-2 text-right">{summary?.totalBrokerage?.toLocaleString()}</td>
              <td className="p-2 text-right">{summary?.totalNetPnl?.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout filters={
          <div className="p-4 space-y-4">
            <input type="date" className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500" value={dates.from} onChange={(e) => setDates({ ...dates, from: e.target.value })} />
            <input type="date" className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500" value={dates.to} onChange={(e) => setDates({ ...dates, to: e.target.value })} />
            <SearchableSelect label="Username :" items={userOptions} selectedId={userId} onSelect={(id) => setUserId(Number(id))} placeholder="Search user..." />
            <div className="space-y-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
              <div>Opening?</div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="op" checked={opening === 'WITHOUT'} onChange={() => setOpening('WITHOUT')} /> Without</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="op" checked={opening === 'WITH'} onChange={() => setOpening('WITH')} /> With</label>
            </div>
            <button onClick={handleView} disabled={loading} className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-bold text-sm">View</button>
          </div>
        }>
          <div className="flex flex-col h-full gap-4 p-4 bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm">
            <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settlement</h1>
            </div>
            {data ? (
              <div className="flex-1 flex gap-4 overflow-hidden">
                <TableSection title="Profit" items={data.profit} summary={data.netProfit} headerColor="bg-green-600" />
                <TableSection title="Loss" items={data.loss} summary={data.netLoss} headerColor="bg-red-600" />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">Select filters and click View to load data.</div>
            )}
          </div>
        </FilterLayout>
      </div>
    </div>
  );
};

export default Settlement;