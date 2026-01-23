import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react({
      // Otimizar Fast Refresh
      fastRefresh: true,
      // Não incluir runtime no bundle principal
      jsxRuntime: 'automatic',
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Otimizações de build e dev
  optimizeDeps: {
    // Pre-bundle de dependências pesadas
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'i18next',
      'react-i18next',
      'lucide-react',
    ],
    // Excluir dependências que não precisam ser pré-empacotadas ou têm exports complexos
    exclude: ['electron'],
  },
  // Configurações de build para produção
  build: {
    // Chunking otimizado
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
          // Firebase v9+ (modular) não expõe entrypoint "firebase"
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        },
      },
    },
    // Limite de avisos de chunk size
    chunkSizeWarningLimit: 1000,
  },
  // Configurações do servidor de desenvolvimento
  server: {
    // HMR otimizado
    hmr: {
      overlay: true,
    },
  },
  // Cache otimizado
  cacheDir: 'node_modules/.vite',
})
