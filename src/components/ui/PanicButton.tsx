import React, { useState, useRef, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export const PanicButton: React.FC = () => {
  const [showConfirm, setShowConfirm] = useState(false)
  const panicRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panicRef.current && !panicRef.current.contains(event.target as Node)) {
        setShowConfirm(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePanic = () => {
    if (showConfirm) {
      // Close all positions - implement actual logic
      console.log('🚨 Panic mode activated - closing all positions')
      setShowConfirm(false)
      // TODO: Call API to close all positions
    } else {
      setShowConfirm(true)
    }
  }

  return (
    <div ref={panicRef} className="relative">
      <div className="group relative">
        <button
          onClick={handlePanic}
          className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold text-white transition-all ${
            showConfirm 
              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
              : 'bg-red-500 hover:bg-red-600'
          }`}
          title="Panic Button - Close all positions"
        >
          <AlertTriangle className="w-5 h-5" />
        </button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-text-primary text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          Panic Mode
        </div>
      </div>

      {/* Panic Confirmation Dialog */}
      {showConfirm && (
        <div className="absolute right-0 top-full mt-2 bg-surface-primary border border-red-500/50 rounded-lg shadow-2xl p-4 min-w-72 z-50 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-text-primary">Confirm Panic Mode</p>
          </div>
          
          <p className="text-sm text-text-secondary mb-4">
            Are you sure you want to activate panic mode? This will close all open positions.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-3 py-2 text-sm bg-surface-secondary hover:bg-surface-hover rounded-lg text-text-primary font-medium transition-colors border border-border-primary"
            >
              No
            </button>
            <button
              onClick={handlePanic}
              className="flex-1 px-3 py-2 text-sm bg-red-500 hover:bg-red-600 rounded-lg text-white font-semibold transition-colors shadow-lg"
            >
              Yes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PanicButton
