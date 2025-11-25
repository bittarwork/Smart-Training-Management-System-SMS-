// Recommendation Redux slice
// Manages ML recommendations state and actions

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Recommendation, ApiResponse } from '../../types'
import api from '../../services/api'

interface RecommendationState {
  recommendations: Recommendation[]
  loading: boolean
  error: string | null
}

const initialState: RecommendationState = {
  recommendations: [],
  loading: false,
  error: null,
}

// Async thunks
export const fetchRecommendations = createAsyncThunk(
  'recommendations/fetchRecommendations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<Recommendation[]>>('/recommendations')
      return response.data.data || []
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch recommendations')
    }
  }
)

export const fetchEmployeeRecommendations = createAsyncThunk(
  'recommendations/fetchEmployeeRecommendations',
  async (employeeId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<Recommendation[]>>(`/recommendations/employee/${employeeId}`)
      return response.data.data || []
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch employee recommendations')
    }
  }
)

export const generateRecommendations = createAsyncThunk(
  'recommendations/generateRecommendations',
  async (employeeId: string, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<Recommendation[]>>(`/recommendations/generate/${employeeId}`)
      return response.data.data || []
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate recommendations')
    }
  }
)

export const generateCustomRecommendations = createAsyncThunk(
  'recommendations/generateCustomRecommendations',
  async ({ employeeId, customData }: { employeeId: string; customData: any }, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<Recommendation[]>>(
        `/recommendations/generate/${employeeId}`,
        { customData }
      )
      return response.data.data || []
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate custom recommendations')
    }
  }
)

export const batchGenerateRecommendations = createAsyncThunk(
  'recommendations/batchGenerateRecommendations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<{ successCount: number; errorCount: number }>>('/recommendations/batch-generate')
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to batch generate recommendations')
    }
  }
)

export const updateRecommendation = createAsyncThunk(
  'recommendations/updateRecommendation',
  async ({ id, data }: { id: string; data: Partial<Recommendation> }, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<Recommendation>>(`/recommendations/${id}`, data)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update recommendation')
    }
  }
)

const recommendationSlice = createSlice({
  name: 'recommendations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch recommendations
      .addCase(fetchRecommendations.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.loading = false
        state.recommendations = action.payload
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch employee recommendations
      .addCase(fetchEmployeeRecommendations.fulfilled, (state, action) => {
        state.recommendations = action.payload
      })
      // Generate recommendations
      .addCase(generateRecommendations.fulfilled, (state, action) => {
        // Replace existing recommendations for this employee
        const employeeId = typeof action.payload[0]?.employee_id === 'object' 
          ? action.payload[0].employee_id._id 
          : action.payload[0]?.employee_id
        state.recommendations = [
          ...state.recommendations.filter(rec => {
            const recEmployeeId = typeof rec.employee_id === 'object' ? rec.employee_id._id : rec.employee_id
            return recEmployeeId !== employeeId
          }),
          ...action.payload
        ]
      })
      // Generate custom recommendations
      .addCase(generateCustomRecommendations.fulfilled, (state, action) => {
        // Replace existing recommendations for this employee
        const employeeId = typeof action.payload[0]?.employee_id === 'object' 
          ? action.payload[0].employee_id._id 
          : action.payload[0]?.employee_id
        state.recommendations = [
          ...state.recommendations.filter(rec => {
            const recEmployeeId = typeof rec.employee_id === 'object' ? rec.employee_id._id : rec.employee_id
            return recEmployeeId !== employeeId
          }),
          ...action.payload
        ]
      })
      // Update recommendation
      .addCase(updateRecommendation.fulfilled, (state, action) => {
        const index = state.recommendations.findIndex(rec => rec._id === action.payload._id)
        if (index !== -1) {
          state.recommendations[index] = action.payload
        }
      })
  },
})

export const { clearError } = recommendationSlice.actions
export default recommendationSlice.reducer

