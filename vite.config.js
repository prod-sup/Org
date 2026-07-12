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
    // o three.js sozinho já passa de 500 KB (inevitável p/ um motor 3D);
    // ele é cacheável e o splash cobre o carregamento — sobe o teto do aviso
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // chunks separados por dependência: cada um é cacheado à parte, então
        // mexer no app (ou só no gsap) não invalida o pesado three.js
        manualChunks: {
          'vendor-three': ['three'],
          'vendor-r3f': [
            '@react-three/fiber',
            '@react-three/drei',
            '@react-three/postprocessing',
            'postprocessing',
          ],
          'vendor-gsap': ['gsap'],
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
