import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 让打包结果可以放在网站的任意子目录（例如 你的域名/tarot/）
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
})
