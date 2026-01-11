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
        emptyOutDir: true
    }
})
