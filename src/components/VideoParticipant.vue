<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Call, type StreamVideoParticipant } from '@stream-io/video-client'

const props = defineProps<{
  participant: StreamVideoParticipant
  call: Call
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)

// Video dimensions (matching the original implementation)
const videoDimension = {
  width: 333,
  height: 250,
}

let videoUnbind: Function | undefined
let videoUntrack: Function | undefined
let audioUnbind: Function | undefined

onMounted(() => {
  if (videoRef.value) {
    // Track video element visibility
    videoUntrack = props.call.trackElementVisibility(
      videoRef.value,
      props.participant.sessionId,
      'videoTrack',
    )

    // Bind video element to participant's video track
    videoUnbind = props.call.bindVideoElement(
      videoRef.value,
      props.participant.sessionId,
      'videoTrack',
    )
  }

  // Don't create audio element for local participant
  if (!props.participant.isLocalParticipant && audioRef.value) {
    audioUnbind = props.call.bindAudioElement(audioRef.value, props.participant.sessionId)
  }
})

onUnmounted(() => {
  // Clean up bindings when component is unmounted
  if (videoUnbind) videoUnbind()
  if (videoUntrack) videoUntrack()
  if (audioUnbind) audioUnbind()
})
</script>

<template>
  <div class="video-participant">
    <video
      ref="videoRef"
      :width="videoDimension.width"
      :height="videoDimension.height"
      :data-session-id="participant.sessionId"
      style="object-fit: contain"
    ></video>
    <audio
      v-if="!participant.isLocalParticipant"
      ref="audioRef"
      :data-session-id="participant.sessionId"
    ></audio>
    <div class="participant-name">
      {{ participant.name || participant.userId }}
    </div>
  </div>
</template>

<style scoped>
.video-participant {
  position: relative;
  width: 100%;
  height: 100%;
}

.participant-name {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
}
</style>
