import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { createPortal } from 'react-dom'

interface SelectedInstrument {
  token: number
  config: {
    exchange?: string
    tradeSymbol?: string
    instrumentName?: string
    script?: string
    lotSize?: number
    expiry?: string
  }
}

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  orderType: 'BUY' | 'SELL'
  selectedInstrument: SelectedInstrument | null
  liveData?: {
    bid?: number
    ask?: number
    ltp?: number
  }

  // Form state
  orderQuantity: string
  onOrderQuantityChange: (value: string) => void

  orderPrice: string
  onOrderPriceChange: (value: string) => void

  orderMethod: string
  onOrderMethodChange: (value: string) => void

  orderRemark: string
  onOrderRemarkChange: (value: string) => void

  // Pre-filled Client Profile Display
  isAdminUser?: boolean
  clientSearchTerm: string
  onClientSearchChange: (value: string) => void
  availableClients?: Array<{ userId: number; username: string; name: string }>
  selectedClient?: { userId: number; username: string; name: string } | null
  onClientSelect?: (client: { userId: number; username: string; name: string }) => void

  // Submission
  isSubmitting: boolean
  onSubmit: () => void
  onCancel?: () => void

  // Fixed Draggable mouse hooks
  modalPosition?: { x: number; y: number }
  onDragStart?: (e: React.MouseEvent) => void
  isDragging?: boolean

  // Order method editability control
  isOrderMethodDisabled?: boolean
}

const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  orderType: typeParam,
  selectedInstrument,
  liveData,

  orderQuantity,
  onOrderQuantityChange,

  orderPrice,
  onOrderPriceChange,

  orderMethod,
  onOrderMethodChange,

  orderRemark,
  onOrderRemarkChange,

  isAdminUser = false,
  clientSearchTerm,
  onClientSearchChange,
  availableClients,
  selectedClient,
  onClientSelect,

  isSubmitting,
  onSubmit,
  onCancel,

  modalPosition = { x: 0, y: 0 },
  onDragStart,
  isDragging = false,
  isOrderMethodDisabled = false
}) => {
  // Searchable select state for Client Account
  const [clientSearchOpen, setClientSearchOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const clientDropdownRef = useRef<HTMLDivElement>(null)

  // When modal opens or selected client changes, show the selected client's display name
  useEffect(() => {
    if (isOpen && selectedClient) {
      setClientSearch(`${selectedClient.username}`)
    } else if (!isOpen) {
      setClientSearch('')
    }
  }, [selectedClient, isOpen])

  // Handle click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setClientSearchOpen(false)
      }
    }
    if (clientSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [clientSearchOpen])

  if (!isOpen || !selectedInstrument) return null

  const isBuy = typeParam === 'BUY'
  const headerColor = isBuy ? 'from-blue-600 to-blue-700' : 'from-red-600 to-red-700'
  const labelColor = isBuy ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
  const inputBgColor = isBuy ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'
  const inputBorderColor = isBuy ? 'border-blue-300 dark:border-blue-600' : 'border-red-300 dark:border-red-600'
  const focusBorderColor = isBuy ? 'focus:border-blue-500' : 'focus:border-red-500'
  const priceLabel = isBuy ? 'Sell Price (ASK)' : 'Buy Price (BID)'

  const config = selectedInstrument.config
  const isCallPutExchange = config?.exchange === 'CALLPUT'
  const isMarketMode = orderMethod === 'MARKET'

  // Filter clients based on search term
  const filteredClients = availableClients?.filter(client =>
    client.username.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.name.toLowerCase().includes(clientSearch.toLowerCase())
  ) || []

  // Fallback coordinates matching implementation mechanics
  const hasMoved = modalPosition.x !== 0 || modalPosition.y !== 0
  const inlineStyles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 100001,
    cursor: isDragging ? 'grabbing' : 'auto',
    left: hasMoved ? `${modalPosition.x}px` : '50%',
    top: hasMoved ? `${modalPosition.y}px` : '50%',
    transform: hasMoved ? 'none' : 'translate(-50%, -50%)'
  }

  const modalContent = (
    <div className="fixed inset-0 bg-black/40 z-[100000] p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        style={inlineStyles}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Handle */}
        <div
          className={`bg-gradient-to-r ${headerColor} px-6 py-4 flex items-center justify-between cursor-grab active:cursor-grabbing select-none`}
          onMouseDown={onDragStart}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              {isBuy ? <TrendingUp className="w-6 h-6 text-white" /> : <TrendingDown className="w-6 h-6 text-white" />}
            </div>
            <h2 className="text-xl font-bold text-white">Modify {typeParam} Position</h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="space-y-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: isAdminUser ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr' }}>
              {isAdminUser && (
                <div ref={clientDropdownRef} className="relative client-dropdown-container">
                  <label className="block text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">Client Name</label>
                  {availableClients && availableClients.length > 0 ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value)
                          setClientSearchOpen(true)
                        }}
                        onFocus={() => {
                          setClientSearch('')
                          setClientSearchOpen(true)
                        }}
                        placeholder="Search client..."
                        className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                      />

                      {/* Dropdown List */}
                      {clientSearchOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredClients.length > 0 ? (
                            filteredClients.map((client) => (
                              <button
                                key={client.userId}
                                type="button"
                                onClick={() => {
                                  onClientSelect?.(client)
                                  setClientSearch(`${client.username}`)
                                  setClientSearchOpen(false)
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-200 dark:border-slate-700 last:border-b-0"
                              >
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {client.username}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                              No clients found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={clientSearch}
                      disabled
                      className="w-full px-3 py-3 bg-gray-100 dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-lg text-gray-600 dark:text-gray-400 font-medium cursor-not-allowed outline-none"
                    />
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Order Type</label>
                <select
                  value={orderMethod}
                  onChange={(e) => !isOrderMethodDisabled && onOrderMethodChange(e.target.value)}
                  disabled={isOrderMethodDisabled}
                  className={`w-full px-3 py-3 font-medium border-2 rounded-lg outline-none ${
                    isOrderMethodDisabled
                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 focus:border-blue-500'
                  }`}
                >
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                  <option value="SL">Stop Loss</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-bold ${labelColor} mb-2`}>Quantity</label>
                <input
                  type="number"
                  value={orderQuantity}
                  // ✅ Fixed: Hand off raw values directly to the validated handler in parent code
                  onChange={(e) => onOrderQuantityChange(e.target.value)}
                  className={`w-full px-3 py-3 ${inputBgColor} border-2 ${inputBorderColor} rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none ${focusBorderColor}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-bold ${labelColor} mb-2`}>{priceLabel}</label>
                <input
                  type="number"
                  value={orderPrice}
                  onChange={(e) => onOrderPriceChange(e.target.value)}
                  disabled={isMarketMode}
                  placeholder={isBuy ? liveData?.ask?.toFixed(2) : liveData?.bid?.toFixed(2) || '0'}
                  className={`w-full px-3 py-3 border-2 rounded-lg font-semibold transition-all focus:outline-none ${focusBorderColor} ${isMarketMode
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70'
                      : `${inputBgColor} ${inputBorderColor} text-gray-900 dark:text-white`
                    }`}
                />
              </div>
            </div>

            {/* Row 2: Metadata Fields */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Exchange</label>
                <select disabled className="w-full px-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 font-medium cursor-not-allowed outline-none">
                  <option>{config?.exchange || 'MCX'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Symbol</label>
                <select disabled className="w-full px-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 font-medium cursor-not-allowed outline-none">
                  <option>{config?.tradeSymbol || config?.instrumentName || config?.script || 'N/A'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">LotSize</label>
                <input
                  type="number"
                  defaultValue={config?.lotSize || '100'}
                  disabled
                  className="w-full px-3 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 font-semibold cursor-not-allowed outline-none"
                />
              </div>
              <div>
                <label className={`block text-sm font-bold ${labelColor} mb-2`}>Remark</label>
                <input
                  type="text"
                  value={orderRemark}
                  onChange={(e) => onOrderRemarkChange(e.target.value)}
                  placeholder="Optional note..."
                  className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Action Group */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Modification'}
              </button>
              <button onClick={() => { onCancel?.(); onClose(); }} disabled={isSubmitting} className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default OrderModal