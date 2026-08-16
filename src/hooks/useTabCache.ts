import { useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useTabs } from './useTabs'

interface CacheableState {
  [key: string]: any
}

interface UseTabCacheOptions {
  pageKey: string
  initialFilters: CacheableState
  onRestoreFromCache?: (cachedFilters: CacheableState) => void
  onClearFilters?: () => void
}

/**
 * Hook to manage filter state caching across tab instances
 * - Restores filters when a closed tab is reopened
 * - Clears filters when switching between open tabs
 * - Persists filter state to cache
 */
export const useTabCache = ({
  pageKey,
  initialFilters,
  onRestoreFromCache,
  onClearFilters
}: UseTabCacheOptions) => {
  const location = useLocation()
  const { tabs, updateTabCache } = useTabs()
  const hasRestoredFromCacheRef = useRef(false)
  const previousPathRef = useRef<string>(location.pathname)
  const currentTabRef = useRef<any>(null)

  // Find current tab
  const currentTab = tabs.find(tab => tab.path === location.pathname)
  currentTabRef.current = currentTab

  // Check if we're returning to this page after switching away
  const hasTabSwitched = previousPathRef.current !== location.pathname
  previousPathRef.current = location.pathname

  /**
   * Try to restore filter state from cache
   * Called once when component mounts for the first time
   */
  const tryRestoreFromCache = useCallback(() => {
    if (hasRestoredFromCacheRef.current) return

    const cachedFilters = currentTab?.cacheData?.tableState?.filters
    
    if (cachedFilters && Object.keys(cachedFilters).length > 0) {
      console.log(`🔄 [${pageKey}] Restoring filters from cache:`, cachedFilters)
      hasRestoredFromCacheRef.current = true
      onRestoreFromCache?.(cachedFilters)
      return true
    }

    console.log(`📝 [${pageKey}] No cache found, using default filters`)
    hasRestoredFromCacheRef.current = true
    return false
  }, [currentTab, pageKey, onRestoreFromCache])

  /**
   * Save current filter state to cache
   */
  const saveFiltersToCahe = useCallback((filters: CacheableState) => {
    if (!currentTab) return

    console.log(`💾 [${pageKey}] Saving filters to cache:`, filters)
    updateTabCache(currentTab.id, {
      tableState: {
        filters,
        lastUpdated: Date.now()
      }
    })
  }, [currentTab, pageKey, updateTabCache])

  /**
   * Clear filters and reset to initial state
   */
  const clearFiltersForNewTab = useCallback(() => {
    console.log(`🗑️ [${pageKey}] Clearing filters for new tab`)
    onClearFilters?.()
    // Also clear the cache for this tab
    if (currentTab) {
      updateTabCache(currentTab.id, {
        tableState: {
          filters: {},
          lastUpdated: null
        }
      })
    }
  }, [currentTab, pageKey, onClearFilters, updateTabCache])

  // Attempt to restore from cache on first mount
  useEffect(() => {
    if (!hasRestoredFromCacheRef.current) {
      tryRestoreFromCache()
    }
  }, [tryRestoreFromCache])

  return {
    saveFiltersToCahe,
    clearFiltersForNewTab,
    currentTab,
    shouldClearOnInit: !currentTab?.cacheData?.tableState?.filters
  }
}
