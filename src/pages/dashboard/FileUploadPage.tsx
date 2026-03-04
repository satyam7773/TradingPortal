import React, { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { fileUploadService, type FileReaderType } from '../../services/fileUploadService'

// Simple notification function (replace with your notification library if needed)
const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`[${type.toUpperCase()}] ${message}`)
  // You can replace this with your toast library like:
  // import { toast } from 'react-hot-toast'
  // toast[type](message)
}

export const FileUploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileReaderType, setFileReaderType] = useState<FileReaderType>('OPTION')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const file = files[0]
      
      // Validate file
      const validation = fileUploadService.validateFile(file)
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
      const validation = fileUploadService.validateFile(file)
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

      const response = await fileUploadService.uploadBhaavCopyFile(selectedFile, fileReaderType)
      
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
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">File Upload</h1>
          <p className="text-slate-600 dark:text-slate-400">Upload CSV files for quote data processing</p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
          <div className="p-8">
            {/* File Type Selection */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">File Type</h2>
              <div className="flex gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="fileType"
                    value="OPTION"
                    checked={fileReaderType === 'OPTION'}
                    onChange={(e) => setFileReaderType(e.target.value as FileReaderType)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Option
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="fileType"
                    value="FUTURE"
                    checked={fileReaderType === 'FUTURE'}
                    onChange={(e) => setFileReaderType(e.target.value as FileReaderType)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Future
                  </span>
                </label>
              </div>
            </div>

            {/* File Upload Area */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Select File</h2>
              
              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all cursor-pointer"
                >
                  <Upload className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-700 dark:text-slate-300 font-semibold mb-2">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    or click below to select a file
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Select File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                    Only CSV files are supported (Max 50MB)
                  </p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={clearSelection}
                      disabled={isLoading}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Upload Progress */}
                  {isLoading && (
                    <div className="mb-4">
                      <div className="w-full bg-slate-300 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        Uploading... {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  )}

                  {/* Upload Button */}
                  <button
                    onClick={handleUpload}
                    disabled={isLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            {/* Error Message */}
            {uploadError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-200">Upload Failed</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{uploadError}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {uploadSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">Upload Successful</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                    Your file has been uploaded successfully as {fileReaderType} file type
                  </p>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">File Upload Information</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>Supported format: CSV only</li>
                <li>Maximum file size: 50MB</li>
                <li>Select file type (Option or Future) before uploading</li>
                <li>Ensure your CSV file contains valid quote data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileUploadPage
