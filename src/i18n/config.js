import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar traduções de forma síncrona (JSONs são pequenos e são tree-shaken)
// Isso garante que o i18n esteja pronto antes do React renderizar
import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';

// Inicializar i18n imediatamente (síncrono)
i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            'pt-BR': {
                translation: ptBR
            },
            'en-US': {
                translation: enUS
            }
        },
        fallbackLng: 'pt-BR',
        lng: 'pt-BR', // Idioma padrão explícito
        supportedLngs: ['pt-BR', 'en-US'],
        interpolation: {
            escapeValue: false
        },
        // Inicializar imediatamente sem esperar
        initImmediate: false
    });

export default i18n;
