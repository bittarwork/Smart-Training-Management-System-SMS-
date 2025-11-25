// Enhanced Recommendations page with detailed insights
// Displays ML-generated recommendations with hybrid system explanations

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import {
  fetchRecommendations,
  generateRecommendations,
  generateCustomRecommendations,
  batchGenerateRecommendations,
  updateRecommendation,
  fetchEmployeeRecommendations,
} from '../store/slices/recommendationSlice'
import { fetchEmployees } from '../store/slices/employeeSlice'
import { fetchCourses } from '../store/slices/courseSlice'
import toast from 'react-hot-toast'
import { Recommendation, Employee } from '../types'
import PageLoader from '../components/PageLoader'
import FeedbackBanner from '../components/FeedbackBanner'
import PageState from '../components/PageState'
import CustomRecommendationModal from '../components/CustomRecommendationModal'

const Recommendations = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { recommendations, loading, error } = useSelector((state: RootState) => state.recommendations)
  const { employees } = useSelector((state: RootState) => state.employees)
  const { courses } = useSelector((state: RootState) => state.courses)
  const { user } = useSelector((state: RootState) => state.auth)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')

  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null)
  const [showInfoPanel, setShowInfoPanel] = useState(true)
  const [overrideModal, setOverrideModal] = useState<{ open: boolean; recommendation: Recommendation | null }>({
    open: false,
    recommendation: null,
  })
  const [overrideReason, setOverrideReason] = useState('')
  const [dismissedError, setDismissedError] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)

  // RBAC permissions
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const canGenerate = isAdmin || isManager
  const canOverride = isAdmin || isManager
  const canUpdateStatus = isAdmin || isManager

  useEffect(() => {
    dispatch(fetchRecommendations())
    dispatch(fetchEmployees())
    dispatch(fetchCourses())
  }, [dispatch])

  useEffect(() => {
    if (selectedEmployee) {
      dispatch(fetchEmployeeRecommendations(selectedEmployee))
    } else {
      dispatch(fetchRecommendations())
    }
  }, [selectedEmployee, dispatch])

  useEffect(() => {
    if (error) {
      setDismissedError(false)
    }
  }, [error])

  const handleGenerate = async (employeeId: string) => {

    const toastId = toast.loading('Generating recommendations using hybrid system...')
    const result = await dispatch(generateRecommendations(employeeId))
    
    if (generateRecommendations.fulfilled.match(result)) {

      toast.success('Recommendations generated successfully!', { id: toastId })
      // Auto-select the employee to show their recommendations
      setSelectedEmployee(employeeId)
    } else {

      toast.error('Failed to generate recommendations', { id: toastId })
    }
  }

  const handleCustomGenerate = async (customData: any) => {
    if (!selectedEmployee) return
    
    setShowCustomModal(false)
    const toastId = toast.loading('Generating recommendations with custom data...')
    const result = await dispatch(generateCustomRecommendations({ 
      employeeId: selectedEmployee, 
      customData 
    }))
    
    if (generateCustomRecommendations.fulfilled.match(result)) {
      toast.success('Custom recommendations generated successfully!', { id: toastId })
      // Keep employee selected to show results
      setSelectedEmployee(selectedEmployee)
    } else {
      toast.error('Failed to generate custom recommendations', { id: toastId })
    }
  }

  const handleBatchGenerate = async () => {
    if (window.confirm('Generate recommendations for all employees? This may take a while.')) {

      const toastId = toast.loading('Batch generating...')
      const result = await dispatch(batchGenerateRecommendations())

      
      if (batchGenerateRecommendations.fulfilled.match(result)) {

        toast.success('Batch generation completed!', { id: toastId })
      } else {

        toast.error('Batch generation failed', { id: toastId })
      }
    }
  }

  const handleReloadModel = async () => {

    const toastId = toast.loading('Reloading ML model...')
    try {
      const response = await fetch('http://localhost:5001/api/model/reload', {
        method: 'POST',

        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()

      
      if (data.success) {

        toast.success('Model reloaded successfully!', { id: toastId })
      } else {

        toast.error('Failed to reload: ' + data.error, { id: toastId })
      }
    } catch (error) {

      toast.error('Cannot connect to ML Engine', { id: toastId })
    }
  }

  const handleOverride = (recommendation: Recommendation) => {
    setOverrideModal({ open: true, recommendation })
    setOverrideReason(recommendation.override_reason || '')
  }

  const handleSaveOverride = async () => {
    if (!overrideModal.recommendation) return

    const result = await dispatch(
      updateRecommendation({
        id: overrideModal.recommendation._id!,
        data: {
          override_flag: true,
          override_reason: overrideReason,
        },
      })
    )

    if (updateRecommendation.fulfilled.match(result)) {

      toast.success('Updated successfully')
      setOverrideModal({ open: false, recommendation: null })
      setOverrideReason('')
    }
  }

  const handleStatusChange = async (recommendation: Recommendation, status: string) => {
    const result = await dispatch(
      updateRecommendation({
        id: recommendation._id!,
        data: { status: status as Recommendation['status'] },
      })
    )

    if (updateRecommendation.fulfilled.match(result)) {

      toast.success('Status updated')
    }
  }

  const getEmployeeName = (employeeId: string | Employee) => {
    if (typeof employeeId === 'object' && employeeId !== null) {
      return employeeId.name
    }
    const emp = employees.find((e) => e._id === employeeId)
    return emp?.name || 'Unknown'
  }


  const getEmployeeData = (employeeId: string | Employee) => {
    if (typeof employeeId === 'object' && employeeId !== null) {
      return employeeId
    }
    return employees.find((e) => e._id === employeeId)
  }

  const getCourseTitle = (courseId: string | any) => {
    if (typeof courseId === 'object' && courseId !== null) {
      return courseId.title || 'Unknown Course'
    }
    
    if (typeof courseId === 'string' && courses && courses.length > 0) {
      const course = courses.find(c => c._id === courseId)
      return course?.title || 'Course Not Found'
    }
    
    return 'Unknown Course'
  }


  const getCourseData = (courseId: string | any) => {
    if (typeof courseId === 'object' && courseId !== null) {
      return courseId
    }
    
    if (typeof courseId === 'string' && courses && courses.length > 0) {
      return courses.find(c => c._id === courseId)
    }
    
    return null
  }

  const handleRetry = () => {
    if (selectedEmployee) {
      dispatch(fetchEmployeeRecommendations(selectedEmployee))
    } else {
      dispatch(fetchRecommendations())
    }
  }


  // Calculate statistics
  const stats = {
    total: recommendations.length,
    pending: recommendations.filter(r => r.status === 'Pending').length,
    accepted: recommendations.filter(r => r.status === 'Accepted').length,
    rejected: recommendations.filter(r => r.status === 'Rejected').length,
    completed: recommendations.filter(r => r.status === 'Completed').length,
    avgConfidence: recommendations.length > 0
      ? (recommendations.reduce((sum, r) => sum + r.confidence_score, 0) / recommendations.length * 100).toFixed(1)
      : '0',
    hybridSystem: recommendations.some(r => r.metadata?.method === 'hybrid_system'),
  }

  const isInitialLoading = loading && !recommendations.length


  // Get confidence color
  const getConfidenceColor = (score: number) => {
    const percentage = score * 100
    if (percentage >= 85) return 'text-green-600 bg-green-50'
    if (percentage >= 70) return 'text-blue-600 bg-blue-50'
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-orange-600 bg-orange-50'
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted': return 'bg-green-100 text-green-800'
      case 'Rejected': return 'bg-red-100 text-red-800'
      case 'Completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (

    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Smart Recommendations System</h1>
            <p className="text-gray-600 mt-1">
              Personalized course recommendations powered by AI and advanced criteria
            </p>
          </div>
          <button
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showInfoPanel ? 'Hide' : 'Show'} System Info
          </button>
        </div>

        {/* Info Panel */}
        {showInfoPanel && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              How Does the Hybrid Recommendation System Work?
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">AI Models (50%)</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• <strong>Random Forest</strong>: Stable and reliable model</li>
                  <li>• <strong>XGBoost</strong>: High accuracy and advanced processing</li>
                  <li>• Trained on 12,000+ samples</li>
                  <li>• 43 features for deep employee profile analysis</li>
                </ul>
              </div>
    <div>

                <h4 className="font-semibold text-gray-900 mb-2">Four Criteria (50%)</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• <strong>Skills Match (30%)</strong>: Current skills alignment</li>
                  <li>• <strong>Skill Gap Fill (30%)</strong>: Missing skills coverage</li>
                  <li>• <strong>Department Needs (20%)</strong>: Team objectives</li>
                  <li>• <strong>Career Path (20%)</strong>: Professional development</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 bg-white/60 rounded p-3 text-sm text-gray-700">
              <strong>Goal:</strong> Select the best 3 courses for each employee based on comprehensive analysis combining AI power with business logic
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Accepted</div>
          <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Rejected</div>
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Avg Confidence</div>
          <div className="text-2xl font-bold text-indigo-600">{stats.avgConfidence}%</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}

                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>

                    {emp.name} - {emp.department.name}
              </option>
            ))}
          </select>

            </div>
            
            {selectedEmployee && canGenerate && (
              <div className="flex gap-2">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1 invisible">.</label>
                  <button
                    onClick={() => handleGenerate(selectedEmployee)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate
                  </button>
                </div>
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1 invisible">.</label>
                  <button
                    onClick={() => setShowCustomModal(true)}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-sm"
                    title="تخصيص البيانات المستخدمة في التوصية"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Custom
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded ${viewMode === 'cards' ? 'bg-white shadow' : 'text-gray-600'}`}
                title="Card View"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded ${viewMode === 'table' ? 'bg-white shadow' : 'text-gray-600'}`}
                title="Table View"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

          {canGenerate && (

              <>
            <button
              onClick={handleBatchGenerate}

                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm"
                  title="Generate recommendations for all employees"
            >

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Batch Generate
            </button>
            <button
              onClick={handleReloadModel}

                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 shadow-sm"
                  title="Reload ML model after retraining"
            >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reload Model
            </button>
              </>
          )}
          </div>
        </div>
      </div>


      {/* Error Banner */}
      {error && !dismissedError && (
          <FeedbackBanner
            type="error"

          title="Failed to load recommendations"
            message={error}
            actionLabel="Retry"
            onAction={handleRetry}
            onDismiss={() => setDismissedError(true)}
          />
      )}


      {/* Content */}
      {isInitialLoading ? (
        <PageLoader label="Loading recommendations..." fullHeight />
      ) : !recommendations.length ? (
        <PageState
          title="No recommendations available"

          message="Generate recommendations for employees to see personalized AI suggestions with detailed explanations"
          actionLabel={canGenerate ? 'Start Generating' : undefined}
          onAction={canGenerate ? () => selectedEmployee && handleGenerate(selectedEmployee) : undefined}
          icon={

            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />

      ) : viewMode === 'cards' ? (
        <RecommendationCards
          recommendations={recommendations}
          getEmployeeName={getEmployeeName}
          getEmployeeData={getEmployeeData}
          getCourseTitle={getCourseTitle}
          getCourseData={getCourseData}
          getConfidenceColor={getConfidenceColor}
          getStatusColor={getStatusColor}
          canUpdateStatus={canUpdateStatus}
          canOverride={canOverride}
          handleStatusChange={handleStatusChange}
          handleOverride={handleOverride}
          setSelectedRecommendation={setSelectedRecommendation}
        />
      ) : (
        <RecommendationTable
          recommendations={recommendations}
          getEmployeeName={getEmployeeName}
          getCourseTitle={getCourseTitle}
          getConfidenceColor={getConfidenceColor}
          getStatusColor={getStatusColor}
          canUpdateStatus={canUpdateStatus}
          canOverride={canOverride}
          handleStatusChange={handleStatusChange}
          handleOverride={handleOverride}
        />
      )}

      {/* Details Modal */}
      {selectedRecommendation && (
        <RecommendationDetailsModal
          recommendation={selectedRecommendation}
          employee={getEmployeeData(selectedRecommendation.employee_id)}
          course={getCourseData(selectedRecommendation.course_id)}
          onClose={() => setSelectedRecommendation(null)}
        />
      )}

      {/* Custom Recommendation Modal */}
      {showCustomModal && selectedEmployee && (
        <CustomRecommendationModal
          employee={employees.find(e => e._id === selectedEmployee)!}
          onGenerate={handleCustomGenerate}
          onClose={() => setShowCustomModal(false)}
        />
      )}

      {/* Override Modal */}
      {overrideModal.open && overrideModal.recommendation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Manual Override</h2>
              <div className="mb-4 bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Employee:</strong> {getEmployeeName(overrideModal.recommendation.employee_id)}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Course:</strong> {getCourseTitle(overrideModal.recommendation.course_id)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Confidence:</strong> {(overrideModal.recommendation.confidence_score * 100).toFixed(1)}%
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Override Reason</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter reason for manual override..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveOverride}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setOverrideModal({ open: false, recommendation: null })
                    setOverrideReason('')
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Recommendation Cards View Component
const RecommendationCards = ({ recommendations, getEmployeeName, getEmployeeData, getCourseTitle, getCourseData, getConfidenceColor, getStatusColor, canUpdateStatus, canOverride, handleStatusChange, handleOverride, setSelectedRecommendation }: any) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recommendations.map((rec: Recommendation) => {
        const employee = getEmployeeData(rec.employee_id)
        const course = getCourseData(rec.course_id)
        const metadata = rec.metadata || {}
        const breakdown = metadata.breakdown || {}
        const explanation = metadata.explanation || {}
        
        return (
          <div key={rec._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{getEmployeeName(rec.employee_id)}</h3>
                  <p className="text-sm text-blue-100">{employee?.department?.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">#{rec.rank}</div>
                  <div className="text-xs text-blue-100">Rank</div>
                </div>
              </div>
            </div>

            {/* Course Info */}
            <div className="p-4 border-b">
              <h4 className="font-semibold text-gray-900 mb-2">{getCourseTitle(rec.course_id)}</h4>
              {course && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {course.department}
                  </span>
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {course.target_experience_level}
                  </span>
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {course.duration} days
                  </span>
                </div>
              )}
            </div>

            {/* Scores */}
            <div className="p-4 space-y-3">
              {/* Overall Score */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Overall Score</span>
                  <span className={`font-bold ${getConfidenceColor(rec.confidence_score)}`}>
                    {(rec.confidence_score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${rec.confidence_score * 100}%` }}
                  />
                </div>
              </div>

              {/* Breakdown if available */}
              {Object.keys(breakdown).length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 font-medium">Criteria Breakdown:</div>
                  {breakdown.skill_match_score !== undefined && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Skills Match</span>
                      <span className="font-semibold">{(breakdown.skill_match_score * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  {breakdown.skill_gap_score !== undefined && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Gap Fill</span>
                      <span className="font-semibold">{(breakdown.skill_gap_score * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  {breakdown.dept_needs_score !== undefined && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Dept Needs</span>
                      <span className="font-semibold">{(breakdown.dept_needs_score * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  {breakdown.career_path_score !== undefined && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Career Path</span>
                      <span className="font-semibold">{(breakdown.career_path_score * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              )}

              {/* Explanation */}
              {explanation.top_reasons && explanation.top_reasons.length > 0 && (
                <div className="bg-blue-50 rounded p-3 text-xs space-y-1">
                  <div className="font-semibold text-gray-900 mb-1">Why this course?</div>
                  {explanation.top_reasons.slice(0, 2).map((reason: any, idx: number) => (
                    <div key={idx} className="text-gray-700">
                      • {reason.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 flex justify-between items-center">
              <div>
                {canUpdateStatus ? (
                  <select
                    value={rec.status}
                    onChange={(e) => handleStatusChange(rec, e.target.value)}
                    className={`text-xs rounded px-2 py-1 border-0 ${getStatusColor(rec.status)}`}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Completed">Completed</option>
                  </select>
                ) : (
                  <span className={`text-xs rounded px-2 py-1 ${getStatusColor(rec.status)}`}>
                    {rec.status}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedRecommendation(rec)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  title="View Details"
                >
                  Details
                </button>
                {canOverride && (
                  <button
                    onClick={() => handleOverride(rec)}
                    className="text-gray-600 hover:text-gray-700 text-sm"
                    title="Manual override"
                  >
                    Override
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Recommendation Table View Component
const RecommendationTable = ({ recommendations, getEmployeeName, getCourseTitle, getConfidenceColor, getStatusColor, canUpdateStatus, canOverride, handleStatusChange, handleOverride }: any) => {
  return (
        <div className="bg-white rounded-lg shadow overflow-hidden">

      <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">

            {recommendations.map((rec: Recommendation) => (
              <tr key={rec._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getEmployeeName(rec.employee_id)}
                  </td>

                <td className="px-6 py-4 text-sm text-gray-900">
                    {getCourseTitle(rec.course_id)}
                  </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`font-semibold ${getConfidenceColor(rec.confidence_score)}`}>
                    {(rec.confidence_score * 100).toFixed(1)}%
                  </span>
                </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">

                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                    #{rec.rank}
                  </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {canUpdateStatus ? (
                      <select
                        value={rec.status}
                        onChange={(e) => handleStatusChange(rec, e.target.value)}

                      className={`text-sm rounded px-2 py-1 border-0 ${getStatusColor(rec.status)}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Completed">Completed</option>
                      </select>
                    ) : (

                    <span className={`text-sm rounded px-2 py-1 ${getStatusColor(rec.status)}`}>
                        {rec.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {canOverride ? (
                      <button
                        onClick={() => handleOverride(rec)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Override
                      </button>
                    ) : (
                      <span className="text-gray-400">View Only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

    </div>
  )
}

// Recommendation Details Modal Component
const RecommendationDetailsModal = ({ recommendation, employee, course, onClose }: any) => {
  const metadata = recommendation.metadata || {}
  const breakdown = metadata.breakdown || {}
  const explanation = metadata.explanation || {}
  const method = metadata.method || 'v1'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-2xl my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Recommendation Details #{recommendation.rank}</h2>
              <p className="text-blue-100">
                {method === 'hybrid_system' ? 'Hybrid System (ML + Rules)' : 'Classic System'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee & Course Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Employee Information
              </h3>
              {employee && (
                <div className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {employee.name}</div>
                  <div><strong>Department:</strong> {employee.department?.name}</div>
                  <div><strong>Experience:</strong> {employee.experience?.years} years</div>
                  <div><strong>Skills Count:</strong> {employee.skills?.length || 0}</div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Course Information
              </h3>
              {course && (
                <div className="space-y-2 text-sm">
                  <div><strong>Title:</strong> {course.title}</div>
                  <div><strong>Department:</strong> {course.department}</div>
                  <div><strong>Level:</strong> {course.target_experience_level}</div>
                  <div><strong>Duration:</strong> {course.duration} days</div>
                </div>
              )}
            </div>
          </div>

          {/* Overall Score */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Overall Score</h3>
              <div className="text-4xl font-bold text-blue-600">
                {(recommendation.confidence_score * 100).toFixed(1)}%
              </div>
            </div>
            <div className="w-full bg-white rounded-full h-4 shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                style={{ width: `${recommendation.confidence_score * 100}%` }}
              >
                <span className="text-white text-xs font-bold">
                  {recommendation.confidence_score >= 0.85 ? 'Excellent' :
                   recommendation.confidence_score >= 0.75 ? 'Very Good' :
                   recommendation.confidence_score >= 0.65 ? 'Good' : 'Fair'}
                </span>
              </div>
            </div>
            {metadata.ml_confidence !== undefined && (
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div className="bg-white rounded p-3">
                  <div className="text-gray-600 mb-1">ML Confidence</div>
                  <div className="text-lg font-bold text-purple-600">
                    {(metadata.ml_confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white rounded p-3">
                  <div className="text-gray-600 mb-1">Rule Score</div>
                  <div className="text-lg font-bold text-green-600">
                    {(metadata.rule_score * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Criteria Breakdown */}
          {Object.keys(breakdown).length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Four Criteria Breakdown
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {breakdown.skill_match_score !== undefined && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Skills Match (30%)</span>
                      <span className="text-lg font-bold text-green-600">
                        {(breakdown.skill_match_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${breakdown.skill_match_score * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {breakdown.skill_gap_score !== undefined && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Skill Gap Fill (30%)</span>
                      <span className="text-lg font-bold text-orange-600">
                        {(breakdown.skill_gap_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${breakdown.skill_gap_score * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {breakdown.dept_needs_score !== undefined && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Department Needs (20%)</span>
                      <span className="text-lg font-bold text-blue-600">
                        {(breakdown.dept_needs_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${breakdown.dept_needs_score * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {breakdown.career_path_score !== undefined && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Career Path (20%)</span>
                      <span className="text-lg font-bold text-purple-600">
                        {(breakdown.career_path_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${breakdown.career_path_score * 100}%` }}
              />
            </div>

                  </div>
                )}
              </div>
            </div>
          )}

          {/* Explanation */}
          {explanation.top_reasons && explanation.top_reasons.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-6 border border-amber-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Why Was This Course Recommended?
              </h3>
              <div className="space-y-3">
                {explanation.top_reasons.map((reason: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium">{reason.reason}</p>
                        {reason.impact_percentage && (
                          <p className="text-sm text-gray-600 mt-1">
                            Impact: {reason.impact_percentage}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {explanation.fit_category && (
                <div className="mt-4 bg-white rounded-lg p-3 text-center">
                  <span className="text-sm text-gray-600">Overall Fit: </span>
                  <span className="text-lg font-bold text-amber-600">{explanation.fit_category}</span>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
              <button

              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
              </button>
            </div>
          </div>
        </div>
    </div>
  )
}

export default Recommendations

