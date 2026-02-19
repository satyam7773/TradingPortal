class ConfigManager {
  private static instrumentsByTokenCache: Record<number, any> | null = null

  static getFullConfig() {
    try {
      const config = localStorage.getItem('appConfig')
      return config ? JSON.parse(config) : null
    } catch (error) {
      console.error('Error parsing appConfig:', error)
      return null
    }
  }

  static getConfigIndex() {
    try {
      const index = localStorage.getItem('appConfigIndex')
      if (!index) return null
      
      const parsed = JSON.parse(index)
      
      // Build token-based index for fast lookups if not cached
      if (!this.instrumentsByTokenCache) {
        this.instrumentsByTokenCache = {}
        // Index by instrumentToken for O(1) lookups
        Object.values(parsed.instrumentsById || {}).forEach((instrument: any) => {
          if (instrument.instrumentToken) {
            this.instrumentsByTokenCache![instrument.instrumentToken] = instrument
          }
        })
      }
      
      return parsed
    } catch (error) {
      console.error('Error parsing appConfigIndex:', error)
      return null
    }
  }

  // Fast O(1) lookup by instrumentToken
  static getInstrumentByToken(instrumentToken: number) {
    // Ensure cache is loaded
    this.getConfigIndex()
    return this.instrumentsByTokenCache?.[instrumentToken] || null
  }

  static getInstrumentsByExchange(exchange: string) {
    const index = this.getConfigIndex()
    if (!index) return []
    return index.instrumentsByExchange[exchange] || []
  }

  static getInstrumentByName(name: string) {
    const index = this.getConfigIndex()
    if (!index) return null
    return index.instrumentsByName[name] || null
  }

  static getMarketHours(exchange: string) {
    const index = this.getConfigIndex()
    if (!index) return null
    return index.marketHours[exchange] || null
  }

  static getAllExchanges() {
    const index = this.getConfigIndex()
    if (!index) return []
    return Object.keys(index.instrumentsByExchange)
  }

  static getAllInstruments() {
    const index = this.getConfigIndex()
    if (!index) return []
    return Object.values(index.instrumentsById)
  }

  static searchInstruments(searchTerm: string) {
    const allInstruments = this.getAllInstruments()
    const term = searchTerm.toLowerCase()
    
    return allInstruments.filter((instrument: any) => 
      (instrument.tradeSymbol?.toLowerCase().includes(term)) ||
      (instrument.instrumentName?.toLowerCase().includes(term)) ||
      (instrument.script?.toLowerCase().includes(term))
    )
  }

  static getDefaultQuantities(id: number) {
    const instrument = this.getInstrumentByToken(id)
    if (!instrument) return []
    return instrument.defaultQuantity || []
  }

  static getLotSize(id: number) {
    const instrument = this.getInstrumentByToken(id)
    if (!instrument) return 1
    return instrument.lotSize || 1
  }

  static isTradingAllowed(id: number) {
    const instrument = this.getInstrumentByToken(id)
    if (!instrument) return false
    return instrument.allowTrade || false
  }
}

export default ConfigManager
