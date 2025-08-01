<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Call } from '@stream-io/video-client'
import { isMobile } from '../utils/Mobile'
import { ClosedCaptionManager } from '../utils/CloseCaption'

// Define a safe type for MediaDeviceInfo
interface SafeMediaDeviceInfo {
  deviceId: string
  label: string
  kind: string
  groupId: string
}

const props = defineProps<{
  call: Call
}>()

// Connection state
const connectionStatus = ref<'connected' | 'disconnected' | 'reconnecting'>('connected')
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 5
const reconnectInterval = ref(2000) // Start with 2 seconds

// Audio button state
const micStatus = ref<string>('disabled')
const toggleMic = async () => {
  await props.call.microphone.toggle()
}

// Video button state
const cameraStatus = ref<string>('disabled')
const toggleCamera = async () => {
  await props.call.camera.toggle()
}

// Screen share button state
const screenShareStatus = ref<string>('disabled')
const toggleScreenShare = async () => {
  await props.call.screenShare.toggle()
}

// Camera flip button state (mobile only)
const cameraDirection = ref('front')
const flipCamera = async () => {
  await props.call.camera.flip()
}

// Volume control state
const volume = ref(0)
const setVolume = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  props.call.speaker.setVolume(parseFloat(value))
}

// Audio devices state
const audioDevices = ref<SafeMediaDeviceInfo[]>([])
const selectedAudioDevice = ref('')
const selectAudioDevice = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  props.call.microphone.select(value)
}

// Video devices state
const videoDevices = ref<SafeMediaDeviceInfo[]>([])
const selectedVideoDevice = ref('')
const selectVideoDevice = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  props.call.camera.select(value)
}

// Audio output devices state
const audioOutputSupported = ref(false)
const audioOutputDevices = ref<SafeMediaDeviceInfo[]>([])
const selectedAudioOutput = ref('')
const selectAudioOutput = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  props.call.speaker.select(value)
}

// Closed captions state
const captionStatus = ref<'on' | 'off'>('off')
const closedCaptionManager = ref<ClosedCaptionManager>()
const captionText = ref('')

// Define emit for caption container and leave call
const emit = defineEmits<{
  (e: 'caption-container', element: HTMLElement): void
  (e: 'connection-status', status: 'connected' | 'disconnected' | 'reconnecting'): void
  (e: 'leave-call'): void
}>()

const toggleCaptions = () => {
  if (!closedCaptionManager.value) return

  if (captionStatus.value === 'on') {
    closedCaptionManager.value.hideCaptions()
    captionStatus.value = 'off'
  } else {
    closedCaptionManager.value.showCaptions()
    captionStatus.value = 'on'
  }
}

// Leave call function
const leaveCall = () => {
  // Update connection status to disconnected
  connectionStatus.value = 'disconnected'
  emit('connection-status', 'disconnected')
  emit('leave-call')
}

// Convert MediaDeviceInfo to SafeMediaDeviceInfo
const toSafeMediaDeviceInfo = (device: MediaDeviceInfo): SafeMediaDeviceInfo => {
  return {
    deviceId: device.deviceId || 'default',
    label: device.label || `Device-${device.deviceId?.slice(0, 4) || 'unknown'}`,
    kind: device.kind || 'unknown',
    groupId: device.groupId || 'default',
  }
}

// Reconnection logic
const reconnect = async () => {
  if (reconnectAttempts.value >= maxReconnectAttempts) {
    console.error('Maximum reconnection attempts reached')
    connectionStatus.value = 'disconnected'
    emit('connection-status', 'disconnected')
    return
  }

  connectionStatus.value = 'reconnecting'
  emit('connection-status', 'reconnecting')

  try {
    console.log(`Attempting to reconnect (${reconnectAttempts.value + 1}/${maxReconnectAttempts})`)
    await props.call.join({ create: true })

    // Reset reconnection attempts on success
    reconnectAttempts.value = 0
    reconnectInterval.value = 2000
    connectionStatus.value = 'connected'
    emit('connection-status', 'connected')

    // Re-enable camera and mic if they were on before
    if (micStatus.value === 'enabled') await props.call.microphone.enable()
    if (cameraStatus.value === 'enabled') await props.call.camera.enable()
  } catch (error) {
    console.error('Reconnection failed:', error)
    reconnectAttempts.value++

    // Exponential backoff (max 30 seconds)
    reconnectInterval.value = Math.min(reconnectInterval.value * 1.5, 30000)

    // Try again after interval
    setTimeout(reconnect, reconnectInterval.value)
  }
}

// Simple network monitoring for reconnection
const setupNetworkMonitoring = () => {
  // Handle online event
  const handleOnline = () => {
    console.log('Network connection restored, attempting to reconnect')
    if (connectionStatus.value !== 'connected') {
      reconnect()
    }
  }

  // Handle offline event
  const handleOffline = () => {
    console.log('Network connection lost')
    connectionStatus.value = 'disconnected'
    emit('connection-status', 'disconnected')
  }

  // Add listeners
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

// Periodic connection check
const startPeriodicConnectionCheck = () => {
  let checkInterval: number | null = null

  const checkConnection = async () => {
    try {
      // Try to get participants as a way to check connection
      // Use getParticipants() instead of queryParticipants()
      const participants = props.call.state.participants

      // If we can access participants, we're likely connected
      if (connectionStatus.value !== 'connected') {
        connectionStatus.value = 'connected'
        emit('connection-status', 'connected')
      }
    } catch (error) {
      console.error('Connection check failed:', error)

      // If we were connected before, try to reconnect
      if (connectionStatus.value === 'connected') {
        connectionStatus.value = 'disconnected'
        emit('connection-status', 'disconnected')
        reconnect()
      }
    }
  }

  // Check every 30 seconds
  checkInterval = window.setInterval(checkConnection, 30000) as unknown as number

  // Return cleanup function
  return () => {
    if (checkInterval !== null) {
      clearInterval(checkInterval)
    }
  }
}

onMounted(() => {
  // Initialize closed caption manager
  closedCaptionManager.value = new ClosedCaptionManager(props.call)

  // Setup network monitoring
  const cleanupNetworkMonitoring = setupNetworkMonitoring()

  // Start periodic connection checks
  const cleanupConnectionCheck = startPeriodicConnectionCheck()

  // Clean up on unmount
  onBeforeUnmount(() => {
    cleanupNetworkMonitoring()
    cleanupConnectionCheck()
    closedCaptionManager.value?.cleanup()
  })

  // Subscribe to microphone status
  props.call.microphone.state.status$.subscribe((status) => {
    micStatus.value = status || 'disabled'
  })

  // Subscribe to camera status
  props.call.camera.state.status$.subscribe((status) => {
    cameraStatus.value = status || 'disabled'
  })

  // Subscribe to screen share status
  props.call.screenShare.state.status$.subscribe((status) => {
    screenShareStatus.value = status || 'disabled'
  })

  // Subscribe to camera direction (for mobile)
  props.call.camera.state.direction$.subscribe((direction) => {
    cameraDirection.value = direction || 'front'
  })

  // Subscribe to volume changes
  props.call.speaker.state.volume$.subscribe((vol) => {
    volume.value = vol || 0
  })

  // Get audio devices
  props.call.microphone.listDevices().subscribe({
    next: (devices) => {
      if (devices) {
        audioDevices.value = devices.map(toSafeMediaDeviceInfo)
      }
    },
    error: (error) => console.error(`Can't list audio devices: ${error}`),
  })

  // Get video devices
  props.call.camera.listDevices().subscribe({
    next: (devices) => {
      if (devices) {
        videoDevices.value = devices.map(toSafeMediaDeviceInfo)
      }
    },
    error: (error) => console.error(`Can't list video devices: ${error}`),
  })

  // Check if audio output selection is supported
  audioOutputSupported.value = props.call.speaker.state.isDeviceSelectionSupported

  // Get audio output devices if supported
  if (audioOutputSupported.value) {
    props.call.speaker.listDevices().subscribe({
      next: (devices) => {
        audioOutputDevices.value = devices.map(toSafeMediaDeviceInfo)
      },
      error: (error) => console.error(`Can't list audio output devices: ${error}`),
    })
  }

  // Create caption container and emit it
  if (closedCaptionManager.value) {
    const captionContainerElement = closedCaptionManager.value.renderCaptionContainer()
    emit('caption-container', captionContainerElement)
  }
})
</script>

<template>
  <div class="controls-container">
    <!-- Connection status indicator -->
    <div class="connection-status" :class="connectionStatus">
      {{
        connectionStatus === 'connected'
          ? '🟢 Connected'
          : connectionStatus === 'reconnecting'
            ? '🟠 Reconnecting...'
            : '🔴 Call Ended'
      }}
    </div>

    <!-- Mic control -->
    <button @click="toggleMic" :disabled="connectionStatus === 'disconnected'">
      {{ micStatus === 'enabled' ? 'Turn off mic' : 'Turn on mic' }}
    </button>

    <!-- Camera control -->
    <button @click="toggleCamera" :disabled="connectionStatus === 'disconnected'">
      {{ cameraStatus === 'enabled' ? 'Turn off camera' : 'Turn on camera' }}
    </button>

    <!-- Screen share control -->
    <button @click="toggleScreenShare" :disabled="connectionStatus === 'disconnected'">
      {{ screenShareStatus === 'enabled' ? 'Turn off screen share' : 'Turn on screen share' }}
    </button>

    <!-- Audio device selector -->
    <select
      v-if="audioDevices.length"
      @change="selectAudioDevice"
      :disabled="connectionStatus === 'disconnected'"
    >
      <option v-for="device in audioDevices" :key="device.deviceId" :value="device.deviceId">
        {{ device.label }}
      </option>
    </select>

    <!-- Mobile camera flip or desktop video device selector -->
    <template v-if="isMobile.any()">
      <button @click="flipCamera" :disabled="connectionStatus === 'disconnected'">
        {{ cameraDirection === 'front' ? 'Back camera' : 'Front camera' }}
      </button>
    </template>
    <template v-else>
      <select
        v-if="videoDevices.length"
        @change="selectVideoDevice"
        :disabled="connectionStatus === 'disconnected'"
      >
        <option v-for="device in videoDevices" :key="device.deviceId" :value="device.deviceId">
          {{ device.label }}
        </option>
      </select>
    </template>

    <!-- Audio output selector (if supported) -->
    <select
      v-if="audioOutputSupported && audioOutputDevices.length"
      @change="selectAudioOutput"
      :disabled="connectionStatus === 'disconnected'"
    >
      <option v-for="device in audioOutputDevices" :key="device.deviceId" :value="device.deviceId">
        {{ device.label }}
      </option>
    </select>

    <!-- Volume control -->
    <input
      type="range"
      min="0"
      max="1"
      step="0.1"
      :value="volume"
      @change="setVolume"
      :disabled="connectionStatus === 'disconnected'"
    />

    <!-- Closed captions toggle -->
    <button @click="toggleCaptions" :disabled="connectionStatus === 'disconnected'">
      {{ captionStatus === 'on' ? 'Turn off closed captions' : 'Turn on closed captions' }}
    </button>

    <!-- Leave call button -->
    <button
      @click="leaveCall"
      class="leave-call-btn"
      :disabled="connectionStatus === 'disconnected'"
      :class="{ 'call-ended': connectionStatus === 'disconnected' }"
    >
      {{ connectionStatus === 'disconnected' ? 'Call Ended' : 'Leave Call' }}
    </button>
  </div>
</template>

<style scoped>
.controls-container {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  align-items: center;
}

.connection-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
}

.connection-status.connected {
  color: #2ecc71;
}

.connection-status.reconnecting {
  color: #f39c12;
  animation: pulse 1.5s infinite;
}

.connection-status.disconnected {
  color: #e74c3c;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  background: #4a4a4a;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #666;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}

.leave-call-btn {
  background-color: #e74c3c;
  margin-left: auto;
}

.leave-call-btn:hover {
  background-color: #c0392b;
}

.leave-call-btn.call-ended {
  background-color: #95a5a6;
}

select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
}

select:disabled {
  opacity: 0.7;
  background-color: #f5f5f5;
}

input[type='range'] {
  width: 100px;
}

input[type='range']:disabled {
  opacity: 0.7;
}
</style>
