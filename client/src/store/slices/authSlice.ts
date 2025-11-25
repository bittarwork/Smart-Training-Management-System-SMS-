// Authentication Redux slice
// Manages user authentication state and actions

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'
import { User, ApiResponse } from '../../types'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  tokenExpiry: number | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

// Load user from localStorage if exists
const loadUserFromStorage = (): User | null => {
  try {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  } catch {
    return null
  }
}

const initialState: AuthState = {
  user: loadUserFromStorage(),
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  tokenExpiry: localStorage.getItem('tokenExpiry') ? parseInt(localStorage.getItem('tokenExpiry') as string, 10) : null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
}

// Async thunk for login
interface LoginSuccessPayload {
  token: string
  refreshToken: string
  tokenExpiry: number
  user: User
}

export const login = createAsyncThunk<LoginSuccessPayload, { username: string; password: string }, { rejectValue: string }>(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post<{ success: boolean; token: string; refreshToken: string; expiresIn: number; user: User }>('/api/auth/login', credentials)
      if (response.data.success && response.data.token) {
        const expiresAt = Date.now() + (response.data.expiresIn || 1800) * 1000
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('refreshToken', response.data.refreshToken)
        localStorage.setItem('tokenExpiry', expiresAt.toString())
        return {
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          tokenExpiry: expiresAt,
          user: response.data.user,
        }
      }
      return rejectWithValue('Login failed')
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Login failed')
    }
  }
)

// Async thunk for getting current user
export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        return rejectWithValue('Not authenticated')
      }
      const response = await axios.get<ApiResponse<User>>('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.data.success && response.data.data) {
        return response.data.data
      }
      return rejectWithValue('Failed to get user')
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get user')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      state.refreshToken = null
      state.tokenExpiry = null
      state.isAuthenticated = false
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('tokenExpiry')
      localStorage.removeItem('user')
    },
    clearError: (state) => {
      state.error = null
    },
    setSession: (state, action: PayloadAction<{ token: string; refreshToken?: string; tokenExpiry: number }>) => {
      state.token = action.payload.token
      state.isAuthenticated = true
      state.tokenExpiry = action.payload.tokenExpiry
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.token = action.payload.token
        state.refreshToken = action.payload.refreshToken
        state.tokenExpiry = action.payload.tokenExpiry
        state.user = action.payload.user
        // Save user to localStorage
        localStorage.setItem('user', JSON.stringify(action.payload.user))
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Get current user
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
        // Save user to localStorage
        localStorage.setItem('user', JSON.stringify(action.payload))
      })
  },
})

export const { logout, clearError, setSession } = authSlice.actions
export default authSlice.reducer

