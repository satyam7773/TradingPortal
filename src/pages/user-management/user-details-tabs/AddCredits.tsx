import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { userManagementService } from '../../../services';
import FilterLayout from '../../../components/FilterLayout';

interface AddCreditsProps {
  user: any;
  userDetails: any;
  onClose?: () => void;
  onToggle?: (userId: string, field: string) => void;
  onRefresh?: (targetUser?: any) => Promise<any>;
}

const AddCredits: React.FC<AddCreditsProps> = ({ user, userDetails, onClose, onToggle, onRefresh }) => {
  const [creditOperation, setCreditOperation] = useState<string>('Credit Reference');
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditComment, setCreditComment] = useState<string>('');
  const [creditTransType, setCreditTransType] = useState<'Credit' | 'Debit'>('Credit');
  const [creditFromDate, setCreditFromDate] = useState<string>('');
  const [creditToDate, setCreditToDate] = useState<string>('');

  const isCreditAction = creditTransType === 'Credit';

  // Memoized pool calculation: toggles between parentCredits and user credits
  const availableCredits = useMemo(() => {
    return isCreditAction
      ? (userDetails?.userProfile?.parentCredits ?? 0)
      : (userDetails?.userProfile?.credits ?? 0);
  }, [isCreditAction, userDetails]);

  // Validation: true if amount exceeds the active pool
  const enteredAmount = Number(creditAmount) || 0;
  const isInvalid = enteredAmount > availableCredits;

  // Reset/Notify if user switches mode and existing amount is now invalid
  useEffect(() => {
    if (isInvalid && creditAmount !== '') {
      toast.error(`Amount exceeds available ${isCreditAction ? 'Parent' : 'User'} credits`);
    }
  }, [creditTransType]);

  const handleSubmit = async () => {
    if (!enteredAmount || enteredAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (isInvalid) {
      toast.error('Transaction exceeds available balance');
      return;
    }

    const userDataStr = localStorage.getItem('userData');
    const operatorUserId = userDataStr ? JSON.parse(userDataStr)?.userId : null;
    
    const payloadData = {
      amount: enteredAmount,
      userId: Number(user?.id) || 0,
      comments: creditComment || '',
      type: creditTransType.toUpperCase()
    };

    try {
      toast.loading('Submitting...', { id: 'add-credit' });
      const res = await userManagementService.manageCredits(payloadData, userDetails?.userInfo?.parentId);
      toast.dismiss('add-credit');
      
      const code = (res && (res.responseCode ?? res.data?.responseCode))?.toString();
      if (code === '0' || code === '1000') {
        toast.success('Transaction successful');
        setCreditAmount('');
        setCreditComment('');
        if (onRefresh) await onRefresh(user);
      } else {
        toast.error(res?.responseMessage || 'Transaction failed');
      }
    } catch (err: any) {
      toast.dismiss('add-credit');
      toast.error('Failed to submit request');
    }
  };

  return (
    <FilterLayout
      storageKey="addCredits:showFilters"
      defaultShow={true}
      filterWidthClass="lg:w-[25%]"
      filters={(
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Filter / Add Credit</h3>
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-300">Operation</label>
            <select value={creditOperation} onChange={(e) => setCreditOperation(e.target.value)} className="w-full mt-1 px-3 py-2 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
              <option>Credit Reference</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-300">
              {isCreditAction ? 'Parent Available Credits' : 'User Available Credits'}
            </label>
            <input
              value={availableCredits}
              readOnly
              className="w-full mt-1 px-3 py-2 rounded border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900 text-sm cursor-not-allowed opacity-75"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-300">Amount</label>
            <input
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className={`w-full mt-1 px-3 py-2 rounded border text-sm ${isInvalid
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
            />
            {isInvalid && (
              <p className="text-xs text-red-500 mt-1">
                Amount exceeds available {isCreditAction ? 'Parent' : 'User'} credits ({availableCredits})
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-300 block mb-1">Trans Type</label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="transType" checked={isCreditAction} onChange={() => setCreditTransType('Credit')} />
                <span>Credit</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="transType" checked={!isCreditAction} onChange={() => setCreditTransType('Debit')} />
                <span>Debit</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-300">Comment</label>
            <textarea value={creditComment} onChange={(e) => setCreditComment(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
          </div>

          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={!creditAmount || enteredAmount <= 0 || isInvalid}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:brightness-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    >
      <div className="space-y-3 p-4">
        {/* Table content remains here */}
      </div>
    </FilterLayout>
  );
};

export default AddCredits;