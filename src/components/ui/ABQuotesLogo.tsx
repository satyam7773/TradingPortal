import React from 'react'
import logoImage from '../../assets/logo.png'

interface ABQuotesLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  variant?: 'full' | 'icon-only'
  showText?: boolean
}

const ABQuotesLogo: React.FC<ABQuotesLogoProps> = ({
  size = 'md',
  className = '',
  variant = 'full',
  showText = true
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  }

  const LogoIcon = () => (
    <div className={`${sizeClasses[size]} relative flex items-center justify-center ${className}`}>
      <img 
        src={logoImage} 
        alt="AB Quotes Logo" 
        className="w-full h-full object-contain rounded-lg"
      />
    </div>
  )

  if (variant === 'icon-only') {
    return <LogoIcon />
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoIcon />
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-text-primary ${textSizes[size]}`}>
            <span className="text-brand-primary">A</span>
            <span className="text-brand-secondary">B</span>
          </span>
          <span className={`font-semibold ${textSizes[size]} text-text-secondary`}>
            <span className="text-brand-secondary">QUO</span>
            <span className="text-brand-primary">TES</span>
          </span>
        </div>
      )}
    </div>
  )
}

export default ABQuotesLogo