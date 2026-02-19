import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks'
import { logout, clearFirstLogin } from '../../store/slices/authSlice'
import ThemeToggle from '../ui/ThemeToggle'
import ABQuotesLogo from '../ui/ABQuotesLogo'
import Menu, { createExistingMenuItems } from '../ui/Menu'
import { PanicButton } from '../ui/PanicButton'
import { TabsProvider, useTabs } from '../../hooks/useTabs'
import { TabBar } from '../ui/TabBar'
import { User, Eye } from 'lucide-react'
import apiService from '../../services/api'
import toast from 'react-hot-toast'

// Use Vite's import.meta.glob for proper bundling in production
const pageModules = import.meta.glob('../../pages/**/*.{tsx,ts,jsx,js}')

const SecondaryPanelContent: React.FC = () => {
  const { tabs } = useTabs()
  const navigate = useNavigate()
  
  // Dynamic component loader - automatically loads any page based on path
  const loadComponentFromPath = (path: string) => {
    // Remove /dashboard prefix and convert to component path
    const componentPath = path.replace('/dashboard/', '')
    
    // Map of path patterns to file locations (relative to pages folder)
    const pathMappings: Record<string, string> = {
      // User Management
      'user-list': 'user-management/UserList',
      'create-user': 'user-management/CreateNewUser',
      'search-user': 'user-management/SearchUser',
      
      // Reports
      'user-position': 'reports/UserWisePosition',
      'manage-traders': 'reports/ManageTraders',
      'trade-account': 'reports/TradeAccount',
      'settlement': 'reports/Settlement',
      
      // Dashboard & Trading
      'market-watch': 'dashboard/MarketWatch',
      'markets': 'trading/Markets',
      'orders': 'trading/Orders',
      'portfolio': 'trading/Portfolio',
      'trades': 'trading/Trades',
      'positions': 'trading/Positions',
      
      // Admin
      'api-test': 'admin/ApiTestPage',
    }
    
    // Get the component path from mapping
    const componentFilePath = pathMappings[componentPath]
    
    if (componentFilePath) {
      // Find the exact module from pageModules
      const moduleKey = `../../pages/${componentFilePath}.tsx`
      const moduleKeyAlt = `../../pages/${componentFilePath}.ts`
      const moduleKeyJsx = `../../pages/${componentFilePath}.jsx`
      const moduleKeyJs = `../../pages/${componentFilePath}.js`
      
      const moduleLoader = pageModules[moduleKey] || pageModules[moduleKeyAlt] || pageModules[moduleKeyJsx] || pageModules[moduleKeyJs]
      
      if (moduleLoader) {
        return React.lazy(() => moduleLoader().then((m: any) => ({ default: m.default })))
      }
    }
    
    // Fallback: try to auto-detect from folder structure
    const folders = ['dashboard', 'trading', 'reports', 'user-management', 'admin', 'settings']
    
    for (const folder of folders) {
      // Convert kebab-case to PascalCase for component name
      const componentName = componentPath
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
      
      // Try all possible extensions
      const possibleKeys = [
        `../../pages/${folder}/${componentName}.tsx`,
        `../../pages/${folder}/${componentName}.ts`,
        `../../pages/${folder}/${componentName}.jsx`,
        `../../pages/${folder}/${componentName}.js`
      ]
      
      for (const key of possibleKeys) {
        const moduleLoader = pageModules[key]
        if (moduleLoader) {
          return React.lazy(() => moduleLoader().then((m: any) => ({ default: m.default })))
        }
      }
    }
    
    return null
  }
  
  // Find the most recent non-create-user tab
  const secondaryTab = [...tabs]
    .reverse()
    .find(tab => tab.path !== '/dashboard/create-user' && !tab.path.includes('mode=edit'))
  
  // Directly use secondaryTab path, no state needed
  const secondaryPath = secondaryTab?.path || null
  
  const renderSecondaryContent = () => {
    if (!secondaryPath) {
      return (
        <div className="p-6">
          <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select a page to view
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Open User List or any other page from the Profile menu to view it here while creating a user
            </p>
          </div>
        </div>
      )
    }
    
    // Dynamically load component based on path
    const SelectedComponent = loadComponentFromPath(secondaryPath)

    return (
      <React.Suspense fallback={
        <div className="p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading page...</p>
          </div>
        </div>
      }>
        <div className="h-full">
          {SelectedComponent ? <SelectedComponent /> : (
            <div className="p-6">
              <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg mb-4">
                  <User className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Page not found</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  The component for path "{secondaryPath}" could not be loaded.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Add this path to the pathMappings in SecondaryPanelContent
                </p>
              </div>
            </div>
          )}
        </div>
      </React.Suspense>
    )
  }
  
  return (
    <div className="h-full overflow-auto">
      {renderSecondaryContent()}
    </div>
  )
}

const AppLayout: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAppSelector(state => state.auth)
  const [showFullMenu, setShowFullMenu] = useState(false)
  
  // Check if user is on first login
  const isFirstLogin = user?.firstLogin === true && !showFullMenu
  
  const handleLogout = () => {
    try {
      // Dispatch logout action - saga will handle API call
      dispatch(logout())
      toast.success('Logged out successfully!')
      
      // Navigate to login after a short delay to show the toast
      setTimeout(() => {
        navigate('/login')
      }, 500)
    } catch (error) {
      console.error('❌ Logout error:', error)
      toast.error('Logout failed, but clearing local data...')
      
      // Clear storage anyway even if API fails
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      // Dispatch logout and navigate anyway
      dispatch(logout())
      setTimeout(() => {
        navigate('/login')
      }, 500)
    }
  }

  const handleProfileClick = () => {
    if (user?.firstLogin) {
      dispatch(clearFirstLogin())
      setShowFullMenu(true)
    }
    navigate('/dashboard')
  }

  const menuItems = createExistingMenuItems(navigate, handleLogout)
  
  return (
    <TabsProvider>
      <AppLayoutContent 
        user={user}
        isFirstLogin={isFirstLogin}
        showFullMenu={showFullMenu}
        setShowFullMenu={setShowFullMenu}
        handleProfileClick={handleProfileClick}
        menuItems={menuItems}
        location={location}
      />
    </TabsProvider>
  )
}

interface AppLayoutContentProps {
  user: any
  isFirstLogin: boolean
  showFullMenu: boolean
  setShowFullMenu: (value: boolean) => void
  handleProfileClick: () => void
  menuItems: any[]
  location: any
}

const AppLayoutContent: React.FC<AppLayoutContentProps> = ({
  user,
  isFirstLogin,
  showFullMenu,
  setShowFullMenu,
  handleProfileClick,
  menuItems,
  location
}) => {
  const { clearAllTabs, tabs, removeTab } = useTabs()
  const navigate = useNavigate()
  
  // Clear tabs when navigating away from dashboard
  useEffect(() => {
    if (!location.pathname.startsWith('/dashboard')) {
      clearAllTabs()
    }
  }, [location.pathname, clearAllTabs])
  
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Top Header with Logo and Menu */}
      <header className="bg-surface-primary border-b border-border-primary shadow-lg backdrop-blur-sm relative z-50">
        <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <ABQuotesLogo size="md" variant="icon-only" />
            <div className="text-lg font-semibold text-text-primary">
              Trading Platform
            </div>
          </div>
          {!isFirstLogin && <Menu items={menuItems} currentPath={location.pathname} />}
          {isFirstLogin && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard/market-watch')}
                className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-600 hover:bg-blue-500 hover:text-white transition-all duration-300 flex items-center gap-2 font-medium"
              >
                <Eye className="w-4 h-4" />
                Market Watch
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <PanicButton />
          <ThemeToggle variant="icon" size="sm" />
          <button 
            onClick={handleProfileClick}
            className="w-10 h-10 rounded-xl bg-gradient-to-r from-brand-primary/15 to-brand-secondary/15 hover:from-brand-primary hover:to-brand-primary-hover hover:text-white flex items-center justify-center text-brand-primary transition-all duration-300 hover:scale-110 cursor-pointer text-sm font-bold border-2 border-brand-primary/30 hover:border-white shadow-lg hover:shadow-xl transform"
            title={isFirstLogin ? "Click to Access Full Menu" : "User Menu"}
          >
            U
          </button>
        </div>
      </div>
    </header>

      {/* Tab Bar */}
      <div className="relative z-40">
        <TabBar />
      </div>

      {/* Main Content */}
      <MainContentArea location={location} />
    </div>
  )
}

const MainContentArea: React.FC<{ location: any }> = ({ location }) => {
  const { tabs } = useTabs()
  const navigate = useNavigate()
  const isCreateUserOnCurrentPage = location.pathname === '/dashboard/create-user'
  const isEditModeOnCurrentPage = location.search.includes('mode=edit')
  
  // Check if Create User tab exists in open tabs
  const createUserTabExists = tabs.some(tab => tab.path === '/dashboard/create-user')
  
  // Check if Edit User tab exists (mode=edit in path)
  const editUserTabExists = tabs.some(tab => tab.path.includes('mode=edit'))
  
  // Check if there are other tabs open besides create-user
  const hasOtherTabs = tabs.some(tab => tab.path !== '/dashboard/create-user' && !tab.path.includes('mode=edit'))
  
  // Show split layout if either create-user or edit tab exists
  const showSplitLayout = createUserTabExists || editUserTabExists
  
  // Redirect to dashboard if all tabs are closed and not on login page
  useEffect(() => {
    if (tabs.length === 0 && !location.pathname.includes('/login') && location.pathname !== '/dashboard') {
      navigate('/dashboard')
    }
  }, [tabs.length, location.pathname, navigate])

  // When on create-user page but the tab is closed, navigate to the other tab
  useEffect(() => {
    if ((isCreateUserOnCurrentPage || isEditModeOnCurrentPage) && !showSplitLayout) {
      // The create-user or edit tab has been closed, navigate to another tab if exists
      const validTab = tabs.find(tab => tab.path !== '/dashboard/create-user' && !tab.path.includes('mode=edit'))
      if (validTab) {
        navigate(validTab.path)
      } else {
        navigate('/dashboard')
      }
    }
  }, [isCreateUserOnCurrentPage, isEditModeOnCurrentPage, showSplitLayout, tabs, navigate])
  
  return (
    <main className="flex-1 overflow-auto relative z-10">
      {showSplitLayout ? (
        <div className="flex h-full">
          {/* Create/Edit User Panel - 40% (always visible when tab exists) */}
          <div className="w-[40%] border-r-2 border-border-primary overflow-auto">
            {isCreateUserOnCurrentPage || isEditModeOnCurrentPage ? (
              <Outlet />
            ) : (
              // Show Create/Edit User component even when not on that route
              <CreateUserPanel />
            )}
          </div>
          {/* Right Panel - 60% (shows current page or other tabs) */}
          <div className="w-[60%] overflow-auto">
            {isCreateUserOnCurrentPage || isEditModeOnCurrentPage ? (
              // If on Create/Edit User page, show other tabs or placeholder
              hasOtherTabs ? (
                <SecondaryPanelContent />
              ) : (
                <div className="p-6">
                  <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mb-4">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Welcome to User Management
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">
                      Fill in the form on the left to create or edit a user
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      💡 Tip: Open User List or Search User from the Profile menu to view them here
                    </p>
                  </div>
                </div>
              )
            ) : (
              // If on different page, show that page in 60% panel
              <Outlet />
            )}
          </div>
        </div>
      ) : (
        <div className="p-6">
          <Outlet />
        </div>
      )}
    </main>
  )
}

const CreateUserPanel: React.FC = () => {
  const CreateNewUser = React.lazy(() => import('../../pages/user-management/CreateNewUser'))
  
  return (
    <React.Suspense fallback={<div className="p-6 text-center">Loading Create User...</div>}>
      <CreateNewUser />
    </React.Suspense>
  )
}

export default AppLayout
