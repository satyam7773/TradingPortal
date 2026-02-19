import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { 
  Login,
  DashboardPage,
  Markets,
  Orders,
  Portfolio,
  UserList,
  UserDetails,
  ApiTestPage,
  SearchUser
} from './pages'
import CreateNewUser from './pages/user-management/CreateNewUser'
import MarketWatch from './pages/dashboard/MarketWatch'
import UserWisePosition from './pages/reports/UserWisePosition'
import ManageTraders from './pages/reports/ManageTraders'
import TradeAccount from './pages/reports/TradeAccount'
import Settlement from './pages/reports/Settlement'
import AppLayout from './components/layout/AppLayout'
import ScrollToTop from './components/common/ScrollToTop'

const App: React.FC = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="markets" element={<Markets />} />
          <Route path="market-watch" element={<MarketWatch />} />
          <Route path="orders" element={<Orders />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="user-list" element={<UserList />} />
          <Route path="user-details/:userId" element={<UserDetails />} />
          <Route path="create-user" element={<CreateNewUser />} />
          <Route path="search-user" element={<SearchUser />} />
          <Route path="api-test" element={<ApiTestPage />} />
          <Route path="user-position" element={<UserWisePosition />} />
          <Route path="manage-traders" element={<ManageTraders />} />
          <Route path="trade-account" element={<TradeAccount />} />
          <Route path="settlement" element={<Settlement />} />
          <Route path="*" element={<div className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
            <p className="text-gray-600 mb-4">The route you're looking for doesn't exist within /dashboard</p>
            <button onClick={() => window.location.href = '/dashboard'} className="px-4 py-2 bg-blue-600 text-white rounded">
              Go to Dashboard
            </button>
          </div>} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}

export default App
