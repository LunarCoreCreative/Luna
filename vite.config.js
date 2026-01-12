import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
    plugins: [
        react({
            // Garante que o React seja sempre importado corretamente
            jsxRuntime: 'automatic'
        }),
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
        },
        {
            name: 'copy-changelog-plugin'
            // Plugin removido - deixa Vite gerenciar ordem automaticamente
        }
    ],
    base: './',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                // Deixa o Vite/Rollup gerenciar os chunks automaticamente
                // Evita problemas de ordem de carregamento com React
                manualChunks: {
                    // Apenas Firebase separado por ser grande
                    'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore']
                },
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]'
            }
        },
        // Otimizações de build
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false, // Mantém console.log para debug
                drop_debugger: true,
                pure_funcs: ['console.debug', 'console.trace'],
                // Não quebra referências do React
                keep_classnames: true,
                keep_fnames: true,
                // Evita problemas com React
                passes: 2
            },
            format: {
                // Mantém comentários importantes
                comments: /^!|@preserve|@license|@cc_on/
            },
            mangle: {
                // Não minifica propriedades do React
                reserved: ['React', 'forwardRef', 'createElement', 'useState', 'useEffect']
            }
        },
        // Chunk size warnings
        chunkSizeWarningLimit: 1000,
        // Configuração específica para build de produção
        commonjsOptions: {
            // Garante que o React seja tratado corretamente
            transformMixedEsModules: true
        }
    },
    // Otimizações de desenvolvimento
    optimizeDeps: {
        include: ['react', 'react-dom', 'lucide-react'],
        // Força o React a ser um singleton
        esbuildOptions: {
            target: 'esnext'
        }
    },
    resolve: {
        // Garante que sempre resolva para a mesma instância do React
        dedupe: ['react', 'react-dom']
    }
})
