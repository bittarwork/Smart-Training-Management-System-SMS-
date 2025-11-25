// API service layer using Axios
// Handles HTTP requests and authentication token management

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { logout, setSession } from '../store/slices/authSlice'
import type { AppDispatch } from '../store/store'

let storeDispatch: AppDispatch | null = null

export const registerStoreDispatch = (dispatch: AppDispatch) => {
  storeDispatch = dispatch
}

const ensureDispatch = () => {
  if (!storeDispatch) {
    throw new Error('Store dispatch not registered in api.ts')
  }
  return storeDispatch
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<string | null> | null = null

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        return null
      }
      try {
        const response = await axios.post<{
          success: boolean
          token: string
          refreshToken: string
          expiresIn: number
          user?: any
        }>('/api/auth/refresh', { refreshToken })

        if (response.data.success && response.data.token) {
          const expiresAt = Date.now() + (response.data.expiresIn || 1800) * 1000
          localStorage.setItem('token', response.data.token)
          localStorage.setItem('tokenExpiry', expiresAt.toString())
          if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken)
          }
          if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user))
          }
          ensureDispatch()(
            setSession({
              token: response.data.token,
              refreshToken: response.data.refreshToken,
              tokenExpiry: expiresAt,
            })
          )
          return response.data.token
        }
        return null
      } catch (error) {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('tokenExpiry')
        localStorage.removeItem('user')
        ensureDispatch()(logout())
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors and refresh logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const message = (error.response?.data as any)?.message

    if (
      error.response?.status === 401 &&
      message === 'Token expired' &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newToken}`,
        }
        return api(originalRequest)
      }
    }

    if (error.response?.status === 401) {
      ensureDispatch()(logout())
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api

