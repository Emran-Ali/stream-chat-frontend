<script setup lang="ts">
import { provide, onMounted, onUnmounted } from 'vue'
import { useVideoClient } from '@/composables/useVideoClient.ts'
import { useRouter } from 'vue-router'
import type { User } from '@stream-io/video-client'

const apiKey = import.meta.env.VITE_STREAM_API_KEY
const token = localStorage.getItem('streamToken') ?? ''
const userId = localStorage.getItem('user') ?? ''
const user: User = { id: userId }

const router = useRouter()

if (!apiKey || !token || !userId) {
  router.push('/login')
}

const { client, initialize, disconnect } = useVideoClient(apiKey, token, user)

provide('streamClient', client)

onMounted(() => {
  initialize()
})

onUnmounted(() => {
  disconnect()
})
</script>

<template>
  <div class="call-wrapper">
    <slot :client="client" />
  </div>
</template>
