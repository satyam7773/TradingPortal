import React, { forwardRef } from 'react'
import { Button } from 'primereact/button'
import { classNames } from 'primereact/utils'

interface ButtonFieldProps {
  label?: string
  icon?: string
  iconPos?: 'left' | 'right' | 'top' | 'bottom'
  loading?: boolean
  loadingIcon?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'help' | 'outlined' | 'text' | 'link'
  size?: 'small' | 'normal' | 'large'
  severity?: 'secondary' | 'success' | 'info' | 'warning' | 'help' | 'danger'
  rounded?: boolean
  raised?: boolean
  fullWidth?: boolean
  className?: string
  style?: React.CSSProperties
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLButtonElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLButtonElement>) => void
  children?: React.ReactNode
  tooltip?: string
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
}

const ButtonField = forwardRef<HTMLButtonElement, ButtonFieldProps>(({
  label,
  icon,
  iconPos = 'left',
  loading = false,
  loadingIcon = 'pi pi-spin pi-spinner',
  disabled = false,
  type = 'button',
  variant = 'primary',
  size = 'normal',
  severity,
  rounded = false,
  raised = false,
  fullWidth = false,
  className = '',
  style,
  onClick,
  onFocus,
  onBlur,
  children,
  tooltip,
  tooltipPosition = 'top',
}, ref) => {
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:from-red-700 hover:via-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
      case 'secondary':
        return 'bg-surface-secondary hover:bg-surface-hover text-text-primary border-border-primary'
      case 'success':
        return 'bg-status-success hover:bg-status-success/90 text-text-inverse border-status-success'
      case 'warning':
        return 'bg-status-warning hover:bg-status-warning/90 text-text-inverse border-status-warning'
      case 'danger':
        return 'bg-status-error hover:bg-status-error/90 text-text-inverse border-status-error'
      case 'info':
        return 'bg-status-info hover:bg-status-info/90 text-text-inverse border-status-info'
      case 'help':
        return 'bg-brand-accent hover:bg-brand-accent/90 text-text-inverse border-brand-accent'
      case 'outlined':
        return 'bg-transparent hover:bg-surface-hover text-text-primary border-border-primary border-2'
      case 'text':
        return 'bg-transparent hover:bg-surface-hover text-text-primary border-transparent'
      case 'link':
        return 'bg-transparent hover:bg-transparent text-brand-primary border-transparent underline'
      default:
        return 'bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:from-red-700 hover:via-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-2 text-sm'
      case 'normal':
        return 'px-4 py-3 text-base'
      case 'large':
        return 'px-6 py-4 text-lg'
      default:
        return 'px-4 py-3 text-base'
    }
  }

  const buttonClass = classNames(
    'inline-flex items-center justify-center',
    'font-semibold',
    'rounded-lg',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    getSizeClasses(),
    getVariantClasses(),
    {
      'rounded-full': rounded,
      'shadow-lg': raised,
      'w-full': fullWidth,
      'cursor-not-allowed opacity-60': loading || disabled,
    },
    className
  )

  const content = children || label

  return (
    <Button
      type={type}
      className={buttonClass}
      style={style}
      onClick={onClick}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled || loading}
      loading={loading}
      loadingIcon={loadingIcon}
      icon={icon}
      iconPos={iconPos}
      severity={severity}
      tooltip={tooltip}
      tooltipOptions={{
        position: tooltipPosition,
        className: 'bg-surface-primary text-text-primary border-border-primary'
      }}
    >
      {content}
    </Button>
  )
})

ButtonField.displayName = 'ButtonField'

export default ButtonField