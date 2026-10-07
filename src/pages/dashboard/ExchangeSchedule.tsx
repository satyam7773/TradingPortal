import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Edit2, X, Save, AlertCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { createPortal } from 'react-dom'
import { API_ENDPOINTS } from '../../config/apiConfig'

interface ScheduleData {
  date: string
  day: string
  operational: boolean
  particulars?: string
  timings: Array<{
    startTime: string
    endTime: string
  }>
}

interface ExchangeOption {
  id: number
  name: string
}

const EXCHANGES: ExchangeOption[] = [
  { id: 1, name: 'NSE' },
  { id: 2, name: 'MCX' },
  { id: 3, name: 'SGX' },
  { id: 4, name: 'CDS' },
  { id: 5, name: 'CALLPUT' },
  { id: 6, name: 'OTHERS' }
]

const ExchangeSchedulePage: React.FC = () => {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedExchange, setSelectedExchange] = useState<number>(1)
  const [scheduleData, setScheduleData] = useState<ScheduleData[]>([])
  const [loading, setLoading] = useState(false)
  const [savingChanges, setSavingChanges] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)

  // Edit state
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editedData, setEditedData] = useState<Record<string, ScheduleData>>({})
  const [showEditModal, setShowEditModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Default timings state
  const [showDefaultTimingsModal, setShowDefaultTimingsModal] = useState(false)
  const [defaultTimings, setDefaultTimings] = useState<Array<{ startTime: string; endTime: string }>>([])
  const [editingDefaultTimings, setEditingDefaultTimings] = useState<Array<{ startTime: string; endTime: string }>>([])
  const [savingDefaultTimings, setSavingDefaultTimings] = useState(false)
  const [loadingDefaultTimings, setLoadingDefaultTimings] = useState(false)
  const [roleId, setRoleId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Get userId and roleId from localStorage on mount
  useEffect(() => {
    const userData = localStorage.getItem('userData')
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        setUserId(parsed.userId || parsed.id || null)
        const userRoleId = parsed.roleId || null
        setRoleId(userRoleId)
        // Only roleId 1 or 2 can edit
        setIsAdmin(userRoleId === 1 || userRoleId === 2)
      } catch (e) {
        console.error('Error parsing userData:', e)
        setIsAdmin(false)
      }
    }
  }, [])

  // Fetch exchange schedule
  const fetchSchedule = async (month: number, exchange: number) => {
    setLoading(true)
    try {
        const response = await fetch(`${API_ENDPOINTS.SETTINGS.EXCHANGE_HOLIDAYS}?month=${month}&exchange=${exchange}`, {
          method: 'GET'
        })
      const result = await response.json()
      
      if (result?.responseCode === '0' && Array.isArray(result.data)) {
        setScheduleData(result.data)
      } else {
        toast.error(result?.responseMessage || 'Failed to fetch schedule')
        setScheduleData([])
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
      toast.error('Error fetching exchange schedule')
      setScheduleData([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch default timings for selected exchange
  const fetchDefaultTimings = async (exchangeId: number) => {
    setLoadingDefaultTimings(true)
    try {
      const response = await fetch(`https://api-staging.rivoplus.live/user/settings/getDefaultTiming?exchangeId=${exchangeId}`, {
        method: 'GET'
      })
      const result = await response.json()
      
      if (result?.responseCode === '0' && Array.isArray(result.data)) {
        setDefaultTimings(result.data)
        setEditingDefaultTimings(result.data.map((t: any) => ({ ...t })))
      } else {
        setDefaultTimings([])
        setEditingDefaultTimings([])
      }
    } catch (error) {
      console.error('Error fetching default timings:', error)
      setDefaultTimings([])
      setEditingDefaultTimings([])
    } finally {
      setLoadingDefaultTimings(false)
    }
  }

  // Save default timings
  const handleSaveDefaultTimings = async () => {
    if (!userId) {
      toast.error('User ID not found. Please refresh and try again.')
      return
    }

    // Validate timings
    if (editingDefaultTimings.length === 0) {
      toast.error('Please add at least one timing')
      return
    }

    // For SGX, ensure exactly 2 timings
    if (selectedExchange === 3 && editingDefaultTimings.length !== 2) {
      toast.error('SGX requires exactly 2 trading sessions')
      return
    }

    setSavingDefaultTimings(true)
    try {
      const requestTimestamp = Date.now().toString()
      const requestBody = {
        userId: userId,
        requestTimestamp: requestTimestamp,
        data: {
          exchangeId: selectedExchange,
          timings: editingDefaultTimings.map(t => ({
            startTime: t.startTime,
            endTime: t.endTime
          }))
        }
      }

      const response = await fetch('https://api-staging.rivoplus.live/user/settings/editDefaultTiming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()
      if (result?.responseCode === '0') {
        setDefaultTimings(editingDefaultTimings.map(t => ({ ...t })))
        toast.success('Default timings updated successfully!')
        setShowDefaultTimingsModal(false)
        // Refresh the calendar after updating default timings
        fetchSchedule(currentMonth, selectedExchange)
      } else {
        toast.error(result?.responseMessage || 'Failed to save default timings')
      }
    } catch (error) {
      console.error('Error saving default timings:', error)
      toast.error('Error saving default timings')
    } finally {
      setSavingDefaultTimings(false)
    }
  }

  // Handle opening default timings modal
  const handleOpenDefaultTimingsModal = () => {
    setEditingDefaultTimings(defaultTimings.map(t => ({ ...t })))
    setShowDefaultTimingsModal(true)
  }

  // Add timing slot to default timings
  const handleAddDefaultTiming = () => {
    setEditingDefaultTimings([
      ...editingDefaultTimings,
      { startTime: '09:15:00', endTime: '15:30:00' }
    ])
  }

  // Remove timing slot from default timings
  const handleRemoveDefaultTiming = (index: number) => {
    if (editingDefaultTimings.length <= 1) {
      toast.error('Please keep at least one timing')
      return
    }
    setEditingDefaultTimings(editingDefaultTimings.filter((_, i) => i !== index))
  }

  // Update default timing
  const handleUpdateDefaultTiming = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setEditingDefaultTimings(
      editingDefaultTimings.map((t, i) =>
        i === index ? { ...t, [field]: value + ':00' } : t
      )
    )
  }

  // Fetch schedule on mount and when month/exchange changes
  useEffect(() => {
    fetchSchedule(currentMonth, selectedExchange)
    fetchDefaultTimings(selectedExchange)
  }, [currentMonth, selectedExchange])

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleToday = () => {
    const now = new Date()
    setCurrentMonth(now.getMonth() + 1)
    setCurrentYear(now.getFullYear())
  }

  // Get edited data or original data
  const getEditedOrOriginal = (dateStr: string): ScheduleData | undefined => {
    return editedData[dateStr] || scheduleData.find(d => d.date === dateStr)
  }

  // Handle edit click
  const handleEditClick = (dateStr: string) => {
    setEditingDate(dateStr)
    setShowEditModal(true)
  }

  // Update timing data
  const handleUpdateTiming = (dateStr: string, index: number, field: 'startTime' | 'endTime', value: string) => {
    const current = editedData[dateStr] || scheduleData.find(d => d.date === dateStr)
    if (!current) return

    const updated: ScheduleData = {
      ...current,
      timings: current.timings.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      )
    }
    setEditedData(prev => ({ ...prev, [dateStr]: updated }))
  }

  // Add new timing slot
  const handleAddTiming = (dateStr: string) => {
    const current = editedData[dateStr] || scheduleData.find(d => d.date === dateStr)
    if (!current) return

    const updated: ScheduleData = {
      ...current,
      timings: [
        ...current.timings,
        { startTime: '09:15:00', endTime: '15:30:00' }
      ]
    }
    setEditedData(prev => ({ ...prev, [dateStr]: updated }))
  }

  // Remove timing slot
  const handleRemoveTiming = (dateStr: string, index: number) => {
    const current = editedData[dateStr] || scheduleData.find(d => d.date === dateStr)
    if (!current || current.timings.length <= 1) return

    const updated: ScheduleData = {
      ...current,
      timings: current.timings.filter((_, i) => i !== index)
    }
    setEditedData(prev => ({ ...prev, [dateStr]: updated }))
  }

  // Update particulars (reason for holiday)
  const handleUpdateParticulars = (dateStr: string, value: string) => {
    const current = editedData[dateStr] || scheduleData.find(d => d.date === dateStr)
    if (!current) return

    const updated: ScheduleData = {
      ...current,
      particulars: value
    }
    setEditedData(prev => ({ ...prev, [dateStr]: updated }))
  }

  // Toggle operational status
  const handleToggleOperational = (dateStr: string) => {
    const current = editedData[dateStr] || scheduleData.find(d => d.date === dateStr)
    if (!current) return

    const updated: ScheduleData = {
      ...current,
      operational: !current.operational
      // Keep timings intact - don't clear them when toggling
    }
    setEditedData(prev => ({ ...prev, [dateStr]: updated }))
  }

  // Save all edits to API
  const handleSaveAll = async () => {
    if (Object.keys(editedData).length === 0) {
      toast('No changes to save')
      setShowConfirmModal(false)
      return
    }

    if (!userId) {
      toast.error('User ID not found. Please refresh and try again.')
      return
    }

    setSavingChanges(true)
    try {
      const changedData = Object.values(editedData)
      const requestTimestamp = Date.now().toString()
      let successCount = 0
      let errorCount = 0

      // Send each change to the API
      for (const change of changedData) {
        try {
          const requestBody: any = {
            userId: userId,
            requestTimestamp: requestTimestamp,
            data: {
              exchangeId: selectedExchange,
              date: change.date,
              operational: change.operational
            }
          }

          // Add particulars and timings based on operational status
          if (change.operational) {
            requestBody.data.particulars = ''
            requestBody.data.timings = change.timings
          } else {
            requestBody.data.particulars = change.particulars || ''
          }

          const response = await fetch('https://api-staging.rivoplus.live/user/settings/editHolidays', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          })

          const result = await response.json()
          if (result?.responseCode === '0') {
            successCount++
          } else {
            errorCount++
            console.error(`Failed to save ${change.date}:`, result?.responseMessage)
          }
        } catch (error) {
          errorCount++
          console.error(`Error saving ${change.date}:`, error)
        }
      }

      // Update local state and show results
      const updatedSchedule = scheduleData.map(item => 
        editedData[item.date] || item
      )
      setScheduleData(updatedSchedule)
      setEditedData({})
      setShowConfirmModal(false)

      if (errorCount === 0) {
        toast.success(`${successCount} schedule(s) updated successfully`)
      } else {
        toast.error(`Saved ${successCount}, Failed ${errorCount}`)
      }
    } catch (error) {
      console.error('Error saving changes:', error)
      toast.error('Failed to save changes')
    } finally {
      setSavingChanges(false)
    }
  }

  // Group schedule data by week for calendar display
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month - 1, 1).getDay()
  }

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Create calendar grid
  const calendarDays: (ScheduleData | null)[] = []
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const data = scheduleData.find(d => d.date === dateStr)
    calendarDays.push(data || null)
  }

  // Pad remaining cells
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null)
  }

  const isToday = (dateStr: string | undefined) => {
    if (!dateStr) return false
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    return dateStr === todayStr
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-gradient-to-br from-slate-50 via-blue-50/50 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="flex flex-col h-full max-w-7xl mx-auto w-full px-6">
        {/* Compact Header */}
        <div className="mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl shadow-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Exchange Time Schedule</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time operational hours</p>
              </div>
            </div>

            {/* Controls - Compact Layout */}
            <div className="flex items-center gap-3">
              <select
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition border border-slate-300 dark:border-slate-600 shadow-sm"
              >
                {EXCHANGES.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>

              {isAdmin && (
                <button
                  onClick={handleOpenDefaultTimingsModal}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-lg font-semibold text-xs transition border border-purple-700 shadow-sm"
                  title="Edit default market timings"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Default Timings
                </button>
              )}

              <button
                onClick={handleToday}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-semibold text-xs transition border border-slate-300 dark:border-slate-600 shadow-sm"
              >
                Today
              </button>

              <div className="flex gap-1 bg-white dark:bg-slate-700 rounded-lg p-1 border border-slate-300 dark:border-slate-600 shadow-sm">
                <button
                  onClick={handlePreviousMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition text-slate-600 dark:text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition text-slate-600 dark:text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="text-right pl-3 border-l border-slate-300 dark:border-slate-600">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{monthName}</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid - Compact */}
        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700/50 p-5 flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-xs text-slate-400 dark:text-slate-400 uppercase tracking-wider font-semibold">Loading</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full gap-3">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map(day => (
                  <div key={day} className="text-center font-bold text-slate-600 dark:text-slate-300 py-2 text-xs uppercase tracking-widest bg-slate-100 dark:bg-slate-700/30 rounded-lg">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1.5 flex-1 overflow-hidden">
                {calendarDays.map((day, idx) => {
                  const dayNum = day?.date.split('-')[2]
                  const isTodayCell = isToday(day?.date)
                  const displayData = day ? getEditedOrOriginal(day.date) : null
                  const isEdited = day && editedData[day.date] ? true : false
                  
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg p-1.5 flex flex-col justify-between text-xs border-2 transition duration-300 group relative ${
                        !day
                          ? 'bg-transparent border-transparent'
                          : displayData?.operational
                          ? 'bg-gradient-to-br from-blue-50 dark:from-blue-950/40 to-blue-100/50 dark:to-blue-900/20 border-blue-300 dark:border-blue-500/40 hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-md dark:hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-500/20'
                          : 'bg-gradient-to-br from-red-50 dark:from-red-950/40 to-red-100/50 dark:to-red-900/20 border-red-300 dark:border-red-500/40 hover:border-red-400 dark:hover:border-red-400 hover:shadow-md dark:hover:shadow-lg hover:shadow-red-200 dark:hover:shadow-red-500/20'
                      } ${isTodayCell ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-200 dark:shadow-yellow-400/30 border-yellow-400/60' : ''} ${isEdited ? 'ring-2 ring-purple-400 ring-opacity-50' : ''}`}
                    >
                      {day && displayData && (
                        <>
                          {/* Edit Button - Only shown for admins, hidden for others */}
                          {isAdmin && (
                            <button
                              onClick={() => handleEditClick(day.date)}
                              className="absolute top-1 right-1 p-1 rounded bg-blue-500 hover:bg-blue-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                              title="Edit schedule"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}

                          {/* Modified Indicator */}
                          {isEdited && (
                            <div className="absolute top-1 left-1 w-2 h-2 bg-purple-500 rounded-full" title="Modified" />
                          )}

                          {/* Date Header */}
                          <div className="flex items-start justify-between mb-0.5">
                            <div>
                              <div className={`text-base font-bold leading-tight ${isTodayCell ? 'text-yellow-600 dark:text-yellow-300' : 'text-slate-900 dark:text-white'}`}>
                                {dayNum}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                                {displayData.day.slice(0, 3)}
                              </div>
                            </div>
                            <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                              displayData.operational
                                ? 'bg-blue-200 dark:bg-blue-500/30 text-blue-700 dark:text-blue-200 border border-blue-400/40 dark:border-blue-400/30'
                                : 'bg-red-200 dark:bg-red-500/30 text-red-700 dark:text-red-200 border border-red-400/40 dark:border-red-400/30'
                            }`}>
                              {displayData.operational ? 'OPEN' : 'CLOSED'}
                            </div>
                          </div>

                          {/* Timings */}
                          <div className="flex-1 flex flex-col justify-end">
                            {displayData.operational && displayData.timings.length > 0 ? (
                              <div className="space-y-0.5">
                                {displayData.timings.map((timing, tidx) => (
                                  <div key={tidx} className="text-[9px] text-blue-700 dark:text-blue-300 font-mono bg-blue-100 dark:bg-blue-500/10 px-1 py-0.5 rounded border border-blue-300 dark:border-blue-500/20">
                                    <div className="font-bold">{timing.startTime.slice(0, 5)}-{timing.endTime.slice(0, 5)}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[9px] text-red-600 dark:text-red-400 italic font-semibold truncate" title={displayData.particulars || 'Holiday'}>
                                {displayData.operational ? '-' : (displayData.particulars || 'Holiday')}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Save All Button - Only for admins */}
        {Object.keys(editedData).length > 0 && isAdmin && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition shadow-lg"
            >
              <Save className="w-4 h-4" />
              Save All Changes ({Object.keys(editedData).length})
            </button>
            <button
              onClick={() => setEditedData({})}
              className="flex items-center gap-2 px-4 py-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-900 dark:text-white rounded-lg font-semibold text-sm transition"
            >
              <X className="w-4 h-4" />
              Discard Changes
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              {Object.keys(editedData).length} item(s) modified
            </span>
          </div>
        )}
      </div>

      {/* Edit Modal - Only show for admin users */}
      {showEditModal && editingDate && isAdmin && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Schedule</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition text-slate-500 dark:text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {getEditedOrOriginal(editingDate) && (
              <div className="space-y-4">
                {/* Date Display */}
                <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-semibold">{editingDate}</span> - {getEditedOrOriginal(editingDate)!.day}
                  </p>
                </div>

                {/* Operational Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Operational Status</label>
                  <button
                    onClick={() => handleToggleOperational(editingDate)}
                    className={`w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition border-2 ${
                      (editedData[editingDate] || scheduleData.find(d => d.date === editingDate))!.operational
                        ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500'
                        : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-500'
                    }`}
                  >
                    {(editedData[editingDate] || scheduleData.find(d => d.date === editingDate))!.operational ? '✓ OPEN' : '✗ CLOSED'}
                  </button>
                </div>

                {/* Particulars (for non-operational days) */}
                {!(editedData[editingDate] || scheduleData.find(d => d.date === editingDate))!.operational && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reason for Holiday</label>
                    <input
                      type="text"
                      value={(editedData[editingDate] || scheduleData.find(d => d.date === editingDate))!.particulars || ''}
                      onChange={(e) => handleUpdateParticulars(editingDate, e.target.value)}
                      placeholder="e.g., Diwali, Republic Day, Dussehra"
                      className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}

                {/* Timings */}
                {(editedData[editingDate] || scheduleData.find(d => d.date === editingDate))!.operational && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Trading Hours</label>
                      <button
                        onClick={() => handleAddTiming(editingDate)}
                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition"
                      >
                        + Add Slot
                      </button>
                    </div>
                    {(editedData[editingDate] || scheduleData.find(d => d.date === editingDate))!.timings.map((timing, idx) => (
                      <div key={idx} className="space-y-2 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Slot {idx + 1}</span>
                          <button
                            onClick={() => handleRemoveTiming(editingDate, idx)}
                            disabled={(editedData[editingDate] || scheduleData.find(d => d.date === editingDate))!.timings.length <= 1}
                            className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Start Time</label>
                            <input
                              type="time"
                              value={timing.startTime.slice(0, 5)}
                              onChange={(e) => handleUpdateTiming(editingDate, idx, 'startTime', e.target.value + ':00')}
                              className="w-full mt-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold">End Time</label>
                            <input
                              type="time"
                              value={timing.endTime.slice(0, 5)}
                              onChange={(e) => handleUpdateTiming(editingDate, idx, 'endTime', e.target.value + ':00')}
                              className="w-full mt-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-600">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-semibold text-sm transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal - Only for admins */}
      {showConfirmModal && isAdmin && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Save All Changes?</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  You are about to save <span className="font-semibold">{Object.keys(editedData).length}</span> schedule change(s)
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <span className="font-semibold">⚠️ Warning:</span> These changes will be sent to the backend. Make sure all modifications are correct before proceeding.
              </p>
            </div>

            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Modified Dates:</p>
              {Object.keys(editedData).map(dateStr => (
                <div key={dateStr} className="text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/30 p-2 rounded">
                  {dateStr} - {editedData[dateStr].operational ? 'OPEN' : 'CLOSED'}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={savingChanges}
                className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                disabled={savingChanges}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingChanges ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Default Timings Modal - Only for admins */}
      {showDefaultTimingsModal && isAdmin && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-600 to-purple-500 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Default Market Timings</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {EXCHANGES.find(ex => ex.id === selectedExchange)?.name || 'Exchange'} - These are the default trading hours
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDefaultTimingsModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition text-slate-500 dark:text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDefaultTimings ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 dark:text-slate-400 uppercase tracking-wider font-semibold">Loading</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <span className="font-semibold">ℹ️ Info:</span> {selectedExchange === 3 ? 'SGX requires exactly 2 trading sessions.' : 'You can add multiple trading sessions for this exchange.'}
                  </p>
                </div>

                {/* Timings List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {editingDefaultTimings.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No default timings set. Click "Add Timing" to add one.</p>
                    </div>
                  ) : (
                    editingDefaultTimings.map((timing, idx) => (
                      <div key={idx} className="space-y-2 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Session {idx + 1}</span>
                          <button
                            onClick={() => handleRemoveDefaultTiming(idx)}
                            disabled={editingDefaultTimings.length <= 1}
                            className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block mb-1.5">Start Time</label>
                            <input
                              type="time"
                              value={timing.startTime.slice(0, 5)}
                              onChange={(e) => handleUpdateDefaultTiming(idx, 'startTime', e.target.value)}
                              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold block mb-1.5">End Time</label>
                            <input
                              type="time"
                              value={timing.endTime.slice(0, 5)}
                              onChange={(e) => handleUpdateDefaultTiming(idx, 'endTime', e.target.value)}
                              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Timing Button */}
                {selectedExchange !== 3 || editingDefaultTimings.length < 2 ? (
                  <button
                    onClick={handleAddDefaultTiming}
                    className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition"
                  >
                    + Add Timing Session
                  </button>
                ) : null}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-600">
                  <button
                    onClick={() => setShowDefaultTimingsModal(false)}
                    disabled={savingDefaultTimings}
                    className="flex-1 px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDefaultTimings}
                    disabled={savingDefaultTimings}
                    className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingDefaultTimings ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Timings
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ExchangeSchedulePage
