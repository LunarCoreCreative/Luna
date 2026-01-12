import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('[MAIN] Iniciando aplicação...');
console.log('[MAIN] React version:', React.version);

// Verifica se React está disponível antes de renderizar
if (typeof React === 'undefined' || !React.forwardRef) {
    console.error('[MAIN] React não está disponível corretamente');
    document.body.innerHTML = `
        <div style="padding: 20px; color: red; font-family: monospace;">
            <h1>Erro: React não carregou corretamente</h1>
            <p>Por favor, recarregue a aplicação.</p>
        </div>
    `;
    throw new Error('React não está disponível');
}

console.log('[MAIN] React carregado com sucesso');

// Tratamento de erro para debug
try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
        throw new Error('Elemento #root não encontrado no DOM');
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <StrictMode>
            <App />
        </StrictMode>
    );
} catch (error) {
    console.error('[MAIN] Erro ao inicializar a aplicação:', error);
    document.body.innerHTML = `
        <div style="padding: 20px; color: red; font-family: monospace;">
            <h1>Erro ao carregar a aplicação</h1>
            <pre>${error.message}</pre>
            <pre>${error.stack}</pre>
        </div>
    `;
}
