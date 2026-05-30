import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { LanguageProvider } from './LanguageContext'
import axios from 'axios'

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
if (apiUrl) {
  axios.defaults.baseURL = apiUrl
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
)
