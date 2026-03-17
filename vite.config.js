import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'https://localhost:3000',
      '/auth': 'https://localhost:3000',
      '/logout': 'https://localhost:3000'
    }
  }
})
