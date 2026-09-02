import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface DownloadReportProps {
  onDownload: (format: 'pdf' | 'excel') => Promise<void>;
  isDisabled?: boolean;
  label?: string;
}

/**
 * Reusable Download Report Component
 * 
 * Usage Example:
 * const handleDownload = async (format: 'pdf' | 'excel') => {
 *   const response = await fetch('your-api-endpoint', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({
 *       userId: loggedInUserId,
 *       requestTimestamp: Date.now().toString(),
 *       data: { userId: targetUserId, exchange: selectedExchange }
 *     })
 *   });
 * };
 * 
 * <DownloadReport onDownload={handleDownload} />
 */
const DownloadReport: React.FC<DownloadReportProps> = ({ 
  onDownload, 
  isDisabled = false,
  label = 'Download Report'
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadClick = async (format: 'pdf' | 'excel') => {
    if (isDisabled || isDownloading) return;
    
    setIsDownloading(true);
    try {
      await onDownload(format);
    } catch (error: any) {
      console.error(`Download error (${format}):`, error);
      toast.error(`Error downloading ${format.toUpperCase()} report`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
        {label}
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => handleDownloadClick('pdf')}
          disabled={isDisabled || isDownloading}
          className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 disabled:opacity-50 text-white rounded font-semibold text-sm transition shadow-md flex items-center justify-center gap-2"
          title="Download as PDF"
        >
          <FileDown className="w-4 h-4" />
          PDF
        </button>
        <button
          onClick={() => handleDownloadClick('excel')}
          disabled={isDisabled || isDownloading}
          className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-400 disabled:opacity-50 text-white rounded font-semibold text-sm transition shadow-md flex items-center justify-center gap-2"
          title="Download as Excel"
        >
          <FileDown className="w-4 h-4" />
          Excel
        </button>
      </div>
    </div>
  );
};

export default DownloadReport;
