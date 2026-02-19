import React, { forwardRef } from 'react'
import { Dropdown } from 'primereact/dropdown'
import { classNames } from 'primereact/utils'

export interface DropdownOption {
  label: string
  value: string | number
  disabled?: boolean
  icon?: string
}

interface DropdownFieldProps {
  id?: string
  label?: string
  value: string | number | null
  onChange: (value: string | number | null) => void
  onBlur?: () => void
  options: DropdownOption[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  helpText?: string
  size?: 'small' | 'normal' | 'large'
  className?: string
  showClear?: boolean
  filter?: boolean
  filterPlaceholder?: string
  emptyMessage?: string
  loading?: boolean
}

const DropdownField = forwardRef<Dropdown, DropdownFieldProps>(({
  id,
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
  error,
  helpText,
  size = 'normal',
  className = '',
  showClear = true,
  filter = false,
  filterPlaceholder = 'Search...',
  emptyMessage = 'No options available',
  loading = false,
}, ref) => {
  const inputId = id || `dropdown-${Math.random().toString(36).substr(2, 9)}`
  
  const sizeClasses = {
    small: 'p-dropdown-sm',
    normal: '',
    large: 'p-dropdown-lg'
  }

  const containerClass = classNames(
    'flex flex-col gap-2',
    className
  )

  const dropdownClass = classNames(
    'w-full',
    sizeClasses[size],
    {
      'p-invalid': !!error,
    }
  )

  const labelClass = classNames(
    'text-sm font-medium text-text-secondary',
    {
      'text-status-error': !!error,
    }
  )

  const optionTemplate = (option: DropdownOption) => {
    return (
      <div className="flex items-center gap-2">
        {option.icon && <i className={option.icon} />}
        <span>{option.label}</span>
      </div>
    )
  }

  const valueTemplate = () => {
    const selectedOption = options.find(opt => opt.value === value)
    if (!selectedOption) return placeholder

    return (
      <div className="flex items-center gap-2">
        {selectedOption.icon && <i className={selectedOption.icon} />}
        <span>{selectedOption.label}</span>
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <Dropdown
        id={inputId}
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.value)}
        onBlur={onBlur}
        options={options}
        optionLabel="label"
        optionValue="value"
        optionDisabled="disabled"
        placeholder={placeholder}
        disabled={disabled || loading}
        className={dropdownClass}
        itemTemplate={optionTemplate}
        valueTemplate={valueTemplate}
        showClear={showClear && !!value}
        filter={filter}
        filterPlaceholder={filterPlaceholder}
        emptyMessage={emptyMessage}
        loading={loading}
        loadingIcon="pi pi-spin pi-spinner"
      />

      {error && (
        <small className="text-red-400 text-xs mt-1 block">
          <i className="pi pi-exclamation-triangle mr-1" />
          {error}
        </small>
      )}
    </div>
  )
})

DropdownField.displayName = 'DropdownField'

export default DropdownField