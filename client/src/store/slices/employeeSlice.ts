// Employee Redux slice
// Manages employee data state and actions

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Employee, ApiResponse } from '../../types'
import api from '../../services/api'

interface EmployeeState {
  employees: Employee[]
  selectedEmployee: Employee | null
  loading: boolean
  error: string | null
}

const initialState: EmployeeState = {
  employees: [],
  selectedEmployee: null,
  loading: false,
  error: null,
}

// Async thunks
export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<Employee[]>>('/employees')
      return response.data.data || []
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employees')
    }
  }
)

export const fetchEmployee = createAsyncThunk(
  'employees/fetchEmployee',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<Employee>>(`/employees/${id}`)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee')
    }
  }
)

export const createEmployee = createAsyncThunk(
  'employees/createEmployee',
  async (employee: Partial<Employee>, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<Employee>>('/employees', employee)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create employee')
    }
  }
)

export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, data }: { id: string; data: Partial<Employee> }, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<Employee>>(`/employees/${id}`, data)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update employee')
    }
  }
)

export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/employees/${id}`)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete employee')
    }
  }
)

const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    setSelectedEmployee: (state, action: PayloadAction<Employee | null>) => {
      state.selectedEmployee = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch employees
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false
        state.employees = action.payload
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch single employee
      .addCase(fetchEmployee.fulfilled, (state, action) => {
        state.selectedEmployee = action.payload || null
      })
      // Create employee
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.employees.push(action.payload)
      })
      // Update employee
      .addCase(updateEmployee.fulfilled, (state, action) => {
        const index = state.employees.findIndex(emp => emp._id === action.payload._id)
        if (index !== -1) {
          state.employees[index] = action.payload
        }
        if (state.selectedEmployee?._id === action.payload._id) {
          state.selectedEmployee = action.payload
        }
      })
      // Delete employee
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.employees = state.employees.filter(emp => emp._id !== action.payload)
        if (state.selectedEmployee?._id === action.payload) {
          state.selectedEmployee = null
        }
      })
  },
})

export const { setSelectedEmployee, clearError } = employeeSlice.actions
export default employeeSlice.reducer

