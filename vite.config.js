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
    rollupOptions: {
      output: {
        // three.js + pós-processamento num chunk próprio (cacheável e
        // paralelo): o app carrega e pinta a UI antes do motor 3D chegar
        manualChunks: {
          'vendor-three': [
            'three',
            '@react-three/fiber',
            '@react-three/drei',
            '@react-three/postprocessing',
            'postprocessing',
          ],
          'vendor-react': ['react', 'react-dom', 'gsap'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
