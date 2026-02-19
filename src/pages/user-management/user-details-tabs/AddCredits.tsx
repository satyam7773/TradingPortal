import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { userManagementService } from '../../../services';
import FilterLayout from '../../../components/FilterLayout';

interface AddCreditsProps {
  user: any
  userDetails: any
  onClose?: () => void
  onToggle?: (userId: string, field: string) => void
  onRefresh?: (targetUser?: any) => Promise<any>
}

const AddCredits: React.FC<AddCreditsProps> = ({ user, userDetails, onClose, onToggle, onRefresh }) => {
  const [creditOperation, setCreditOperation] = useState<string>('Credit Reference');
  // Use credits from userDetails.userProfile.credits
  const availableCredits = userDetails?.userProfile?.credits ?? 0;
  
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditComment, setCreditComment] = useState<string>('');
  const [creditTransType, setCreditTransType] = useState<'Credit' | 'Debit'>('Credit');
  const [creditFromDate, setCreditFromDate] = useState<string>('');
  const [creditToDate, setCreditToDate] = useState<string>('');

  // Calculate remaining credits
  const enteredAmount = Number(creditAmount) || 0;
  const remainingCredits = creditTransType === 'Debit' 
    ? availableCredits - enteredAmount 
    : availableCredits;

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
            <label className="text-xs text-slate-600 dark:text-slate-300">Credit Ref (Available Credits)</label>
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
              onChange={(e) => {
                const numValue = Number(e.target.value);
                if (numValue > availableCredits) {
                  toast.error(`Amount cannot exceed ${availableCredits}`);
                  setCreditAmount(availableCredits.toString());
                } else if (numValue < 0) {
                  setCreditAmount('0');
                } else {
                  setCreditAmount(e.target.value);
                }
              }}
              min="0"
              max={availableCredits}
              className={`w-full mt-1 px-3 py-2 rounded border text-sm ${
                enteredAmount > availableCredits
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            />
            {enteredAmount > availableCredits && (
              <p className="text-xs text-red-500 mt-1">Amount exceeds available credits</p>
            )}
          </div>

          {/* Remaining Credits Display */}
          {enteredAmount > 0 && creditTransType === 'Debit' && (
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-300">
                Remaining Credits (After Debit)
              </label>
              <input 
                value={remainingCredits} 
                readOnly 
                className={`w-full mt-1 px-3 py-2 rounded border text-sm font-semibold cursor-not-allowed ${
                  remainingCredits < 0 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                    : 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                }`}
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-300">Comment</label>
            <textarea value={creditComment} onChange={(e) => setCreditComment(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-slate-300 block mb-1">Trans Type</label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="transType" checked={creditTransType === 'Credit'} onChange={() => setCreditTransType('Credit')} />
                <span>Credit</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="transType" checked={creditTransType === 'Debit'} onChange={() => setCreditTransType('Debit')} />
                <span>Debit</span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={async () => {
                const amount = Number(creditAmount)
                if (!amount || amount <= 0) {
                  toast.error('Please enter a valid amount')
                  return
                }

                if (amount > availableCredits) {
                  toast.error(`Amount cannot exceed ${availableCredits}`)
                  return
                }

                // Prepare payload
                const payload: { amount: number; userId: number; comments?: string; type: 'CREDIT' | 'DEBIT' } = {
                  amount,
                  userId: Number(user?.id) || 0,
                  comments: creditComment || '',
                  type: creditTransType === 'Credit' ? 'CREDIT' : 'DEBIT'
                }

                try {
                  toast.loading('Submitting request...', { id: 'add-credit' })
                  const operatorUserId = userDetails?.userProfile?.userId
                  const res = await userManagementService.manageCredits(payload, operatorUserId)
                  toast.dismiss('add-credit')

                  // Normalize responseCode/message from various shapes that the API or axios could return
                  const code = (res && (res.responseCode ?? res.data?.responseCode ?? res?.response?.data?.responseCode)) ?? null
                  const message = (res && (res.responseMessage ?? res.data?.responseMessage ?? res?.response?.data?.responseMessage)) ?? 'Failed to submit request'

                    // Convert numeric codes to string for comparison
                    const codeStr = code !== null && code !== undefined ? String(code) : null

                    // Debug log to help trace server responses when toast isn't appearing
                    console.debug('manageCredits response:', { raw: res, code: codeStr, message })

                    if (codeStr === '0' || codeStr === '1000') {
                      toast.success(message || 'Credit request submitted successfully')
                      // Clear the form only on success
                      setCreditAmount('')
                      setCreditComment('')
                      // Refresh parent modal data if provided
                      try {
                        if (onRefresh) await onRefresh(user)
                      } catch (err) {
                        console.warn('Failed to refresh user details after manageCredits', err)
                      }
                    } else if (codeStr === '1017') {
                      // Invalid Funds Request - inform user, do not clear form so they can correct
                      toast.error(message)
                      console.warn('Manage Credits returned 1017 - Invalid Funds Request', res)
                    } else {
                      // Other errors - show message and preserve form
                      toast.error(message)
                      console.warn('Manage Credits returned error', res)
                    }
                  } catch (err: any) {
                    toast.dismiss('add-credit')
                    const msg = err?.message || err?.response?.data?.responseMessage || 'Failed to submit request'
                    toast.error(msg)
                    console.error('Manage Credits error:', err)
                  }
                }}
                disabled={!creditAmount || Number(creditAmount) <= 0 || Number(creditAmount) > availableCredits}
                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:brightness-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
              >
                Submit
              </button>
            </div>
        </div>
      )}
    >
      {/* Right content - Date range + table */}
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/80 p-2 rounded border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
            <label className="text-xs text-slate-600 dark:text-slate-300">From Date</label>
            <input type="date" value={creditFromDate} onChange={(e) => setCreditFromDate(e.target.value)} className="ml-2 px-2 py-1 rounded border border-gray-200 dark:border-slate-700 text-sm" />
          </div>
          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/80 p-2 rounded border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
            <label className="text-xs text-slate-600 dark:text-slate-300">To Date</label>
            <input type="date" value={creditToDate} onChange={(e) => setCreditToDate(e.target.value)} className="ml-2 px-2 py-1 rounded border border-gray-200 dark:border-slate-700 text-sm" />
          </div>
          <div className="ml-auto">
            <button className="px-4 py-2 bg-orange-500 text-white rounded shadow">Request</button>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl p-3 border border-gray-200/50 dark:border-slate-700/50 shadow-lg">
          <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">Credit Transactions</div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-600">
                  <th className="px-3 py-2">Date Time</th>
                  <th className="px-3 py-2">Opening</th>
                  <th className="px-3 py-2">Credit</th>
                  <th className="px-3 py-2">Debit</th>
                  <th className="px-3 py-2">Closing</th>
                  <th className="px-3 py-2">Comment</th>
                  <th className="px-3 py-2">Transaction By</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-500">No transactions found for the selected range.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FilterLayout>
  );
};

export default AddCredits;

