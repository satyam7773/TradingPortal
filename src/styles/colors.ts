// Theme colors configuration
export const colors = {
  // Brand colors - Updated from new R+ logo (purple primary, red secondary)
  brand: {
    primary: '#8b2d8b',     // Purple from logo (primary)
    secondary: '#ef1c25',   // Red from logo (secondary)
    accent: '#d91e63',      // Pink/Magenta from logo (accent)
  },
  
  // Light theme
  light: {
    // Background colors
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      elevated: '#ffffff',
    },
    
    // Surface colors
    surface: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
      hover: '#f9fafb',
      active: '#f3f4f6',
    },
    
    // Text colors
    text: {
      primary: '#0f172a',
      secondary: '#374151',
      tertiary: '#6b7280',
      inverse: '#ffffff',
      muted: '#9ca3af',
    },
    
    // Border colors
    border: {
      primary: '#e5e7eb',
      secondary: '#d1d5db',
      tertiary: '#9ca3af',
      focus: '#2563eb', // Brand blue focus for light theme
    },
    
    // Status colors
    status: {
      success: '#8b2d8b', // Brand purple
      warning: '#f59e0b',
      error: '#ef1c25',   // Brand red
      info: '#d91e63',    // Brand accent pink
    },
    
    // Trading specific colors  
    trading: {
      profit: '#8b2d8b',  // Brand purple
      loss: '#ef1c25',    // Brand red
      buy: '#8b2d8b',     // Brand purple
      sell: '#ef1c25',    // Brand red
      neutral: '#6b7280',
    },
  },
  
  // Dark theme
  dark: {
    // Background colors
    background: {
      primary: '#0b1220',
      secondary: '#0f172a',
      tertiary: '#1e293b',
      elevated: '#1e293b',
    },
    
    // Surface colors
    surface: {
      primary: '#1e293b',
      secondary: '#334155',
      tertiary: '#475569',
      hover: '#334155',
      active: '#475569',
    },
    
    // Text colors
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      inverse: '#0f172a',
      muted: '#64748b',
    },
    
    // Border colors
    border: {
      primary: '#334155',
      secondary: '#475569',
      tertiary: '#64748b',
      focus: '#2563eb',
    },
    
    // Status colors
    status: {
      success: '#d91e63',  // Brand accent pink
      warning: '#f59e0b',
      error: '#ef1c25',    // Brand red
      info: '#d91e63',     // Brand accent pink
    },
    
    // Trading specific colors
    trading: {
      profit: '#d91e63',   // Brand accent pink
      loss: '#ef1c25',     // Brand red
      buy: '#d91e63',      // Brand accent pink
      sell: '#ef1c25',     // Brand red
      neutral: '#94a3b8',
    },
  },
}

// CSS custom properties generator
export const generateCSSVariables = (theme: 'light' | 'dark') => {
  const themeColors = colors[theme]
  const cssVars: Record<string, string> = {}
  
  // Flatten the color object and create CSS custom properties
  const flattenColors = (obj: any, prefix = '') => {
    Object.keys(obj).forEach(key => {
      const value = obj[key]
      const cssKey = prefix ? `${prefix}-${key}` : key
      
      if (typeof value === 'object' && value !== null) {
        flattenColors(value, cssKey)
      } else {
        cssVars[`--color-${cssKey}`] = value
      }
    })
  }
  
  // Add brand colors (always available)
  flattenColors(colors.brand, 'brand')
  
  // Add theme-specific colors
  flattenColors(themeColors)
  
  return cssVars
}