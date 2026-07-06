import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' garante que os assets funcionem também no GitHub Pages (prod-sup).
// build.outDir 'docs': o GitHub Pages publica a pasta /docs da branch main —
// mesmo fluxo do painel (git push e pronto), sem Actions.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'docs',
  },
  server: {
    host: true,
    port: 5173,
  },
})
