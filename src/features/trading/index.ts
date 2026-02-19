// Trading feature barrel export
export { default as MarketWatchPage } from './pages/MarketWatchPage'
export { default as OrdersPage } from './pages/OrdersPage'
export { default as PortfolioPage } from './pages/PortfolioPage'
export { default as PositionsPage } from './pages/PositionsPage'

// Trading components
export { default as OrderForm } from './components/OrderForm'
export { default as PositionTable } from './components/PositionTable'
export { default as PriceChart } from './components/PriceChart'

// Trading hooks
export { useTradingData } from './hooks/useTradingData'
export { useOrderBook } from './hooks/useOrderBook'
export { usePortfolio } from './hooks/usePortfolio'

// Trading types
export type { Order, Position, Symbol, OrderType } from './types'