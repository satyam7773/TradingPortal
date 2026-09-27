import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface UseSortingOptions {
  data: any[];
}

export const useSorting = ({ data }: UseSortingOptions) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Column sorting logic
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Apply sorting to data
  const sortedData = useMemo(() => {
    let result = [...data];

    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        let aVal: any = a[sortColumn];
        let bVal: any = b[sortColumn];

        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
        if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, sortColumn, sortDirection]);

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" /> : 
      <ArrowDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />;
  };

  return {
    sortColumn,
    sortDirection,
    handleSort,
    sortedData,
    getSortIcon
  };
};

export default useSorting;
