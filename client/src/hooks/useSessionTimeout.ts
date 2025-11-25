import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { logout, setSession } from '../store/slices/authSlice'

const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000 // 5 minutes

const useSessionTimeout = () => {
  const dispatch = useDispatch()
  const { tokenExpiry, refreshToken } = useSelector((state: RootState) => state.auth)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [warningVisible, setWarningVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const sessionExpiredRef = useRef(false)

  useEffect(() => {
    if (!tokenExpiry) {
      setTimeLeft(null)
      setWarningVisible(false)
      sessionExpiredRef.current = false
      return
    }

    const updateTimer = () => {
      const diff = tokenExpiry - Date.now()
      setTimeLeft(diff)

      if (diff <= 0 && !sessionExpiredRef.current) {
        sessionExpiredRef.current = true
        dispatch(logout())
        window.location.href = '/login'
      } else if (diff > 0 && diff <= SESSION_WARNING_THRESHOLD) {
        setWarningVisible(true)
      } else {
        setWarningVisible(false)
      }
    }

    updateTimer()
    const interval = window.setInterval(updateTimer, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [tokenExpiry, dispatch])

  const refreshSession = async () => {
    if (!refreshToken || refreshing) return

    setRefreshing(true)
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

        dispatch(
          setSession({
            token: response.data.token,
            refreshToken: response.data.refreshToken,
            tokenExpiry: expiresAt,
          })
        )
        setWarningVisible(false)
        sessionExpiredRef.current = false
      }
    } catch (error) {
      dispatch(logout())
      window.location.href = '/login'
    } finally {
      setRefreshing(false)
    }
  }

  return {
    warningVisible,
    timeLeft,
    refreshSession,
    refreshing,
  }
}

export default useSessionTimeout

