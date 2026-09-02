import React, { useState } from 'react'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface SettlementResponse {
  status: string
  message: string
}

const RunSettlement: React.FC = () => {
  const [step, setStep] = useState<'initial' | 'confirmation' | 'processing' | 'success' | 'error'>('initial')
  const [confirmationInput, setConfirmationInput] = useState('')
  const [response, setResponse] = useState<SettlementResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleStartSettlement = () => {
    setStep('confirmation')
    setConfirmationInput('')
    setError(null)
  }

  const handleConfirm = async () => {
    if (confirmationInput.toLowerCase() !== 'yes') {
      setError('Please type "yes" to confirm settlement')
      return
    }

    setIsLoading(true)
    setStep('processing')

    try {
      const response = await fetch('https://api-staging.rivoplus.live/oms2/settlement/position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data: SettlementResponse = await response.json()

      if (data.status === 'SUCCESS') {
        setResponse(data)
        setStep('success')
        toast.success(data.message || 'Settlement request processed!')
      } else {
        setError(data.message || 'Settlement failed')
        setStep('error')
        toast.error('Settlement failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process settlement'
      setError(errorMessage)
      setStep('error')
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setStep('initial')
    setConfirmationInput('')
    setError(null)
    setResponse(null)
  }

  const handleReset = () => {
    setStep('initial')
    setConfirmationInput('')
    setError(null)
    setResponse(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        {/* Initial Step */}
        {step === 'initial' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">⚙️</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-2">Run Settlement</h1>
            <p className="text-center text-slate-600 dark:text-slate-400 mb-8">
              This will process settlement for all positions. This action is irreversible.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded mb-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-1">Warning</p>
                  <p>Settlement will process all open positions. Please ensure this is what you intend before proceeding.</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartSettlement}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Proceed to Settlement
            </button>
          </div>
        )}

        {/* Confirmation Step */}
        {step === 'confirmation' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">❓</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-6">Are you sure?</h2>

            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded mb-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  <p className="font-semibold mb-1">Critical Operation</p>
                  <p>Settlement will process all open positions immediately. This cannot be undone.</p>
                </div>
              </div>
            </div>

            <p className="text-center text-slate-600 dark:text-slate-400 mb-4">
              Type <span className="font-bold text-red-600 dark:text-red-400">"yes"</span> to confirm:
            </p>

            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => {
                setConfirmationInput(e.target.value)
                setError(null)
              }}
              placeholder='Type "yes" to confirm'
              className="w-full px-4 py-3 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:border-red-500 transition-colors mb-4 text-center text-lg font-semibold tracking-widest"
            />

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 p-3 rounded mb-4 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                className="flex-1 py-3 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || confirmationInput.toLowerCase() !== 'yes'}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {isLoading && <Loader className="w-4 h-4 animate-spin" />}
                {isLoading ? 'Processing...' : 'Confirm Settlement'}
              </button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                <Loader className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-4">Processing Settlement</h2>
            <p className="text-center text-slate-600 dark:text-slate-400">
              Please wait while we process the settlement...
            </p>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">Settlement Successful!</h2>

            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-8">
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-green-200 dark:border-green-800">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status:</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">{response?.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Message:</span>
                  <span className="text-sm text-green-700 dark:text-green-300">{response?.message}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Done
            </button>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-4">Settlement Failed</h2>

            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
              <p className="text-sm text-red-700 dark:text-red-300 font-semibold">{error}</p>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 px-4 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RunSettlement
