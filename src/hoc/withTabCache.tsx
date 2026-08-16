import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useTabs } from '../hooks/useTabs'

export interface CacheContextProps {
  cacheData?: any
  apiData?: any
  onCacheSave: (data: any, apiData?: any) => void
  isRestoringCache: boolean
}

/**
 * HOC that provides tab caching functionality to any page component
 * Usage:
 *   export default withTabCache(MyPageComponent, { title: 'My Page' })
 * 
 * In component:
 *   function MyPage({ cacheData, onCacheSave, isRestoringCache }: CacheContextProps & MyProps) {
 *     // Use cacheData to restore state
 *     // Call onCacheSave(filterState) to persist
 *   }
 */
export const withTabCache = <P extends object>(
  Component: React.ComponentType<P & CacheContextProps>,
  options: { title: string; debug?: boolean }
) => {
  const log = (msg: string, data?: any) => {
    if (options.debug !== false) {
      console.log(`📋 [${options.title}] ${msg}`, data || '')
    }
  }

  return (props: P) => {
    const { tabs, updateTabCache, addTab } = useTabs()
    const location = useLocation()
    const hasRestoredRef = useRef(false)
    const currentTabRef = useRef<any>(null)

    // Find current tab by path
    const currentTab = useMemo(() => {
      const found = tabs.find(tab => tab.path === location.pathname)
      if (found) {
        currentTabRef.current = found
      }
      return found
    }, [tabs, location.pathname])

    // Register this page as a tab on mount
    useEffect(() => {
      log(`📝 Registering tab for path: ${location.pathname}`)
      addTab({
        title: options.title,
        path: location.pathname
      })
      // Reset restoration flag when component mounts (tab switch)
      hasRestoredRef.current = false
    }, [location.pathname, addTab])

    // Handle cache save (memoized to prevent infinite loops)
    const handleCacheSave = useCallback((filterState: any, apiData?: any) => {
      if (!currentTabRef.current) return

      log(`💾 Saving to cache`, filterState)
      updateTabCache(currentTabRef.current.id, {
        tableState: {
          filters: filterState,
          lastUpdated: Date.now()
        },
        apiData: apiData
      })
    }, [updateTabCache, options.title, options.debug])

    // Determine if we should restore from cache
    const hasCacheData = currentTab?.cacheData?.tableState?.filters
    const isRestoringCache = hasCacheData && !hasRestoredRef.current

    // Mark restoration complete after cache is provided to component
    useEffect(() => {
      if (isRestoringCache) {
        log(`✅ Cache available for restoration:`, hasCacheData)
        // Small delay to ensure component receives props and updates state
        const timer = setTimeout(() => {
          hasRestoredRef.current = true
          log(`✅ Marked cache as restored`)
        }, 0)
        return () => clearTimeout(timer)
      } else if (hasCacheData === false && !hasRestoredRef.current) {
        log(`⚠️ No cache found`)
        hasRestoredRef.current = true
      }
    }, [hasCacheData, isRestoringCache])

    return (
      <Component
        {...props}
        cacheData={currentTab?.cacheData?.tableState?.filters}
        apiData={currentTab?.cacheData?.apiData}
        onCacheSave={handleCacheSave}
        isRestoringCache={Boolean(isRestoringCache)}
      />
    )
  }
}
