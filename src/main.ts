import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import route from './router'
import { createPinia } from 'pinia'
import axiosPlugin from './plugins/axios'

const app = createApp(App)
app.use(route)
app.use(createPinia())
app.use(axiosPlugin)
app.mount('#app')
