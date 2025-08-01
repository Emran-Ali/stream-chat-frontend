<template>
  <div class="container mx-auto p-4 max-w-lg">
    <h1 class="text-2xl font-bold text-indigo-600 mb-4">Log In to Messaging App</h1>
    <hr class="mb-4 border-4 text-indigo-600" />

    <form @submit.prevent="login" method="post" class="uk-form-stacked">
      <div class="w-full">
        <label class="text-xl text-cyan-900 mb-2" for="email">User ID</label>
        <div class="uk-form-controls">
          <input
            id="email"
            class="border-b-cyan-900 border-2 rounded p-2"
            type="text"
            v-model.trim="email"
            required
            placeholder="Enter your username"
          />
        </div>
      </div>
      <div class="uk-margin-small-top uk-width-1-1@s">
        <label class="text-xl text-cyan-900 mb-2" for="password">Password</label>
        <div class="uk-form-controls">
          <input
            id="password"
            class="border-b-cyan-900 border-2 rounded p-2"
            type="password"
            v-model.trim="password"
            required
            placeholder="Enter your username"
          />
        </div>
      </div>

      <div class="my-2">
        <button type="submit" class="bg-cyan-800 text-white py-4 px-6 font-semibold rounded-lg">
          Log in
        </button>
      </div>
    </form>

    <div>
      New User ?
      <span @click="handleSignUp" class="text-blue-600 px-3 cursor-pointer font-semibold"
        >Sign Up</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth-store.ts'

const email = ref('')
const password = ref('')
const router = useRouter()
const streamStore = useAuthStore()

const login = async () => {
  if (!email.value) {
    return
  }
  const data = await streamStore.login(email.value, password.value)
  console.log(data)

  await router.push('/message')
}

const handleSignUp = async () => {
  console.log('handleSignUp')
  await router.push('/create-user')
}
</script>
