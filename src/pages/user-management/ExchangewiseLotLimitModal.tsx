import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createPortal } from 'react-dom'
import userManagementService from '../../services/userManagementService'

interface Exchange {
  exchangeId: number
  exchangeName: string
  lotLimit: boolean
  maxLots: number
}

interface ExchangewiseLotLimitModalProps {
  isOpen: boolean
  user: any
  onClose: () => void
}

const ExchangewiseLotLimitModal: React.FC<ExchangewiseLotLimitModalProps> = ({
  isOpen,
  user,
  onClose,
}) => {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch data on modal open
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchExchangeLotLimits()
    }
  }, [isOpen, user?.id])

  const fetchExchangeLotLimits = async () => {
    setLoading(true)
    try {
      const response = await userManagementService.fetchExchangewiseLotLimit(
        user.id,
      )
      if (response?.responseCode === '0' && Array.isArray(response.data)) {
        setExchanges(response.data)
      } else {
        toast.error('Failed to load exchange lot limits')
      }
    } catch (error) {
      console.error('Error fetching exchange lot limits:', error)
      toast.error('Failed to load exchange lot limits')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleExchange = (exchangeId: number) => {
    setExchanges(prev =>
      prev.map(ex =>
        ex.exchangeId === exchangeId ? { ...ex, lotLimit: !ex.lotLimit } : ex,
      ),
    )
  }

  const handleMaxLotsChange = (exchangeId: number, value: string) => {
    // Remove leading zeros but keep input editable
    let cleanValue = value.replace(/^0+/, '') || '0'
    
    // Prevent negative numbers
    if (cleanValue.startsWith('-')) {
      cleanValue = '0'
    }
    
    const numValue = parseInt(cleanValue) || 0
    setExchanges(prev =>
      prev.map(ex =>
        ex.exchangeId === exchangeId ? { ...ex, maxLots: numValue } : ex,
      ),
    )
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = exchanges.map(ex => ({
        exchangeId: ex.exchangeId,
        lotLimit: ex.lotLimit,
        maxLots: ex.maxLots,
      }))

      const response = await userManagementService.updateExchangewiseLotLimit(
        user.id,
        payload,
      )

      if (response?.responseCode === '0') {
        toast.success('Exchangewise Lot Limit updated successfully')
        onClose()
      } else {
        toast.error(response?.responseMessage || 'Failed to update')
      }
    } catch (error) {
      console.error('Error updating exchange lot limits:', error)
      toast.error('Failed to update exchangewise lot limits')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !user) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md z-50 animate-fadeIn"
      style={{ zIndex: 99999 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-gray-200/50 dark:border-slate-700/50 overflow-hidden transform transition-all duration-300 animate-slideUp"
        style={{ width: '98vw', height: '96vh', maxWidth: '600px' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-lg">
              <span className="text-lg">📦</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Exchangewise Lot Limit
              </h2>
              <p className="text-cyan-100 text-xs">User: {user?.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 backdrop-blur-xl border border-white/30 hover:rotate-90 transform group disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {exchanges.map(exchange => (
                <div
                  key={exchange.exchangeId}
                  className="bg-white dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Exchange Name */}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {exchange.exchangeName}
                      </p>
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center">
                      <button
                        onClick={() => handleToggleExchange(exchange.exchangeId)}
                        disabled={isSaving}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          exchange.lotLimit
                            ? 'bg-green-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        } disabled:opacity-50`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            exchange.lotLimit ? 'translate-x-6' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Max Lots Input */}
                    <div className="w-28">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={exchange.maxLots}
                        onChange={e =>
                          handleMaxLotsChange(
                            exchange.exchangeId,
                            e.target.value,
                          )
                        }
                        disabled={!exchange.lotLimit || isSaving}
                        onKeyDown={(e) => {
                          // Block arrow keys and minus sign
                          if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === '-') {
                            e.preventDefault()
                          }
                        }}
                        onWheel={(e) => {
                          e.currentTarget.blur()
                        }}
                        className={`w-full px-3 py-2 border rounded-lg text-center font-semibold transition-colors ${
                          exchange.lotLimit
                            ? 'bg-white dark:bg-slate-800 border-blue-400 dark:border-blue-500 text-gray-900 dark:text-white'
                            : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                        placeholder="Max Lot"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-slate-700 flex-shrink-0 bg-gray-50 dark:bg-slate-800">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              isSaving || 
              loading || 
              exchanges.some(ex => ex.lotLimit && ex.maxLots === 0)
            }
            title={exchanges.some(ex => ex.lotLimit && ex.maxLots === 0) ? 'Cannot save: Max Lots cannot be 0 when enabled' : ''}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ExchangewiseLotLimitModal
