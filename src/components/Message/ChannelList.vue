<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { Channel } from 'stream-chat'

const props = defineProps<{
  channel: Channel
  selectCannelId: string
  userId: string
}>()

const channelInfo = ref<{
  image: string | undefined
  name: string | undefined
  isOnline: boolean
  lastMessage: string | undefined
  unreadCount: number | undefined
  lastMessageAt: string | undefined
} | null>(null)

const getChannelInfo = (channel: Channel) => {
  const membersArray = Object.values(channel.state.members)
  const otherMember = membersArray.find(
    (member) => member.user?.id !== props.userId
  )
  const latestMessages = channel?.state?.latestMessages
  const lastMessageAt = channel?.state?.last_message_at

  channelInfo.value = {
    image: otherMember?.user?.image || undefined,
    name: otherMember?.user?.name,
    lastMessageAt: getTimeDifferenceString(lastMessageAt),
    isOnline: otherMember?.user?.online || false,
    lastMessage: latestMessages[latestMessages.length - 1]?.text,
    unreadCount: channel?.state?.unreadCount,
  }
  return true
}
function getTimeDifferenceString(dateString: Date | null) {
  if (!dateString) return ''
  const now = new Date()
  const targetDate = new Date(dateString)

  const diffMs = now.getTime() - targetDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m`
  } else if (diffHours < 24) {
    const remainingMinutes = diffMinutes % 60
    return remainingMinutes === 0
      ? `${diffHours}h`
      : `${diffHours}h ${remainingMinutes}m`
  } else {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`
  }
}

watch(
  () => props.channel,
  (newVal) => {
    getChannelInfo(newVal)
  },
  { immediate: true }
)
onMounted(async () => {
  getChannelInfo(props.channel)
})
</script>

<template>
  <div
    class="p-2 hover:bg-gray-100 cursor-pointer rounded-lg transition-colors duration-200"
    :class="{
      'bg-[#F5F9FF] ': props.selectCannelId === channel.cid,
    }"
  >
    <div class="flex flex-row gap-2">
      <div
        class="relative flex-shrink-0 rounded-full h-8 w-8 bg-gray-300 flex items-center justify-center"
      >
        <img
          v-if="channelInfo?.image"
          :src="channelInfo?.image"
          alt="User"
          class="object-cover h-8 w-8 rounded-full"
        />
        <span v-else class="font-semibold text-sm text-white">U</span>
        <span
          v-if="channelInfo?.isOnline"
          class="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"
        ></span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex justify-between">
          <div class="truncate text-md">{{ channelInfo?.name }}</div>
          <span class="text-sm text-[#71717A]">{{
            channelInfo?.lastMessageAt
          }}</span>
        </div>
        <div class="flex justify-between">
          <div class="text-sm text-[#71717A] truncate">
            {{ channelInfo?.lastMessage || 'none' }}
          </div>
          <span
            v-if="channelInfo?.unreadCount"
            class="text-xs bg-black rounded-full h-4 w-4 text-center text-white"
            >{{ channelInfo?.unreadCount }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>
