import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Dùng cho local dev
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Loại bỏ /api khỏi URL
      },
    },
  },
  build: {
    outDir: 'dist', // Thư mục đầu ra cho Vercel
    sourcemap: false, // Tắt sourcemap để giảm kích thước build
  },
})