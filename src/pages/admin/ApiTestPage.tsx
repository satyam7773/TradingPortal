import React, { useState } from 'react'
import apiService, { apiConfig, TokenManager } from '../../services/api'
import { motion } from 'framer-motion'

const ApiTestPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<any[]>([])

  const addResult = (title: string, data: any, isError = false) => {
    const result = {
      id: Date.now(),
      title,
      data,
      isError,
      timestamp: new Date().toLocaleString()
    }
    setResults(prev => [result, ...prev.slice(0, 9)]) // Keep last 10 results
  }

  const testApi = async (title: string, apiCall: () => Promise<any>) => {
    setLoading(title)
    try {
      const result = await apiCall()
      addResult(title, result)
    } catch (error: any) {
      addResult(title, error.message || error, true)
    } finally {
      setLoading(null)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  const clearTokens = () => {
    TokenManager.clearTokens()
    addResult('Clear Tokens', 'All tokens cleared successfully')
  }

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-4">API Testing Dashboard</h1>
          <div className="bg-surface-primary border border-border-primary rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-text-secondary">Base URL:</span>
                <span className="ml-2 text-text-primary">{apiConfig.baseURL}</span>
              </div>
              <div>
                <span className="text-text-secondary">Timeout:</span>
                <span className="ml-2 text-text-primary">{apiConfig.timeout}ms</span>
              </div>
              <div>
                <span className="text-text-secondary">Token:</span>
                <span className="ml-2 text-text-primary">
                  {TokenManager.getToken() ? '✓ Present' : '✗ None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* API Test Buttons */}
          <div className="bg-surface-primary border border-border-primary rounded-lg p-6">
            <h2 className="text-xl font-bold text-text-primary mb-6">API Endpoints</h2>
            
            <div className="space-y-4">
              {/* Authentication APIs */}
              <div>
                <h3 className="text-lg font-semibold text-text-secondary mb-3">Authentication</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => testApi('Login', () => apiService.login({
                      username: 'testadmin',
                      password: '123456',
                      server: 'MATRIX'
                    }))}
                    disabled={loading === 'Login'}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:from-red-700 hover:via-pink-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                  >
                    {loading === 'Login' ? 'Testing...' : 'Test Login'}
                  </button>
                  
                  <button
                    onClick={() => testApi('Profile', () => apiService.getProfile())}
                    disabled={loading === 'Profile'}
                    className="px-4 py-2 bg-brand-secondary hover:bg-brand-secondary/90 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading === 'Profile' ? 'Testing...' : 'Get Profile'}
                  </button>
                  
                  <button
                    onClick={() => testApi('Logout', () => apiService.logout())}
                    disabled={loading === 'Logout'}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading === 'Logout' ? 'Testing...' : 'Test Logout'}
                  </button>
                </div>
              </div>

              {/* Trading APIs */}
              <div>
                <h3 className="text-lg font-semibold text-text-secondary mb-3">Trading</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => testApi('Portfolio', () => apiService.getPortfolio())}
                    disabled={loading === 'Portfolio'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading === 'Portfolio' ? 'Loading...' : 'Get Portfolio'}
                  </button>
                  
                  <button
                    onClick={() => testApi('Positions', () => apiService.getPositions())}
                    disabled={loading === 'Positions'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading === 'Positions' ? 'Loading...' : 'Get Positions'}
                  </button>
                  
                  <button
                    onClick={() => testApi('Orders', () => apiService.getOrders({ page: 1, limit: 10 }))}
                    disabled={loading === 'Orders'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading === 'Orders' ? 'Loading...' : 'Get Orders'}
                  </button>
                  
                  <button
                    onClick={() => testApi('Market Data', () => apiService.getMarketData(['NIFTY50', 'BANKNIFTY']))}
                    disabled={loading === 'Market Data'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading === 'Market Data' ? 'Loading...' : 'Market Data'}
                  </button>
                </div>
              </div>

              {/* Reports APIs */}
              <div>
                <h3 className="text-lg font-semibold text-text-secondary mb-3">Reports</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => testApi('P&L Report', () => apiService.getPnLReport({
                      from: '2024-01-01',
                      to: '2024-01-31'
                    }))}
                    disabled={loading === 'P&L Report'}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading === 'P&L Report' ? 'Loading...' : 'P&L Report'}
                  </button>
                  
                  <button
                    onClick={() => testApi('Account Summary', () => apiService.getAccountSummary())}
                    disabled={loading === 'Account Summary'}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading === 'Account Summary' ? 'Loading...' : 'Account Summary'}
                  </button>
                </div>
              </div>

              {/* Utility Buttons */}
              <div>
                <h3 className="text-lg font-semibold text-text-secondary mb-3">Utilities</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={clearTokens}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Clear Tokens
                  </button>
                  
                  <button
                    onClick={clearResults}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Clear Results
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-surface-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-primary">API Results</h2>
              <span className="text-text-secondary text-sm">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-center text-text-muted py-8">
                  No API calls made yet. Try some endpoints!
                </div>
              ) : (
                results.map((result) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border ${
                      result.isError 
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' 
                        : 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold ${
                        result.isError ? 'text-red-700 dark:text-red-300' : 'text-purple-700 dark:text-purple-300'
                      }`}>
                        {result.title}
                      </h3>
                      <span className="text-xs text-text-muted">
                        {result.timestamp}
                      </span>
                    </div>
                    <pre className={`text-xs overflow-x-auto ${
                      result.isError ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'
                    }`}>
                      {typeof result.data === 'string' 
                        ? result.data 
                        : JSON.stringify(result.data, null, 2)
                      }
                    </pre>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApiTestPage