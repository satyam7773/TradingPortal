import React, { useState, useCallback, createContext, useContext, type ReactNode } from 'react'

export interface Tab {
  id: string
  title: string
  path: string
  icon?: React.ComponentType<{ className?: string }>
  isCloseable?: boolean
  cacheData?: {
    formData?: Record<string, any>
    tableState?: {
      page: number
      pageSize: number
      filters: Record<string, any>
      sort: { field: string; direction: 'asc' | 'desc' }[]
    }
    apiData?: any
    scrollPosition?: number
    lastUpdated?: number
    isDirty?: boolean
  }
}

interface TabsContextType {
  tabs: Tab[]
  activeTabId: string | null
  addTab: (tab: Omit<Tab, 'id'>) => void
  removeTab: (tabId: string) => Tab | null
  setActiveTab: (tabId: string) => void
  clearAllTabs: () => void
  updateTabCache: (tabId: string, cacheData: any) => void
}

const TabsContext = createContext<TabsContextType | null>(null)

export const TabsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  const addTab = useCallback((newTab: Omit<Tab, 'id'>) => {
    setTabs(prevTabs => {
      const existingTab = prevTabs.find(tab => tab.path === newTab.path)
      if (existingTab) {
        console.log('♻️ [useTabs] Tab already exists, updating cache and keeping same tab');
        setActiveTabId(existingTab.id)
        // Update the cache for existing tab
        return prevTabs.map(tab => 
          tab.id === existingTab.id 
            ? { ...tab, cacheData: newTab.cacheData || tab.cacheData, title: newTab.title }
            : tab
        )
      }
      
      const tabId = `tab-${newTab.path.replace(/[/]/g, '-')}-${Date.now()}`
      const tab: Tab = { ...newTab, id: tabId, isCloseable: true }
      const newTabs = [...prevTabs, tab]
      setActiveTabId(tabId)
      return newTabs
    })
  }, [])

  const removeTab = useCallback((tabId: string): Tab | null => {
    let newActiveTab: Tab | null = null
    
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId)
      
      if (activeTabId === tabId && newTabs.length > 0) {
        newActiveTab = newTabs[newTabs.length - 1]
        setActiveTabId(newActiveTab.id)
      } else if (newTabs.length === 0) {
        setActiveTabId(null)
      }
      
      return newTabs
    })
    
    return newActiveTab
  }, [activeTabId])

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId)
  }, [])

  const clearAllTabs = useCallback(() => {
    setTabs([])
    setActiveTabId(null)
  }, [])

  const updateTabCache = useCallback((tabId: string, cacheData: any) => {
    setTabs(prevTabs => {
      return prevTabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, cacheData: { ...tab.cacheData, ...cacheData } }
          : tab
      )
    })
  }, [])

  return (
    <TabsContext.Provider value={{
      tabs,
      activeTabId,
      addTab,
      removeTab,
      setActiveTab,
      clearAllTabs,
      updateTabCache
    }}>
      {children}
    </TabsContext.Provider>
  )
}

export const useTabs = () => {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider')
  }
  return context
}