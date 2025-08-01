<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import type { Channel, Event } from 'stream-chat'
import SearchUser from '@/components/Message/SearchUser.vue'
import ChannelList from '@/components/Message/ChannelList.vue'
import ChatHeader from '@/components/Message/ChatHeader.vue'
import ChatMessage from '@/components/Message/ChatMessage.vue'
import MessageInput from '@/components/Message/MessageInput.vue'
import SharedContent from '@/components/Message/SharedContent.vue'
import { useRoute } from 'vue-router'
import { useMessageClient } from '@/composables/useMessageClient.ts'
import { useAuthStore } from '@/store/auth-store.ts'

const route = useRoute()
const { client, isConnecting } = useMessageClient() // Get client directly from composable
const authStore = useAuthStore()
const streamUserId = computed(() => authStore.streamUserId)

// State
const channels = ref<Channel[]>([])
const selectedChannel = ref<Channel | null>(null)
const loadingChannels = ref(true)
const typingUsers = ref<{ [key: string]: string }>({})
const typingTimeout = ref<{ [key: string]: any }>({})
const selectedUserId = ref<string | null>(null)
const error = ref<string | null>(null)
const unreadChannels = ref<boolean>(false)

// Computed
const typingText = computed(() => {
  const userIds = Object.keys(typingUsers.value).filter((id) => id !== streamUserId.value)

  if (userIds.length === 0) return ''
  if (userIds.length === 1) return `${typingUsers.value[userIds[0]]} is typing...`
  if (userIds.length === 2)
    return `${typingUsers.value[userIds[0]]} and ${typingUsers.value[userIds[1]]} are typing...`

  return 'Several people are typing...'
})

// Check if client is ready for operations
const isClientReady = computed(() => client.value && client.value.user)

// Channel management
const loadChannels = async () => {
  if (!isClientReady.value) {
    console.warn('Client not ready when trying to load channels')
    return
  }

  try {
    loadingChannels.value = true
    error.value = null

    const filter = { type: 'messaging', members: { $in: [streamUserId.value] } }
    if (unreadChannels.value) {
      filter.has_unread = true
    }
    const sort = [{ last_message_at: -1 }]
    const options = { watch: true, state: true, presence: true }

    const response = await client.value.queryChannels(filter, sort, options)
    channels.value = response

    // Select the first channel if available and no channel is selected
    if (response.length > 0 && !selectedChannel.value) {
      await selectChannel(response[0])
    }
  } catch (err) {
    console.error('Error loading channels:', err)
    error.value = 'Failed to load channels'
  } finally {
    loadingChannels.value = false
  }
}

const selectChannel = async (channel: Channel) => {
  if (selectedChannel.value?.cid === channel.cid) return

  try {
    // Clear previous channel state
    typingUsers.value = {}
    clearAllTypingTimeouts()

    selectedChannel.value = channel
    await channel.watch()
    await channel.markRead()

    // Scroll to bottom after channel selection
    await nextTick()
  } catch (err) {
    console.error('Error selecting channel:', err)
    error.value = 'Failed to select channel'
  }
}

// User management
const handleUserSelected = async (user: any) => {
  if (!isClientReady.value) return

  try {
    const filter = {
      type: 'messaging',
      members: { $eq: [streamUserId.value, user.id] },
    }

    const existingChannels = await client.value.queryChannels(filter, {}, {})
    let channel

    if (existingChannels.length === 0) {
      channel = client.value.channel('messaging', {
        members: [streamUserId.value, user.id],
        name: user.name || user.id,
      })
      await channel.create()
    } else {
      channel = existingChannels[0]
    }

    await selectChannel(channel)
    await loadChannels()
  } catch (err) {
    console.error('Error creating or finding channel:', err)
    error.value = 'Failed to create or find channel'
  }
}

// Message handling
const handleSendMessage = async (payload: { text: string; files: File[] }) => {
  if (!selectedChannel.value) return

  try {
    const messageData: any = {
      text: payload.text,
    }

    // Handle multiple file attachments with progress tracking
    if (payload.files && payload.files.length > 0) {
      const attachments = []
      const totalFiles = payload.files.length
      let uploadedFiles = 0

      // Process each file sequentially
      for (const file of payload.files) {
        let type = 'file'

        // Determine file type
        if (file.type.startsWith('image/')) {
          type = 'image'
        } else if (file.type.startsWith('video/')) {
          type = 'video'
        } else if (file.type.startsWith('audio/')) {
          type = 'audio'
        }

        try {
          // Update progress (you can emit this or update a reactive variable)
          console.log(`Uploading file ${uploadedFiles + 1} of ${totalFiles}: ${file.name}`)

          let fileResponse

          // Upload file based on type
          if (type === 'image') {
            fileResponse = await selectedChannel.value.sendImage(file)
          } else {
            fileResponse = await selectedChannel.value.sendFile(file)
          }

          // Add to attachments array
          attachments.push({
            type: type,
            asset_url: fileResponse.file,
            thumb_url: fileResponse.file,
            name: file.name,
            file_size: file.size,
            mime_type: file.type,
          })

          uploadedFiles++
          console.log(`Successfully uploaded: ${file.name} (${uploadedFiles}/${totalFiles})`)
        } catch (fileError) {
          console.error(`Error uploading file ${file.name}:`, fileError)
          // Continue with other files
          continue
        }
      }

      // Only add attachments if we successfully uploaded at least one file
      if (attachments.length > 0) {
        messageData.attachments = attachments
      }

      // Show summary
      if (attachments.length !== totalFiles) {
        const failedCount = totalFiles - attachments.length
        console.warn(`${failedCount} of ${totalFiles} files failed to upload`)
      }
    }

    // Send the message with all attachments
    await selectedChannel.value.sendMessage(messageData)
    console.log('Message sent successfully with attachments')
  } catch (err) {
    console.error('Error sending message:', err)
    error.value = 'Failed to send message'
  }
}

// Typing indicators
const handleTyping = () => {
  if (!selectedChannel.value) return

  selectedChannel.value.keystroke()
  startTyping()
}

const startTyping = () => {
  if (typingTimeout.value[streamUserId.value]) {
    clearTimeout(typingTimeout.value[streamUserId.value])
  }

  typingTimeout.value[streamUserId.value] = setTimeout(() => {
    stopTyping()
  }, 3000)
}

const stopTyping = () => {
  if (!selectedChannel.value) return

  if (typingTimeout.value[streamUserId.value]) {
    clearTimeout(typingTimeout.value[streamUserId.value])
    delete typingTimeout.value[streamUserId.value]
  }

  selectedChannel.value.stopTyping()
}

const clearAllTypingTimeouts = () => {
  Object.values(typingTimeout.value).forEach((timeout) => clearTimeout(timeout))
  typingTimeout.value = {}
}

// Event handlers
const handleTypingStart = (event: Event) => {
  if (!selectedChannel.value || event.cid !== selectedChannel.value.cid) return

  const user = event.user
  if (user.id !== streamUserId.value) {
    typingUsers.value = {
      ...typingUsers.value,
      [user.id]: user.name || user.id,
    }
  }
}

const handleTypingStop = (event: Event) => {
  if (!selectedChannel.value || event.cid !== selectedChannel.value.cid) return

  const user = event.user
  if (user.id !== streamUserId.value && typingUsers.value[user.id]) {
    const newTypingUsers = { ...typingUsers.value }
    delete newTypingUsers[user.id]
    typingUsers.value = newTypingUsers
  }
}

const handleNewMessage = (event: any) => {
  console.log('New message received:', event.message)
}

const handleConnectionChanged = (event: any) => {
  if (event.online === false) {
    error.value = 'Connection lost'
  } else if (event.online === true && error.value === 'Connection lost') {
    error.value = null
  }
}

const handleQueryUsers = async () => {
  const userId = route.query.streamUser
  if (userId) {
    await handleUserSelected({ id: userId })
  }
}

// Watch for unread channels toggle
watch(
  () => unreadChannels.value,
  () => {
    loadChannels()
  },
)

// Watch for client changes
watch(
  () => isClientReady.value,
  (ready) => {
    if (ready) {
      console.log('🎉 Client ready - setting up events and loading channels')
      setupEventListeners()
      loadChannels()
      handleQueryUsers()
    } else {
      console.log('⚠️ Client not ready')
    }
  },
  { immediate: true },
)

// Setup event listeners
const setupEventListeners = () => {
  if (!client.value) return

  // Remove any existing listeners first
  client.value.off('message.new', handleNewMessage)
  client.value.off('typing.start', handleTypingStart)
  client.value.off('typing.stop', handleTypingStop)
  client.value.off('connection.changed', handleConnectionChanged)

  // Add listeners
  client.value.on('message.new', handleNewMessage)
  client.value.on('typing.start', handleTypingStart)
  client.value.on('typing.stop', handleTypingStop)
  client.value.on('connection.changed', handleConnectionChanged)

  console.log('✅ Event listeners set up')
}

// Cleanup on unmount
onUnmounted(() => {
  if (client.value) {
    client.value.off('message.new', handleNewMessage)
    client.value.off('typing.start', handleTypingStart)
    client.value.off('typing.stop', handleTypingStop)
    client.value.off('connection.changed', handleConnectionChanged)
  }

  // Clear all timeouts
  clearAllTypingTimeouts()
})

// Error handling
const dismissError = () => {
  error.value = null
}
</script>

<template>
  <!-- Loading state while waiting for client -->
  <div v-if="isConnecting" class="text-center py-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
    <p class="mt-2 text-gray-600">Connecting to chat...</p>
  </div>
  <div v-else class="grid grid-cols-3 md:grid-cols-4 gap-4 min-h-[80vh]">
    <!-- Error notification -->
    <div v-if="error" class="col-span-full max-h-8">
      <div
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex justify-between items-center"
      >
        <span>{{ error }}</span>
        <button class="text-red-700 hover:text-red-900" @click="dismissError">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Channels List -->
    <div class="rounded-xl border border-gray-300 bg-white flex flex-col h-[80vh]">
      <!-- Fixed Header Section -->
      <div class="p-2 flex-shrink-0">
        <h2 class="text-lg font-bold text-gray-800">Chats</h2>

        <SearchUser
          v-model="selectedUserId"
          :client="client"
          class="mt-2"
          placeholder="Search user..."
          @user-selected="handleUserSelected"
        />
      </div>
      <div class="flex bg-[#F5F9FF] p-1 m-2 rounded-lg">
        <div
          class="flex-1 px-4 py-2 text-center cursor-pointer transition-all duration-200"
          :class="!unreadChannels ? 'text-gray-900 bg-white rounded-lg shadow-sm' : 'text-gray-500'"
          @click="unreadChannels = false"
        >
          All
        </div>
        <div
          class="flex-1 px-4 py-2 text-center cursor-pointer transition-all duration-200"
          :class="unreadChannels ? 'text-gray-900 bg-white rounded-lg shadow-sm' : 'text-gray-500'"
          @click="unreadChannels = true"
        >
          Unread
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loadingChannels" class="flex-1 flex items-center justify-center text-gray-500">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p class="mt-2">Loading channels...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="channels.length === 0"
        class="flex-1 flex items-center justify-center text-gray-500"
      >
        No chats found
      </div>

      <!-- Channels List - Scrollable -->
      <div v-else class="flex-1 overflow-y-auto p-3">
        <div class="space-y-2">
          <ChannelList
            v-for="channel in channels"
            :key="channel.cid"
            :channel="channel"
            :select-cannel-id="selectedChannel!.cid"
            :user-id="streamUserId"
            @click="selectChannel(channel)"
          />
        </div>
      </div>
    </div>

    <!-- Chat Area -->
    <div class="rounded-xl border border-gray-300 bg-white col-span-2 flex flex-col h-[80vh]">
      <!-- Channel Header - Fixed at top -->
      <ChatHeader v-if="selectedChannel" :channel="selectedChannel" :user-id="streamUserId" />
      <div v-if="!selectedChannel" class="flex-1 flex items-center justify-center text-gray-500">
        Select a channel to start chatting
      </div>

      <!-- Messages Area - Scrollable -->
      <div
        v-else
        class="flex flex-col flex-1 min-h-0 rounded-xl bg-[#F5F9FF] m-3 p-2 border border-[#E5E7EB]"
      >
        <ChatMessage :channel="selectedChannel" />
        <div class="flex flex-col">
          <div v-if="typingText" class="text-sm text-gray-500 animate-pulse px-4 py-2">
            {{ typingText }}
          </div>

          <MessageInput
            :channel="selectedChannel"
            @send-message="handleSendMessage"
            @typing="handleTyping"
            @stop-typing="stopTyping"
          />
        </div>
      </div>
    </div>

    <!-- Files and links panel -->
    <SharedContent v-if="selectedChannel" :channel="selectedChannel" :client="client" />
  </div>
</template>

<style scoped>
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
