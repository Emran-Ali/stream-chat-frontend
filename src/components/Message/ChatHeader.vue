<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { Channel } from 'stream-chat'

const props = defineProps<{ channel: Channel; userId: string }>()
const userInfo = ref<any | null>(null)

const getUserInfo = (channel: Channel = props.channel) => {
  const membersArray = Object.values(channel.state.members)

  const otherMember = membersArray.find((member) => member.user?.id !== props.userId)

  userInfo.value = {
    image: otherMember?.user?.image || undefined,
    name: otherMember?.user?.name,
    // isOnline: true,
    isOnline: otherMember?.user?.online || false,
  }
}

watch(
  (): Channel => props.channel,
  () => getUserInfo(),
)
onMounted(async () => {
  getUserInfo()
})
</script>

<template>
  <div class="flex flex-row gap-2 p-2 items-center">
    <div
      class="relative flex-shrink-0 rounded-full h-12 w-12 bg-gray-300 flex items-center justify-center"
    >
      <img
        v-if="userInfo?.image"
        :src="userInfo?.image"
        alt="User"
        class="object-cover h-12 w-12 rounded-full"
      />
      <span v-else class="font-semibold text-sm text-white">U</span>
      <span
        v-if="userInfo?.isOnline"
        class="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-white"
      ></span>
    </div>

    <div class="flex flex-col text-gray-800 px-2">
      <h2 class="text-xl font-bold">
        {{ userInfo?.name || 'Unnamed Channel' }}
      </h2>
      <span class="text-sm text-[#585D69]">User Details</span>
    </div>
  </div>
</template>
