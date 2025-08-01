<script setup lang="ts">
import type { Channel, MessageResponse } from 'stream-chat'
import { onMounted, onUnmounted, ref, nextTick, watch, computed } from 'vue'
import { useAuthStore } from '@/store/auth-store.ts'

interface Props {
  channel: Channel
}

const props = defineProps<Props>()

const authStore = useAuthStore()
const userId = computed(() => authStore.streamUserId)

// State
const messages = ref<MessageResponse[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)
const hasMoreMessages = ref(true)
const loadingMore = ref(false)
const mediaRef = ref<HTMLMediaElement[]>([])

// Constants
const MESSAGES_LIMIT = 30

const fetchMessages = async (options: { limit?: number; id_lt?: string } = {}) => {
  try {
    const response = await props.channel.query({
      messages: {
        limit: options.limit || MESSAGES_LIMIT,
        ...(options.id_lt && { id_lt: options.id_lt }),
      },
    })

    return response.messages || []
  } catch (err) {
    console.error('Error fetching messages:', err)
    error.value = 'Failed to load messages'
    return []
  }
}

const loadInitialMessages = async () => {
  loading.value = true
  error.value = null

  const fetchedMessages = await fetchMessages()
  messages.value = fetchedMessages // Reverse to show oldest first
  hasMoreMessages.value = fetchedMessages.length === MESSAGES_LIMIT

  loading.value = false

  await nextTick()
  setTimeout(() => scrollToBottom(), 0)
}

const loadMoreMessages = async () => {
  if (loadingMore.value || !hasMoreMessages.value || messages.value.length === 0) return

  loadingMore.value = true
  const oldestMessage = messages.value[0]

  const fetchedMessages = await fetchMessages({
    limit: MESSAGES_LIMIT,
    id_lt: oldestMessage.id,
  })

  if (fetchedMessages.length > 0) {
    const scrollHeight = messagesContainer.value?.scrollHeight || 0
    messages.value = [...fetchedMessages, ...messages.value]
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = scrollHeight
    }
    hasMoreMessages.value = fetchedMessages.length === MESSAGES_LIMIT
  } else {
    hasMoreMessages.value = false
  }
  loadingMore.value = false
}

const scrollToBottom = (behavior: 'auto' | 'smooth' = 'auto') => {
  const el = messagesContainer.value
  if (el) {
    el.scrollTo({ top: el.scrollHeight, behavior })
  }
}

const handleScroll = () => {
  if (!messagesContainer.value) return
  if (messagesContainer.value.scrollTop === 0 && hasMoreMessages.value) {
    loadMoreMessages()
  }
}

const handleNewMessage = (event: any) => {
  if (event.cid !== props.channel.cid) return
  messages.value.push(event.message)
  nextTick(() => {
    // If message has image(s), wait for the image(s) to finish loading
    const images = messagesContainer.value?.querySelectorAll('img')
    if (images && images.length > 0) {
      let loadedCount = 0
      images.forEach((img) => {
        if (img.complete) loadedCount++
        else img.addEventListener('load', checkLoaded, { once: true })
      })
      function checkLoaded() {
        loadedCount++
        if (loadedCount === images!.length) {
          scrollToBottom('smooth')
        }
      }
      if (loadedCount === images.length) scrollToBottom('smooth')
    } else {
      scrollToBottom('smooth')
    }
  })
}

const handleMessageUpdated = (event: any) => {
  if (event.cid === props.channel.cid) {
    const messageIndex = messages.value.findIndex((m) => m.id === event.message.id)
    if (messageIndex > -1) {
      messages.value[messageIndex] = event.message
    }
  }
}

const handleMessageDeleted = (event: any) => {
  if (event.cid === props.channel.cid) {
    messages.value = messages.value.filter((m) => m.id !== event.message.id)
  }
}

// Utility functions
const formatTimestamp = (dateString: string | Date | undefined) => {
  if (!dateString) return ''
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString

  const now = new Date()
  const messageDate = new Date(date)
  const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 24) {
    return messageDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  } else {
    return messageDate.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    })
  }
}

const getMessageGrouping = (message: MessageResponse, index: number) => {
  const prevMessage = messages.value[index - 1]
  const nextMessage = messages.value[index + 1]

  const isSameUserAsPrev = prevMessage?.user?.id === message.user?.id
  const isSameUserAsNext = nextMessage?.user?.id === message.user?.id

  // Check if messages are within 5 minutes of each other
  const prevTime = prevMessage?.created_at ? new Date(prevMessage.created_at).getTime() : 0
  const currentTime = message.created_at ? new Date(message.created_at).getTime() : 0
  const isWithin5Min = currentTime - prevTime < 2 * 60 * 1000

  return {
    isFirst: !isSameUserAsPrev || !isWithin5Min,
    isLast: !isSameUserAsNext,
    showAvatar: !isSameUserAsNext || index === messages.value.length - 1,
  }
}

const renderAttachment = (attachment: any) => {
  if (attachment.type === 'image') {
    return {
      type: 'image',
      url: attachment.asset_url || attachment.thumb_url,
      alt: attachment.fallback || 'Image',
    }
  } else if (attachment.type === 'video') {
    return {
      type: 'video',
      url: attachment.asset_url,
      name: attachment.name || attachment.fallback || 'Video File',
      size: attachment.file_size,
    }
  } else if (attachment.type === 'audio') {
    return {
      type: 'audio',
      url: attachment.asset_url,
      name: attachment.name || attachment.fallback || 'Audio File',
      size: attachment.file_size,
    }
  } else if (attachment.type === 'file') {
    return {
      type: 'file',
      url: attachment.asset_url,
      name: attachment.name || attachment.fallback || 'File',
      size: attachment.file_size,
    }
  }
  return null
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  else return (bytes / 1048576).toFixed(1) + ' MB'
}

const handleMediaPlay = (event: Event) => {
  const current = event.target as HTMLMediaElement
  mediaRef.value.forEach((media) => {
    if (media !== current && !media.paused) {
      media.pause()
    }
  })
}

watch(
  () => props.channel.cid,
  async () => {
    await loadInitialMessages()
    scrollToBottom()
  },
)

onMounted(async () => {
  props.channel.on('message.new', handleNewMessage)
  props.channel.on('message.updated', handleMessageUpdated)
  props.channel.on('message.deleted', handleMessageDeleted)

  await loadInitialMessages()
})

onUnmounted(() => {
  props.channel.off('message.new', handleNewMessage)
  props.channel.off('message.updated', handleMessageUpdated)
  props.channel.off('message.deleted', handleMessageDeleted)
})
</script>

<template>
  <div v-if="loadingMore" class="text-center py-2">
    <div class="inline-flex items-center text-sm text-gray-500">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
      Loading more messages...
    </div>
  </div>

  <!-- Messages container -->
  <div
    ref="messagesContainer"
    class="flex-1 overflow-y-auto p-4 space-y-1"
    :class="{ 'opacity-50': loading }"
    @scroll="handleScroll"
  >
    <!-- Initial loading state -->
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"
        ></div>
        <p class="text-gray-500">Loading messages...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center text-red-500 py-8">
      <p>{{ error }}</p>
      <button @click="loadInitialMessages" class="mt-2 text-blue-500 hover:text-blue-700">
        Try again
      </button>
    </div>

    <!-- Empty state -->
    <div v-else-if="!messages.length" class="text-center text-gray-500 py-8">
      No messages yet. Start the conversation!
    </div>

    <template v-else>
      <div
        v-for="(message, index) in messages"
        :key="message.id"
        class="message-wrapper"
        :class="{
          'mb-4': getMessageGrouping(message, index).isLast,
          'mb-1': !getMessageGrouping(message, index).isLast,
        }"
      >
        <!-- Timestamp (shown for first message in group) -->
        <div
          v-if="getMessageGrouping(message, index).isFirst"
          class="text-xs text-gray-400 text-center mb-2 select-none"
        >
          {{ formatTimestamp(message.created_at) }}
        </div>

        <div
          class="flex items-end gap-2 max-w-[80%]"
          :class="message.user!.id === userId ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'"
        >
          <!-- Avatar (only show for last message in group) -->
          <div
            v-if="getMessageGrouping(message, index).showAvatar"
            class="flex-shrink-0 rounded-full overflow-hidden h-8 w-8 bg-gray-300 flex items-center justify-center"
            :class="{
              invisible:
                !getMessageGrouping(message, index).showAvatar && message.user!.id !== userId,
            }"
          >
            <img
              v-if="message.user!.image"
              :src="message.user!.image"
              :alt="message.user!.name || 'User'"
              class="object-cover h-8 w-8"
            />
            <span v-else class="text-gray-600 font-semibold text-sm">
              {{ (message.user!.name || message.user!.id || 'U')[0].toUpperCase() }}
            </span>
          </div>
          <div v-else class="w-8"></div>

          <!-- Message bubble -->
          <div class="flex flex-col max-w-full">
            <!-- User name (only for first message in group from others) -->
            <div
              v-if="getMessageGrouping(message, index).isFirst && message.user!.id !== userId"
              class="text-xs text-gray-500 mb-1 px-3"
            >
              {{ message.user!.name || message.user!.id }}
            </div>

            <div
              class="px-3 py-2 text-sm break-words"
              :class="[
                message.user!.id === userId
                  ? 'bg-black text-white mr-2'
                  : 'bg-white text-black ml-2',
                getMessageGrouping(message, index).isFirst &&
                getMessageGrouping(message, index).isLast
                  ? 'rounded-2xl'
                  : getMessageGrouping(message, index).isFirst
                    ? message.user!.id === userId
                      ? 'rounded-2xl rounded-br-md'
                      : 'rounded-2xl rounded-bl-md'
                    : getMessageGrouping(message, index).isLast
                      ? message.user!.id === userId
                        ? 'rounded-2xl rounded-tr-md'
                        : 'rounded-2xl rounded-tl-md'
                      : message.user!.id === userId
                        ? 'rounded-l-2xl rounded-r-md'
                        : 'rounded-r-2xl rounded-l-md',
              ]"
            >
              <!-- Message text -->
              <div v-if="message.text" class="whitespace-pre-wrap">
                {{ message.text }}
              </div>

              <!-- Attachments -->
              <div
                v-if="message.attachments && message.attachments.length > 0"
                class="mt-1 space-y-2"
              >
                <div
                  v-for="(attachment, attachIndex) in message.attachments"
                  :key="attachIndex"
                  class="attachment"
                >
                  <!-- Image attachment -->
                  <template v-if="renderAttachment(attachment)?.type === 'image'">
                    <img
                      :src="renderAttachment(attachment)?.url"
                      :alt="renderAttachment(attachment)?.alt"
                      class="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      @click="window.open(renderAttachment(attachment)?.url, '_blank')"
                    />
                  </template>
                  <template v-else-if="renderAttachment(attachment)?.type === 'video'">
                    <video
                      ref="mediaRef"
                      :src="renderAttachment(attachment)?.url"
                      class="w-full h-full object-cover rounded-lg"
                      controls
                      preload="metadata"
                      @play="handleMediaPlay($event)"
                    />
                  </template>
                  <template v-else-if="renderAttachment(attachment)?.type === 'audio'">
                    <div class="p-2 bg-gray-100 rounded-lg">
                      <p class="text-sm font-medium text-gray-800 mb-1">
                        {{ renderAttachment(attachment)?.name || 'Audio File' }}
                      </p>
                      <audio
                        ref="mediaRef"
                        :src="renderAttachment(attachment)?.url"
                        controls
                        @play="handleMediaPlay($event)"
                      />
                    </div>
                  </template>

                  <!-- File attachment -->
                  <template v-else-if="renderAttachment(attachment)?.type === 'file'">
                    <div
                      class="flex items-center p-2 bg-blue-100 text-black bg-opacity-20 rounded-lg"
                    >
                      <svg
                        class="w-6 h-6 text-current mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">
                          {{ renderAttachment(attachment)?.name }}
                        </p>
                        <p class="text-xs opacity-75">
                          {{ formatFileSize(renderAttachment(attachment)?.size) }}
                        </p>
                      </div>
                      <a
                        :href="renderAttachment(attachment)?.url"
                        target="_blank"
                        class="ml-2 text-current hover:opacity-75"
                      >
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fill-rule="evenodd"
                            d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </a>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.message-wrapper {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
