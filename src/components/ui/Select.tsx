import React, { useState, useRef, useEffect, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, LucideIcon } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
  description?: string
  icon?: LucideIcon
}

interface SelectProps {
  label?: string
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  error?: string
  className?: string
  name?: string
  onBlur?: (e: React.FocusEvent<HTMLButtonElement>) => void
  disabled?: boolean
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  className = '',
  name,
  onBlur,
  disabled = false,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs text-text-secondary mb-1">
          {label}
        </label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        <button
          ref={ref}
          type="button"
          name={name}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onBlur={onBlur}
          disabled={disabled}
          className={`w-full h-12 px-4 py-3 rounded-lg bg-surface-secondary border transition-all duration-200 flex items-center justify-between ${
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-surface-tertiary cursor-pointer'
          } ${
            error
              ? 'border-red-500 ring-2 ring-red-500/20'
              : 'border-border-primary focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary'
          }`}
          {...props}
        >
          <div className="flex items-center gap-3">
            {selectedOption ? (
              <>
                {selectedOption.icon && (
                  <selectedOption.icon className="w-4 h-4 text-brand-primary" />
                )}
                <span className="text-text-primary">{selectedOption.label}</span>
              </>
            ) : (
              <span className="text-text-muted">{placeholder}</span>
            )}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`} 
          />
        </button>

        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full mt-1 bg-surface-secondary border border-border-primary rounded-lg shadow-lg overflow-hidden"
            >
              {options.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-4 py-3 text-left hover:bg-surface-tertiary transition-colors flex items-center gap-3 ${
                      value === option.value 
                        ? 'bg-brand-primary/10 border-r-2 border-brand-primary text-brand-primary' 
                        : 'text-text-primary'
                    }`}
                  >
                    {Icon && (
                      <Icon className={`w-4 h-4 ${
                        value === option.value ? 'text-brand-primary' : 'text-text-secondary'
                      }`} />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-text-secondary">{option.description}</div>
                      )}
                    </div>
                    {value === option.value && (
                      <div className="w-2 h-2 bg-brand-primary rounded-full"></div>
                    )}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

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
    </div>
  )
})

Select.displayName = 'Select'

export default Select