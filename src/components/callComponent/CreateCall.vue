<script setup lang="ts">
import { reactive } from 'vue'
import { useAuthStore } from '@/store/auth-store.ts'

const streamStore = useAuthStore()

const formData = reactive({
  callId: 'call-test-1',
  teacherId: 'teacher-1',
  studentId: 'student-1',
})

const handleSubmit = async () => {
  console.log('Starting call with:', formData)
  const res = await streamStore.createCall(formData)
  console.log(res)

  // Your call logic here
}
</script>

<template>
  <div class="container mx-auto bg-gray-600 text-white p-8 rounded-lg border">
    <h3 class="text-lg font-semibold mb-4 text-center">Create New Call</h3>

    <form @submit.prevent="handleSubmit" class="space-y-3 max-w-lg border-2 rounded-lg p-4 mx-auto">
      <div>
        <label class="block text-sm font-medium mb-1">Call ID</label>
        <input
          v-model="formData.callId"
          type="text"
          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Teacher ID</label>
        <input
          v-model="formData.teacherId"
          type="text"
          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Student ID</label>
        <input
          v-model="formData.studentId"
          type="text"
          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <button
        type="submit"
        class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
      >
        Create Call
      </button>
    </form>
  </div>
</template>
