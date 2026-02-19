import React, { forwardRef } from 'react'
import { InputText } from 'primereact/inputtext'
import { Password } from 'primereact/password'
import { classNames } from 'primereact/utils'

interface InputFieldProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  type?: 'text' | 'email' | 'password' | 'number'
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  helpText?: string
  icon?: string
  iconPosition?: 'left' | 'right'
  size?: 'small' | 'normal' | 'large'
  className?: string
  showPasswordStrength?: boolean
}

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  disabled = false,
  required = false,
  error,
  helpText,
  icon,
  iconPosition = 'left',
  size = 'normal',
  className = '',
  showPasswordStrength = false,
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  
  const sizeClasses = {
    small: 'p-inputtext-sm',
    normal: '',
    large: 'p-inputtext-lg'
  }

  const containerClass = classNames(
    'flex flex-col gap-2',
    className
  )

  const inputWrapperClass = classNames(
    'relative',
    {
      'p-input-icon-left': icon && iconPosition === 'left',
      'p-input-icon-right': icon && iconPosition === 'right',
    }
  )

  const inputClass = classNames(
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

  const renderInput = () => {
    if (type === 'password') {
      return (
        <Password
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
          inputClassName="w-full bg-surface-secondary border-border-primary text-text-primary"
          toggleMask
          feedback={showPasswordStrength}
          promptLabel="Enter a password"
          weakLabel="Weak"
          mediumLabel="Medium"
          strongLabel="Strong"
        />
      )
    }

    return (
      <>
        {icon && (
          <i className={classNames(icon, 'text-text-tertiary')} />
        )}
        <InputText
          id={inputId}
          ref={ref}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClass}
        />
      </>
    )
  }

  return (
    <div className={containerClass}>
      <div className={inputWrapperClass}>
        {renderInput()}
      </div>

      {error && (
        <small className="text-red-400 text-xs mt-1 block">
          <i className="pi pi-exclamation-triangle mr-1" />
          {error}
        </small>
      )}
    </div>
  )
})

InputField.displayName = 'InputField'

export default InputField