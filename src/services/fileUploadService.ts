import { apiClient } from './apiClient'

export type FileReaderType = 'OPTION' | 'FUTURE'

interface FileUploadResponse {
  responseCode?: string
  responseMessage?: string
  data?: any
}

class FileUploadService {
  /**
   * Upload a CSV file for quote data
   * @param file - CSV file to upload
   * @param fileReaderType - Type of file reader: OPTION or FUTURE
   */
  async uploadBhaavCopyFile(
    file: File,
    fileReaderType: FileReaderType
  ): Promise<FileUploadResponse> {
    try {
      if (!file) {
        throw new Error('No file provided')
      }

      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        throw new Error('Only CSV files are allowed')
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `https://api-staging.rivoplus.live/quotes/api/v1/bhaav-copy?fileReaderType=${fileReaderType}`,
        {
          method: 'POST',
          body: formData,
          headers: {
            // Don't set Content-Type header - browser will set it automatically with boundary
          }
        }
      )

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
   * Validate file before upload
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
