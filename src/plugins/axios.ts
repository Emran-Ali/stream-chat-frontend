// src/plugins/axios.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 10000,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('stream_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// Export the axios instance
export const $axios = apiClient as typeof axios

// Export the plugin for Vue app
export default {
  install(app: any) {
    app.config.globalProperties.$http = apiClient
    app.provide('$http', apiClient)
  },
}
