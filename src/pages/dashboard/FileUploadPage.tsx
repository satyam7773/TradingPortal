import React, { useState, useRef, useEffect } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { fileUploadService, type FileReaderType, type ExchangeType, type FileFormat, type ActiveInstrument } from '../../services/fileUploadService'

// Simple notification function (replace with your notification library if needed)
const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`[${type.toUpperCase()}] ${message}`)
  // You can replace this with your toast library like:
  // import { toast } from 'react-hot-toast'
  // toast[type](message)
}

export const FileUploadPage: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'upload' | 'closingPrice'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileReaderType, setFileReaderType] = useState<FileReaderType>('OPTION')
  const [exchangeType, setExchangeType] = useState<ExchangeType>('DEFAULT')
  const [fileFormat, setFileFormat] = useState<FileFormat>('CSV')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Circuit limits states
  const [instruments, setInstruments] = useState<ActiveInstrument[]>([])
  const [selectedInstrument, setSelectedInstrument] = useState<ActiveInstrument | null>(null)
  const [closingPrice, setClosingPrice] = useState('')
  const [isUpdatingClosingPrice, setIsUpdatingClosingPrice] = useState(false)
  const [closingPriceError, setClosingPriceError] = useState<string | null>(null)
  const [closingPriceSuccess, setClosingPriceSuccess] = useState(false)
  const [isLoadingInstruments, setIsLoadingInstruments] = useState(false)

  // Load active instruments on mount
  useEffect(() => {
    const loadInstruments = async () => {
      try {
        setIsLoadingInstruments(true)
        const data = await fileUploadService.getActiveInstruments()
        setInstruments(data)
        if (data.length > 0) {
          setSelectedInstrument(data[0])
        }
      } catch (error: any) {
        console.error('❌ Error loading instruments:', error)
        showNotification('Failed to load instruments', 'error')
      } finally {
        setIsLoadingInstruments(false)
      }
    }

    loadInstruments()
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const file = files[0]
      
      // Validate file
      const validation = fileUploadService.validateFileFormat(file, fileFormat)
      if (!validation.valid) {
        setUploadError(validation.error || 'File validation failed')
        showNotification(validation.error || 'File validation failed', 'error')
        setSelectedFile(null)
        return
      }

      setSelectedFile(file)
      setUploadError(null)
      setUploadSuccess(false)
    }
  }

  const handleUpdateClosingPrice = async () => {
    if (!selectedInstrument) {
      showNotification('Please select an instrument', 'error')
      setClosingPriceError('Please select an instrument')
      return
    }

    if (!closingPrice) {
      showNotification('Please enter closing price', 'error')
      setClosingPriceError('Please enter closing price')
      return
    }

    setIsUpdatingClosingPrice(true)
    setClosingPriceError(null)
    setClosingPriceSuccess(false)

    try {
      const response = await fileUploadService.updateClosingPrice(
        selectedInstrument.token,
        parseFloat(closingPrice)
      )

      const responseCode = String(response?.responseCode ?? '')
      const message = response?.responseMessage || 'Closing price updated successfully'

      if (responseCode === '0' || responseCode === '1000' || responseCode === '200' || message.toLowerCase().includes('successfully')) {
        setClosingPriceSuccess(true)
        showNotification(message, 'success')
        setClosingPrice('')
      } else {
        setClosingPriceError(message)
        showNotification(message, 'error')
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to update closing price'
      setClosingPriceError(errorMsg)
      showNotification(errorMsg, 'error')
      console.error('❌ Closing price update error:', error)
    } finally {
      setIsUpdatingClosingPrice(false)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      
      // Validate file
      const validation = fileUploadService.validateFileFormat(file, fileFormat)
      if (!validation.valid) {
        setUploadError(validation.error || 'File validation failed')
        showNotification(validation.error || 'File validation failed', 'error')
        setSelectedFile(null)
        return
      }

      setSelectedFile(file)
      setUploadError(null)
      setUploadSuccess(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file')
      showNotification('Please select a file', 'error')
      return
    }

    setIsLoading(true)
    setUploadError(null)
    setUploadSuccess(false)
    setUploadProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 30
        })
      }, 200)

      const response = await fileUploadService.uploadBhaavCopyFile(selectedFile, fileReaderType, exchangeType, fileFormat)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      const responseCode = String(response?.responseCode ?? '')
      const message = response?.responseMessage || 'File uploaded successfully'

      if (responseCode === '0' || responseCode === '1000' || responseCode === '200' || message.toLowerCase().includes('successfully')) {
        setUploadSuccess(true)
        showNotification(message, 'success')
        setSelectedFile(null)
        setUploadProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setUploadError(message)
        showNotification(message, 'error')
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to upload file'
      setUploadError(errorMsg)
      showNotification(errorMsg, 'error')
      console.error('❌ Upload error:', error)
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setUploadError(null)
    setUploadSuccess(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-x-hidden">
      <div className="max-w-3xl mx-auto sm:p-6 lg:p-6 py-8">
        
        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            File Upload
          </button>
          <button
            onClick={() => setActiveTab('closingPrice')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'closingPrice'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Closing Price
          </button>
        </div>

        {/* File Upload Tab */}
        {activeTab === 'upload' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
          
          {/* Settings */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            {/* <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-5">Configuration</h2>s */}
            
            {/* Exchange - File Format - File Type in Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              
              {/* Exchange */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Exchange</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exchangeType"
                      value="DEFAULT"
                      checked={exchangeType === 'DEFAULT'}
                      onChange={(e) => setExchangeType(e.target.value as ExchangeType)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">NSE</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exchangeType"
                      value="MCX"
                      checked={exchangeType === 'MCX'}
                      onChange={(e) => setExchangeType(e.target.value as ExchangeType)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">MCX</span>
                  </label>
                </div>
              </div>

              {/* File Format */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">File Format</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fileFormat"
                      value="CSV"
                      checked={fileFormat === 'CSV'}
                      onChange={(e) => setFileFormat(e.target.value as FileFormat)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">CSV</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fileFormat"
                      value="EXCEL"
                      checked={fileFormat === 'EXCEL'}
                      onChange={(e) => setFileFormat(e.target.value as FileFormat)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Excel</span>
                  </label>
                </div>
              </div>
            </div>

            {/* File Type - Only for DEFAULT */}
            {exchangeType === 'DEFAULT' && (
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">File Type</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fileType"
                      value="OPTION"
                      checked={fileReaderType === 'OPTION'}
                      onChange={(e) => setFileReaderType(e.target.value as FileReaderType)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Option</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fileType"
                      value="FUTURE"
                      checked={fileReaderType === 'FUTURE'}
                      onChange={(e) => setFileReaderType(e.target.value as FileReaderType)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Future</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* File Upload Area */}
          <div className="p-6">
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
              >
                <Upload className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                  Drag and drop your {fileFormat} file
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  or click to browse
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                >
                  Select File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={fileFormat === 'CSV' ? '.csv' : '.xls,.xlsx'}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={clearSelection}
                    disabled={isLoading}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400 transition disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Upload Progress */}
                {isLoading && (
                  <div className="space-y-2">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                      {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload File
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Messages Section */}
          <div className="space-y-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            {uploadError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{uploadError}</p>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Successfully uploaded {fileFormat} file to {exchangeType === 'MCX' ? 'MCX' : fileReaderType}
                </p>
              </div>
            )}
          </div>

          {/* Info Footer */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Max size: 50MB • Format: {fileFormat === 'CSV' ? '.csv' : '.xls, .xlsx'}
            </p>
          </div>
        </div>
        )}

        {/* Closing Price Tab */}
        {activeTab === 'closingPrice' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
          
          {/* Instruments Selection */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Select Instrument</label>
            {isLoadingInstruments ? (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Loader className="w-4 h-4 animate-spin" />
                <span>Loading instruments...</span>
              </div>
            ) : (
              <select
                value={selectedInstrument?.token || ''}
                onChange={(e) => {
                  const instrument = instruments.find(i => i.token === parseInt(e.target.value))
                  setSelectedInstrument(instrument || null)
                }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose an instrument...</option>
                {instruments.map((instrument) => (
                  <option key={instrument.token} value={instrument.token}>
                    {instrument.exchangeName} - {instrument.tradeSymbol}
                  </option>
                ))}
              </select>
            )}
            {selectedInstrument && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-slate-900 dark:text-white">
                  <span className="font-medium">Exchange:</span> {selectedInstrument.exchangeName}
                </p>
                <p className="text-sm text-slate-900 dark:text-white">
                  <span className="font-medium">Symbol:</span> {selectedInstrument.tradeSymbol}
                </p>
                {/* <p className="text-sm text-slate-900 dark:text-white">
                  <span className="font-medium">Token:</span> {selectedInstrument.token}
                </p> */}
              </div>
            )}
          </div>

          {/* Closing Price Input Fields */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="mb-4">
              {/* Closing Price */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                  Closing Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={closingPrice}
                  onChange={(e) => setClosingPrice(e.target.value)}
                  placeholder="e.g., 1000.00"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isUpdatingClosingPrice}
                />
              </div>
            </div>

            {/* Update Button */}
            <button
              onClick={handleUpdateClosingPrice}
              disabled={isUpdatingClosingPrice || !selectedInstrument}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
            >
              {isUpdatingClosingPrice ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Closing Price'
              )}
            </button>
          </div>

          {/* Messages Section */}
          <div className="space-y-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            {closingPriceError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{closingPriceError}</p>
              </div>
            )}

            {closingPriceSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Closing price updated successfully for {selectedInstrument?.tradeSymbol}
                </p>
              </div>
            )}
          </div>

          {/* Info Footer */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Update closing price for instruments
            </p>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default FileUploadPage
