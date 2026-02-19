import React from 'react';
import { Receipt } from 'lucide-react';

const Settlement: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Settlement
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage trade settlements and payment processing
            </p>
          </div>
        </div>

        <div className="mt-8 p-12 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-700/50 dark:to-slate-600/50 rounded-xl border-2 border-dashed border-purple-300 dark:border-slate-600 flex flex-col items-center justify-center">
          <Receipt className="w-16 h-16 text-purple-400 dark:text-purple-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Settlement Content
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
            This page will handle all settlement operations including payment processing, reconciliation, and financial reporting.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settlement;
