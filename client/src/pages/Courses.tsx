// Courses page component
// Displays course catalog with CRUD operations

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import { fetchCourses, createCourse, updateCourse, deleteCourse } from '../store/slices/courseSlice'
import toast from 'react-hot-toast'
import { Course } from '../types'
import PageLoader from '../components/PageLoader'
import FeedbackBanner from '../components/FeedbackBanner'
import ConfirmDialog from '../components/ConfirmDialog'
import PageState from '../components/PageState'
import api from '../services/api'

const Courses = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { courses, loading, error } = useSelector((state: RootState) => state.courses)
  const { user } = useSelector((state: RootState) => state.auth)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [skillInput, setSkillInput] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [optimisticDeletes, setOptimisticDeletes] = useState<Set<string>>(new Set())
  const [dismissedError, setDismissedError] = useState(false)
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDeliveryMode, setFilterDeliveryMode] = useState<string>('all')
  const [filterExperienceLevel, setFilterExperienceLevel] = useState<string>('all')
  
  // View mode state
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  
  const [formData, setFormData] = useState<Partial<Course>>({
    title: '',
    description: '',
    department: '',
    delivery_mode: 'Online',
    duration: 0,
    max_participants: 20,
    required_skills: [],
    target_experience_level: 'Intermediate',
    prerequisites: [],
    isActive: true,
  })

  // RBAC permissions
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const isViewer = user?.role === 'Viewer'
  const canAdd = isAdmin || isManager
  const canEdit = isAdmin || isManager
  const canDelete = isAdmin

  // Helper functions for better UX
  const addSkill = () => {
    if (skillInput.trim()) {
      setFormData({
        ...formData,
        required_skills: [...(formData.required_skills || []), skillInput.trim()]
      })
      setSkillInput('')
    }
  }

  const removeSkill = (index: number) => {
    setFormData({
      ...formData,
      required_skills: formData.required_skills?.filter((_, i) => i !== index)
    })
  }

  const togglePrerequisite = (courseId: string) => {
    const currentPrereqs = formData.prerequisites || []
    if (currentPrereqs.includes(courseId)) {
      setFormData({
        ...formData,
        prerequisites: currentPrereqs.filter(id => id !== courseId)
      })
    } else {
      setFormData({
        ...formData,
        prerequisites: [...currentPrereqs, courseId]
      })
    }
  }

  useEffect(() => {
    dispatch(fetchCourses())
  }, [dispatch])

  const handleEdit = (course: Course) => {
    setEditingCourse(course)
    setFormData({
      ...course,
      prerequisites: course.prerequisites || [],
      required_skills: course.required_skills || [],
      max_participants: course.max_participants || 20,
      target_experience_level: course.target_experience_level || 'Intermediate'
    })
    setSkillInput('')
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeletingCourseId(id)
    setDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deletingCourseId) return

    setDeleteLoading(true)
    setOptimisticDeletes((prev) => new Set(prev).add(deletingCourseId))

    try {
      await dispatch(deleteCourse(deletingCourseId)).unwrap()
      toast.success('Course deleted successfully')
    } catch (err: any) {
      setOptimisticDeletes((prev) => {
        const next = new Set(prev)
        next.delete(deletingCourseId)
        return next
      })
      toast.error(err?.message || 'Failed to delete course')
    } finally {
      setDeleteLoading(false)
      setDeleteModal(false)
      setDeletingCourseId(null)
    }
  }

  // Filter courses based on search and filters
  const visibleCourses = courses.filter((course) => {
    // Filter out optimistically deleted courses
    if (optimisticDeletes.has(course._id!)) return false
    
    // Search filter (by title or description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const title = course.title?.toLowerCase() || ''
      const description = course.description?.toLowerCase() || ''
      if (!title.includes(query) && !description.includes(query)) {
        return false
      }
    }
    
    // Department filter
    if (filterDepartment !== 'all' && course.department !== filterDepartment) {
      return false
    }
    
    // Status filter
    if (filterStatus !== 'all') {
      const isActive = filterStatus === 'active'
      if (course.isActive !== isActive) {
        return false
      }
    }
    
    // Delivery mode filter
    if (filterDeliveryMode !== 'all' && course.delivery_mode !== filterDeliveryMode) {
      return false
    }
    
    // Experience level filter
    if (filterExperienceLevel !== 'all' && course.target_experience_level !== filterExperienceLevel) {
      return false
    }
    
    return true
  })
  
  // Get unique departments for filter dropdown
  const uniqueDepartments = Array.from(new Set(courses.map(c => c.department).filter(Boolean))).sort()
  
  // Calculate statistics
  const stats = {
    total: courses.length,
    active: courses.filter(c => c.isActive && !optimisticDeletes.has(c._id!)).length,
    inactive: courses.filter(c => !c.isActive && !optimisticDeletes.has(c._id!)).length,
    departments: uniqueDepartments.length,
    avgDuration: courses.length > 0
      ? (courses.reduce((sum, c) => sum + (c.duration || 0), 0) / courses.length).toFixed(0)
      : '0',
    totalSkills: courses.reduce((sum, c) => sum + (c.required_skills?.length || 0), 0),
  }

  const handleRetry = () => {
    setDismissedError(false)
    dispatch(fetchCourses())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCourse) {
      const result = await dispatch(updateCourse({ id: editingCourse._id!, data: formData }))
      if (updateCourse.fulfilled.match(result)) {
        toast.success('Course updated successfully')
        setIsModalOpen(false)
        setEditingCourse(null)
        setSkillInput('')
        dispatch(fetchCourses()) // Refresh courses list
      } else {
        toast.error('Failed to update course')
      }
    } else {
      const result = await dispatch(createCourse(formData))
      if (createCourse.fulfilled.match(result)) {
        toast.success('Course created successfully')
        setIsModalOpen(false)
        setSkillInput('')
        setFormData({
          title: '',
          description: '',
          department: '',
          delivery_mode: 'Online',
          duration: 0,
          max_participants: 20,
          required_skills: [],
          target_experience_level: 'Intermediate',
          prerequisites: [],
          isActive: true,
        })
        dispatch(fetchCourses()) // Refresh courses list
      } else {
        toast.error('Failed to create course')
      }
    }
  }
  
  // Excel Export Handler
  const handleExportExcel = async () => {
    try {
      const response = await api.get('/reports/export/csv?type=courses', {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      const contentType = response.headers['content-type']
      const isExcel = contentType?.includes('spreadsheetml')
      const extension = isExcel ? 'xlsx' : 'csv'
      link.setAttribute('download', `courses-${Date.now()}.${extension}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success(`Courses exported to ${isExcel ? 'Excel' : 'CSV'}`)
    } catch (error) {
      toast.error('Failed to export courses')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Course Catalog</h1>
          <p className="text-gray-600 mt-1">Manage your training courses and programs</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            📤 Export Excel
          </button>
          {canAdd && (
            <button
              onClick={() => {
                setEditingCourse(null)
                setSkillInput('')
                setFormData({
                  title: '',
                  description: '',
                  department: '',
                  delivery_mode: 'Online',
                  duration: 0,
                  max_participants: 20,
                  required_skills: [],
                  target_experience_level: 'Intermediate',
                  prerequisites: [],
                  isActive: true,
                })
                setIsModalOpen(true)
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              Add Course
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {courses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Courses</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Inactive</div>
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Departments</div>
            <div className="text-2xl font-bold text-blue-600">{stats.departments}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Avg Duration</div>
            <div className="text-2xl font-bold text-indigo-600">{stats.avgDuration} hrs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Skills</div>
            <div className="text-2xl font-bold text-purple-600">{stats.totalSkills}</div>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      {courses.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Viewing {visibleCourses.length} of {stats.active} active courses
            </div>
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
          </div>
        </div>
      )}
      
      {/* Search and Filter Section */}
      {courses.length > 0 && (
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search for course by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Departments</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            {/* Delivery Mode Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Mode</label>
              <select
                value={filterDeliveryMode}
                onChange={(e) => setFilterDeliveryMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="Online">Online</option>
                <option value="In-Person">In-Person</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            
            {/* Experience Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
              <select
                value={filterExperienceLevel}
                onChange={(e) => setFilterExperienceLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
          </div>
          
          {/* Results Count and Clear Filters */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {visibleCourses.length} course{visibleCourses.length !== 1 ? 's' : ''} found in results
            </p>
            {(searchQuery || filterDepartment !== 'all' || filterStatus !== 'all' || filterDeliveryMode !== 'all' || filterExperienceLevel !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterDepartment('all')
                  setFilterStatus('all')
                  setFilterDeliveryMode('all')
                  setFilterExperienceLevel('all')
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      )}

      {error && !dismissedError && (
        <div className="mb-4">
          <FeedbackBanner
            type="error"
            title="Unable to load courses"
            message={error}
            actionLabel="Retry"
            onAction={handleRetry}
            onDismiss={() => setDismissedError(true)}
          />
        </div>
      )}

      {loading && !courses.length ? (
        <PageLoader label="Loading courses..." fullHeight />
      ) : !visibleCourses.length ? (
        <PageState
          title={searchQuery || filterDepartment !== 'all' || filterStatus !== 'all' || filterDeliveryMode !== 'all' || filterExperienceLevel !== 'all' ? "No Results Found" : "No courses available"}
          message={searchQuery || filterDepartment !== 'all' || filterStatus !== 'all' || filterDeliveryMode !== 'all' || filterExperienceLevel !== 'all' ? `No courses found matching the specified criteria. Try adjusting the filters.` : "Create your first training course to populate the catalog and enable recommendation workflows."}
          actionLabel={searchQuery || filterDepartment !== 'all' || filterStatus !== 'all' || filterDeliveryMode !== 'all' || filterExperienceLevel !== 'all' ? undefined : (canAdd ? 'Add Course' : undefined)}
          onAction={
            canAdd
              ? () => {
                  setEditingCourse(null)
                  setSkillInput('')
                  setFormData({
                    title: '',
                    description: '',
                    department: '',
                    delivery_mode: 'Online',
                    duration: 0,
                    max_participants: 20,
                    required_skills: [],
                    target_experience_level: 'Intermediate',
                    prerequisites: [],
                    isActive: true,
                  })
                  setIsModalOpen(true)
                }
              : undefined
          }
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          }
        />
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleCourses.map((course) => (
            <div key={course._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-green-100 mt-1">{course.department}</p>
                  </div>
                  <div className="ml-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      course.isActive ? 'bg-white text-green-600' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {course.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {course.description || 'No description provided'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Duration</div>
                    <div className="font-semibold text-gray-900">{course.duration} hrs</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Mode</div>
                    <div className="font-semibold text-gray-900">{course.delivery_mode}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Level</div>
                    <div className="font-semibold text-gray-900">{course.target_experience_level}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Max Students</div>
                    <div className="font-semibold text-gray-900">{course.max_participants || 20}</div>
                  </div>
                </div>

                {course.required_skills && course.required_skills.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Required Skills ({course.required_skills.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {course.required_skills.slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {skill}
                        </span>
                      ))}
                      {course.required_skills.length > 3 && (
                        <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">
                          +{course.required_skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-gray-50 flex gap-2">
                {canEdit && (
                  <button
                    onClick={() => handleEdit(course)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(course._id!)}
                    className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                )}
                {isViewer && (
                  <span className="flex-1 text-center text-gray-400 text-sm py-2">View Only</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
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
                {visibleCourses.map((course) => (
                  <tr key={course._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{course.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{course.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.duration} hrs
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.delivery_mode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.target_experience_level}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        course.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {course.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(course)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(course._id!)}
                            className="text-red-600 hover:text-red-900 font-medium"
                          >
                            Delete
                          </button>
                        )}
                        {isViewer && (
                          <span className="text-gray-400">View Only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteModal}
        title="Delete Course"
        description="Deleting this course removes it from recommendations and training plans."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
        onCancel={() => {
          setDeleteModal(false)
          setDeletingCourseId(null)
        }}
        onConfirm={confirmDelete}
      />

      {/* Simplified Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl animate-slideUp">
            {/* Simple Header - Fixed */}
            <div className="px-6 py-4 border-b flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCourse ? 'Edit Course' : 'Add New Course'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                    {/* Basic Fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Course Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Advanced Python Programming"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of the course"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder="IT, HR, Finance"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Delivery Mode <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.delivery_mode}
                          onChange={(e) =>
                            setFormData({ ...formData, delivery_mode: e.target.value as 'Online' | 'In-Person' | 'Hybrid' })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Online">Online</option>
                          <option value="In-Person">In-Person</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (hours) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="500"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Participants
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.max_participants || 20}
                          onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 20 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Experience Level
                        </label>
                        <select
                          value={formData.target_experience_level || 'Intermediate'}
                          onChange={(e) => setFormData({ ...formData, target_experience_level: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Beginner">Beginner</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Advanced">Advanced</option>
                          <option value="Expert">Expert</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-1 focus:ring-blue-500"
                      />
                      <label htmlFor="isActive" className="text-sm text-gray-700">
                        Active (available for enrollment)
                      </label>
                    </div>

                    {/* Divider */}
                    <div className="border-t pt-6"></div>

                    {/* Prerequisites */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prerequisites (optional)
                      </label>
                      <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1 bg-gray-50">
                        {courses
                          .filter(c => c._id !== editingCourse?._id)
                          .map(course => (
                            <label
                              key={course._id}
                              className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={(formData.prerequisites || []).includes(course._id!)}
                                onChange={() => togglePrerequisite(course._id!)}
                                className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{course.title}</span>
                            </label>
                          ))}
                        {courses.filter(c => c._id !== editingCourse?._id).length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-2">No other courses available</p>
                        )}
                      </div>
                      {(formData.prerequisites || []).length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.prerequisites!.length} course(s) selected
                        </p>
                      )}
                    </div>

                    {/* Required Skills */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Required Skills (optional)
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addSkill()
                            }
                          }}
                          placeholder="Type skill and press Enter"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={addSkill}
                          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                          Add
                        </button>
                      </div>

                      {(formData.required_skills || []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {formData.required_skills!.map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => removeSkill(index)}
                                className="hover:text-gray-900"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                </div>
              </div>

              {/* Simple Footer - Fixed */}
              <div className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingCourse(null)
                    setSkillInput('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Courses

