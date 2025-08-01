<template>
  <div v-if="call" class="str-video__call-panel str-video__call-panel--ringing">
    <div class="str-video__call-panel__members-list">
      <div v-for="user in membersToShow" :key="user.id" class="str-video__call-panel__member-box">
        <!--        <Avatar :name="user.name" :image-src="user.image" />-->
        <div v-if="user.name" class="str-video__member_details">
          <span class="str-video__member_name">{{ user.name }}</span>
        </div>
      </div>
    </div>

    <div v-if="callingStateLabel" class="str-video__call-panel__calling-state-label">
      {{ callingStateLabel }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { CallingState } from '@stream-io/video-client'
import { useVideoClient } from '@/composables/useVideoClient.ts'
import { ref } from 'vue'

const { client, isReady } = useVideoClient() // ← inject only

const call = ref<Call>(null)

if (isReady.value && client.value) {
  console.log('Calls In Ring')
  client.value.state.calls$.subscribe((calls) => {
    const incomingCalls = calls.filter(
      (call) => !call.isCreatedByMe && call.state.callingState === CallingState.RINGING,
    )
    if (incomingCalls.length > 0) {
      call.value = incomingCalls[0]
    }

    console.log('Incoming calls:', incomingCalls)
  })
}
</script>
