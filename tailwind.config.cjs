/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand colors - Trading Green Theme
        'brand-primary': 'var(--brand-primary)',
        'brand-primary-hover': 'var(--brand-primary-hover)',
        'brand-secondary': 'var(--brand-secondary)',
        'brand-accent': 'var(--brand-accent)',
        
        // Surface colors
        'surface-primary': 'var(--surface-primary)',
        'surface-secondary': 'var(--surface-secondary)',
        'surface-hover': 'var(--surface-hover)',
        'surface-elevated': 'var(--surface-elevated)',
        
        // Text colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        
        // Border colors
        'border-primary': 'var(--border-primary)',
        
        // Status colors
        'status-success': 'var(--color-status-success)',
        'status-warning': 'var(--color-status-warning)',
        'status-error': 'var(--color-status-error)',
        'status-info': 'var(--color-status-info)',
        
        // Trading colors
        'trading-profit': 'var(--color-trading-profit)',
        'trading-loss': 'var(--color-trading-loss)',
        'trading-buy': 'var(--color-trading-buy)',
        'trading-sell': 'var(--color-trading-sell)',
        'trading-neutral': 'var(--color-trading-neutral)',
        
        // Legacy support (gradually migrate away from these)
        primary: {
          50: '#f3f8ff',
          100: '#e6f0ff',
          500: 'var(--color-brand-primary)'
        },
        accent: 'var(--color-brand-secondary)'
      },
      spacing: {
        '18': '4.5rem'
      },
      borderRadius: {
        'xl': '1rem'
      },
      fontSize: {
        'xs': ['0.65rem', { lineHeight: '1rem' }],     // 10.4px, smaller than default 12px
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }], // 13px, smaller than default 14px
        'base': ['0.875rem', { lineHeight: '1.375rem' }], // 14px, smaller than default 16px
        'lg': ['1rem', { lineHeight: '1.5rem' }],       // 16px, smaller than default 18px
        'xl': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px, smaller than default 20px
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px, smaller than default 24px
        '3xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px, smaller than default 30px
        '4xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px, smaller than default 36px
        '5xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px, smaller than default 48px
        '6xl': ['3rem', { lineHeight: '1' }],           // 48px, smaller than default 60px
      }
    },
  },
  plugins: [],
}
