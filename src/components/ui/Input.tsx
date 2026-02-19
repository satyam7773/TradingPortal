import React, { useState, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LucideIcon } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: LucideIcon
  error?: string
  showPasswordToggle?: boolean
  isValid?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  icon: Icon,
  error,
  showPasswordToggle = false,
  isValid = false,
  className = '',
  type = 'text',
  value,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type
  const hasValue = value && String(value).length > 0

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs text-text-secondary mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Left Icon */}
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Icon className="w-4 h-4 text-brand-primary" />
          </div>
        )}

        {/* Input Field */}
        <input
          ref={ref}
          type={inputType}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full h-12 ${Icon ? 'pl-12' : 'pl-4'} ${
            showPasswordToggle ? 'pr-12' : 'pr-4'
          } py-3 rounded-lg bg-surface-secondary border transition-all duration-200 text-text-primary placeholder-text-muted hover:bg-surface-tertiary ${
            error
              ? 'border-red-500 ring-2 ring-red-500/20'
              : isFocused
              ? 'border-brand-primary ring-2 ring-brand-primary/20 bg-surface-tertiary'
              : 'border-border-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20'
          }`}
          {...props}
        />

        {/* Password Toggle */}
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-brand-primary transition-colors duration-200"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-text-secondary hover:text-brand-primary" />
            ) : (
              <Eye className="w-4 h-4 text-text-secondary hover:text-brand-primary" />
            )}
          </button>
        )}

        {/* Valid Indicator */}
        {hasValue && isValid && !error && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute inset-y-0 ${showPasswordToggle ? 'right-8 pr-4' : 'right-0 pr-4'} flex items-center pointer-events-none`}
          >
            <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
          </motion.div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-xs text-red-400"
        >
          {error}
        </motion.div>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input