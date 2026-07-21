import { apiClient } from './apiClient'

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
}

export const fileUploadService = new FileUploadService()
