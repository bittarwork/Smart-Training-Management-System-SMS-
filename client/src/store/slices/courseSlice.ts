// Course Redux slice
// Manages course catalog state and actions

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Course, ApiResponse } from '../../types'
import api from '../../services/api'

interface CourseState {
  courses: Course[]
  selectedCourse: Course | null
  loading: boolean
  error: string | null
}

const initialState: CourseState = {
  courses: [],
  selectedCourse: null,
  loading: false,
  error: null,
}

// Async thunks
export const fetchCourses = createAsyncThunk(
  'courses/fetchCourses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<Course[]>>('/courses')
      return response.data.data || []
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch courses')
    }
  }
)

export const fetchCourse = createAsyncThunk(
  'courses/fetchCourse',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get<ApiResponse<Course>>(`/courses/${id}`)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch course')
    }
  }
)

export const createCourse = createAsyncThunk(
  'courses/createCourse',
  async (course: Partial<Course>, { rejectWithValue }) => {
    try {
      const response = await api.post<ApiResponse<Course>>('/courses', course)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create course')
    }
  }
)

export const updateCourse = createAsyncThunk(
  'courses/updateCourse',
  async ({ id, data }: { id: string; data: Partial<Course> }, { rejectWithValue }) => {
    try {
      const response = await api.put<ApiResponse<Course>>(`/courses/${id}`, data)
      return response.data.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update course')
    }
  }
)

export const deleteCourse = createAsyncThunk(
  'courses/deleteCourse',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/courses/${id}`)
      return id
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete course')
    }
  }
)

const courseSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    setSelectedCourse: (state, action: PayloadAction<Course | null>) => {
      state.selectedCourse = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch courses
      .addCase(fetchCourses.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.loading = false
        state.courses = action.payload
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Fetch single course
      .addCase(fetchCourse.fulfilled, (state, action) => {
        state.selectedCourse = action.payload || null
      })
      // Create course
      .addCase(createCourse.fulfilled, (state, action) => {
        state.courses.push(action.payload)
      })
      // Update course
      .addCase(updateCourse.fulfilled, (state, action) => {
        const index = state.courses.findIndex(course => course._id === action.payload._id)
        if (index !== -1) {
          state.courses[index] = action.payload
        }
        if (state.selectedCourse?._id === action.payload._id) {
          state.selectedCourse = action.payload
        }
      })
      // Delete course
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.courses = state.courses.filter(course => course._id !== action.payload)
        if (state.selectedCourse?._id === action.payload) {
          state.selectedCourse = null
        }
      })
  },
})

export const { setSelectedCourse, clearError } = courseSlice.actions
export default courseSlice.reducer

