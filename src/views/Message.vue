<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useAuthStore } from '@/store/auth-store'
import { useMessageClient } from '@/composables/useMessageClient'
import Chat from '@/components/Message/Chat.vue'

const authStore = useAuthStore()
const { isConnecting, error, client, retry } = useMessageClient()

// Reactive auth state
const isAuthenticated = computed(() => authStore.isAuthenticated)
const streamUserId = computed(() => authStore.streamUserId)

watchEffect(() => {
  console.log('auth values', isAuthenticated.value, streamUserId.value)
  if (!isAuthenticated.value || !streamUserId.value) {
    console.log('Authentication check failed, redirecting to login')
  }
})
if (!isConnecting) {
  console.log('client in if', client)
}
console.log('client', client)
</script>

<template>
  <div class="flex gap-2">
    <div class="border-r"></div>
    <div class="w-[calc(100%-185px)] py-8 px-3">
      <!-- Loading state -->
      <div v-if="isConnecting" class="text-center w-full mx-auto">
        <div class="spinner"></div>
        <p class="mt-2 text-gray-600">Connecting to chat...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-red-500 text-center bg-red-50 p-4 rounded-md">
        <p class="mb-2">{{ error }}</p>
        <div class="flex gap-2 justify-center">
          <button
            class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            @click="retry"
          >
            Retry
          </button>
          <button
            class="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            @click="$router.go(0)"
          >
            Refresh
          </button>
        </div>
      </div>

      <!-- Chat component -->

      <Chat v-else-if="client?.user && streamUserId" />

      <!-- Fallback state -->
      <div v-else class="text-center text-gray-500">
        <pre>client : {{ client }}</pre>
        <p>Unable to initialize chat</p>
        <button
          class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          @click="retry"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
  margin-right: 8px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
