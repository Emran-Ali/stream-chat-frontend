<template>
  {{ state }}
</template>

<script setup lang="ts">
const props = defineProps<{ callId: string }>()
import { inject } from 'vue'
import { type Call, StreamVideoClient } from '@stream-io/video-client'

const client = inject<StreamVideoClient>('streamClient')
const call: Call = client.call('classroom', props.callId)

const state = ref('not connected')

if (call) {
  call.join()
  state.value = 'connected'
}
</script>
