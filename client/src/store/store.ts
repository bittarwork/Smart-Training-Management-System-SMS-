// Redux store configuration
// Centralized state management using Redux Toolkit

import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import employeeReducer from './slices/employeeSlice'
import courseReducer from './slices/courseSlice'
import recommendationReducer from './slices/recommendationSlice'
import trainingHistoryReducer from './slices/trainingHistorySlice'
import { registerStoreDispatch } from '../services/api'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    employees: employeeReducer,
    courses: courseReducer,
    recommendations: recommendationReducer,
    trainingHistory: trainingHistoryReducer,
  },
})

registerStoreDispatch(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

