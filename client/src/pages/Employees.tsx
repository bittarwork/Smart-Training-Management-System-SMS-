// Employees page component
// Displays employee list with Ag-Grid and CRUD operations

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '../store/store'
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from '../store/slices/employeeSlice'
import { AgGridReact } from 'ag-grid-react'
import { ColDef } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import toast from 'react-hot-toast'
import { Employee, Skill } from '../types'
import api from '../services/api'
import PageLoader from '../components/PageLoader'
import FeedbackBanner from '../components/FeedbackBanner'
import ConfirmDialog from '../components/ConfirmDialog'
import PageState from '../components/PageState'

const Employees = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { employees, loading, error } = useSelector((state: RootState) => state.employees)
  const { user } = useSelector((state: RootState) => state.auth)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [csvModal, setCsvModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [optimisticDeletes, setOptimisticDeletes] = useState<Set<string>>(new Set())
  const [dismissedError, setDismissedError] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  
  // CSV Import states
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<any>(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  // View mode state
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards')
  
  // Form data state
  const [formData, setFormData] = useState<Partial<Employee>>({
    employee_id: '',
    name: '',
    email: '',
    department: { name: '' },
    skills: [],
    experience: { years: 0 },
    location: '',
  })

  // RBAC permissions
  const isAdmin = user?.role === 'Admin'
  const isManager = user?.role === 'Manager'
  const isViewer = user?.role === 'Viewer'
  const canAdd = isAdmin || isManager
  const canEdit = isAdmin || isManager
  const canDelete = isAdmin

  useEffect(() => {
    dispatch(fetchEmployees())
  }, [dispatch])

  // Skills Management Functions
  const addSkill = () => {
    if ((formData.skills?.length || 0) >= 15) {
      toast.error('Maximum 15 skills allowed')
      return
    }
    setFormData({
      ...formData,
      skills: [...(formData.skills || []), { name: '', level: 3, last_used: new Date() }]
    })
  }

  const removeSkill = (index: number) => {
    setFormData({
      ...formData,
      skills: formData.skills?.filter((_, i) => i !== index) || []
    })
  }

  const updateSkill = (index: number, field: keyof Skill, value: any) => {
    const newSkills = [...(formData.skills || [])]
    newSkills[index] = { ...newSkills[index], [field]: value }
    setFormData({ ...formData, skills: newSkills })
  }

  // CSV Import Handler
  const handleCSVUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file')
      return
    }

    const formDataUpload = new FormData()
    formDataUpload.append('file', csvFile)

    try {
      const response = await api.post('/employees/upload', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setImportResult(response.data)
      toast.success(`Imported ${response.data.imported} employees`)
      dispatch(fetchEmployees()) // Refresh table
      
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import CSV')
    }
  }

  // Excel Export Handler (now exports as Excel instead of CSV)
  const handleExportCSV = async () => {
    try {
      const response = await api.get('/reports/export/csv?type=employees', {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      // Check if it's Excel file (based on content type)
      const contentType = response.headers['content-type']
      const isExcel = contentType?.includes('spreadsheetml')
      const extension = isExcel ? 'xlsx' : 'csv'
      link.setAttribute('download', `employees-${Date.now()}.${extension}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success(`Employees exported to ${isExcel ? 'Excel' : 'CSV'}`)
    } catch (error) {
      toast.error('Failed to export file')
    }
  }

  const columnDefs: ColDef[] = [
    { field: 'employee_id', headerName: 'Employee ID', sortable: true, filter: true },
    { field: 'name', headerName: 'Name', sortable: true, filter: true },
    { field: 'email', headerName: 'Email', sortable: true, filter: true },
    { field: 'department.name', headerName: 'Department', sortable: true, filter: true },
    { field: 'experience.years', headerName: 'Experience (Years)', sortable: true, filter: true },
    { field: 'location', headerName: 'Location', sortable: true, filter: true },
    {
      headerName: 'Actions',
      cellRenderer: (params: any) => (
        <div className="flex gap-2">
          {canEdit && (
          <button
            onClick={() => handleEdit(params.data)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit
          </button>
          )}
          {canDelete && (
          <button
            onClick={() => handleDelete(params.data._id)}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
          )}
          {isViewer && (
            <span className="text-gray-400 text-sm">View Only</span>
          )}
        </div>
      ),
    },
  ]

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData(employee)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeletingEmployeeId(id)
    setDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deletingEmployeeId) return

    setDeleteLoading(true)
    setOptimisticDeletes((prev) => new Set(prev).add(deletingEmployeeId))

    try {
      await dispatch(deleteEmployee(deletingEmployeeId)).unwrap()
      toast.success('Employee deleted successfully')
    } catch (err: any) {
      setOptimisticDeletes((prev) => {
        const next = new Set(prev)
        next.delete(deletingEmployeeId)
        return next
      })
      toast.error(err?.message || 'Failed to delete employee')
    } finally {
      setDeleteLoading(false)
      setDeleteModal(false)
      setDeletingEmployeeId(null)
    }
  }

  // Filter employees based on search query and optimistic deletes
  const visibleEmployees = employees.filter((emp) => {
    // Filter out optimistically deleted employees
    if (optimisticDeletes.has(emp._id)) return false
    
    // Filter by search query (case-insensitive search by name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const name = emp.name?.toLowerCase() || ''
      const employeeId = emp.employee_id?.toLowerCase() || ''
      const email = emp.email?.toLowerCase() || ''
      
      return name.includes(query) || employeeId.includes(query) || email.includes(query)
    }
    
    return true
  })

  const handleRetry = () => {
    setDismissedError(false)
    dispatch(fetchEmployees())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingEmployee) {
      const result = await dispatch(updateEmployee({ id: editingEmployee._id!, data: formData }))
      if (updateEmployee.fulfilled.match(result)) {
        toast.success('Employee updated successfully')
        setIsModalOpen(false)
        setEditingEmployee(null)
        // Refresh the employee list to ensure UI is up to date
        dispatch(fetchEmployees())
      }
    } else {
      const result = await dispatch(createEmployee(formData))
      if (createEmployee.fulfilled.match(result)) {
        toast.success('Employee created successfully')
        setIsModalOpen(false)
        setFormData({
          employee_id: '',
          name: '',
          email: '',
          department: { name: '' },
          skills: [],
          experience: { years: 0 },
          location: '',
        })
        // Refresh the employee list to show the new employee
        dispatch(fetchEmployees())
      }
    }
  }

  // Calculate statistics
  const stats = {
    total: employees.length,
    active: employees.filter(e => !optimisticDeletes.has(e._id)).length,
    departments: Array.from(new Set(employees.map(e => e.department?.name).filter(Boolean))).length,
    avgExperience: employees.length > 0
      ? (employees.reduce((sum, e) => sum + (e.experience?.years || 0), 0) / employees.length).toFixed(1)
      : '0',
    totalSkills: employees.reduce((sum, e) => sum + (e.skills?.length || 0), 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees Management</h1>
          <p className="text-gray-600 mt-1">Manage your workforce and employee data</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            📤 Export Excel
          </button>
          {canAdd && (
            <>
              <button
                onClick={() => setCsvModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                📥 Import CSV
              </button>
        <button
          onClick={() => {
            setEditingEmployee(null)
            setFormData({
              employee_id: '',
              name: '',
              email: '',
              department: { name: '' },
              skills: [],
              experience: { years: 0 },
              location: '',
            })
            setIsModalOpen(true)
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          Add Employee
        </button>
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {employees.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Employees</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Active</div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Departments</div>
            <div className="text-2xl font-bold text-blue-600">{stats.departments}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Avg Experience</div>
            <div className="text-2xl font-bold text-indigo-600">{stats.avgExperience} yrs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Skills</div>
            <div className="text-2xl font-bold text-purple-600">{stats.totalSkills}</div>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      {employees.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Viewing {visibleEmployees.length} of {stats.active} employees
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

      {/* Search Bar */}
      {employees.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for employee by name, ID, or email..."
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
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600">
              {visibleEmployees.length} employee{visibleEmployees.length !== 1 ? 's' : ''} found in search results
            </p>
          )}
        </div>
      )}

      {error && !dismissedError && (
        <div className="mb-4">
          <FeedbackBanner
            type="error"
            title="Unable to load employees"
            message={error}
            actionLabel="Retry"
            onAction={handleRetry}
            onDismiss={() => setDismissedError(true)}
          />
        </div>
      )}

      {loading && !employees.length ? (
        <PageLoader label="Loading employees..." fullHeight />
      ) : !visibleEmployees.length ? (
        <PageState
          title={searchQuery ? "No Results Found" : "No employees yet"}
          message={searchQuery ? `No employees found matching "${searchQuery}". Try different search terms.` : "Add your first employee record to unlock analytics, recommendations, and training workflows."}
          actionLabel={searchQuery ? undefined : (canAdd ? 'Add Employee' : undefined)}
          onAction={
            canAdd
              ? () => {
                  setEditingEmployee(null)
                  setFormData({
                    employee_id: '',
                    name: '',
                    email: '',
                    department: { name: '' },
                    skills: [],
                    experience: { years: 0 },
                    location: '',
                  })
                  setIsModalOpen(true)
                }
              : undefined
          }
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          }
        />
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleEmployees.map((employee) => (
            <div key={employee._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{employee.name}</h3>
                    <p className="text-sm text-blue-100">{employee.employee_id}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{employee.experience?.years || 0}</div>
                    <div className="text-xs text-blue-100">Years</div>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Department</div>
                  <div className="font-semibold text-gray-900">{employee.department?.name || 'N/A'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 mb-1">Email</div>
                  <div className="text-sm text-gray-700 truncate">{employee.email}</div>
                </div>

                {employee.location && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Location</div>
                    <div className="text-sm text-gray-700">{employee.location}</div>
                  </div>
                )}

                {employee.skills && employee.skills.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Skills ({employee.skills.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {employee.skills.slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {skill.name}
                        </span>
                      ))}
                      {employee.skills.length > 3 && (
                        <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">
                          +{employee.skills.length - 3} more
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
                    onClick={() => handleEdit(employee)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(employee._id)}
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
        <div className="bg-white rounded-lg shadow">
          <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
            <AgGridReact
              rowData={visibleEmployees}
              columnDefs={columnDefs}
              defaultColDef={{ resizable: true }}
              pagination
              paginationPageSize={20}
              overlayLoadingTemplate="<span class='ag-overlay-loading-center'>Refreshing employees...</span>"
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteModal}
        title="Delete Employee"
        description="This action cannot be undone and will remove related training records."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleteLoading}
        onCancel={() => {
          setDeleteModal(false)
          setDeletingEmployeeId(null)
        }}
        onConfirm={confirmDelete}
      />

      {/* CSV Import Modal */}
      {csvModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Import Employees from CSV</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {importResult && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800">
                  Imported: {importResult.imported}<br/>
                  Skipped: {importResult.skipped}
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleCSVUpload}
                disabled={!csvFile}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload
              </button>
              <button
                onClick={() => {
                  setCsvModal(false)
                  setImportResult(null)
                  setCsvFile(null)
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <p className="font-semibold mb-1">CSV Format Example:</p>
              <code className="text-xs block bg-white p-2 rounded">
                employee_id,name,email,department,skills,experience_years,location
              </code>
              <p className="text-xs text-gray-600 mt-2">
                Skills format: "skill1:level1;skill2:level2" (e.g., "Python:4;Leadership:3")
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Employee Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingEmployee ? 'Edit Employee' : 'Add Employee'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={formData.department?.name || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      department: { ...formData.department, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="50"
                  value={formData.experience?.years || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      experience: { ...formData.experience, years: parseInt(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Skills Management Section */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills (Max 15) - Optional
                </label>
                {(formData.skills || []).map((skill, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Skill name (e.g., Python, Leadership)"
                      value={skill.name}
                      onChange={(e) => updateSkill(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <select
                      value={skill.level}
                      onChange={(e) => updateSkill(index, 'level', parseInt(e.target.value))}
                      className="px-3 py-2 border rounded-lg"
                    >
                      <option value={1}>Level 1 - Beginner</option>
                      <option value={2}>Level 2 - Basic</option>
                      <option value={3}>Level 3 - Intermediate</option>
                      <option value={4}>Level 4 - Advanced</option>
                      <option value={5}>Level 5 - Expert</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeSkill(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSkill}
                  disabled={(formData.skills?.length || 0) >= 15}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
                >
                  + Add Skill
                </button>
                {(formData.skills?.length || 0) >= 15 && (
                  <p className="text-xs text-red-500 mt-1">Maximum skills limit reached</p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                >
                  {editingEmployee ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingEmployee(null)
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees

