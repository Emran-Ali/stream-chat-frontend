<script setup lang="ts">
import { inject, computed } from 'vue'

console.log('incoming call component')

// Inject provided data
const callState = inject('callState')
const callActions = inject('callActions')

// Computed properties for easy access
const hasIncomingCalls = computed(() => callState?.incomingCalls.length > 0)
const hasActiveCalls = computed(() => callState?.activeCalls.length > 0)

// Handle incoming call
const handleAnswerCall = (call) => {
  callActions?.answerCall(call)
}

const handleRejectCall = (call) => {
  callActions?.rejectCall(call)
}
</script>

<template>
  <div class="call-interface">
    <!-- Incoming calls -->
    <div v-if="hasIncomingCalls" class="incoming-calls">
      <h3>Incoming Calls</h3>
      <div
        v-for="call in callState.incomingCalls"
        :key="call.id"
        class="call-item"
      >
        <span>{{ call.id }}</span>
        <button @click="handleAnswerCall(call)" class="answer-btn">
          Answer
        </button>
        <button @click="handleRejectCall(call)" class="reject-btn">
          Reject
        </button>
      </div>
    </div>

    <!-- Active calls -->
    <div v-if="hasActiveCalls" class="active-calls">
      <h3>Active Calls</h3>
      <div
        v-for="call in callState.activeCalls"
        :key="call.id"
        class="call-item"
      >
        <span>{{ call.id }}</span>
        <button @click="callActions?.endCall(call)" class="end-btn">
          End Call
        </button>
      </div>
    </div>
  </div>
</template>
