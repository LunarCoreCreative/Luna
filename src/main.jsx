import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Importar i18n ANTES do App para garantir que está inicializado
import './i18n/config'
import App from './App.jsx'

// Renderizar imediatamente - i18n já está inicializado
const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
