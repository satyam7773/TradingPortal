import { useCallback } from 'react';
import toast from 'react-hot-toast';

interface DownloadPayload {
  userId: number;
  requestTimestamp: string;
  data: Record<string, any>;
}

interface UseDownloadReportOptions {
  apiEndpoint: string;
  filename?: string;
  onBeforeDownload?: () => void;
  onAfterDownload?: () => void;
}

/**
 * Custom Hook for Downloading Reports (PDF/Excel)
 * 
 * Handles:
 * - API call to download endpoint
 * - Base64 decoding of binary data
 * - File creation and download
 * - Error handling and toast notifications
 * 
 * Usage Example:
 * ```
 * const downloadReportLogic = useDownloadReport({
 *   apiEndpoint: 'https://api-staging.rivoplus.live/reports/positions/download',
 *   filename: 'positions',
 *   onBeforeDownload: () => console.log('Starting download...'),
 *   onAfterDownload: () => console.log('Download complete!')
 * });
 * 
 * const handleDownload = async (format: 'pdf' | 'excel') => {
 *   await downloadReportLogic.download(format, {
 *     userId: loggedInUserId,
 *     requestTimestamp: Date.now().toString(),
 *     data: {
 *       userId: targetUserId,
 *       exchange: selectedExchange,
 *       tradeSymbol: selectedSymbol
 *     }
 *   });
 * };
 * ```
 */
export const useDownloadReport = (options: UseDownloadReportOptions) => {
  const {
    apiEndpoint,
    filename = 'report',
    onBeforeDownload,
    onAfterDownload
  } = options;

  const download = useCallback(async (
    format: 'pdf' | 'excel',
    payload: DownloadPayload,
    queryParams?: Record<string, string | boolean>
  ) => {
    try {
      onBeforeDownload?.();

      // Build URL with optional query parameters
      let url = apiEndpoint;
      const params = new URLSearchParams();
      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }
      if (params.toString()) {
        url += (url.includes('?') ? '&' : '?') + params.toString();
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result?.responseCode === '0' && result?.data) {
        // Decode base64 binary data
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes]);

        // Create download link and trigger download
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        toast.success(`${format.toUpperCase()} downloaded successfully`);
        onAfterDownload?.();
      } else {
        const errorMsg = result?.responseMessage || `Failed to download ${format.toUpperCase()}`;
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error(`Download error (${format}):`, error);
      toast.error(`Error downloading ${format.toUpperCase()} report`);
    }
  }, [apiEndpoint, filename, onBeforeDownload, onAfterDownload]);

  return { download };
};
