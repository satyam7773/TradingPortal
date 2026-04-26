import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Upload, Download, Eye, ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { groupService } from '../../services/groupService'
import { userManagementService } from '../../services'
import { ExchangeData } from '../../services/api.types'

interface Group {
  id: number
  groupName: string
  exchangeId: number
  isActive: boolean
  exchangeName?: string
  createdAt?: string
}

interface QuantitySetting {
  id: number
  groupId: number
  groupName: string
  script: string
  lotSize: number
  qtyMax: number
  lotMax: number
  breakupQty: number
  breakupLot: number
  isActive: boolean
}

const Groups: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [exchangesLoading, setExchangesLoading] = useState(true)
  const [groups, setGroups] = useState<Group[]>([])
  const [exchanges, setExchanges] = useState<Array<{ id: number; name: string }>>([])
  const [selectedExchange, setSelectedExchange] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [quantitySettings, setQuantitySettings] = useState<QuantitySetting[]>([])
  const [formData, setFormData] = useState({ groupName: '', exchangeId: 1 })
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  // Fetch exchanges on mount
  useEffect(() => {
    fetchExchanges()
  }, [])

  // Fetch groups when exchange changes
  useEffect(() => {
    if (selectedExchange !== null) {
      fetchGroups(selectedExchange)
    }
  }, [selectedExchange])

  const fetchExchanges = async () => {
    try {
      setExchangesLoading(true)
      // Get userId from localStorage or auth context
      const userId = parseInt(localStorage.getItem('userId') || '31', 10)
      const exchangeData = await userManagementService.getExchanges(userId)
      
      if (exchangeData && Array.isArray(exchangeData)) {
        // Map exchange names to IDs (you might want to adjust this mapping based on your backend)
        const exchangeMap: Record<string, number> = {
          'NSE': 1,
          'BSE': 2,
          'MCX': 3,
          'NFO': 4,
          'SGX': 5,
          'CDS': 6,
          'CALLPUT': 7,
          'OTHERS': 8
        }
        
        const mappedExchanges = exchangeData.map(ex => ({
          id: exchangeMap[ex.name] || 0,
          name: ex.name
        }))
        
        setExchanges(mappedExchanges)
        
        // Set first exchange as selected by default
        if (mappedExchanges.length > 0) {
          setSelectedExchange(mappedExchanges[0].id)
          setFormData(prev => ({ ...prev, exchangeId: mappedExchanges[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching exchanges:', error)
      toast.error('Failed to fetch exchanges')
      // Fallback to default exchanges
      const defaultExchanges = [
        { id: 1, name: 'NSE' },
        { id: 2, name: 'BSE' },
        { id: 3, name: 'MCX' },
        { id: 4, name: 'NFO' }
      ]
      setExchanges(defaultExchanges)
      setSelectedExchange(defaultExchanges[0].id)
    } finally {
      setExchangesLoading(false)
    }
  }

  const fetchGroups = async (exchangeId: number) => {
    try {
      setLoading(true)
      const response = await groupService.getGroupsByExchange(exchangeId)
      
      if (response && Array.isArray(response)) {
        setGroups(response)
      } else {
        setGroups([])
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      toast.error('Failed to fetch groups')
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!formData.groupName.trim()) {
      toast.error('Please enter group name')
      return
    }

    if (selectedExchange === null) {
      toast.error('Please select an exchange')
      return
    }

    try {
      await groupService.createGroup(formData)
      toast.success('Group created successfully')
      setShowCreateModal(false)
      setFormData({ groupName: '', exchangeId: selectedExchange })
      fetchGroups(selectedExchange)
    } catch (error: any) {
      console.error('Error creating group:', error)
      toast.error(error?.message || 'Failed to create group')
    }
  }

  const handleUpdateGroup = async () => {
    if (!selectedGroup || !formData.groupName.trim()) {
      toast.error('Please enter group name')
      return
    }

    if (selectedExchange === null) {
      toast.error('Please select an exchange')
      return
    }

    try {
      await groupService.updateGroup(selectedGroup.id, formData)
      toast.success('Group updated successfully')
      setShowEditModal(false)
      setSelectedGroup(null)
      setFormData({ groupName: '', exchangeId: selectedExchange })
      fetchGroups(selectedExchange)
    } catch (error: any) {
      console.error('Error updating group:', error)
      toast.error(error?.message || 'Failed to update group')
    }
  }

  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm('Are you sure you want to delete this group?')) {
      return
    }

    if (selectedExchange === null) {
      return
    }

    try {
      await groupService.deleteGroup(groupId)
      toast.success('Group deleted successfully')
      fetchGroups(selectedExchange)
    } catch (error: any) {
      console.error('Error deleting group:', error)
      toast.error(error?.message || 'Failed to delete group')
    }
  }

  const handleUploadExcel = async () => {
    if (!uploadFile || !selectedGroup) {
      toast.error('Please select a file')
      return
    }

    try {
      await groupService.uploadQuantityExcel(selectedGroup.id, uploadFile)
      toast.success('Quantity settings uploaded successfully')
      setShowUploadModal(false)
      setUploadFile(null)
      setSelectedGroup(null)
    } catch (error: any) {
      console.error('Error uploading file:', error)
      toast.error(error?.message || 'Failed to upload file')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const blob = await groupService.downloadTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'quantity_template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Template downloaded successfully')
    } catch (error: any) {
      console.error('Error downloading template:', error)
      toast.error(error?.message || 'Failed to download template')
    }
  }

  const handleViewQuantitySettings = async (group: Group) => {
    try {
      setSelectedGroup(group)
      const response = await groupService.getQuantitySettings(group.id)
      setQuantitySettings(response || [])
      setShowQuantityModal(true)
    } catch (error: any) {
      console.error('Error fetching quantity settings:', error)
      toast.error(error?.message || 'Failed to fetch quantity settings')
    }
  }

  const openEditModal = (group: Group) => {
    setSelectedGroup(group)
    setFormData({ groupName: group.groupName, exchangeId: group.exchangeId })
    setShowEditModal(true)
  }

  const openUploadModal = (group: Group) => {
    setSelectedGroup(group)
    setShowUploadModal(true)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-col h-full max-w-[1800px] mx-auto w-full bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Group Management</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Manage trading quantity groups and settings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition inline-flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Template
              </button>
              <button
                onClick={() => {
                  setFormData({ groupName: '', exchangeId: selectedExchange || 1 })
                  setShowCreateModal(true)
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition inline-flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Group
              </button>
            </div>
          </div>
        </div>

        {/* Exchange Filter */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/30 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Exchange:</label>
            <select
              value={selectedExchange || ''}
              onChange={(e) => setSelectedExchange(Number(e.target.value))}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={exchangesLoading}
            >
              {exchangesLoading ? (
                <option value="">Loading exchanges...</option>
              ) : (
                exchanges.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))
              )}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-slate-600 dark:text-slate-400">Loading groups...</p>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <Settings className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-slate-600 dark:text-slate-400">No groups found for this exchange</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
            <table className="w-full border-collapse">
              <colgroup>
                <col style={{width: '80px'}} />
                <col style={{width: '250px'}} />
                <col style={{width: '150px'}} />
                <col style={{width: '200px'}} />
                <col style={{width: '250px'}} />
              </colgroup>
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Group Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Exchange
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800">
                {groups.map((group) => (
                  <tr
                    key={group.id}
                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700/50 dark:hover:to-slate-600/50 transition-all duration-200 border-b border-slate-200/50 dark:border-slate-700/30"
                  >
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {group.id}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {group.groupName}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {exchanges.find(ex => ex.id === group.exchangeId)?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {group.createdAt ? new Date(group.createdAt).toLocaleString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewQuantitySettings(group)}
                          className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                          title="View Quantity Settings"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openUploadModal(group)}
                          className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition"
                          title="Upload Excel"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(group)}
                          className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition"
                          title="Edit Group"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                          title="Delete Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Info */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Total Groups: <span className="font-semibold text-slate-900 dark:text-white">{groups.length}</span>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Create New Group</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={formData.groupName}
                  onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Exchange
                </label>
                <select
                  value={formData.exchangeId}
                  onChange={(e) => setFormData({ ...formData, exchangeId: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {exchanges.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ groupName: '', exchangeId: selectedExchange || 1 })
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Edit Group</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={formData.groupName}
                  onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Exchange
                </label>
                <select
                  value={formData.exchangeId}
                  onChange={(e) => setFormData({ ...formData, exchangeId: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {exchanges.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedGroup(null)
                  setFormData({ groupName: '', exchangeId: selectedExchange || 1 })
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateGroup}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Upload Quantity Settings - {selectedGroup.groupName}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Excel File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedGroup(null)
                  setUploadFile(null)
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadExcel}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Settings Modal */}
      {showQuantityModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              Quantity Settings - {selectedGroup.groupName}
            </h2>
            <div className="flex-1 overflow-auto">
              {quantitySettings.length === 0 ? (
                <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                  No quantity settings found
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0">
                    <tr className="border-b border-slate-300 dark:border-slate-600">
                      <th className="px-3 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 min-w-[100px]">Script</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 min-w-[80px]">Lot Size</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 min-w-[80px]">Qty Max</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 min-w-[80px]">Lot Max</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 min-w-[100px]">Breakup Qty</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 min-w-[100px]">Breakup Lot</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 min-w-[70px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {quantitySettings.map((setting) => (
                      <tr key={setting.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-3 py-2 text-slate-900 dark:text-white font-medium">{setting.script}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-white text-center">{setting.lotSize}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-white text-center">{setting.qtyMax}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-white text-center">{setting.lotMax}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-white text-center">{setting.breakupQty}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-white text-center">{setting.breakupLot}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            setting.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {setting.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowQuantityModal(false)
                  setSelectedGroup(null)
                  setQuantitySettings([])
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-600 hover:bg-slate-700 text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Groups
