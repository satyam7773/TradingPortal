import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { createPortal } from 'react-dom'

interface Client {
  userId: number
  name: string
  username: string
}

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
  
  // Client selection (for admin only)
  isAdminUser?: boolean
  clients?: Client[]
  selectedClient: { userId: number; name: string; username: string } | null
  onClientSelect: (client: Client | null) => void
  
  clientSearchTerm: string
  onClientSearchChange: (value: string) => void
  
  // Submission
  isSubmitting: boolean
  onSubmit: () => void
  onCancel?: () => void
  
  // Draggable state
  modalPosition?: { x: number; y: number }
  onDragStart?: (e: React.MouseEvent) => void
  isDragging?: boolean
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
  clients = [],
  selectedClient,
  onClientSelect,
  
  clientSearchTerm,
  onClientSearchChange,
  
  isSubmitting,
  onSubmit,
  onCancel,
  
  modalPosition = { x: 0, y: 0 },
  onDragStart,
  isDragging = false
}) => {
  const isBuy = typeParam === 'BUY'
  const headerColor = isBuy ? 'from-blue-600 to-blue-700' : 'from-red-600 to-red-700'
  const labelColor = isBuy ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
  const inputBgColor = isBuy ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'
  const inputBorderColor = isBuy ? 'border-blue-300 dark:border-blue-600' : 'border-red-300 dark:border-red-600'
  const focusBorderColor = isBuy ? 'focus:border-blue-500' : 'focus:border-red-500'
  const priceLabel = isBuy ? 'Sell Price (ASK)' : 'Buy Price (BID)'
  
  const [showClientList, setShowClientList] = useState(false)

  if (!isOpen || !selectedInstrument) return null

  const config = selectedInstrument.config
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.username.toLowerCase().includes(clientSearchTerm.toLowerCase())
  )

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-[100000] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        style={{
          position: 'fixed',
          left: modalPosition.x !== 0 ? `${modalPosition.x}px` : '50%',
          top: modalPosition.y !== 0 ? `${modalPosition.y}px` : '50%',
          transform: modalPosition.x !== 0 ? 'none' : 'translate(-50%, -50%)',
          cursor: isDragging ? 'grabbing' : 'auto',
          zIndex: 100001
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`bg-gradient-to-r ${headerColor} px-6 py-4 flex items-center justify-between cursor-grab active:cursor-grabbing`}
          onMouseDown={onDragStart}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              {isBuy ? (
                <TrendingUp className="w-6 h-6 text-white" />
              ) : (
                <TrendingDown className="w-6 h-6 text-white" />
              )}
            </div>
            <h2 className="text-xl font-bold text-white">{typeParam} Order</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Row 1: Client Name (if admin) | Order Type | Quantity | Price */}
            <div className="grid gap-4" style={{ gridTemplateColumns: isAdminUser ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr' }}>
              {isAdminUser && (
                <div className="relative client-dropdown-container">
                  <label className={`block text-sm font-bold ${labelColor} mb-2`}>Client Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={clientSearchTerm}
                      onChange={(e) => onClientSearchChange(e.target.value)}
                      onFocus={() => setShowClientList(true)}
                      placeholder="Search client..."
                      className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                    />
                    {showClientList && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredClients.length > 0 ? (
                          filteredClients.map((client) => (
                            <button
                              key={client.userId}
                              type="button"
                              onClick={() => {
                                onClientSelect(client)
                                onClientSearchChange(`${client.name} (${client.username})`)
                                setShowClientList(false)
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-200 dark:border-slate-700 last:border-b-0"
                            >
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">{client.name}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">{client.username}</div>
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
                </div>
              )}
              <div>
                <label className={`block text-sm font-bold ${labelColor} mb-2`}>Order Type</label>
                <select
                  value={orderMethod}
                  onChange={(e) => onOrderMethodChange(e.target.value)}
                  className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                  {!isBuy && <option value="STOP_LOSS">Stop Loss</option>}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-bold ${labelColor} mb-2`}>Quantity</label>
                <input
                  type="number"
                  value={orderQuantity}
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
                  placeholder={isBuy ? liveData?.ask?.toFixed(2) : liveData?.bid?.toFixed(2) || '0'}
                  className={`w-full px-3 py-3 ${inputBgColor} border-2 ${inputBorderColor} rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none ${focusBorderColor}`}
                />
              </div>
            </div>

            {/* Row 2: Exchange | Symbol | LotSize | Remark */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={`block text-sm font-bold ${labelColor} mb-2`}>Exchange</label>
                <select className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500">
                  <option>{config?.exchange || 'MCX'}</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-bold ${labelColor} mb-2`}>Symbol</label>
                <select className="w-full px-3 py-3 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-medium focus:outline-none focus:border-blue-500">
                  <option>{config?.tradeSymbol || config?.instrumentName || config?.script || 'N/A'}</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-bold ${labelColor} mb-2`}>LotSize</label>
                <input
                  type="number"
                  defaultValue={config?.lotSize || '100'}
                  disabled
                  className="w-full px-3 py-3 bg-gray-200 dark:bg-slate-700 border-2 border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white font-semibold focus:outline-none cursor-not-allowed"
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

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                onClick={() => {
                  onCancel?.()
                  onClose()
                }}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )

  return createPortal(modalContent, document.body)
}

export default OrderModal
