import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' garante que os assets funcionem também no GitHub Pages (prod-sup).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
})
