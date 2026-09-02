# Download Report - Reusable Component Guide

## Overview
A complete, reusable download functionality for generating PDF and Excel reports across all pages in the trading portal. The implementation consists of:

1. **DownloadReport Component** - UI component with PDF/Excel buttons
2. **useDownloadReport Hook** - Logic for handling API calls and file downloads

## Quick Setup (5 minutes)

### Step 1: Import Components
```typescript
import DownloadReport from '../../components/DownloadReport';
import { useDownloadReport } from '../../hooks/useDownloadReport';
```

### Step 2: Initialize Hook
```typescript
const downloadReport = useDownloadReport({
  apiEndpoint: 'https://api-staging.rivoplus.live/your-endpoint/download',
  filename: 'report-name',
  onBeforeDownload: () => setIsDownloading(true),
  onAfterDownload: () => setIsDownloading(false)
});
```

### Step 3: Create Download Handler
```typescript
const [isDownloading, setIsDownloading] = useState(false);

const handleDownloadReport = async (format: 'pdf' | 'excel') => {
  if (!dataToDownload) {
    toast.error('No data to download');
    return;
  }
  
  try {
    await downloadReport.download(format, {
      userId: loggedInUserId,
      requestTimestamp: Date.now().toString(),
      data: {
        userId: selectedUserId,
        exchange: selectedExchange,
        tradeSymbol: selectedSymbol
      }
    });
  } catch (error) {
    console.error('Download error:', error);
  }
};
```

### Step 4: Add Component to UI
```typescript
<DownloadReport
  onDownload={handleDownloadReport}
  isDisabled={isDownloading || !dataToDownload}
  label="Download Report :"
/>
```

## Component API

### DownloadReport Component

**Props:**
```typescript
interface DownloadReportProps {
  onDownload: (format: 'pdf' | 'excel') => Promise<void>;
  isDisabled?: boolean;
  label?: string;
}
```

**Features:**
- Renders PDF and Excel download buttons
- Handles loading state
- Shows error toast on failure
- Automatically disabled when data unavailable
- Responsive design with dark mode support

### useDownloadReport Hook

**Configuration:**
```typescript
interface UseDownloadReportOptions {
  apiEndpoint: string;           // API endpoint URL
  filename?: string;             // Base filename for downloads
  onBeforeDownload?: () => void; // Callback before API call
  onAfterDownload?: () => void;  // Callback after successful download
}
```

**Returns:**
```typescript
{
  download: (format: 'pdf' | 'excel', payload: DownloadPayload) => Promise<void>
}
```

## API Request Format

All download endpoints expect this payload structure:

```typescript
{
  userId: number;              // ID of authenticated user making request
  requestTimestamp: string;    // Current timestamp as string
  data: {
    userId?: number;           // Target user ID (who's data to fetch)
    exchange?: string;         // Filter: exchange name
    tradeSymbol?: string;      // Filter: symbol/script name
    // ... any other filters specific to your endpoint
  }
}
```

## Dual userId Pattern

⚠️ **Important:** Most APIs use a dual userId structure:

- **Outer userId**: Authenticated user (who's making the request) - ALWAYS use loggedInUserId
- **Inner data.userId**: Target user (whose data to fetch) - Use selectedUserId, propsUserId, or loggedInUserId

```typescript
await downloadReport.download('pdf', {
  userId: loggedInUserId,        // ✅ Authenticated user
  requestTimestamp: Date.now().toString(),
  data: {
    userId: selectedUserId,      // ✅ Target user (can be different)
    exchange: selectedExchange,
    tradeSymbol: selectedSymbol
  }
});
```

## Real-World Examples

### Example 1: Positions Page (Already Implemented)
See: `src/pages/trading/Positions.tsx` (lines ~395-420)

### Example 2: UserWisePosition Page (Recently Added)
See: `src/pages/reports/UserWisePosition.tsx` (lines ~92-127)

### Example 3: Trades Page (Template)
```typescript
import DownloadReport from '../../components/DownloadReport';
import { useDownloadReport } from '../../hooks/useDownloadReport';

// In component:
const [isDownloading, setIsDownloading] = useState(false);

const downloadReport = useDownloadReport({
  apiEndpoint: 'https://api-staging.rivoplus.live/oms/trades/download',
  filename: 'trades',
  onBeforeDownload: () => setIsDownloading(true),
  onAfterDownload: () => setIsDownloading(false)
});

const handleDownloadReport = async (format: 'pdf' | 'excel') => {
  if (!tradesData) {
    toast.error('No trades data to download');
    return;
  }

  await downloadReport.download(format, {
    userId: loggedInUserId,
    requestTimestamp: Date.now().toString(),
    data: {
      userId: selectedUserId || loggedInUserId,
      exchange: selectedExchange,
      fromDate: fromDate,
      toDate: toDate
    }
  });
};

// In render:
<DownloadReport
  onDownload={handleDownloadReport}
  isDisabled={isDownloading || !tradesData}
  label="Download Trades :"
/>
```

## Features

✅ **Automatic Error Handling**
- Network errors show toast notification
- Invalid responses handled gracefully
- Failed downloads won't crash the app

✅ **Loading States**
- Buttons disabled while downloading
- Single download at a time
- Visual feedback with disabled styling

✅ **File Management**
- Base64 decoding of API response
- Automatic filename with current date
- Cross-browser compatible download
- Memory cleanup (revokes blob URLs)

✅ **User Experience**
- Toast notifications for success/error
- Responsive button styling
- Dark mode support
- Accessible UI with proper labels

## API Response Format

All download endpoints should return:

```typescript
{
  responseCode: '0';           // Success indicator
  data: string;                // Base64 encoded binary file
  responseMessage?: string;    // Error message if failed
}
```

## Troubleshooting

### Download button doesn't work
- Check if `onDownload` callback is properly defined
- Verify `isDisabled` prop logic
- Check browser console for errors

### "No data to download" message
- Ensure data is fetched before showing download button
- Check `isDisabled` prop includes data validation

### Wrong filename format
- Customize with `filename` prop in hook config
- Default: `{filename}_{YYYY-MM-DD}.{format}`

### API 404 errors
- Verify correct `apiEndpoint` URL
- Check API documentation for exact endpoint
- Ensure request payload format matches API spec

## Best Practices

1. **Always validate data before download**
   ```typescript
   if (!dataAvailable) {
     toast.error('No data to download');
     return;
   }
   ```

2. **Use consistent naming**
   ```typescript
   // Good
   filename: 'positions'
   filename: 'deleted-trades'
   filename: 'userwise-positions'
   ```

3. **Handle auth errors**
   ```typescript
   const loggedInUserId = userData?.userId || 31; // Fallback to admin
   ```

4. **Test both PDF and Excel**
   - PDF generation may differ from Excel
   - Test with real data volumes
   - Verify formatting in downloaded files

5. **Add to multiple pages systematically**
   - Copy implementation from working page
   - Adjust apiEndpoint and filename only
   - Test build compilation
   - Verify in browser before committing

## File Locations

- **Component**: `src/components/DownloadReport.tsx`
- **Hook**: `src/hooks/useDownloadReport.ts`
- **Documentation**: `src/services/README.md` (this file)

## Integration Checklist

- [ ] Import DownloadReport component
- [ ] Import useDownloadReport hook
- [ ] Add useState for isDownloading
- [ ] Initialize useDownloadReport hook with correct endpoint
- [ ] Create handleDownloadReport function
- [ ] Add DownloadReport component to filters section
- [ ] Test PDF download
- [ ] Test Excel download
- [ ] Test with no data (should show error)
- [ ] Build with `npm run build` (0 errors expected)
- [ ] Test in browser
