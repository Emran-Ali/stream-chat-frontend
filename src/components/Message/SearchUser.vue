<template>
  <div class="relative" ref="selectRef">
    <!-- Search Input -->
    <div
      class="inline-flex w-full px-2 py-1 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none overflow-hidden"
    >
      <div class="h-7 w-7">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28px"
          height="28px"
          viewBox="0 0 1024 1024"
          class="icon"
          version="1.1"
        >
          <path
            d="M853.988 783.582L704.985 634.578c29.249-49.501 46.054-107.229 46.054-168.891 0-183.636-148.866-332.504-332.503-332.504S86.034 282.051 86.034 465.688 234.9 798.19 418.536 798.19c61.662 0 119.39-16.805 168.892-46.055L736.43 901.138c32.462 32.462 85.094 32.462 117.558 0 32.462-32.461 32.462-85.094 0-117.556z m-435.452-21.339c-163.784 0-296.557-132.775-296.557-296.556 0-163.784 132.773-296.557 296.557-296.557 163.782 0 296.556 132.773 296.556 296.557 0 163.781-132.773 296.556-296.556 296.556z m411.939 115.384c-19.476 19.478-51.056 19.478-70.534 0L615.726 733.411a334.417 334.417 0 0 0 70.421-70.379l148.017 151.781c19.478 19.479 15.789 43.336-3.689 62.814z"
            fill="#8C8C8C"
          />
        </svg>
      </div>
      <input
        v-model="searchQuery"
        type="text"
        class="text-gray-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-none"
        :placeholder="placeholder"
        @input="handleInput"
      />
    </div>

    <!-- Dropdown Options -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="isOpen && filteredUsers.length > 0"
        class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
      >
        <ul class="py-1">
          <li
            v-for="user in filteredUsers"
            :key="user.id"
            class="px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors duration-150"
            :class="{
              'bg-blue-100': selectedUserId === user.id,
            }"
            @click="selectUser(user)"
          >
            <div class="flex items-center">
              <!-- User Avatar if available -->
              <img
                v-if="user.image"
                :src="user.image"
                :alt="user.name || user.id"
                class="w-8 h-8 rounded-full mr-3"
              />
              <div
                v-else
                class="w-8 h-8 rounded-full bg-gray-300 mr-3 flex items-center justify-center"
              >
                {{ (user.name || user.id).charAt(0).toUpperCase() }}
              </div>

              <!-- User Info -->
              <div>
                <div class="font-medium">{{ user.name || user.id }}</div>
                <div v-if="user.online" class="text-xs text-green-500">
                  Online
                </div>
                <div v-else class="text-xs text-gray-400">Offline</div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </Transition>

    <!-- Loading state -->
    <div
      v-if="isOpen && isLoading"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-gray-500 text-center"
    >
      Loading users...
    </div>

    <!-- No results message -->
    <div
      v-if="isOpen && !isLoading && filteredUsers.length === 0 && searchQuery"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-gray-500 text-center"
    >
      No users found
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { StreamChat, UserResponse } from 'stream-chat'

interface Props {
  client: StreamChat
  placeholder?: string
  modelValue?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Search for a user...',
  modelValue: null,
})

const emit = defineEmits<{
  'update:modelValue': [userId: string | null]
  'user-selected': [user: UserResponse]
}>()

// State
const users = ref<UserResponse[]>([])
const searchQuery = ref('')
const isOpen = ref(false)
const isLoading = ref(false)
const selectedUserId = ref<string | null>(props.modelValue)
const selectRef = ref<HTMLElement>()

// Computed
const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value

  const query = searchQuery.value.toLowerCase()
  return users.value.filter((user) => {
    const userName = (user.name || user.id || '').toLowerCase()
    return userName.includes(query)
  })
})

// Methods
const loadUsers = async () => {
  if (!props.client) return

  isLoading.value = true
  try {
    const response = await props.client.queryUsers(
      {
        banned: false,
        // role: 'user',
      },
      {
        name: 1,
        last_active: -1,
      },
      {
        limit: 100,
      }
    )
    users.value = response.users
  } catch (error) {
    console.error('Error loading users:', error)
    users.value = []
  } finally {
    isLoading.value = false
  }
}

const handleInput = () => {
  isOpen.value = true

  // Optional: Debounced search if you want to query users based on search
  // You can implement a debounced API call here to search users
}

const selectUser = (user: UserResponse) => {
  selectedUserId.value = user.id
  searchQuery.value = user.name || user.id
  isOpen.value = false

  // Emit events
  emit('update:modelValue', user.id)
  emit('user-selected', user)
}

const handleClickOutside = (event: MouseEvent) => {
  if (selectRef.value && !selectRef.value.contains(event.target as Node)) {
    isOpen.value = false
    // Reset search if no selection was made
    if (!selectedUserId.value) {
      searchQuery.value = ''
    }
  }
}

// Lifecycle
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  await loadUsers()

  // Set initial display value if modelValue is provided
  if (props.modelValue) {
    const user = users.value.find((u) => u.id === props.modelValue)
    if (user) {
      searchQuery.value = user.name || user.id
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Watch for external modelValue changes
watch(
  () => props.modelValue,
  (newValue) => {
    selectedUserId.value = newValue
    if (newValue) {
      const user = users.value.find((u) => u.id === newValue)
      if (user) {
        searchQuery.value = user.name || user.id
      }
    } else {
      searchQuery.value = ''
    }
  }
)
</script>
