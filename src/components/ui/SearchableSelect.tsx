import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownItem {
  id: number | string;
  name: string;
}

interface SearchableSelectProps {
  label: string;
  items: DropdownItem[];
  selectedId: number | string;
  onSelect: (id: number | string, name: string) => void;
  placeholder?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label, items, selectedId, onSelect, placeholder = "Search..."
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeItem = items.find(item => item.id === selectedId);
    if (activeItem) {
      setSearchTerm(activeItem.name);
    } else if (!selectedId) {
      setSearchTerm('');
    }
  }, [selectedId, items]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        const activeItem = items.find(item => item.id === selectedId);
        if (activeItem) setSearchTerm(activeItem.name);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [items, selectedId]);

  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      {label && <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onFocus={() => {
            setSearchTerm(''); // Clear the input so the user can start typing a new search
            setIsOpen(true);
          }}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
          placeholder={placeholder}
          className="w-full pl-3 pr-8 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500"
        />
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border rounded shadow-xl max-h-60 overflow-y-auto">
          {filteredItems.length > 0 ? filteredItems.map((item) => (
            <div key={item.id} onClick={() => { onSelect(item.id, item.name); setIsOpen(false); }}
              className={`px-3 py-2 text-sm cursor-pointer ${selectedId === item.id ? 'bg-blue-500 text-white' : 'hover:bg-blue-50 dark:hover:bg-slate-600'}`}>
              {item.name}
            </div>
          )) : <div className="px-3 py-2 text-sm text-slate-400 text-center italic">No results found</div>}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;