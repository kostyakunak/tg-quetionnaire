import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // важно оставить base по умолчанию "/" — так ассеты будут по /assets/...
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        questionnaire: resolve(__dirname, 'questionnaire.html')
      }
    }
  }
})