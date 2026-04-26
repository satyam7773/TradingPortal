import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import orderService from '../services/orderService'

interface Client {
  userId: number
  name: string
  username: string
}

export interface SelectedInstrument {
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

interface UseOrderModalReturn {
  // BUY Modal
  showBuyOrderModal: boolean
  openBuyModal: (instrument: SelectedInstrument) => void
  closeBuyModal: () => void
  
  buyOrderQuantity: string
  setBuyOrderQuantity: (value: string) => void
  buyOrderPrice: string
  setBuyOrderPrice: (value: string) => void
  buyOrderType: string
  setBuyOrderType: (value: string) => void
  buyOrderRemark: string
  setBuyOrderRemark: (value: string) => void
  isBuyOrderSubmitting: boolean
  
  // SELL Modal
  showSellOrderModal: boolean
  openSellModal: (instrument: SelectedInstrument) => void
  closeSellModal: () => void
  
  sellOrderQuantity: string
  setSellOrderQuantity: (value: string) => void
  sellOrderPrice: string
  setSellOrderPrice: (value: string) => void
  sellOrderType: string
  setSellOrderType: (value: string) => void
  sellOrderRemark: string
  setSellOrderRemark: (value: string) => void
  isSellOrderSubmitting: boolean
  
  // Common
  selectedOrderInstrument: SelectedInstrument | null
  selectedClient: { userId: number; name: string; username: string } | null
  setSelectedClient: (client: { userId: number; name: string; username: string } | null) => void
  clientSearchTerm: string
  setClientSearchTerm: (value: string) => void
  
  // Draggable state
  buyModalPosition: { x: number; y: number }
  sellModalPosition: { x: number; y: number }
  isDraggingBuy: boolean
  isDraggingSell: boolean
  dragOffset: { x: number; y: number }
  setDragOffset: (offset: { x: number; y: number }) => void
  setIsDraggingBuy: (isDragging: boolean) => void
  setIsDraggingSell: (isDragging: boolean) => void
  setBuyModalPosition: (pos: { x: number; y: number }) => void
  setSellModalPosition: (pos: { x: number; y: number }) => void
  
  // Submit handlers
  submitBuyOrder: (liveData: any) => Promise<boolean>
  submitSellOrder: (liveData: any) => Promise<boolean>
  
  // Reset handlers
  resetBuyForm: (isAdminUser?: boolean) => void
  resetSellForm: (isAdminUser?: boolean) => void
}

export const useOrderModal = (isAdminUser: boolean = false): UseOrderModalReturn => {
  const [showBuyOrderModal, setShowBuyOrderModal] = useState(false)
  const [showSellOrderModal, setShowSellOrderModal] = useState(false)
  const [selectedOrderInstrument, setSelectedOrderInstrument] = useState<SelectedInstrument | null>(null)
  
  // Buy Order State
  const [buyOrderQuantity, setBuyOrderQuantity] = useState('1')
  const [buyOrderPrice, setBuyOrderPrice] = useState('0')
  const [buyOrderType, setBuyOrderType] = useState('MARKET')
  const [buyOrderRemark, setBuyOrderRemark] = useState('')
  const [isBuyOrderSubmitting, setIsBuyOrderSubmitting] = useState(false)
  
  // Sell Order State
  const [sellOrderQuantity, setSellOrderQuantity] = useState('1')
  const [sellOrderPrice, setSellOrderPrice] = useState('0')
  const [sellOrderType, setSellOrderType] = useState('MARKET')
  const [sellOrderRemark, setSellOrderRemark] = useState('')
  const [isSellOrderSubmitting, setIsSellOrderSubmitting] = useState(false)
  
  // Client Selection
  const [selectedClient, setSelectedClient] = useState<{ userId: number; name: string; username: string } | null>(null)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  
  // Draggable State
  const [buyModalPosition, setBuyModalPosition] = useState({ x: 0, y: 0 })
  const [sellModalPosition, setSellModalPosition] = useState({ x: 0, y: 0 })
  const [isDraggingBuy, setIsDraggingBuy] = useState(false)
  const [isDraggingSell, setIsDraggingSell] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const openBuyModal = useCallback((instrument: SelectedInstrument) => {
    setSelectedOrderInstrument(instrument)
    setShowBuyOrderModal(true)
  }, [])

  const closeBuyModal = useCallback(() => {
    setShowBuyOrderModal(false)
  }, [])

  const openSellModal = useCallback((instrument: SelectedInstrument) => {
    setSelectedOrderInstrument(instrument)
    setShowSellOrderModal(true)
  }, [])

  const closeSellModal = useCallback(() => {
    setShowSellOrderModal(false)
  }, [])

  const resetBuyForm = useCallback((adminUser: boolean = isAdminUser) => {
    setBuyOrderQuantity('1')
    setBuyOrderPrice('0')
    setBuyOrderType('MARKET')
    setBuyOrderRemark('')
    if (adminUser) {
      setSelectedClient(null)
      setClientSearchTerm('')
    }
  }, [isAdminUser])

  const resetSellForm = useCallback((adminUser: boolean = isAdminUser) => {
    setSellOrderQuantity('1')
    setSellOrderPrice('0')
    setSellOrderType('MARKET')
    setSellOrderRemark('')
    if (adminUser) {
      setSelectedClient(null)
      setClientSearchTerm('')
    }
  }, [isAdminUser])

  const submitBuyOrder = async (liveData: any): Promise<boolean> => {
    try {
      setIsBuyOrderSubmitting(true)

      if (isAdminUser && !selectedClient) {
        toast.error('Please select a client')
        return false
      }

      if (!buyOrderQuantity || parseFloat(buyOrderQuantity) <= 0) {
        toast.error('Please enter a valid quantity')
        return false
      }

      if (buyOrderType === 'LIMIT' && (!buyOrderPrice || parseFloat(buyOrderPrice) <= 0)) {
        toast.error('Please enter a valid price for limit order')
        return false
      }

      const submitToast = toast.loading('Placing buy order...')

      const userData = localStorage.getItem('userData')
      const user = userData ? JSON.parse(userData) : null
      const loggedInUserId = user?.userId
      const recipientUserId = isAdminUser ? (selectedClient?.userId || loggedInUserId) : loggedInUserId

      const config = selectedOrderInstrument?.config
      const response = await orderService.placeBuyOrder(
        loggedInUserId,
        recipientUserId,
        config?.exchange || 'MCX',
        config?.tradeSymbol || config?.instrumentName || config?.script || '',
        selectedOrderInstrument?.token || 0,
        parseInt(buyOrderQuantity),
        parseFloat(buyOrderPrice || liveData?.ask?.toString() || '0'),
        config?.lotSize || 100,
        buyOrderType as 'MARKET' | 'LIMIT' | 'STOP_LOSS'
      )

      if (response?.responseCode === '0') {
        toast.success(`Buy order placed successfully! Order ID: ${response.data?.orderId || 'N/A'}`, { id: submitToast })
        resetBuyForm(isAdminUser)
        return true
      } else {
        toast.error(response?.responseMessage || 'Failed to place order', { id: submitToast })
        return false
      }
    } catch (error: any) {
      toast.error(error.message || 'Error placing buy order')
      return false
    } finally {
      setIsBuyOrderSubmitting(false)
    }
  }

  const submitSellOrder = async (liveData: any): Promise<boolean> => {
    try {
      setIsSellOrderSubmitting(true)

      if (isAdminUser && !selectedClient) {
        toast.error('Please select a client')
        return false
      }

      if (!sellOrderQuantity || parseFloat(sellOrderQuantity) <= 0) {
        toast.error('Please enter a valid quantity')
        return false
      }

      if (sellOrderType === 'LIMIT' && (!sellOrderPrice || parseFloat(sellOrderPrice) <= 0)) {
        toast.error('Please enter a valid price for limit order')
        return false
      }

      const submitToast = toast.loading('Placing sell order...')

      const userData = localStorage.getItem('userData')
      const user = userData ? JSON.parse(userData) : null
      const loggedInUserId = user?.userId
      const recipientUserId = isAdminUser ? (selectedClient?.userId || loggedInUserId) : loggedInUserId

      const config = selectedOrderInstrument?.config
      const response = await orderService.placeSellOrder(
        loggedInUserId,
        recipientUserId,
        config?.exchange || 'MCX',
        config?.tradeSymbol || config?.instrumentName || config?.script || '',
        selectedOrderInstrument?.token || 0,
        parseInt(sellOrderQuantity),
        parseFloat(sellOrderPrice || liveData?.bid?.toString() || '0'),
        config?.lotSize || 100,
        sellOrderType as 'MARKET' | 'LIMIT' | 'STOP_LOSS'
      )

      if (response?.responseCode === '0') {
        toast.success(`Sell order placed successfully! Order ID: ${response.data?.orderId || 'N/A'}`, { id: submitToast })
        resetSellForm(isAdminUser)
        return true
      } else {
        toast.error(response?.responseMessage || 'Failed to place order', { id: submitToast })
        return false
      }
    } catch (error: any) {
      toast.error(error.message || 'Error placing sell order')
      return false
    } finally {
      setIsSellOrderSubmitting(false)
    }
  }

  return {
    showBuyOrderModal,
    openBuyModal,
    closeBuyModal,
    buyOrderQuantity,
    setBuyOrderQuantity,
    buyOrderPrice,
    setBuyOrderPrice,
    buyOrderType,
    setBuyOrderType,
    buyOrderRemark,
    setBuyOrderRemark,
    isBuyOrderSubmitting,
    
    showSellOrderModal,
    openSellModal,
    closeSellModal,
    sellOrderQuantity,
    setSellOrderQuantity,
    sellOrderPrice,
    setSellOrderPrice,
    sellOrderType,
    setSellOrderType,
    sellOrderRemark,
    setSellOrderRemark,
    isSellOrderSubmitting,
    
    selectedOrderInstrument,
    selectedClient,
    setSelectedClient,
    clientSearchTerm,
    setClientSearchTerm,
    
    buyModalPosition,
    sellModalPosition,
    isDraggingBuy,
    isDraggingSell,
    dragOffset,
    setDragOffset,
    setIsDraggingBuy,
    setIsDraggingSell,
    setBuyModalPosition,
    setSellModalPosition,
    
    submitBuyOrder,
    submitSellOrder,
    resetBuyForm,
    resetSellForm
  }
}
