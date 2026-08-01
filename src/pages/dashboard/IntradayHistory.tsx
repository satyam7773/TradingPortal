import React, { useState, useEffect, useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import FilterLayout from '../../components/FilterLayout'
import SearchableSelect from '../../components/ui/SearchableSelect'
import intradayHistoryService from '../../services/intradayHistoryService'
import userManagementService from '../../services/userManagementService'

interface Candle {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const IntradayHistory: React.FC = () => {
  // Filter State
  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), [])
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [selectedExchange, setSelectedExchange] = useState<string>('MCX')
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [selectedInterval, setSelectedInterval] = useState<string>('minute')

  // Data State
  const [candles, setCandles] = useState<Candle[]>([])
  const [symbols, setSymbols] = useState<any[]>([])
  const [exchanges, setExchanges] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Adapt symbols for SearchableSelect
  const selectableSymbols = useMemo(() => {
    return symbols.map(s => ({
      id: String(s.insToken || s.token),
      name: s.tradeSymbol || s.symbol || s
    }))
  }, [symbols])



  // Fetch symbols for selected exchange
  const fetchSymbolsForExchange = async (exchangeName: string) => {
    try {
      const symbolsResponse = await userManagementService.fetchSymbols(exchangeName)
      if (symbolsResponse?.responseCode === '0' && Array.isArray(symbolsResponse.data)) {
        setSymbols(symbolsResponse.data)
        if (symbolsResponse.data.length > 0) {
          setSelectedSymbol(String(symbolsResponse.data[0].insToken || symbolsResponse.data[0].token))
        }
      }
    } catch (error: any) {
      toast.error('Failed to load symbols')
    }
  }

  // Fetch candle data
  const handleFetchCandles = async (symbolOverride?: string) => {
    const symbolToUse = symbolOverride || selectedSymbol

    if (!symbolToUse) {
      toast.error('Please select a symbol')
      return
    }

    setLoading(true)

    try {
      const candleData = await intradayHistoryService.getHistory(
        symbolToUse,
        selectedInterval,
        selectedDate,
        selectedDate
      )
      setCandles(candleData)
      if (candleData.length === 0) {
        toast.error('No data found for selected filters')
      } else {
        toast.success(`Loaded ${candleData.length} candles`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch history data')
      setCandles([])
    } finally {
      setLoading(false)
    }
  }

  // Initialize data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)

        // Fetch exchanges
        const exchangesResponse = await userManagementService.fetchExchanges()
        if (Array.isArray(exchangesResponse) && exchangesResponse.length > 0) {
          setExchanges(exchangesResponse)
          const defaultExchange = exchangesResponse[0].name
          setSelectedExchange(defaultExchange)
          
          // Fetch symbols for default exchange
          const symbolsResponse = await userManagementService.fetchSymbols(defaultExchange)
          if (symbolsResponse?.responseCode === '0' && Array.isArray(symbolsResponse.data)) {
            setSymbols(symbolsResponse.data)
            if (symbolsResponse.data.length > 0) {
              setSelectedSymbol(String(symbolsResponse.data[0].insToken || symbolsResponse.data[0].token))
            }
          }
        }
      } catch (error: any) {
        toast.error('Failed to load metadata')
      } finally {
        setInitialLoading(false)
      }
    }

    loadInitialData()
  }, [])

  // Fetch symbols when exchange changes
  useEffect(() => {
    if (selectedExchange && !initialLoading) {
      fetchSymbolsForExchange(selectedExchange)
    }
  }, [selectedExchange])

  const formatDateTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr)
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    } catch (e) {
      return dateTimeStr
    }
  }

  const stats = {
    totalCandles: candles.length,
    highestClose: candles.length > 0 ? Math.max(...candles.map(c => c.close)) : 0,
    lowestClose: candles.length > 0 ? Math.min(...candles.map(c => c.close)) : 0,
    totalVolume: candles.reduce((sum, c) => sum + c.volume, 0),
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  const filtersPanel = (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date :</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Exchange :</label>
        <select
          value={selectedExchange}
          onChange={(e) => setSelectedExchange(e.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500"
        >
          {exchanges.map((ex) => (
            <option key={ex.name} value={ex.name}>{ex.name}</option>
          ))}
        </select>
      </div>

      <SearchableSelect
        label="Symbol :"
        items={selectableSymbols}
        selectedId={selectedSymbol}
        onSelect={(id) => setSelectedSymbol(String(id))}
        placeholder="Search symbol..."
      />

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Interval :</label>
        <select
          value={selectedInterval}
          onChange={(e) => setSelectedInterval(e.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="minute">1 Minute</option>
          <option value="5minute">5 Minutes</option>
          <option value="15minute">15 Minutes</option>
          <option value="30minute">30 Minutes</option>
          <option value="60minute">1 Hour</option>
          <option value="day">Daily</option>
        </select>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => handleFetchCandles()}
          disabled={loading || !selectedSymbol}
          className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-semibold text-sm transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Fetching...' : 'Fetch'}
        </button>
        <button
          onClick={() => {
            setSelectedDate(today)
            setSelectedExchange(exchanges[0]?.name || 'MCX')
            setSelectedSymbol('')
            setSelectedInterval('minute')
            setCandles([])
          }}
          className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded font-semibold text-sm transition"
        >
          Clear
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full">
        <FilterLayout
          storageKey="intraday:showFilters"
          filterWidthClass="lg:w-[22%]"
          filters={filtersPanel}
        >
          <div className="flex flex-col h-full bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-white/80 via-blue-50/80 to-white/80 dark:from-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Intraday History</h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    {selectableSymbols.find(s => s.id === selectedSymbol)?.name || 'Select Symbol'} • <span className="text-blue-600 font-semibold">{selectedInterval}</span> • <span className="text-blue-600 font-semibold">{selectedDate}</span>
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalCandles}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">{stats.highestClose.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">High</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{stats.lowestClose.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Low</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.totalVolume.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">Volume</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto min-h-0 scrollbar-thin">
              {candles.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-600 dark:text-slate-400">No data available</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                      Select filters and click "Fetch" to load candle data
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full border-collapse min-w-max">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10 border-b-2 border-blue-100 dark:border-blue-900">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Open</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">High</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Low</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Close</th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {candles.map((candle, index) => (
                      <tr key={index} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 text-left text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatDateTime(candle.timestamp)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {candle.open.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap font-bold">
                          {candle.high.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-mono text-red-600 dark:text-red-400 whitespace-nowrap font-bold">
                          {candle.low.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap font-bold">
                          {candle.close.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {candle.volume.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>


          </div>
        </FilterLayout>
      </div>
    </div>
  )
}

export default IntradayHistory
