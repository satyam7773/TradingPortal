import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Bell, AlertCircle } from 'lucide-react'
import balanceService, { BalanceData } from '../../services/balanceService'
import { API_ENDPOINTS } from '../../config/apiConfig'

interface UserBalanceProps {
  className?: string
}

interface BalanceItem {
  label: string
  value: number
  color: string
  bgColor: string
}

interface AdminMessage {
  id: number
  start_date: string
  end_date: string
  message: string
}

export const UserBalance: React.FC<UserBalanceProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAdminMessages = async () => {
    try {
      setError(null)
      const endpoint = `${API_ENDPOINTS.SETTINGS.ADMIN_MESSAGES}?all=no`
      const response = await fetch(endpoint)
      const data = await response.json()
      
      if (data?.responseCode === '0' && data?.data) {
        setMessages(data.data)
      } else {
        setError('No messages available')
      }
    } catch (err) {
      console.error('❌ Error fetching admin messages:', err)
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminMessages()
    
    // ✅ Listen for custom event when AdminMessages updates/deletes/creates
    const handleMessagesChanged = () => {
      console.log('📢 Messages changed event received, refetching...')
      fetchAdminMessages()
    }
    
    window.addEventListener('adminMessagesChanged', handleMessagesChanged)
    
    return () => window.removeEventListener('adminMessagesChanged', handleMessagesChanged)
  }, [])

  if (loading) {
    return (
      <div className={`flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-50/80 to-cyan-50/80 dark:from-slate-800/60 dark:to-slate-700/60 backdrop-blur-sm border border-blue-200/40 dark:border-slate-600/40 animate-pulse ${className}`}>
        <Bell className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <div className="h-5 w-full bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }

  if (error || messages.length === 0) {
    return null
  }

  // Combine all messages with separator
  const combinedMessages = messages
    .map((msg, idx) => `${msg.message} • ${msg.start_date} to ${msg.end_date}`)
    .join('   |   ')

  return (
    <div className={`relative overflow-hidden bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 dark:from-blue-900/20 dark:via-cyan-900/20 dark:to-blue-900/20 backdrop-blur-md border border-blue-300/30 dark:border-blue-700/30 shadow-lg h-6 max-w-2xl ${className}`}>
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent dark:via-white/5 pointer-events-none"></div>

      {/* Left Fade */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white dark:from-slate-900 to-transparent dark:to-transparent z-10 pointer-events-none"></div>

      {/* Right Fade */}
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white dark:from-slate-900 to-transparent dark:to-transparent z-10 pointer-events-none"></div>

      {/* Marquee Container - Constrained Width */}
      <div className="flex items-center px-1 py-0.5 overflow-hidden h-full w-full">
        <style>{`
          @keyframes marquee {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          
          .marquee-content {
            animation: marquee 20s linear infinite;
            white-space: nowrap;
          }
          
          .marquee-container:hover .marquee-content {
            animation-play-state: paused;
          }
        `}</style>

        <div className="marquee-container overflow-hidden">
          <div className="marquee-content flex gap-2">
            {/* Original messages */}
            {messages.map((msg, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 flex-shrink-0 leading-none">
                <span className="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-xs text-xs">{msg.message}</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">({msg.start_date})</span>
                <span className="text-blue-400 dark:text-blue-500 text-xs">•</span>
              </span>
            ))}
            
            {/* Duplicate for seamless loop */}
            {messages.map((msg, idx) => (
              <span key={`dup-${idx}`} className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300 flex-shrink-0 leading-none">
                <span className="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-xs text-xs">{msg.message}</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">({msg.start_date})</span>
                <span className="text-blue-400 dark:text-blue-500 text-xs">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserBalance
