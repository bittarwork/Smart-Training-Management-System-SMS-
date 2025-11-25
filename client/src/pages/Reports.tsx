// Reports page component
// Displays training reports and export functionality with improved UX

import { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import api from '../services/api'
import toast from 'react-hot-toast'
import FeedbackBanner from '../components/FeedbackBanner'

type ReportType = 'participation' | 'skill-gaps' | 'completion' | 'employees' | 'courses' | 'recommendations'

interface ReportCard {
  type: ReportType
  title: string
  description: string
  icon: string
  color: string
  requiresDate: boolean
}

const Reports = () => {
  const { user } = useSelector((state: RootState) => state.auth)
  const [loading, setLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [exportError, setExportError] = useState<string | null>(null)

  const reportCards: ReportCard[] = [
    {
      type: 'employees',
      title: 'Employees Report',
      description: 'Complete employee records with skills, experience, and department details',
      icon: '',
      color: 'blue',
      requiresDate: false,
    },
    {
      type: 'courses',
      title: 'Courses Catalog',
      description: 'All training courses with prerequisites, delivery modes, and requirements',
      icon: '',
      color: 'green',
      requiresDate: false,
    },
    {
      type: 'participation',
      title: 'Training Participation',
      description: 'Monthly participation rates by department with completion statistics',
      icon: '',
      color: 'purple',
      requiresDate: true,
    },
    {
      type: 'skill-gaps',
      title: 'Skill Gap Analysis',
      description: 'Identifies missing critical skills across departments and employees',
      icon: '',
      color: 'orange',
      requiresDate: false,
    },
    {
      type: 'completion',
      title: 'Course Completion',
      description: 'Completion rates and enrollment statistics for all courses',
      icon: '',
      color: 'teal',
      requiresDate: false,
    },
    {
      type: 'recommendations',
      title: 'ML Recommendations',
      description: 'AI-generated course recommendations with confidence scores',
      icon: '🤖',
      color: 'pink',
      requiresDate: false,
    },
  ]

  const buildReportQuery = (type: ReportType) => {
    const params = new URLSearchParams({ type })
    if (type === 'participation') {
      params.append('month', String(month))
      params.append('year', String(year))
    }
    return params.toString()
  }

  const handleExportExcel = async (type: ReportType) => {
    setLoading(true)
    setExportError(null)
    try {
      const response = await api.get(`/reports/export/csv?${buildReportQuery(type)}`, {
        responseType: 'blob',
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      // Check if it's Excel or CSV
      const contentType = response.headers['content-type']
      const isExcel = contentType?.includes('spreadsheetml')
      const extension = isExcel ? 'xlsx' : 'csv'
      
      // Create filename with current date
      const dateStr = new Date().toISOString().split('T')[0]
      link.setAttribute('download', `${type}-report-${dateStr}.${extension}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success(`Report exported successfully as ${extension.toUpperCase()}`)
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to export report'
      setExportError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, { border: string; bg: string; icon: string; button: string }> = {
      blue: {
        border: 'border-blue-200',
        bg: 'bg-blue-50',
        icon: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700',
      },
      green: {
        border: 'border-green-200',
        bg: 'bg-green-50',
        icon: 'text-green-600',
        button: 'bg-green-600 hover:bg-green-700',
      },
      purple: {
        border: 'border-purple-200',
        bg: 'bg-purple-50',
        icon: 'text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700',
      },
      orange: {
        border: 'border-orange-200',
        bg: 'bg-orange-50',
        icon: 'text-orange-600',
        button: 'bg-orange-600 hover:bg-orange-700',
      },
      teal: {
        border: 'border-teal-200',
        bg: 'bg-teal-50',
        icon: 'text-teal-600',
        button: 'bg-teal-600 hover:bg-teal-700',
      },
      pink: {
        border: 'border-pink-200',
        bg: 'bg-pink-50',
        icon: 'text-pink-600',
        button: 'bg-pink-600 hover:bg-pink-700',
      },
    }
    return colors[color] || colors.blue
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
        <p className="text-gray-600">
          Generate and export comprehensive training reports in Excel format
        </p>
      </div>

      {exportError && (
        <div className="mb-6">
          <FeedbackBanner
            type="error"
            title="Export Failed"
            message={exportError}
            onDismiss={() => setExportError(null)}
          />
        </div>
      )}

      {/* Date Selection for Participation Report */}
      {selectedReport === 'participation' && (
        <div className="bg-white p-6 rounded-lg shadow mb-6 border-l-4 border-purple-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Select Report Period
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {monthNames.map((name, index) => (
                  <option key={index} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-800">
              <strong>Selected Period:</strong> {monthNames[month - 1]} {year}
            </p>
          </div>
        </div>
      )}

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportCards.map((report) => {
          const colors = getColorClasses(report.color)
          const isSelected = selectedReport === report.type
          
          return (
            <div
              key={report.type}
              className={`bg-white rounded-lg shadow-md border-2 transition-all ${
                isSelected ? `${colors.border} ring-2 ring-offset-2 ring-${report.color}-400` : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`p-6 ${colors.bg} rounded-t-lg`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-4xl ${colors.icon}`}>{report.icon}</span>
                  {isSelected && (
                    <span className="px-2 py-1 bg-white text-xs font-semibold rounded-full text-gray-700">
                      Selected
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{report.title}</h3>
                <p className="text-sm text-gray-600">{report.description}</p>
              </div>
              
              <div className="p-4">
                <div className="flex gap-2">
                  {report.requiresDate && (
                    <button
                      onClick={() => setSelectedReport(isSelected ? null : report.type)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isSelected
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : `${colors.button} text-white`
                      }`}
                    >
                      {isSelected ? 'Cancel' : 'Select Period'}
                    </button>
                  )}
                  <button
                    onClick={() => handleExportExcel(report.type)}
                    disabled={loading || (report.requiresDate && !isSelected && selectedReport !== report.type)}
                    className={`flex-1 px-4 py-2 ${colors.button} text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    {loading ? '⏳ Exporting...' : '📥 Export'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">About Report Exports</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• All reports are exported in <strong>Excel format (.xlsx)</strong> with professional formatting</li>
              <li>• Reports include color-coded headers, borders, and organized data structures</li>
              <li>• Each export contains a summary sheet with key statistics</li>
              <li>• Files are named with the current date for easy organization</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
