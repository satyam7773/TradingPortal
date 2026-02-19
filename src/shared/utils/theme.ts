import { Theme } from '../types'

// Theme utility functions
export const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark'
  
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export const getStoredTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem('trading-app-theme')
  return (stored === 'light' || stored === 'dark') ? stored : null
}

export const setStoredTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return
  
  localStorage.setItem('trading-app-theme', theme)
}

export const applyThemeToDocument = (theme: Theme): void => {
  if (typeof document === 'undefined') return
  
  const root = document.documentElement
  
  // Remove existing theme classes
  root.classList.remove('light', 'dark')
  
  // Add new theme class
  root.classList.add(theme)
}