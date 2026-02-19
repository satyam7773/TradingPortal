import React from 'react';
import { ChevronDown } from 'lucide-react';
import useFilterToggle from '../hooks/useFilterToggle';

interface FilterLayoutProps {
  children: React.ReactNode; // main content
  filters: React.ReactNode; // filter pane content
  header?: React.ReactNode; // optional header area above filters
  defaultShow?: boolean;
  storageKey?: string;
  filterWidthClass?: string; // e.g. 'w-[30%]'
}

// A small layout component that provides a left filter pane (toggleable) and a right content area.
// Usage:
// <FilterLayout filters={<FiltersComponent/>} header={<Header/>}>
//   <MainTable />
// </FilterLayout>
export const FilterLayout: React.FC<FilterLayoutProps> = ({
  children,
  filters,
  header,
  defaultShow = true,
  storageKey,
  filterWidthClass = 'w-[30%]'
}) => {
  const { showFilters, show, hide, toggle } = useFilterToggle(storageKey || 'app:showFilters', defaultShow);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      {header && (
        <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 px-6 py-4 flex-shrink-0">
          {header}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Toggle button when filters hidden */}
        {!showFilters && (
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 p-4 border-r border-gray-200/50 dark:border-slate-700/50">
            <button
              onClick={show}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 whitespace-nowrap"
              title="Show Filters"
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
              <span className="text-sm font-semibold">Show Filters</span>
            </button>
          </div>
        )}

        {/* Left Side - Filters */}
        {showFilters && (
          <div className={`${filterWidthClass} border-r border-gray-200/50 dark:border-slate-700/50 overflow-auto`}> 
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {/* header slot content could include an icon/title */}
                </div>
                <button
                  onClick={hide}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors duration-200 group"
                  title="Hide Filters"
                >
                  <svg
                    className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* filter content */}
              <div>{filters}</div>
            </div>
          </div>
        )}

        {/* Right Side - Main content */}
        <div className={`${showFilters ? 'flex-1' : 'w-full'} flex flex-col overflow-hidden`}>{children}</div>
      </div>
    </div>
  );
};

export default FilterLayout;
