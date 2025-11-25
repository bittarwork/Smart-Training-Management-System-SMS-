// Dashboard page component
// Displays system statistics and overview

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import { fetchEmployees } from '../store/slices/employeeSlice'
import { fetchCourses } from '../store/slices/courseSlice'
import { fetchRecommendations } from '../store/slices/recommendationSlice'
import api from '../services/api'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import PageLoader from '../components/PageLoader'
import FeedbackBanner from '../components/FeedbackBanner'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const Dashboard = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { employees } = useSelector((state: RootState) => state.employees)
  const { courses } = useSelector((state: RootState) => state.courses)
  const { recommendations } = useSelector((state: RootState) => state.recommendations)
  
  // State for dashboard statistics from API
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [mlMetrics, setMLMetrics] = useState<any>(null)
  const [mlMetricsError, setMLMetricsError] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [mlMetricsLoading, setMlMetricsLoading] = useState(true)

  const loadDashboardStats = async () => {
    try {
      setStatsLoading(true)
      const response = await api.get('/dashboard/stats')
      setDashboardStats(response.data.data)
      setStatsError(null)
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error)
      setStatsError(error?.response?.data?.message || 'Failed to load dashboard statistics')
    } finally {
      setStatsLoading(false)
    }
  }

  const loadRecentActivities = async () => {
    try {
      setActivitiesLoading(true)
      const response = await api.get('/dashboard/recent-activities')
      setRecentActivities(response.data.data)
      setActivitiesError(null)
    } catch (error: any) {
      console.error('Failed to fetch recent activities:', error)
      setActivitiesError(error?.response?.data?.message || 'Failed to load recent activities')
    } finally {
      setActivitiesLoading(false)
    }
  }

  const loadMlMetrics = async () => {
    try {
      setMlMetricsLoading(true)
      const response = await api.get('/dashboard/ml-metrics')
      if (response.data.success) {
        setMLMetrics(response.data.data)
        setMLMetricsError(null)
      }
    } catch (error: any) {
      console.error('Failed to fetch ML metrics:', error)
      setMLMetricsError(error.response?.data?.message || 'ML metrics not available')
    } finally {
      setMlMetricsLoading(false)
    }
  }

  useEffect(() => {
    dispatch(fetchEmployees())
    dispatch(fetchCourses())
    dispatch(fetchRecommendations())

    loadDashboardStats()
    loadRecentActivities()
    loadMlMetrics()
  }, [dispatch])

  // Calculate statistics
  const totalEmployees = employees.length
  const totalCourses = courses.length
  const totalRecommendations = recommendations.length
  const pendingRecommendations = recommendations.filter(r => r.status === 'Pending').length

  // Department distribution for employees
  const departmentCounts = employees.reduce((acc, emp) => {
    const dept = emp.department.name
    acc[dept] = (acc[dept] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Courses distribution by department
  const courseDepartmentCounts = courses.reduce((acc, course) => {
    const dept = course.department
    acc[dept] = (acc[dept] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const courseDepartmentData = {
    labels: Object.keys(courseDepartmentCounts),
    datasets: [{
      label: 'Courses',
      data: Object.values(courseDepartmentCounts),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(236, 72, 153, 0.8)',
      ],
    }],
  }

  const departmentData = {
    labels: Object.keys(departmentCounts),
    datasets: [
      {
        label: 'Employees',
        data: Object.values(departmentCounts),
        backgroundColor: [
          'rgba(14, 165, 233, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
      },
    ],
  }

  // Recommendation status distribution
  const statusCounts = recommendations.reduce((acc, rec) => {
    const status = rec.status
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const statusData = {
    labels: Object.keys(statusCounts),
    datasets: [
      {
        data: Object.values(statusCounts),
        backgroundColor: [
          'rgba(14, 165, 233, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
      },
    ],
  }

  const getActivityDotClass = (type: string) => {
    if (!type) return 'bg-gray-400'
    if (type.includes('failed') || type.includes('rejected')) return 'bg-red-500'
    if (type.startsWith('training')) return 'bg-green-500'
    return 'bg-blue-500'
  }

  const isInitialLoading = statsLoading && !dashboardStats

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {statsError && (
        <div className="mb-4">
          <FeedbackBanner
            type="error"
            title="Dashboard data unavailable"
            message={statsError}
            actionLabel="Retry"
            onAction={loadDashboardStats}
            onDismiss={() => setStatsError(null)}
          />
        </div>
      )}

      {isInitialLoading ? (
        <PageLoader label="Loading dashboard data..." fullHeight />
      ) : (
        <>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalEmployees}</p>
            </div>
            <div className="bg-primary-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalCourses}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Recommendations</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalRecommendations}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{pendingRecommendations}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Statistics - Training History */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Training Completed</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {dashboardStats.training.completed}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Training In Progress</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {dashboardStats.training.inProgress}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Training Records</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {dashboardStats.training.total}
                </p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ML Model Performance Metrics */}
      {mlMetrics && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-lg shadow-lg mb-4">
            <h2 className="text-2xl font-bold text-white mb-2">ML Model Performance</h2>
            <p className="text-indigo-100 text-sm">
              Random Forest Classifier | Trained: {new Date(mlMetrics.model_info.training_date).toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
            {/* F1-Score Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">F1-Score</p>
                {mlMetrics.target_threshold.meets_threshold ? (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    Target Met
                  </span>
                ) : (
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                    Below Target
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {(mlMetrics.performance.f1_score * 100).toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-2">Target: ≥85%</p>
            </div>

            {/* Accuracy Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Accuracy</p>
                <div className="bg-blue-100 p-2 rounded-full">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {(mlMetrics.performance.accuracy * 100).toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-2">Overall accuracy</p>
            </div>

            {/* Precision Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Precision</p>
                <div className="bg-purple-100 p-2 rounded-full">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {(mlMetrics.performance.precision * 100).toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-2">Prediction precision</p>
            </div>

            {/* Recall Card */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Recall</p>
                <div className="bg-green-100 p-2 rounded-full">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {(mlMetrics.performance.recall * 100).toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-2">Pattern detection</p>
            </div>
          </div>

          {/* Cross-Validation & Model Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cross-Validation (5-Fold)</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Mean Score:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {(mlMetrics.cross_validation.cv_mean * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Std Deviation:</span>
                  <span className="text-lg font-semibold text-gray-700">
                    ±{(mlMetrics.cross_validation.cv_std * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600 mb-2">Individual Fold Scores:</p>
                  <div className="flex flex-wrap gap-2">
                    {mlMetrics.cross_validation.cv_scores.map((score: number, idx: number) => (
                      <span key={idx} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
                        Fold {idx + 1}: {(score * 100).toFixed(1)}%
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Model Type:</span>
                  <span className="text-sm font-semibold text-gray-900">Random Forest</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Trees:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {mlMetrics.model_info.parameters.n_estimators}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Max Depth:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {mlMetrics.model_info.parameters.max_depth}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Training Samples:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {mlMetrics.model_info.n_samples.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Features:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {mlMetrics.model_info.n_features}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Confidence:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {(mlMetrics.performance.avg_confidence * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!mlMetrics && mlMetricsError && (
        <div className="mb-8">
          <FeedbackBanner
            type="warning"
            title="ML metrics unavailable"
            message={mlMetricsError}
            actionLabel="Retry"
            onAction={loadMlMetrics}
            onDismiss={() => setMLMetricsError(null)}
          />
        </div>
      )}
        </>
      )}

      {/* ML Metrics Error/Warning */}
      {mlMetricsError && !mlMetrics && (
        <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {mlMetricsError}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Employees by Department</h2>
          <Bar data={departmentData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommendation Status</h2>
          <Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Courses by Department</h2>
          <Doughnut data={courseDepartmentData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        {/* Recent Activities Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activities</h2>
            <button
              className="text-sm text-primary-600 hover:text-primary-700"
              onClick={loadRecentActivities}
            >
              Refresh
            </button>
          </div>
          {activitiesError && (
            <div className="mb-4">
              <FeedbackBanner
                type="warning"
                title="Activities unavailable"
                message={activitiesError}
                actionLabel="Retry"
                onAction={loadRecentActivities}
                onDismiss={() => setActivitiesError(null)}
              />
            </div>
          )}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {activitiesLoading && !recentActivities.length ? (
              <PageLoader label="Loading recent activities..." />
            ) : recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getActivityDotClass(
                      activity.type
                    )}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 break-words">{activity.message}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {new Date(activity.date).toLocaleString()}
                      </p>
                      {activity.meta?.status && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          {activity.meta.status}
                        </span>
                      )}
                      {typeof activity.meta?.progress === 'number' && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                          {activity.meta.progress}% progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activities</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

