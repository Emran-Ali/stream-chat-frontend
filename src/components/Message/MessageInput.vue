<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Paperclip, X, File, Smile, Send, Mic } from 'lucide-vue-next'

// Interfaces for files and messages
interface FilePreview {
  id: string
  file: File
  type: 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other'
  previewUrl: string
  name: string
  size: string
}

// Props
interface Props {
  placeholder?: string
  maxFiles?: number
  maxCharacters?: number
  showCharacterCount?: boolean
  isUploading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Type a message...',
  maxFiles: 5,
  maxCharacters: 0,
  showCharacterCount: false,
  isUploading: false,
})

// Emits - matching MessageInput pattern
const emit = defineEmits<{
  sendMessage: [payload: { text: string; files: File[] }]
  typing: []
  stopTyping: []
}>()

// Reactive state
const message = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const textInput = ref<HTMLTextAreaElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const filePreviewList = ref<FilePreview[]>([])
const isEmojiPickerOpen = ref(false)
const isDragging = ref(false)
const fileError = ref('')
const textareaHeight = ref('auto')

// Constants
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

// Common file type icons and extensions
const fileTypes = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
  video: ['mp4', 'webm', 'avi', 'mov', 'wmv', 'mkv'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz'],
}

// File type icons (fallback icons for non-previewed files)
const fileTypeIcons = {
  image: '/icons/image-icon.svg',
  video: '/icons/video-icon.svg',
  audio: '/icons/audio-icon.svg',
  document: '/icons/document-icon.svg',
  archive: '/icons/archive-icon.svg',
  other: '/icons/file-icon.svg',
}

// Get file type based on extension
const getFileType = (
  filename: string
): 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other' => {
  const extension = filename.split('.').pop()?.toLowerCase() || ''

  if (fileTypes.image.includes(extension)) return 'image'
  if (fileTypes.video.includes(extension)) return 'video'
  if (fileTypes.audio.includes(extension)) return 'audio'
  if (fileTypes.document.includes(extension)) return 'document'
  if (fileTypes.archive.includes(extension)) return 'archive'

  return 'other'
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Validate file
const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
  }
  return null
}

// Handle file selection
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files) {
    processFiles(Array.from(input.files))
  }
}

// Process files and create previews
const processFiles = (files: File[]) => {
  // Clear previous errors
  fileError.value = ''

  // Limit the number of files that can be attached
  const remainingSlots = props.maxFiles - filePreviewList.value.length
  const filesToProcess = files.slice(0, remainingSlots)

  let hasError = false

  filesToProcess.forEach((file) => {
    // Validate file
    const error = validateFile(file)
    if (error) {
      fileError.value = error
      hasError = true
      return
    }

    const fileType = getFileType(file.name)
    const id = Math.random().toString(36).substring(2, 11)

    // Create preview for images
    if (fileType === 'image') {
      const reader = new FileReader()
      reader.onload = (e) => {
        filePreviewList.value.push({
          id,
          file,
          type: fileType,
          previewUrl: e.target?.result as string,
          name: file.name,
          size: formatFileSize(file.size),
        })
      }
      reader.readAsDataURL(file)
    } else {
      // For non-image files, use type icon
      filePreviewList.value.push({
        id,
        file,
        type: fileType,
        previewUrl: fileTypeIcons[fileType],
        name: file.name,
        size: formatFileSize(file.size),
      })
    }
  })

  // Reset file input to allow selecting the same file again
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }

  // Show warning if some files were skipped
  if (files.length > remainingSlots && !hasError) {
    fileError.value = `Only ${remainingSlots} files can be attached. ${files.length - remainingSlots} files were skipped.`
  }
}

// Remove a file from preview
const removeFile = (id: string) => {
  filePreviewList.value = filePreviewList.value.filter((item) => item.id !== id)
  fileError.value = '' // Clear error when file is removed
}

// Handle file paste from clipboard
const handlePaste = (event: ClipboardEvent) => {
  const items = event.clipboardData?.items
  if (!items) return

  const files: File[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }

  if (files.length > 0) {
    processFiles(files)
  }
}

// Open file dialog
const openFileDialog = () => {
  fileInputRef.value?.click()
}

// Adjust textarea height
const adjustTextareaHeight = async () => {
  await nextTick()
  if (textInput.value) {
    textInput.value.style.height = 'auto'
    const scrollHeight = textInput.value.scrollHeight
    const maxHeight = 128 // max-h-32 = 8rem = 128px
    textInput.value.style.height = Math.min(scrollHeight, maxHeight) + 'px'
  }
}

// Send the message - updated to match MessageInput pattern
const sendMessage = async () => {
  if (!canSend.value) return

  const messageText = message.value.trim()
  const messageFiles = filePreviewList.value.map((preview) => preview.file)

  // Emit the message with the same structure as MessageInput
  emit('sendMessage', {
    text: messageText,
    files: messageFiles,
  })

  // Reset form
  message.value = ''
  filePreviewList.value = []
  fileError.value = ''
  emit('stopTyping')

  // Reset textarea height
  await nextTick()
  if (textInput.value) {
    textInput.value.style.height = 'auto'
  }
}

// Handle input changes
const handleInput = () => {
  adjustTextareaHeight()
  emit('typing')
}

// Create a function to manage drag and drop events
function createDragAndDropHandler(element: HTMLElement) {
  let dragCounter = 0

  function handleDragEnter(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter++

    if (dragCounter === 1) {
      isDragging.value = true
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter--

    if (dragCounter === 0) {
      isDragging.value = false
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter = 0
    isDragging.value = false

    if (e.dataTransfer?.files.length) {
      processFiles(Array.from(e.dataTransfer.files))
    }
  }

  // Handle document drop to reset state if dropped outside
  function handleDocumentDrop() {
    dragCounter = 0
    isDragging.value = false
  }

  // Set up event listeners
  element.addEventListener('dragenter', handleDragEnter)
  element.addEventListener('dragover', handleDragOver)
  element.addEventListener('dragleave', handleDragLeave)
  element.addEventListener('drop', handleDrop)
  document.addEventListener('drop', handleDocumentDrop)

  // Return cleanup function
  return function cleanup() {
    element.removeEventListener('dragenter', handleDragEnter)
    element.removeEventListener('dragover', handleDragOver)
    element.removeEventListener('dragleave', handleDragLeave)
    element.removeEventListener('drop', handleDrop)
    document.removeEventListener('drop', handleDocumentDrop)
  }
}

// Keyboard shortcuts
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
    return
  }

  // Emit typing event
  emit('typing')
}

// Computed properties
const canSend = computed(() => {
  const hasText = message.value.trim() !== ''
  const hasFiles = filePreviewList.value.length > 0
  const withinLimit =
    props.maxCharacters === 0 || message.value.length <= props.maxCharacters
  return (
    (hasText || hasFiles) &&
    !props.isUploading &&
    withinLimit &&
    !fileError.value
  )
})

const hasFiles = computed(() => {
  return filePreviewList.value.length > 0
})

// Emoji picker functionality could be expanded with a library
const addEmoji = (emoji: string) => {
  message.value += emoji
  isEmojiPickerOpen.value = false
  adjustTextareaHeight()
}

// Focus management
const focusInput = () => {
  nextTick(() => {
    textInput.value?.focus()
  })
}

// Clear inputs method
const clearInputs = () => {
  message.value = ''
  filePreviewList.value = []
  fileError.value = ''
}

// Set up event listeners
let cleanupDragAndDrop: (() => void) | null = null

onMounted(() => {
  document.addEventListener('paste', handlePaste)

  // Set up drag and drop handler once the containerRef element is available
  if (containerRef.value) {
    cleanupDragAndDrop = createDragAndDropHandler(containerRef.value)
  }
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)

  // Clean up drag and drop handler
  if (cleanupDragAndDrop) {
    cleanupDragAndDrop()
  }
})

// Watch for message changes to adjust textarea height
watch(message, () => {
  adjustTextareaHeight()
})

// Expose methods for parent component
defineExpose({
  focusInput,
  clearInputs,
})
</script>

<template>
  <div
    ref="containerRef"
    class="w-full rounded-xl border overflow-hidden relative mt-3"
    :class="{ 'bg-blue-50 border-blue-300': isDragging }"
  >
    <!-- File error message -->
    <div
      v-if="fileError"
      class="p-2 bg-red-50 border-b border-red-200"
      role="alert"
    >
      <div class="flex items-center">
        <svg
          class="w-5 h-5 text-red-400 mr-2 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="text-sm text-red-700">{{ fileError }}</span>
      </div>
    </div>

    <!-- File previews -->
    <div v-if="hasFiles" class="p-2 bg-gray-50 border-b flex flex-wrap gap-2">
      <div
        v-for="file in filePreviewList"
        :key="file.id"
        class="relative rounded-md border overflow-hidden group"
      >
        <!-- Image preview -->
        <div v-if="file.type === 'image'" class="w-20 h-20 relative">
          <img
            :src="file.previewUrl"
            :alt="file.name"
            class="w-full h-full object-cover"
          />
          <button
            class="absolute top-1 right-1 bg-black bg-opacity-60 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            @click="removeFile(file.id)"
            :disabled="isUploading"
          >
            <X :size="16" />
          </button>
        </div>

        <!-- Other file types -->
        <div
          v-else
          class="w-20 p-2 bg-white flex flex-col items-center justify-center"
        >
          <div class="w-10 h-10 mb-1">
            <File
              v-if="file.type === 'document'"
              class="text-blue-500 w-full h-full"
            />
            <Paperclip
              v-else-if="file.type === 'archive'"
              class="text-orange-500 w-full h-full"
            />
            <File v-else class="text-gray-500 w-full h-full" />
          </div>
          <div class="text-xs truncate w-full text-center" :title="file.name">
            {{ file.name }}
          </div>
          <div class="text-xs text-gray-500">{{ file.size }}</div>
          <button
            class="absolute top-1 right-1 bg-black bg-opacity-60 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            @click="removeFile(file.id)"
            :disabled="isUploading"
          >
            <X :size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Input section -->
    <div class="flex items-end p-1 bg-white">
      <!-- Emoji picker button -->
      <button
        class="p-2 text-gray-500 hover:text-gray-700 rounded-full focus:outline-none transition-colors"
        @click="isEmojiPickerOpen = !isEmojiPickerOpen"
        :disabled="isUploading"
      >
        <Smile :size="24" />
      </button>

      <!-- File attachment button -->
      <button
        class="p-2 text-gray-500 hover:text-gray-700 rounded-full focus:outline-none transition-colors"
        @click="openFileDialog"
        :disabled="isUploading"
        :title="`Attach files (${filePreviewList.length}/${maxFiles})`"
      >
        <Paperclip :size="24" />
      </button>

      <!-- Hidden file input element -->
      <input
        ref="fileInputRef"
        type="file"
        multiple
        class="hidden"
        @change="handleFileSelect"
        :disabled="isUploading"
      />

      <!-- Message input field container -->
      <div class="flex-1 mx-2 relative">
        <textarea
          ref="textInput"
          v-model="message"
          :placeholder="placeholder"
          :disabled="isUploading"
          rows="1"
          class="w-full resize-none border-0 focus:ring-0 outline-none py-2 px-1 max-h-32"
          :style="{ height: textareaHeight }"
          @keydown="handleKeyDown"
          @input="handleInput"
        ></textarea>

        <!-- Character count -->
        <div
          v-if="showCharacterCount && message.length > 0"
          class="absolute -bottom-6 right-0 text-xs text-gray-400"
        >
          {{ message.length }}{{ maxCharacters ? `/${maxCharacters}` : '' }}
        </div>
      </div>

      <!-- Send/mic button -->
      <button
        v-if="canSend"
        class="p-2 text-blue-500 hover:text-blue-700 rounded-full focus:outline-none transition-all duration-200 transform hover:scale-105"
        @click="sendMessage"
        :disabled="isUploading"
        title="Send message"
      >
        <Send v-if="!isUploading" :size="24" />
        <svg
          v-else
          class="w-6 h-6 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </button>
      <button
        v-else
        class="p-2 text-gray-500 hover:text-gray-700 rounded-full focus:outline-none transition-colors"
        :disabled="isUploading"
      >
        <Mic :size="24" />
      </button>
    </div>

    <!-- Emoji picker panel (simplified, could be replaced with a library) -->
    <div
      v-if="isEmojiPickerOpen"
      class="p-2 border-t bg-white grid grid-cols-10 gap-1"
    >
      <button
        v-for="emoji in [
          '😀',
          '😂',
          '😊',
          '😍',
          '🥰',
          '😎',
          '👍',
          '❤️',
          '🎉',
          '🔥',
        ]"
        :key="emoji"
        class="text-xl hover:bg-gray-100 rounded p-1 transition-colors"
        @click="addEmoji(emoji)"
        :disabled="isUploading"
      >
        {{ emoji }}
      </button>
    </div>

    <!-- Drop zone overlay -->
    <div
      v-if="isDragging"
      class="absolute top-0 left-0 right-0 bottom-0 w-full h-full bg-blue-500 bg-opacity-10 flex items-center justify-center border-2 border-blue-500 border-dashed rounded-lg z-10"
    >
      <div class="text-center p-4 bg-white rounded-lg shadow">
        <Paperclip :size="32" class="mx-auto mb-2 text-blue-500" />
        <p class="text-lg font-medium">Drop files here</p>
        <p class="text-sm text-gray-500">
          {{ filePreviewList.length }}/{{ maxFiles }} files selected
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for textarea */
textarea::-webkit-scrollbar {
  width: 4px;
}

textarea::-webkit-scrollbar-track {
  background: transparent;
}

textarea::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 2px;
}

textarea::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* Smooth transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.transition-opacity {
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

/* Button animations */
button:active {
  transform: scale(0.98);
}

/* Disabled state */
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
