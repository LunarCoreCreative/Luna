import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
    plugins: [
        react(),
        {
            name: 'copy-changelog',
            writeBundle() {
                // Copia CHANGELOG.md para dist após o build
                try {
                    const changelogPath = resolve(__dirname, 'CHANGELOG.md');
                    const distPath = resolve(__dirname, 'dist', 'CHANGELOG.md');
                    
                    if (existsSync(changelogPath)) {
                        copyFileSync(changelogPath, distPath);
                        console.log('[VITE] CHANGELOG.md copiado para dist');
                    } else {
                        console.warn('[VITE] CHANGELOG.md não encontrado');
                    }
                } catch (error) {
                    console.warn('[VITE] Erro ao copiar CHANGELOG.md:', error);
                }
            }
        }
    ],
    base: './',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    // Vendor chunks - separados para melhor cache
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom')) {
                            return 'react-vendor';
                        }
                        if (id.includes('lucide-react')) {
                            return 'ui-vendor';
                        }
                        if (id.includes('react-markdown') || id.includes('remark-gfm') || id.includes('react-syntax-highlighter')) {
                            return 'markdown-vendor';
                        }
                        if (id.includes('firebase')) {
                            return 'firebase-vendor';
                        }
                        // Outros vendors
                        return 'vendor';
                    }
                    // Feature chunks - apenas componentes pesados
                    if (id.includes('/components/ide/')) {
                        return 'ide';
                    }
                    if (id.includes('/components/Canvas')) {
                        return 'canvas';
                    }
                }
            }
        },
        // Otimizações de build
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false, // Mantém console.log para debug
                drop_debugger: true,
                pure_funcs: ['console.debug', 'console.trace']
            }
        },
        // Chunk size warnings
        chunkSizeWarningLimit: 1000
    },
    // Otimizações de desenvolvimento
    optimizeDeps: {
        include: ['react', 'react-dom', 'lucide-react']
    }
})
