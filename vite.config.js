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
                        // CRÍTICO: React e React-DOM devem estar no MESMO chunk que o código principal
                        // para garantir que sejam carregados juntos e na ordem correta
                        // NÃO separar React em chunk separado para evitar problemas de ordem de execução
                        if (id.includes('react/') || id.includes('react-dom/') || 
                            id.includes('react/index') || id.includes('react-dom/index')) {
                            // Retorna null para incluir no chunk principal
                            return null;
                        }
                        // Outras dependências do React podem estar juntas
                        if (id.includes('lucide-react') ||
                            id.includes('react-markdown') ||
                            id.includes('remark-gfm') ||
                            id.includes('react-syntax-highlighter')) {
                            return 'react-vendor';
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
                },
                // Garante que os chunks sejam carregados na ordem correta
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: (chunkInfo) => {
                    // React-core deve ter prioridade no nome para garantir ordem
                    if (chunkInfo.name === 'react-core') {
                        return 'assets/react-core-[hash].js';
                    }
                    return 'assets/[name]-[hash].js';
                },
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
