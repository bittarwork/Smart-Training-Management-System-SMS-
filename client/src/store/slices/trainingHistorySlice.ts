// Training History Redux slice
// Manages training history data state and actions

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import api from '../../services/api'

// Training History interface
export interface TrainingHistory {
  _id: string
  employee_id: {
    _id: string
    name: string
    email: string
    department: {
      name: string
    }
  }
  course_id: {
    _id: string
    title: string
    duration: number
    department: string
  }
  start_date: string
  completion_date?: string
  assessment_score?: number
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Failed'
  progress: number
  feedback?: string
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  count?: number
  total?: number
  page?: number
  pages?: number
  message?: string
}

interface TrainingHistoryState {
  trainingHistory: TrainingHistory[]
  selectedRecord: TrainingHistory | null
  loading: boolean
  error: string | null
  total: number
  page: number
  pages: number
}

const initialState: TrainingHistoryState = {
  trainingHistory: [],
  selectedRecord: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pages: 1,
}

// Async thunks

// Fetch all training history records with optional filters
export const fetchTrainingHistory = createAsyncThunk(
  'trainingHistory/fetchAll',
  async (params: {
    employeeId?: string
    courseId?: string
    status?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  } = {}, { rejectWithValue }) => {
    try {
      const queryString = new URLSearchParams(
        Object.entries(params)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)])
      ).toString()
      
      const response = await api.get<ApiResponse<TrainingHistory[]>>(
        `/training-history${queryString ? `?${queryString}` : ''}`
      )
      
      return {
        data: response.data.data || [],
        total: response.data.total || 0,
        page: response.data.page || 1,
        pages: response.data.pages || 1,
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch training history')
    }
  }
)

// Fetch single training history record
export const fetchTrainingHistoryById = createAsyncThunk(
  'trainingHistory/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<TrainingHistory>>(`/training-history/${id}`)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch training record')
    }
  }
)

// Create new training history record
export const createTrainingHistory = createAsyncThunk(
  'trainingHistory/create',
  async (record: {
    employee_id: string
    course_id: string
    start_date?: string
    completion_date?: string
    assessment_score?: number
    status?: string
    progress?: number
    feedback?: string
  }, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<TrainingHistory>>('/training-history', record)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create training record')
    }
  }
)

// Update training history record
export const updateTrainingHistory = createAsyncThunk(
  'trainingHistory/update',
  async ({ id, data }: { id: string; data: Partial<TrainingHistory> }, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<TrainingHistory>>(`/training-history/${id}`, data)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update training record')
    }
  }
)

// Delete training history record
export const deleteTrainingHistory = createAsyncThunk(
  'trainingHistory/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/training-history/${id}`)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete training record')
    }
  }
)

// Training history slice
const trainingHistorySlice = createSlice({
  name: 'trainingHistory',
  initialState,
  reducers: {
    // Clear selected record
    clearSelectedRecord: (state) => {
      state.selectedRecord = null
    },
    // Clear error
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Fetch all training history
    builder
      .addCase(fetchTrainingHistory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTrainingHistory.fulfilled, (state, action) => {
        state.loading = false
        state.trainingHistory = action.payload.data
        state.total = action.payload.total
        state.page = action.payload.page
        state.pages = action.payload.pages
      })
      .addCase(fetchTrainingHistory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Fetch single record
    builder
      .addCase(fetchTrainingHistoryById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTrainingHistoryById.fulfilled, (state, action) => {
        state.loading = false
        state.selectedRecord = action.payload!
      })
      .addCase(fetchTrainingHistoryById.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Create training record
    builder
      .addCase(createTrainingHistory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createTrainingHistory.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload) {
          state.trainingHistory.unshift(action.payload)
          state.total += 1
        }
      })
      .addCase(createTrainingHistory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Update training record
    builder
      .addCase(updateTrainingHistory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateTrainingHistory.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload) {
          const index = state.trainingHistory.findIndex(
            (record) => record._id === action.payload!._id
          )
          if (index !== -1) {
            state.trainingHistory[index] = action.payload
          }
          if (state.selectedRecord?._id === action.payload._id) {
            state.selectedRecord = action.payload
          }
        }
      })
      .addCase(updateTrainingHistory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Delete training record
    builder
      .addCase(deleteTrainingHistory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteTrainingHistory.fulfilled, (state, action) => {
        state.loading = false
        state.trainingHistory = state.trainingHistory.filter(
          (record) => record._id !== action.payload
        )
        state.total -= 1
        if (state.selectedRecord?._id === action.payload) {
          state.selectedRecord = null
        }
      })
      .addCase(deleteTrainingHistory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const { clearSelectedRecord, clearError } = trainingHistorySlice.actions
export default trainingHistorySlice.reducer

