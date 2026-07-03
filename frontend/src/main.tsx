import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { LanguageProvider } from './LanguageContext'
import { AuthProvider } from './AuthContext'
import axios from 'axios'

const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')
axios.defaults.baseURL = apiBase

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('stock_app_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle 401s
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status 
    const url: string = error?.config?.url ?? '' 
    if (status === 401 && !url.includes('/api/auth/login')) { 
      const hadSession = localStorage.getItem('stock_app_token') !== null 
      localStorage.removeItem('stock_app_token') 
      localStorage.removeItem('stock_app_user') 
      if (hadSession) { 
        window.location.reload() // genuine expired/invalid session 
      } 
    } 
    return Promise.reject(error)
  }
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </AuthProvider>
  </React.StrictMode>,
)
