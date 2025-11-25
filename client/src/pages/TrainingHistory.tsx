// Enhanced Training History Page
// Professional dashboard with statistics, charts, and comprehensive tracking

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import {
  fetchTrainingHistory,
  createTrainingHistory,
  updateTrainingHistory,
  deleteTrainingHistory,
  TrainingHistory as TrainingHistoryType,
} from '../store/slices/trainingHistorySlice'
import { fetchEmployees } from '../store/slices/employeeSlice'
import { fetchCourses } from '../store/slices/courseSlice'
import toast from 'react-hot-toast'
import PageLoader from '../components/PageLoader'
import FeedbackBanner from '../components/FeedbackBanner'
import ConfirmDialog from '../components/ConfirmDialog'
import PageState from '../components/PageState'

const TrainingHistory = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { trainingHistory, loading, error } = useSelector((state: RootState) => state.trainingHistory)
  const { employees } = useSelector((state: RootState) => state.employees)
  const { courses } = useSelector((state: RootState) => state.courses)
  const { user } = useSelector((state: RootState) => state.auth)

  // View modes
  const [viewMode, setViewMode] = useState<'dashboard' | 'list' | 'timeline'>('dashboard')
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [dismissedError, setDismissedError] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TrainingHistoryType | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<TrainingHistoryType | null>(null)

  // Filter states
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Form data state
  const [formData, setFormData] = useState<{
    employee_id: string
    course_id: string
    start_date: string
    completion_date: string
    assessment_score: number | ''
    status: string
    progress: number
    feedback: string
  }>({
    employee_id: '',
    course_id: '',
    start_date: new Date().toISOString().split('T')[0],
    completion_date: '',
    assessment_score: '',
    status: 'Not Started',
    progress: 0,
    feedback: '',
  })

  // RBAC permissions
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const canAdd = isAdmin || isManager
  const canEdit = isAdmin || isManager
  const canDelete = isAdmin

  useEffect(() => {
    dispatch(fetchTrainingHistory())
    dispatch(fetchEmployees())
    dispatch(fetchCourses())
  }, [dispatch])

  // Calculate statistics
  const stats = {
    total: trainingHistory.length,
    notStarted: trainingHistory.filter(t => t.status === 'Not Started').length,
    inProgress: trainingHistory.filter(t => t.status === 'In Progress').length,
    completed: trainingHistory.filter(t => t.status === 'Completed').length,
    failed: trainingHistory.filter(t => t.status === 'Failed').length,
    avgProgress: trainingHistory.length > 0 
      ? Math.round(trainingHistory.reduce((sum, t) => sum + t.progress, 0) / trainingHistory.length)
      : 0,
    avgScore: trainingHistory.filter(t => t.assessment_score).length > 0
      ? Math.round(
          trainingHistory
            .filter(t => t.assessment_score)
            .reduce((sum, t) => sum + (t.assessment_score || 0), 0) / 
          trainingHistory.filter(t => t.assessment_score).length
        )
      : 0,
    completionRate: trainingHistory.length > 0
      ? Math.round((trainingHistory.filter(t => t.status === 'Completed').length / trainingHistory.length) * 100)
      : 0,
  }

  // Open modal for adding new record
  const handleAdd = () => {
    setEditingRecord(null)
    setFormData({
      employee_id: '',
      course_id: '',
      start_date: new Date().toISOString().split('T')[0],
      completion_date: '',
      assessment_score: '',
      status: 'Not Started',
      progress: 0,
      feedback: '',
    })
    setIsModalOpen(true)
  }

  // Open modal for editing record
  const handleEdit = (record: TrainingHistoryType) => {
    setEditingRecord(record)
    setFormData({
      employee_id: record.employee_id._id,
      course_id: record.course_id._id,
      start_date: record.start_date ? new Date(record.start_date).toISOString().split('T')[0] : '',
      completion_date: record.completion_date ? new Date(record.completion_date).toISOString().split('T')[0] : '',
      assessment_score: record.assessment_score || '',
      status: record.status,
      progress: record.progress,
      feedback: record.feedback || '',
    })
    setIsModalOpen(true)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.employee_id || !formData.course_id) {
      toast.error('Please select employee and course')
      return
    }

    try {
      const submitData: any = {
        employee_id: formData.employee_id,
        course_id: formData.course_id,
        start_date: formData.start_date,
        status: formData.status,
        progress: formData.progress,
      }

      if (formData.completion_date) {
        submitData.completion_date = formData.completion_date
      }

      if (formData.assessment_score !== '') {
        submitData.assessment_score = Number(formData.assessment_score)
      }

      if (formData.feedback) {
        submitData.feedback = formData.feedback
      }

      if (editingRecord) {
        await dispatch(updateTrainingHistory({ id: editingRecord._id, data: submitData })).unwrap()
        toast.success('Training record updated successfully!')
      } else {
        await dispatch(createTrainingHistory(submitData)).unwrap()
        toast.success('Training record created successfully!')
      }

      setIsModalOpen(false)
      dispatch(fetchTrainingHistory())
    } catch (error: any) {
      toast.error(error || 'Operation failed')
    }
  }

  // Handle delete
  const handleDelete = async () => {
    if (!deletingRecordId) return

    setDeleteLoading(true)

    try {
      await dispatch(deleteTrainingHistory(deletingRecordId)).unwrap()
      toast.success('Training record deleted successfully')
      dispatch(fetchTrainingHistory())
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete record')
    } finally {
      setDeleteLoading(false)
      setDeleteModal(false)
      setDeletingRecordId(null)
    }
  }

  // Open delete confirmation modal
  const confirmDelete = (id: string) => {
    setDeletingRecordId(id)
    setDeleteModal(true)
  }

  // Filter and search
  const filteredHistory = trainingHistory.filter(record => {
    const matchesEmployee = !filterEmployee || record.employee_id._id === filterEmployee
    const matchesCourse = !filterCourse || record.course_id._id === filterCourse
    const matchesStatus = !filterStatus || record.status === filterStatus
    const matchesSearch = !searchTerm || 
      record.employee_id.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.course_id.title.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesEmployee && matchesCourse && matchesStatus && matchesSearch
  })

  // Clear filters
  const clearFilters = () => {
    setFilterEmployee('')
    setFilterCourse('')
    setFilterStatus('')
    setSearchTerm('')
  }

  const handleRetry = () => {
    setDismissedError(false)
    dispatch(fetchTrainingHistory())
  }

  const isInitialLoading = loading && !trainingHistory.length

  // Status badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started': return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'Completed': return 'bg-green-100 text-green-800 border-green-300'
      case 'Failed': return 'bg-red-100 text-red-800 border-red-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Progress color
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress >= 25) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  // Score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training History Center</h1>
          <p className="text-gray-600 mt-1">
            Track employee training progress, completion rates, and performance metrics
          </p>
        </div>
        {canAdd && (
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Training Record
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && !dismissedError && (
        <FeedbackBanner
          type="error"
          title="Unable to load training history"
          message={error}
          actionLabel="Retry"
          onAction={handleRetry}
          onDismiss={() => setDismissedError(true)}
        />
      )}

      {isInitialLoading ? (
        <PageLoader label="Loading training records..." fullHeight />
      ) : trainingHistory.length === 0 ? (
        <PageState
          title="No training records yet"
          message="Start tracking employee training by adding your first training record. Monitor progress, completion rates, and assessment scores all in one place."
          actionLabel={canAdd ? 'Add First Record' : undefined}
          onAction={canAdd ? handleAdd : undefined}
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
      ) : (
        <>
          {/* Statistics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {/* Total Records */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div className="text-3xl font-bold">{stats.total}</div>
              </div>
              <div className="text-sm text-blue-100">Total Records</div>
            </div>

            {/* Not Started */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-3xl font-bold text-gray-700">{stats.notStarted}</div>
              </div>
              <div className="text-sm text-gray-600">Not Started</div>
            </div>

            {/* In Progress */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-400">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>

            {/* Completed */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-400">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>

            {/* Failed */}
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-400">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
              </div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>

            {/* Avg Progress */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <div className="text-3xl font-bold text-indigo-600">{stats.avgProgress}%</div>
              </div>
              <div className="text-sm text-gray-600">Avg Progress</div>
            </div>

            {/* Avg Score */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <div className="text-3xl font-bold text-purple-600">{stats.avgScore}%</div>
              </div>
              <div className="text-sm text-gray-600">Avg Score</div>
            </div>

            {/* Completion Rate */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <div className="text-3xl font-bold">{stats.completionRate}%</div>
              </div>
              <div className="text-sm text-green-100">Completion Rate</div>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="bg-white rounded-lg shadow p-1 flex gap-1">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`flex-1 px-4 py-3 rounded-md transition flex items-center justify-center gap-2 ${
                viewMode === 'dashboard'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Dashboard View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 px-4 py-3 rounded-md transition flex items-center justify-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List View
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex-1 px-4 py-3 rounded-md transition flex items-center justify-center gap-2 ${
                viewMode === 'timeline'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Timeline View
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by employee or course..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Employee Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            </div>

            {/* Filter Actions */}
            {(filterEmployee || filterCourse || filterStatus || searchTerm) && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing <strong>{filteredHistory.length}</strong> of <strong>{trainingHistory.length}</strong> records
                </div>
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {/* Content based on view mode */}
          {filteredHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : viewMode === 'dashboard' ? (
            <DashboardView
              records={filteredHistory}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? confirmDelete : undefined}
              onViewDetails={setSelectedRecord}
              getStatusColor={getStatusColor}
              getProgressColor={getProgressColor}
              getScoreColor={getScoreColor}
            />
          ) : viewMode === 'list' ? (
            <ListView
              records={filteredHistory}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? confirmDelete : undefined}
              onViewDetails={setSelectedRecord}
              getStatusColor={getStatusColor}
              getProgressColor={getProgressColor}
              getScoreColor={getScoreColor}
            />
          ) : (
            <TimelineView
              records={filteredHistory}
              onEdit={canEdit ? handleEdit : undefined}
              onDelete={canDelete ? confirmDelete : undefined}
              onViewDetails={setSelectedRecord}
              getStatusColor={getStatusColor}
            />
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg">
              <h2 className="text-2xl font-bold">
                {editingRecord ? 'Edit Training Record' : 'Add New Training Record'}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {editingRecord ? 'Update the training details below' : 'Fill in the training information'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={!!editingRecord}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} - {emp.department.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Course */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={!!editingRecord}
                  >
                    <option value="">Select Course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>

                {/* Progress */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Progress (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress}
                    onChange={(e) =>
                      setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(formData.progress)}`}
                      style={{ width: `${formData.progress}%` }}
                    />
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Completion Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Completion Date
                  </label>
                  <input
                    type="date"
                    value={formData.completion_date}
                    onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Assessment Score */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assessment Score (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.assessment_score}
                    onChange={(e) =>
                      setFormData({ ...formData, assessment_score: e.target.value ? parseInt(e.target.value) : '' })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional - Enter score after assessment"
                  />
                </div>

                {/* Feedback */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback / Notes
                  </label>
                  <textarea
                    value={formData.feedback}
                    onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Optional - Add any feedback, notes, or observations about the training..."
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
                >
                  {editingRecord ? 'Update Record' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedRecord && (
        <TrainingDetailsModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onEdit={canEdit ? () => {
            setSelectedRecord(null)
            handleEdit(selectedRecord)
          } : undefined}
          getStatusColor={getStatusColor}
          getScoreColor={getScoreColor}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteModal}
        title="Delete Training Record"
        description="Are you sure you want to delete this training record? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
        onCancel={() => {
          setDeleteModal(false)
          setDeletingRecordId(null)
        }}
        onConfirm={handleDelete}
      />
    </div>
  )
}

// Dashboard View Component
const DashboardView = ({ records, onEdit, onDelete, onViewDetails, getStatusColor, getProgressColor, getScoreColor }: any) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {records.map((record: TrainingHistoryType) => (
        <div key={record._id} className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-100">
          {/* Card Header */}
          <div className={`p-4 border-b ${
            record.status === 'Completed' ? 'bg-green-50 border-green-200' :
            record.status === 'In Progress' ? 'bg-blue-50 border-blue-200' :
            record.status === 'Failed' ? 'bg-red-50 border-red-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-gray-900 text-lg flex-1">{record.employee_id.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(record.status)}`}>
                {record.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">{record.course_id.title}</p>
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold text-gray-900">{record.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${getProgressColor(record.progress)}`}
                  style={{ width: `${record.progress}%` }}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-500 text-xs mb-1">Start Date</div>
                <div className="font-medium text-gray-900">
                  {record.start_date ? new Date(record.start_date).toLocaleDateString() : '-'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">Completion</div>
                <div className="font-medium text-gray-900">
                  {record.completion_date ? new Date(record.completion_date).toLocaleDateString() : '-'}
                </div>
              </div>
            </div>

            {/* Score */}
            {record.assessment_score !== null && record.assessment_score !== undefined && (
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-sm text-gray-600 mb-1">Assessment Score</div>
                <div className={`text-3xl font-bold ${getScoreColor(record.assessment_score)}`}>
                  {record.assessment_score}%
                </div>
              </div>
            )}

            {/* Feedback Preview */}
            {record.feedback && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-blue-900 mb-1">Feedback:</div>
                <p className="text-sm text-gray-700 line-clamp-2">{record.feedback}</p>
              </div>
            )}
          </div>

          {/* Card Actions */}
          <div className="p-4 bg-gray-50 border-t flex gap-2">
            <button
              onClick={() => onViewDetails(record)}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
            >
              View Details
            </button>
            {onEdit && (
              <button
                onClick={() => onEdit(record)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(record._id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// List View Component
const ListView = ({ records, onEdit, onDelete, onViewDetails, getStatusColor, getProgressColor, getScoreColor }: any) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Course
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record: TrainingHistoryType) => (
              <tr key={record._id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{record.employee_id.name}</div>
                  <div className="text-sm text-gray-500">{record.employee_id.department?.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{record.course_id.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(record.status)}`}>
                    {record.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(record.progress)}`}
                        style={{ width: `${record.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{record.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {record.assessment_score !== null && record.assessment_score !== undefined ? (
                    <span className={`text-lg font-bold ${getScoreColor(record.assessment_score)}`}>
                      {record.assessment_score}%
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div>
                    <strong>Start:</strong> {record.start_date ? new Date(record.start_date).toLocaleDateString() : '-'}
                  </div>
                  <div>
                    <strong>End:</strong> {record.completion_date ? new Date(record.completion_date).toLocaleDateString() : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onViewDetails(record)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View
                    </button>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(record)}
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(record._id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Timeline View Component
const TimelineView = ({ records, onEdit, onDelete, onViewDetails, getStatusColor }: any) => {
  // Sort by start date
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime()
  )

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="space-y-8">
        {sortedRecords.map((record: TrainingHistoryType, index: number) => (
          <div key={record._id} className="relative">
            {/* Timeline Line */}
            {index !== sortedRecords.length - 1 && (
              <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gray-200" />
            )}

            <div className="flex gap-6">
              {/* Timeline Dot */}
              <div className="flex-shrink-0 relative">
                <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center ${
                  record.status === 'Completed' ? 'bg-green-100 border-green-500' :
                  record.status === 'In Progress' ? 'bg-blue-100 border-blue-500' :
                  record.status === 'Failed' ? 'bg-red-100 border-red-500' :
                  'bg-gray-100 border-gray-400'
                }`}>
                  {record.status === 'Completed' ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : record.status === 'In Progress' ? (
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : record.status === 'Failed' ? (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{record.employee_id.name}</h3>
                    <p className="text-blue-600 font-medium">{record.course_id.title}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(record.status)}`}>
                    {record.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Start Date</div>
                    <div className="font-semibold text-gray-900">
                      {record.start_date ? new Date(record.start_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Completion</div>
                    <div className="font-semibold text-gray-900">
                      {record.completion_date ? new Date(record.completion_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Progress</div>
                    <div className="font-semibold text-blue-600 text-lg">{record.progress}%</div>
                  </div>
                  {record.assessment_score !== null && record.assessment_score !== undefined && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Score</div>
                      <div className="font-semibold text-green-600 text-lg">{record.assessment_score}%</div>
                    </div>
                  )}
                </div>

                {record.feedback && (
                  <div className="bg-gray-50 rounded p-3 mb-4">
                    <div className="text-sm text-gray-600">{record.feedback}</div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onViewDetails(record)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                  >
                    View Details
                  </button>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(record)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(record._id)}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition text-sm font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Training Details Modal Component
const TrainingDetailsModal = ({ record, onClose, onEdit, getStatusColor, getScoreColor }: any) => {
  const duration = record.start_date && record.completion_date
    ? Math.ceil((new Date(record.completion_date).getTime() - new Date(record.start_date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className={`p-6 rounded-t-lg ${
          record.status === 'Completed' ? 'bg-gradient-to-r from-green-500 to-green-600' :
          record.status === 'In Progress' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
          record.status === 'Failed' ? 'bg-gradient-to-r from-red-500 to-red-600' :
          'bg-gradient-to-r from-gray-500 to-gray-600'
        } text-white`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-2">Training Details</h2>
              <p className="text-sm opacity-90">Complete information about this training record</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(record.status)}`}>
              {record.status}
            </span>
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Edit Record
              </button>
            )}
          </div>

          {/* Employee & Course Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Employee Information
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Name</div>
                  <div className="font-semibold text-gray-900 text-lg">{record.employee_id.name}</div>
                </div>
                {record.employee_id.department && (
                  <div>
                    <div className="text-sm text-gray-600">Department</div>
                    <div className="font-medium text-gray-900">{record.employee_id.department.name}</div>
                  </div>
                )}
                {record.employee_id.email && (
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <div className="font-medium text-gray-900">{record.employee_id.email}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Course Information
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Title</div>
                  <div className="font-semibold text-gray-900 text-lg">{record.course_id.title}</div>
                </div>
                {record.course_id.department && (
                  <div>
                    <div className="text-sm text-gray-600">Department</div>
                    <div className="font-medium text-gray-900">{record.course_id.department}</div>
                  </div>
                )}
                {record.course_id.duration && (
                  <div>
                    <div className="text-sm text-gray-600">Duration</div>
                    <div className="font-medium text-gray-900">{record.course_id.duration} days</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress and Score */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Training Progress</h3>
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">{record.progress}%</div>
                <div className="w-full bg-white rounded-full h-4 shadow-inner mb-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all"
                    style={{ width: `${record.progress}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {record.progress === 100 ? 'Completed!' :
                   record.progress >= 75 ? 'Almost there!' :
                   record.progress >= 50 ? 'Halfway through' :
                   record.progress >= 25 ? 'Making progress' :
                   'Just started'}
                </div>
              </div>
            </div>

              {record.assessment_score !== null && record.assessment_score !== undefined && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Assessment Score</h3>
                <div className="text-center">
                  <div className={`text-5xl font-bold mb-2 ${getScoreColor(record.assessment_score)}`}>
                    {record.assessment_score}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {record.assessment_score >= 90 ? 'Excellent!' :
                     record.assessment_score >= 70 ? 'Very Good!' :
                     record.assessment_score >= 50 ? 'Good' :
                     'Needs improvement'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Timeline</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-2">Start Date</div>
                <div className="text-xl font-semibold text-gray-900">
                  {record.start_date 
                    ? new Date(record.start_date).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })
                    : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Completion Date</div>
                <div className="text-xl font-semibold text-gray-900">
                  {record.completion_date 
                    ? new Date(record.completion_date).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })
                    : 'Not completed'}
                </div>
              </div>
              {duration && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">Duration</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {duration} day{duration !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback */}
          {record.feedback && (
            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Feedback & Notes
              </h3>
              <p className="text-gray-700 leading-relaxed">{record.feedback}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrainingHistory
