import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  variant?: 'button' | 'icon' | 'switch'
  className?: string
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'md', 
  showLabel = false, 
  variant = 'button',
  className = ''
}) => {
  const { theme, toggleTheme } = useTheme()

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`${sizeClasses[size]} rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border-primary flex items-center justify-center transition-all duration-200 ${className}`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? (
          <Sun className={`${iconSizes[size]} text-text-secondary`} />
        ) : (
          <Moon className={`${iconSizes[size]} text-text-secondary`} />
        )}
      </button>
    )
  }

  if (variant === 'switch') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {showLabel && (
          <span className="text-sm text-text-secondary">
            {theme === 'dark' ? 'Dark' : 'Light'} Mode
          </span>
        )}
        <button
          onClick={toggleTheme}
          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${
            theme === 'dark' ? 'bg-brand-primary' : 'bg-border-secondary'
          }`}
        >
          <span
            className={`inline-block w-4 h-4 transform transition-transform duration-200 bg-white rounded-full ${
              theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border-primary transition-all duration-200 ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className={`${iconSizes[size]} text-text-secondary`} />
      ) : (
        <Moon className={`${iconSizes[size]} text-text-secondary`} />
      )}
      {showLabel && (
        <span className="text-sm text-text-secondary">
          {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </span>
      )}
    </button>
  )
}

export default ThemeToggle