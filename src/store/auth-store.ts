// src/store/auth-store.ts
import { defineStore } from 'pinia'
import { $axios } from '@/plugins/axios' // Use the axios instance, not the plugin
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // Reactive state
  const isAuthenticated = ref(false)
  const user = ref(null)
  const streamUserId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref(null)

  // Computed getters
  const getUser = computed(() => user.value)
  const getStreamUserId = computed(() => streamUserId.value)
  const isLoading = computed(() => loading.value)
  const getError = computed(() => error.value)

  // Initialize auth state from localStorage
  function initializeAuth() {
    const token = localStorage.getItem('access_token')
    const streamToken = localStorage.getItem('stream_token')

    if (token && streamToken) {
      isAuthenticated.value = true
      getCurrentUser()
    }
  }

  // Set tokens in localStorage and update state
  function setTokens(accessToken: string, streamToken: string) {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('stream_token', streamToken)
    isAuthenticated.value = true
  }

  // Clear tokens and reset state
  function clearTokens() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('stream_token')
    isAuthenticated.value = false
    user.value = null
    streamUserId.value = null
    error.value = null
  }

  // Login function
  async function login(email: string, password: string) {
    loading.value = true
    error.value = null

    try {
      const response = await $axios.post('/users/login', {
        email,
        password,
      })

      const accessToken = response.data.access_token
      const streamToken = response.data.stream_token
      const userData = await getCurrentUser()

      if (accessToken && streamToken) {
        setTokens(accessToken, streamToken)

        await getCurrentUser()

        return { success: true, user: userData }
      } else {
        throw new Error('No access token in response')
      }
    } catch (err: any) {
      console.error('Login failed:', err)
      error.value = err.response?.data?.message || err.message || 'Login failed'
      clearTokens()
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Logout function
  async function logout() {
    loading.value = true

    try {
      // Optional: Make API call to logout endpoint
      // await $axios.post('/auth/logout')

      clearTokens()
      return { success: true }
    } catch (err) {
      console.error('Logout error:', err)
      // Clear tokens anyway
      clearTokens()
      return { success: false, error: err?.message }
    } finally {
      loading.value = false
    }
  }

  // Create user function
  async function createUser(userData: {
    name: string
    email: string
    password: string
    image?: string
  }) {
    loading.value = true
    error.value = null

    try {
      const response = await $axios.post('/users', userData)

      const accessToken = response.data?.access_token
      const streamToken = response.data?.stream_token
      const createdUser = response.data?.user || response.data?.authUser

      if (accessToken && streamToken) {
        setTokens(accessToken, streamToken)

        if (createdUser) {
          user.value = createdUser
          streamUserId.value = `user-${createdUser.id}`
        }
      }

      return { success: true, data: response.data, user: createdUser }
    } catch (err: any) {
      console.error('User creation failed:', err)
      error.value = err.response?.data?.message || err.message || 'User creation failed'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Create call function
  async function createCall(callData: { callId: string; teacherId: string; studentId: string }) {
    loading.value = true
    error.value = null

    try {
      const response = await $axios.post('/stream/create-call', callData) // Use relative URL
      return { success: true, data: response.data }
    } catch (err: any) {
      console.error('Create call failed:', err)
      error.value = err.response?.data?.message || err.message || 'Create call failed'
      return { success: false, error: error.value }
    } finally {
      loading.value = false
    }
  }

  // Get current user info (useful for refreshing user data)
  async function getCurrentUser() {
    if (!isAuthenticated.value) return null

    loading.value = true
    try {
      const response = await $axios.get('/users/auth/profile')
      user.value = response.data
      isAuthenticated.value = true
      console.log(`user-${response.data.id}`)
      streamUserId.value = `user-${response.data.id}`

      return response.data
    } catch (err: any) {
      console.error('Get current user failed:', err)
      if (err.response?.status === 401) {
        await logout()
      }
      return null
    } finally {
      loading.value = false
    }
  }

  // Initialize auth on store creation
  initializeAuth()

  return {
    // State
    isAuthenticated,
    user,
    streamUserId,
    loading,
    error,

    // Getters
    getUser,
    getStreamUserId,
    isLoading,
    getError,

    // Actions
    login,
    logout,
    createUser,
    createCall,
    getCurrentUser,
    initializeAuth,
    clearTokens,
  }
})
