import React from 'react'
import { X } from 'lucide-react'
import { useTabs, type Tab } from '../../hooks/useTabs'
import { useNavigate } from 'react-router-dom'

interface TabBarProps {
  className?: string
}

export const TabBar: React.FC<TabBarProps> = ({ className = '' }) => {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabs()
  const navigate = useNavigate()

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab.id)
    navigate(tab.path)
  }

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    const newActiveTab = removeTab(tabId)
    if (newActiveTab) {
      navigate(newActiveTab.path)
    }
  }

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center bg-surface-secondary border-b border-border-primary overflow-x-auto scrollbar-thin scrollbar-thumb-brand-primary/30 relative z-40 px-3 ${className}`}>
      <div className="flex items-center gap-2 min-w-max py-2">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id
          const IconComponent = tab.icon
          
          return (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`group relative flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-200 min-w-[140px] max-w-[220px] ${
                isActive
                  ? 'bg-brand-primary text-white shadow-md rounded-lg'
                  : 'bg-surface-primary text-text-secondary hover:bg-surface-hover rounded-lg hover:text-text-primary'
              }`}
            >
              {/* Icon */}
              {IconComponent && (
                <IconComponent className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-text-secondary group-hover:text-text-primary'
                }`} />
              )}
              
              {/* Tab title */}
              <span className={`text-sm font-semibold truncate flex-1 ${
                isActive ? 'text-white' : ''
              }`}>
                {tab.title}
              </span>
              
              {/* Close button */}
              {tab.isCloseable && (
                <button
                  onClick={(e) => handleTabClose(e, tab.id)}
                  className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'text-white/80 hover:text-white hover:bg-white/20'
                      : 'text-text-secondary/60 hover:text-status-error hover:bg-status-error/10 opacity-0 group-hover:opacity-100'
                  }`}
                  title="Close tab"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}