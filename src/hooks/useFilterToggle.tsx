import { useState, useEffect, useCallback } from 'react';

// Simple hook to manage a show/hide filter state with optional localStorage persistence
export const useFilterToggle = (storageKey = 'app:showFilters', defaultState = true) => {
  const [showFilters, setShowFilters] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw === null ? defaultState : raw === '1';
    } catch (e) {
      return defaultState;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, showFilters ? '1' : '0');
    } catch (e) {
      // ignore
    }
  }, [showFilters, storageKey]);

  const show = useCallback(() => setShowFilters(true), []);
  const hide = useCallback(() => setShowFilters(false), []);
  const toggle = useCallback(() => setShowFilters(s => !s), []);

  return { showFilters, show, hide, toggle, setShowFilters } as const;
};

export default useFilterToggle;
