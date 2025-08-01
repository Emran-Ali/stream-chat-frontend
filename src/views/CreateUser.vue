<template>
  <div class="container max-w-lg mx-auto p-4">
    <h1 class="text-2xl font-bold text-indigo-600 mb-4">Log In to Messaging App</h1>
    <hr class="mb-4 border-4 text-indigo-600" />
    <form @submit.prevent="handleSubmit">
      <div class="mb-4">
        <label for="name" class="block text-cyan-900 text-sm font-bold mb-2">Name:</label>
        <input
          type="text"
          id="name"
          v-model="user.name"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-cyan-900 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div class="mb-4">
        <label for="role" class="block text-cyan-900 text-sm font-bold mb-2">email:</label>
        <input
          type="text"
          id="name"
          v-model="user.email"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-cyan-900 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div class="mb-4">
        <label for="role" class="block text-cyan-900 text-sm font-bold mb-2">password:</label>
        <input
          type="password"
          id="name"
          v-model="user.password"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-cyan-900 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div class="mb-4">
        <label for="image" class="block text-cyan-900 text-sm font-bold mb-2">Profile Photo:</label>
        <input
          type="text"
          id="image"
          v-model="user.photo"
          class="shadow appearance-none border rounded w-full py-2 px-3 text-cyan-900 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <button
        type="submit"
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        Create
      </button>
    </form>
    <div>
      Already have an account ?
      <span @click="handleLogIn" class="text-blue-600 px-3 cursor-pointer font-semibold"
        >Log In
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../store/auth-store.ts'
import { useRouter } from 'vue-router'

const streamStore = useAuthStore()

const user = ref({
  name: '',
  email: '',
  password: '',
  photo: '',
})

const router = useRouter()

const handleSubmit = async () => {
  const res = await streamStore.createUser(user.value)
  if (res.success) {
    await router.push('/login')
  } else {
    alert('Something went wrong')
  }
}

const handleLogIn = async () => {
  await router.push('/login')
}
</script>
