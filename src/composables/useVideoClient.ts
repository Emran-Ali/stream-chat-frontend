// composables/useVideoClient.ts
import { ref, inject, watch, type Ref } from 'vue'
import { StreamVideoClient, type User } from '@stream-io/video-client'

export function useVideoClient(apiKey?: string, token?: string, user?: User) {
  // Case 1: act as injector
  if (!apiKey || !token || !user) {
    const injected = inject<Ref<StreamVideoClient | null>>('streamClient')
    const isReady = ref(false)

    if (!injected) {
      throw new Error('streamClient not provided via provide/inject')
    }

    watch(
      () => injected.value,
      (newVal) => {
        if (newVal) isReady.value = true
      },
      { immediate: true },
    )

    return {
      client: injected,
      isReady,
    }
  }

  // Case 2: create and manage the client
  const client = ref<StreamVideoClient | null>(null)

  const initialize = async () => {
    try {
      client.value = new StreamVideoClient({
        apiKey,
        token,
        user,
        options: { logLevel: 'info' },
      })
    } catch (error) {
      console.error('Failed to initialize Stream client:', error)
    }
  }

  const disconnect = async () => {
    await client.value?.disconnectUser()
  }

  return {
    client,
    initialize,
    disconnect,
  }
}
