import { apiClient, TokenManager } from './apiClient'

export type FileReaderType = 'OPTION' | 'FUTURE'
export type ExchangeType = 'DEFAULT' | 'MCX'
export type FileFormat = 'CSV' | 'EXCEL'

interface FileUploadResponse {
  responseCode?: string
  responseMessage?: string
  data?: any
}

class FileUploadService {
  /**
   * Upload a CSV or EXCEL file for quote data
   * @param file - CSV or EXCEL file to upload
   * @param fileReaderType - Type of file reader: OPTION or FUTURE (for DEFAULT exchange)
   * @param exchangeType - Exchange type: DEFAULT or MCX
   * @param fileFormat - File format: CSV or EXCEL
   */
  async uploadBhaavCopyFile(
    file: File,
    fileReaderType: FileReaderType,
    exchangeType: ExchangeType = 'DEFAULT',
    fileFormat: FileFormat = 'CSV'
  ): Promise<FileUploadResponse> {
    try {
      if (!file) {
        throw new Error('No file provided')
      }

      // Validate file format
      const isValidFormat = this.validateFileFormat(file, fileFormat)
      if (!isValidFormat.valid) {
        throw new Error(isValidFormat.error)
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', fileFormat)

      let url: string
      if (exchangeType === 'MCX') {
        url = 'https://kite.rivoplus.live/api/v1/bhaav-copy/mcx'
      } else {
        url = `https://api-staging.rivoplus.live/quotes/api/v1/bhaav-copy?fileReaderType=${fileReaderType}`
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type header - browser will set it automatically with boundary
        }
      })

      if (!response.ok) {
        const text = await response.text()
        try {
          const errorData = JSON.parse(text)
          throw new Error(errorData.responseMessage || `Upload failed with status ${response.status}`)
        } catch (e) {
          throw new Error(text || `Upload failed with status ${response.status}`)
        }
      }

      const responseText = await response.text()
      
      // Try to parse as JSON, fall back to plain text
      let data: FileUploadResponse
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        // Response is plain text, wrap it in the response object
        data = {
          responseCode: '200',
          responseMessage: responseText
        }
      }
      
      return data
    } catch (error: any) {
      console.error('❌ File upload error:', error)
      throw error
    }
  }

  /**
   * Validate file format (CSV or EXCEL)
   */
  validateFileFormat(file: File, format: FileFormat): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file selected' }
    }

    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 50MB' }
    }

    if (format === 'CSV') {
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        return { valid: false, error: 'File must be a valid CSV file' }
      }
    } else if (format === 'EXCEL') {
      const excelMimeTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
      const isExcelFile = file.name.endsWith('.xls') || file.name.endsWith('.xlsx') || excelMimeTypes.includes(file.type)
      if (!isExcelFile) {
        return { valid: false, error: 'File must be a valid Excel file (.xls or .xlsx)' }
      }
    }

    return { valid: true }
  }

  /**
   * Validate file before upload (legacy method for CSV only)
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file selected' }
    }

    if (!file.name.endsWith('.csv')) {
      return { valid: false, error: 'Only CSV files are allowed' }
    }

    if (file.type !== 'text/csv') {
      return { valid: false, error: 'File must be a valid CSV file' }
    }

    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 50MB' }
    }

    return { valid: true }
  }

  /**
   * Fetch active instruments for SGX and OTHERS exchanges
   */
  async getActiveInstruments() {
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api-staging.rivoplus.live'
      const url = `${baseURL}/user/api/instruments/active`
      
      const headers: any = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization token if available
      const token = TokenManager.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return Array.isArray(data) ? data : data?.data || []
    } catch (error: any) {
      console.error('❌ Error fetching instruments:', error)
      throw error
    }
  }

  /**
   * Update circuit limits for an instrument
   * @param instrumentToken - Kite instrument token
   * @param lowerLimit - Lower circuit limit
   * @param upperLimit - Upper circuit limit
   * @param closingPrice - Closing price
   */
  async updateCircuitLimits(
    instrumentToken: number,
    lowerLimit: number,
    upperLimit: number,
    closingPrice: number
  ) {
    try {
      const payload = {
        instrument_token: instrumentToken,
        lower_circuit_limit: lowerLimit,
        upper_circuit_limit: upperLimit,
        closing_price: closingPrice
      }

      const response = await fetch('https://api-staging.rivoplus.live/quotes/kite/updateCircuits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const text = await response.text()
        try {
          const errorData = JSON.parse(text)
          throw new Error(errorData.responseMessage || `Update failed with status ${response.status}`)
        } catch (e) {
          throw new Error(text || `Update failed with status ${response.status}`)
        }
      }

      const responseText = await response.text()
      let data: FileUploadResponse
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        data = {
          responseCode: '200',
          responseMessage: responseText
        }
      }

      return data
    } catch (error: any) {
      console.error('❌ Circuit limits update error:', error)
      throw error
    }
  }

  /**
   * Update closing price for an instrument
   * @param instrumentToken - Kite instrument token
   * @param closingPrice - Closing price
   */
  async updateClosingPrice(
    instrumentToken: number,
    closingPrice: number
  ) {
    try {
      const payload = {
        instrument_token: instrumentToken,
        closing_price: closingPrice
      }

      const response = await fetch('https://api-staging.rivoplus.live/quotes/kite/updateClosingPrice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const text = await response.text()
        try {
          const errorData = JSON.parse(text)
          throw new Error(errorData.responseMessage || `Update failed with status ${response.status}`)
        } catch (e) {
          throw new Error(text || `Update failed with status ${response.status}`)
        }
      }

      const responseText = await response.text()
      let data: FileUploadResponse
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        data = {
          responseCode: '200',
          responseMessage: responseText
        }
      }

      return data
    } catch (error: any) {
      console.error('❌ Closing price update error:', error)
      throw error
    }
  }
}

export const fileUploadService = new FileUploadService()

export interface ActiveInstrument {
  exchangeName: string
  tradeSymbol: string
  token: number
}
