<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth-store.ts'
const authStore = useAuthStore()

const route = useRoute()
const router = useRouter()
const isMobileMenuOpen = ref(false)
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="bg-indigo-600 shadow-lg">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <!-- Logo/Title -->
        <div class="flex-shrink-0">
          <RouterLink to="/" class="text-white font-bold text-xl"> Music World </RouterLink>
        </div>

        <!-- Desktop Menu -->
        <div class="hidden md:block">
          <div class="ml-10 flex items-center space-x-4">
            <RouterLink
              to="/message"
              :class="`${route.path === '/message' ? 'bg-indigo-700' : ''} text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition duration-300`"
            >
              Message
            </RouterLink>

            <button
              v-if="authStore.isAuthenticated"
              @click="handleLogout"
              :class="`${route.path === '/blog' ? 'bg-indigo-700' : ''} text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition duration-300`"
            >
              Log Out
            </button>

            <RouterLink
              v-else
              to="/login"
              :class="`${route.path === '/blog' ? 'bg-indigo-700' : ''} text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition duration-300`"
            >
              Log In
            </RouterLink>
          </div>
        </div>

        <!-- Mobile Menu Button -->
        <div class="md:hidden">
          <button
            @click="toggleMobileMenu"
            class="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-indigo-700 focus:outline-none"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                v-if="!isMobileMenuOpen"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <div v-show="isMobileMenuOpen" class="md:hidden">
      <div class="px-2 pt-2 pb-3 space-y-1">
        <RouterLink
          to="/message"
          :class="`${route.path === '/message' ? 'bg-indigo-700' : ''} text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition duration-300`"
        >
          Message
        </RouterLink>
        <RouterLink
          to="/login"
          :class="`${route.path === '/blog' ? 'bg-indigo-700' : ''} text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition duration-300`"
        >
          Log In
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
