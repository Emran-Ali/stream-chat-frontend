// composables/useMessageClient.ts (rename file to match function)
import { ref, watch, onMounted, computed, onUnmounted, nextTick } from 'vue'
import { StreamChat } from 'stream-chat'
import { useAuthStore } from '@/store/auth-store'

export function useMessageClient() {
  const isConnecting = ref(true)
  const error = ref('')
  const authStore = useAuthStore()

  const apiKey = import.meta.env.VITE_STREAM_API_KEY

  // Use auth store for reactive data instead of localStorage directly
  const streamToken = computed(() => localStorage.getItem('stream_token'))
  const streamUserId = computed(() => authStore.streamUserId)
  const isAuthenticated = computed(() => authStore.isAuthenticated)

  // Create a single client instance
  const client = ref<StreamChat | null>(null)

  // Connection function
  const connectToStreamChat = async () => {
    try {
      isConnecting.value = true
      error.value = ''

      // Validate environment
      if (!apiKey) {
        throw new Error('Stream API key not found in environment variables')
      }

      // Wait for auth store to be initialized
      if (!isAuthenticated.value) {
        throw new Error('User not authenticated')
      }

      if (!streamUserId.value) {
        throw new Error('No stream user ID found')
      }

      if (!streamToken.value) {
        throw new Error('No stream token found')
      }

      // Check if already connected with same user
      if (client.value?.user?.id === streamUserId.value) {
        console.log('Client already connected with same user')
        isConnecting.value = false
        return
      }

      // Disconnect existing connection if any
      if (client.value?.user) {
        console.log('Disconnecting existing connection...')
        await client.value.disconnectUser()
      }

      // Create new client if needed
      if (!client.value) {
        client.value = new StreamChat(apiKey)
      }

      console.log('Connecting to Stream Chat:', {
        userId: streamUserId.value,
        hasToken: !!streamToken.value,
      })

      // Connect user
      await client.value.connectUser(
        {
          id: streamUserId.value,
        },
        streamToken.value,
      )

      console.log('✅ Successfully connected to Stream Chat')
    } catch (err: any) {
      console.error('❌ Stream Chat connection error:', err)

      if (err?.message?.includes('token is expired')) {
        error.value = 'Session expired. Please log in again.'
      } else if (err?.message?.includes('maximum number of connections')) {
        error.value = 'Too many connections. Please refresh the page.'
      } else if (err?.message?.includes('not authenticated')) {
        error.value = 'Please log in to access chat.'
      } else {
        error.value = err?.message || 'Failed to connect to chat. Please try again.'
      }
    } finally {
      isConnecting.value = false
    }
  }

  // Disconnect function
  const disconnect = async () => {
    if (client.value?.user) {
      console.log('Disconnecting Stream Chat client...')
      try {
        await client.value.disconnectUser()
      } catch (err) {
        console.error('Error disconnecting:', err)
      }
      client.value = null
    }
  }

  onMounted(async () => {
    // Wait for next tick to ensure auth store is initialized
    await nextTick()

    // Only connect if user is authenticated
    if (isAuthenticated.value && streamUserId.value && streamToken.value) {
      await connectToStreamChat()
    } else {
      isConnecting.value = false
      error.value = 'Authentication required'
    }
  })

  onUnmounted(() => {
    disconnect()
  })

  // Watch for authentication changes
  watch(
    [isAuthenticated, streamUserId, streamToken],
    async ([newAuth, newUserId, newToken], [oldAuth, oldUserId, oldToken]) => {
      console.log('Auth state changed:', { newAuth, newUserId: !!newUserId, newToken: !!newToken })

      if (!newAuth || !newUserId || !newToken) {
        // User logged out or lost authentication
        await disconnect()
        error.value = 'Authentication lost'
        return
      }

      if (newAuth && newUserId && newToken && (!oldAuth || newUserId !== oldUserId)) {
        // User logged in or user changed
        await connectToStreamChat()
      }
    },
    { immediate: false },
  )

  // Retry connection function
  const retry = async () => {
    error.value = ''
    await connectToStreamChat()
  }

  return {
    isConnecting,
    error,
    client,
    retry,
    disconnect,
  }
}
