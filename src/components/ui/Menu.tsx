import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ChevronDown, 
  File, 
  BarChart3, 
  Eye, 
  FileText, 
  Settings,
  User,
  Info,
  Lock,
  LogOut,
  CheckCircle,
  Wifi,
  LayoutDashboard,
  Wallet,
  Search,
  Plus,
  TrendingUp,
  Briefcase
} from 'lucide-react'
import { useTabs } from '../../hooks/useTabs'

interface SubMenuItem {
  label?: string
  icon?: React.ComponentType<any>
  action?: () => void
  path?: string
  to?: string
  separator?: boolean
}

interface MenuItem {
  label: string
  subItems?: SubMenuItem[]
  action?: () => void
  to?: string
}

interface MenuProps {
  items: MenuItem[]
  currentPath?: string
}

// Shortcuts Menu Component
const ShortcutsMenu: React.FC<{ items: MenuItem[], addTab: (tab: any) => void }> = ({ items, addTab }) => {
  const navigate = useNavigate()
  
  const shortcuts = [
    { label: 'Market Watch', icon: Eye, path: '/dashboard/market-watch', color: 'bg-blue-500/20 text-blue-600' },
    { label: 'Trade', icon: TrendingUp, path: '/dashboard/trades', color: 'bg-purple-500/20 text-purple-600' },
    { label: 'Position', icon: Briefcase, path: '/dashboard/positions', color: 'bg-green-500/20 text-green-600' },
    { label: 'Orders', icon: FileText, path: '/dashboard/orders', color: 'bg-orange-500/20 text-orange-600' },
    { label: 'Create User', icon: Plus, path: '/dashboard/create-user', color: 'bg-pink-500/20 text-pink-600' },
    { label: 'Search User', icon: Search, path: '/dashboard/search-user', color: 'bg-cyan-500/20 text-cyan-600' }
  ]

  const handleShortcut = (path: string, label: string) => {
    const tabConfig = dashboardTabConfigs[path as keyof typeof dashboardTabConfigs]
    if (tabConfig) {
      addTab({
        title: label,
        path: path,
        icon: tabConfig.icon
      })
      navigate(path)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {shortcuts.map((shortcut) => {
        const Icon = shortcut.icon
        return (
          <div key={shortcut.path} className="group relative">
            <button
              onClick={() => handleShortcut(shortcut.path, shortcut.label)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-110 ${shortcut.color}`}
            >
              <Icon className="w-4 h-4" />
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {shortcut.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}


// Tab configurations for dashboard items
const dashboardTabConfigs = {
  '/dashboard': { title: 'Dashboard', icon: LayoutDashboard },
  '/dashboard/markets': { title: 'Markets', icon: BarChart3 },
  '/dashboard/orders': { title: 'Orders', icon: FileText },
  '/dashboard/portfolio': { title: 'Portfolio', icon: Wallet },
  '/dashboard/create-user': { title: 'Create User', icon: User },
  '/dashboard/user-list': { title: 'User List', icon: User },
  '/dashboard/search-user': { title: 'Search User', icon: User },
  '/dashboard/user-position': { title: 'User Wise Position', icon: BarChart3 },
  '/dashboard/manage-traders': { title: 'Manage Trades', icon: User },
  '/dashboard/trade-account': { title: 'Trade Account', icon: Wallet },
  '/dashboard/settlement': { title: 'Settlement', icon: FileText },
  '/dashboard/market-watch': { title: 'Market Watch', icon: Eye },
  '/dashboard/trades': { title: 'Trades', icon: BarChart3 },
  '/dashboard/positions': { title: 'Positions', icon: BarChart3 },
  '/dashboard/cf-margin-users': { title: 'Cf Margin On Users', icon: User },
  '/dashboard/profit-loss': { title: 'Profit & Loss', icon: BarChart3 },
  '/dashboard/m2m-profit-loss': { title: 'M2M Profit & Loss', icon: BarChart3 },
  '/dashboard/intraday-history': { title: 'Intraday History', icon: FileText },
  '/dashboard/rejection-log': { title: 'Rejection Log', icon: FileText },
  '/dashboard/login-history': { title: 'Login History', icon: FileText },
  '/dashboard/account-summary': { title: 'Account Summary', icon: FileText },
  '/dashboard/bill-generate': { title: 'Bill Generate', icon: FileText },
  '/dashboard/deleted-trades': { title: 'Deleted Trades', icon: FileText },
  '/dashboard/open-position': { title: '% Open Position', icon: BarChart3 },
  '/dashboard/weekly-admin': { title: 'Weekly Admin', icon: Settings },
  '/dashboard/trade-margin': { title: 'Trade Margin', icon: BarChart3 },
  '/dashboard/script-master': { title: 'Script Master', icon: FileText },
  '/dashboard/script-pl-summary': { title: 'Script P&L Summary', icon: BarChart3 },
  '/dashboard/analytics': { title: 'Analytics', icon: BarChart3 },
  '/dashboard/user-logs-new': { title: 'User Logs New', icon: FileText },
  '/dashboard/userwise-pl-summary': { title: 'Userwise P&L Summary', icon: BarChart3 },
  '/dashboard/user-script-position-track': { title: 'User Script Position Track', icon: BarChart3 },
  '/dashboard/user-script-position-pl': { title: 'User Script Position PL', icon: BarChart3 },
  '/dashboard/script-buffer-limit': { title: 'Script Buffer Limit', icon: Settings },
  '/dashboard/notification-alert': { title: 'Notification Alert', icon: Settings },
  '/dashboard/status-bar': { title: 'Status Bar', icon: Settings },
  '/dashboard/toolbar': { title: 'Tool Bar', icon: Settings },
  '/dashboard/messages': { title: 'Messages', icon: FileText },
  '/dashboard/exchange-schedule': { title: 'Exchange Time Schedule', icon: FileText },
  '/dashboard/configure-2fa': { title: 'Configure 2FA', icon: Lock }
}

export const Menu: React.FC<MenuProps> = ({ items, currentPath }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { addTab } = useTabs()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
        setHoveredMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleMenuClick = (menuLabel: string) => {
    if (activeMenu === menuLabel) {
      setActiveMenu(null)
    } else {
      setActiveMenu(menuLabel)
    }
  }

  const handleMenuHover = (menuLabel: string) => {
    if (activeMenu) {
      setActiveMenu(menuLabel)
    }
    setHoveredMenu(menuLabel)
  }

  const handleSubItemClick = (subItem: SubMenuItem, isDashboardItem?: boolean, isUsersItem?: boolean, isReportsItem?: boolean, isViewItem?: boolean, isSettingsItem?: boolean, isToolsItem?: boolean) => {
    const { action, path } = subItem
    
    if (action) {
      // If it's a menu item that should create tabs, create a tab AND navigate
      if (isDashboardItem || isUsersItem || isReportsItem || isViewItem || isSettingsItem || isToolsItem) {
        if (path) {
          console.log('🔍 Attempting to navigate to:', path)
          const tabConfig = dashboardTabConfigs[path as keyof typeof dashboardTabConfigs]
          
          if (tabConfig) {
            console.log('✅ Tab config found:', tabConfig)
            addTab({
              title: tabConfig.title,
              path: path,
              icon: tabConfig.icon
            })
            // Also execute the original navigation action
            action()
            console.log('✅ Navigation executed')
          } else {
            console.error('❌ No tab config found for path:', path)
          }
        } else {
          console.error('❌ No path provided in menu item')
        }
      } else {
        action()
      }
    }
    setActiveMenu(null)
    setHoveredMenu(null)
  }

  // Check if any submenu item matches current path
  const getActiveMenuItem = () => {
    for (const item of items) {
      if (item.subItems) {
        for (const subItem of item.subItems) {
          if (subItem.action && currentPath) {
            // Extract route from action function (simplified approach)
            const actionStr = subItem.action.toString()
            const routeMatch = actionStr.match(/navigate\(['"]([^'"]*)['"]\)/)
            if (routeMatch && currentPath.includes(routeMatch[1])) {
              return { parentLabel: item.label, subLabel: subItem.label }
            }
          }
        }
      } else if (item.action && currentPath) {
        const actionStr = item.action.toString()
        const routeMatch = actionStr.match(/navigate\(['"]([^'"]*)['"]\)/)
        if (routeMatch && currentPath === routeMatch[1]) {
          return { parentLabel: item.label, subLabel: null }
        }
      }
    }
    return { parentLabel: null, subLabel: null }
  }

  const { parentLabel: activeParent, subLabel: activeSub } = getActiveMenuItem()

  return (
    <div ref={menuRef} className="flex flex-col">
      {/* Main Menu */}
      <div className="flex items-center">
          {items.map((item, itemIndex) => {
            const isItemActive = activeMenu === item.label
            const isItemHovered = hoveredMenu === item.label
            const isCurrentPage = activeParent === item.label
            
            return (
              <div key={item.label} className="relative">
                <button
                  onClick={() => item.subItems ? handleMenuClick(item.label) : item.action?.()}
                  onMouseEnter={() => handleMenuHover(item.label)}
                  onMouseLeave={() => !activeMenu && setHoveredMenu(null)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isCurrentPage
                      ? 'text-brand-primary border-b-2 border-brand-primary'
                      : isItemActive
                      ? 'text-brand-primary bg-brand-primary/5 rounded-md'
                      : isItemHovered
                      ? 'text-brand-primary bg-brand-primary/5 rounded-md'
                      : 'text-text-primary hover:text-brand-primary hover:bg-surface-hover rounded-md'
                  }`}
                >
                  <span className="select-none whitespace-nowrap font-medium">{item.label}</span>
                  {item.subItems && (
                    <ChevronDown 
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isItemActive ? 'rotate-180' : ''
                      }`} 
                    />
                  )}
                </button>

                {item.subItems && (isItemActive || (activeMenu && isItemHovered)) && (
                  <div className="absolute top-full left-0 z-[200] mt-1 bg-surface-primary border border-border-primary shadow-2xl min-w-56 rounded-lg overflow-hidden">
                    {item.subItems.map((subItem, index) => {
                      if (subItem.separator) {
                        return (
                          <div 
                            key={index} 
                            className="h-px bg-border-primary my-1 mx-3"
                          />
                        )
                      }
                      
                      const IconComponent = subItem.icon
                      const isSubItemActive = activeSub === subItem.label
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleSubItemClick(subItem, item.label === 'Dashboard', item.label === 'Users', item.label === 'Reports', item.label === 'View', item.label === 'Settings', item.label === 'Tools')}
                          className={`relative w-full text-left px-4 py-2.5 text-sm transition-all duration-200 flex items-center gap-3 ${
                            isSubItemActive
                              ? 'bg-brand-primary text-white'
                              : 'text-text-primary hover:bg-brand-primary/10 hover:text-brand-primary'
                          }`}
                        >
                          {IconComponent && (
                            <IconComponent className={`w-4 h-4 ${
                              isSubItemActive ? 'text-white' : 'text-text-secondary'
                            }`} />
                          )}
                          <span className="select-none font-medium">{subItem.label || ''}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {/* Shortcuts Menu */}
      <div className="flex items-center gap-3 px-4 py-2 bg-surface-secondary/50">
        <ShortcutsMenu items={items} addTab={addTab} />
      </div>
    </div>
  )
}

// Convert existing sidebar menu items to horizontal menu format
export const createExistingMenuItems = (navigate: (path: string) => void, logout: () => void): MenuItem[] => [
  {
    label: 'Dashboard',
    subItems: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        action: () => navigate('/dashboard')
      }
    ]
  },
  {
    label: 'View',
    subItems: [
      {
        label: 'Market Watch',
        path: '/dashboard/market-watch',
        action: () => navigate('/dashboard/market-watch')
      },
      {
        label: 'Trades',
        path: '/dashboard/trades',
        action: () => navigate('/dashboard/trades')
      },
      {
        label: 'Orders',
        path: '/dashboard/orders',
        action: () => navigate('/dashboard/orders')
      },
      {
        label: 'Positions',
        path: '/dashboard/positions',
        action: () => navigate('/dashboard/positions')
      },
      {
        label: 'Cf Margin On Users',
        path: '/dashboard/cf-margin-users',
        action: () => navigate('/dashboard/cf-margin-users')
      },
      {
        label: 'Profit & Loss',
        path: '/dashboard/profit-loss',
        action: () => navigate('/dashboard/profit-loss')
      },
      {
        label: 'M2M Profit & Loss',
        path: '/dashboard/m2m-profit-loss',
        action: () => navigate('/dashboard/m2m-profit-loss')
      },
      {
        label: 'Intraday History',
        path: '/dashboard/intraday-history',
        action: () => navigate('/dashboard/intraday-history')
      },
      {
        label: 'Rejection Log',
        path: '/dashboard/rejection-log',
        action: () => navigate('/dashboard/rejection-log')
      },
      {
        label: 'Login History',
        path: '/dashboard/login-history',
        action: () => navigate('/dashboard/login-history')
      }
    ]
  },
  {
    label: 'Users',
    subItems: [
      {
        label: 'Create User',
        path: '/dashboard/create-user',
        action: () => navigate('/dashboard/create-user')
      },
      {
        label: 'User List',
        path: '/dashboard/user-list',
        action: () => navigate('/dashboard/user-list')
      },
      {
        label: 'Search User',
        path: '/dashboard/search-user',
        action: () => navigate('/dashboard/search-user')
      }
    ]
  },
  {
    label: 'Reports',
    subItems: [
      {
        label: 'User Wise Position',
        path: '/dashboard/user-position',
        action: () => navigate('/dashboard/user-position')
      },
      {
        label: 'Manage Traders',
        path: '/dashboard/manage-traders',
        action: () => navigate('/dashboard/manage-traders')
      },
      {
        label: 'Trade Account',
        path: '/dashboard/trade-account',
        action: () => navigate('/dashboard/trade-account')
      },
      {
        label: 'Settlement',
        path: '/dashboard/settlement',
        action: () => navigate('/dashboard/settlement')
      },
      {
        label: 'Account Summary',
        path: '/dashboard/account-summary',
        action: () => navigate('/dashboard/account-summary')
      },
      {
        label: 'Bill Generate',
        path: '/dashboard/bill-generate',
        action: () => navigate('/dashboard/bill-generate')
      },
      {
        label: 'Deleted Trades',
        path: '/dashboard/deleted-trades',
        action: () => navigate('/dashboard/deleted-trades')
      },
      {
        label: '% Open Position',
        path: '/dashboard/open-position',
        action: () => navigate('/dashboard/open-position')
      },
      {
        label: 'Weekly Admin',
        path: '/dashboard/weekly-admin',
        action: () => navigate('/dashboard/weekly-admin')
      },
      {
        label: 'Trade Margin',
        path: '/dashboard/trade-margin',
        action: () => navigate('/dashboard/trade-margin')
      },
      {
        label: 'Script Master',
        path: '/dashboard/script-master',
        action: () => navigate('/dashboard/script-master')
      },
      {
        label: 'Script P&L Summary',
        path: '/dashboard/script-pl-summary',
        action: () => navigate('/dashboard/script-pl-summary')
      },
      {
        label: 'Analytics',
        path: '/dashboard/analytics',
        action: () => navigate('/dashboard/analytics')
      },
      {
        label: 'User Logs New',
        path: '/dashboard/user-logs-new',
        action: () => navigate('/dashboard/user-logs-new')
      },
      {
        label: 'Userwise P&L Summary',
        path: '/dashboard/userwise-pl-summary',
        action: () => navigate('/dashboard/userwise-pl-summary')
      },
      {
        label: 'User Script Position Track',
        path: '/dashboard/user-script-position-track',
        action: () => navigate('/dashboard/user-script-position-track')
      },
      {
        label: 'User Script Position PL',
        path: '/dashboard/user-script-position-pl',
        action: () => navigate('/dashboard/user-script-position-pl')
      },
      {
        label: 'Script Buffer Limit',
        path: '/dashboard/script-buffer-limit',
        action: () => navigate('/dashboard/script-buffer-limit')
      }
    ]
  },
  {
    label: 'Settings',
    subItems: [
      {
        label: 'Notification Alert',
        path: '/dashboard/notification-alert',
        action: () => navigate('/dashboard/notification-alert')
      }
    ]
  },
  {
    label: 'Tools',
    subItems: [
      {
        label: 'Status Bar',
        path: '/dashboard/status-bar',
        action: () => navigate('/dashboard/status-bar')
      },
      {
        label: 'Tool Bar',
        path: '/dashboard/toolbar',
        action: () => navigate('/dashboard/toolbar')
      },
      {
        label: 'Messages',
        path: '/dashboard/messages',
        action: () => navigate('/dashboard/messages')
      },
      {
        label: 'Exchange Time Schedule',
        path: '/dashboard/exchange-schedule',
        action: () => navigate('/dashboard/exchange-schedule')
      },
      {
        label: 'Configure 2FA',
        path: '/dashboard/configure-2fa',
        action: () => navigate('/dashboard/configure-2fa')
      }
    ]
  },
  {
    label: 'Account',
    subItems: [
      {
        label: 'Logout',
        icon: LogOut,
        separator: false,
        action: () => logout()
      }
    ]
  }
]

export default Menu