<script setup lang="ts">
import { reactive } from 'vue'
import Call from '@/components/callComponent/Call.vue'

const formData = reactive({
  callId: 'call-test-1',
  isSubmit: false,
})

const handleSubmit = () => {
  formData.isSubmit = true
  console.log('Starting call with:', formData)
}
</script>

<template>
  <div
    v-if="!formData.isSubmi"
    class="container mx-auto bg-gray-600 text-white p-8 rounded-lg border"
  >
    <h3 class="text-lg font-semibold mb-4 text-center">Join Call</h3>

    <form @submit.prevent="handleSubmit" class="space-y-3 max-w-lg border-2 rounded-lg p-4 mx-auto">
      <div>
        <label class="block text-sm font-medium mb-1">Call ID</label>
        <input
          v-model="formData.callId"
          type="text"
          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <button
        type="submit"
        class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
      >
        Join Call
      </button>
    </form>
  </div>
  <Call v-else :call-id="formData.callId" />
</template>
