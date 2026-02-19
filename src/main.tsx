import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import store from './store'
import { ThemeProvider } from './contexts/ThemeContext'
import './styles/main.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  // Temporarily disable StrictMode to prevent double API calls in development
  // <React.StrictMode>
    <ThemeProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
            <Toaster
              position="top-right"
              containerStyle={{
                zIndex: 9999999,
              }}
              toastOptions={{
                duration: 5000,
                style: {
                  background: 'var(--color-surface-primary)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border-primary)',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--color-status-success)',
                    secondary: 'var(--color-text-inverse)',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'var(--color-status-error)',
                    secondary: 'var(--color-text-inverse)',
                  },
                },
              }}
            />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    </ThemeProvider>
  // </React.StrictMode>
)
