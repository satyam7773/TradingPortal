import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { 
    port: 5173,
    host: true,
    proxy: {
      '/user/api/instruments/active': {
        target: 'https://api-staging.rivoplus.live',
        changeOrigin: true,
        rewrite: (path) => path,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['framer-motion', 'lucide-react'],
          forms: ['formik', 'yup'],
          state: ['@reduxjs/toolkit', 'react-redux', 'redux-saga'],
        },
      },
    },
  },
})
