<script setup lang="ts">
import type { Channel, StreamChat } from 'stream-chat'
import { onMounted, onUnmounted, ref, watch } from 'vue'

interface Props {
  channel: Channel
  client: StreamChat
}

const props = defineProps<Props>()

const hasContent = ref(false)
const sharedImage = ref<Array<{ id: string; type: string; url: string }>>([])
const sharedFile = ref<
  Array<{ id: string; type: string; url: string; name: string }>
>([])
const sharedLink = ref<Array<{ url: string; type: string }>>([])
const loading = ref(false)

const getFileNameFromUrl = (url: string): string => {
  try {
    const urlWithoutQuery = url.split('?')[0]
    const segments = urlWithoutQuery.split('/')
    const lastSegment = segments[segments.length - 1]
    const parts = lastSegment.split('.')
    return parts[parts.length - 2] + '.' + parts[parts.length - 1]
  } catch (error) {
    return 'Unknown file'
  }
}

const loadSharedContent = async () => {
  if (!props.channel) return

  loading.value = true
  sharedImage.value = []
  sharedFile.value = []
  sharedLink.value = []

  try {
    const response = await props.client.search(
      { cid: props.channel.cid },
      { attachments: { $exists: true } },
      { limit: 100 }
    )

    response.results?.forEach((entry) => {
      const message = entry.message
      if (message.attachments?.length) {
        hasContent.value = true
      }

      message.attachments?.forEach((attachment) => {
        if (attachment.type === 'file' && attachment.asset_url) {
          sharedFile.value.push({
            id: attachment.asset_url || message.id,
            type: 'file',
            url: attachment.asset_url,
            name: attachment.name ?? getFileNameFromUrl(attachment.asset_url),
          })
        }
        if (
          (attachment.type === 'image' || attachment.type === 'video') &&
          attachment.asset_url
        ) {
          sharedImage.value.push({
            id: attachment.asset_url || message.id,
            type: attachment.type,
            url: attachment.asset_url,
          })
        }
        if (attachment.og_scrape_url) {
          sharedLink.value.push({
            url: attachment.og_scrape_url,
            type: 'link',
          })
        }
      })
    })
  } catch (error) {
    console.error('Error loading shared content:', error)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.channel,
  () => {
    hasContent.value = false
    loadSharedContent()
  }
)
const handleNewMessage = (event: any) => {
  if (event.cid !== props.channel.cid) return
  if (event.message.attachments.length > 0) loadSharedContent()
}

onMounted(async () => {
  // Register event listeners
  props.channel.on('message.new', handleNewMessage)
  await loadSharedContent()
})

onUnmounted(() => {
  // Cleanup event listeners
  props.channel.off('message.new', handleNewMessage)
})
</script>

<template>
  <div
    class="rounded-xl border border-gray-300 bg-white hidden md:flex md:flex-col h-[80vh]"
  >
    <!-- Fixed Header -->
    <div class="p-2 flex-shrink-0 border-b">
      <h3 class="font-semibold text-gray-800">Shared Content</h3>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center text-gray-500"
    >
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"
        ></div>
        <p>Loading shared content...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!hasContent"
      class="flex-1 flex items-center justify-center text-gray-500 p-4"
    >
      No shared content in this channel yet
    </div>

    <!-- Content List - Scrollable -->
    <div v-else class="flex-1 overflow-y-auto p-4">
      <div class="space-y-6">
        <!-- Files Section -->
        <div v-if="sharedFile.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold">Files</h3>
          <div class="space-y-2">
            <div
              v-for="file in sharedFile"
              :key="file.id"
              class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg
                class="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <a
                :href="file.url"
                download
                class="flex-1 text-sm text-blue-600 hover:text-blue-800 truncate"
              >
                {{ file.name }}
              </a>
              <svg
                class="w-5 h-5 text-gray-400 hover:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </div>
          </div>
        </div>

        <!-- Links Section -->
        <div v-if="sharedLink.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold">Links</h3>
          <!-- Links content -->
          <div class="space-y-2">
            <div
              v-for="link in sharedLink"
              :key="link.url"
              class="bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <a
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-800 text-sm break-all"
              >
                {{ link.url }}
              </a>
            </div>
          </div>
        </div>

        <!-- Images Section -->
        <div v-if="sharedImage.length > 0" class="space-y-2">
          <h3 class="text-sm font-semibold">Media</h3>
          <div class="grid grid-cols-3 gap-2">
            <div
              v-for="image in sharedImage"
              :key="image.id"
              class="relative group aspect-square"
            >
              <img
                v-if="image.type === 'image'"
                :src="image.url"
                alt="Shared Image"
                class="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                @click="window.open(image.url, '_blank')"
              />
              <video
                v-else-if="image.type === 'video'"
                :src="image.url"
                class="w-full h-full object-cover rounded-lg cursor-pointer"
                muted
                playsinline
                preload="metadata"
                @click="window.open(image.url, '_blank')"
              />
              <div
                class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg"
              />
              <!-- Video icon overlay -->
              <div
                v-if="image.type === 'video'"
                class="absolute inset-0 flex items-center justify-center"
              >
                <svg
                  class="h-5 w-5 text-white bg-lime-200 rounded-full opacity-90"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
