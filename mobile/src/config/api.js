/**
 * Luna API Configuration (Mobile)
 * =================================
 * Configuração da API para conectar com o backend.
 */

import Constants from 'expo-constants';

// URLs do backend
const PRODUCTION_API_URL = "https://luna-production-94f2.up.railway.app";
// IMPORTANTE: Use o IP da sua máquina na rede local, não 127.0.0.1
// Para descobrir seu IP: Windows: ipconfig | findstr IPv4 | Mac/Linux: ifconfig | grep inet
const LOCAL_API_URL = "http://10.0.4.10:8082";

// ============================================================================
// CONFIGURAÇÃO: Escolha qual API usar
// ============================================================================
// Se você está usando tunnel do Expo (não está na mesma rede Wi-Fi),
// defina FORCE_PRODUCTION_API como true para usar a API de produção
// mesmo em modo desenvolvimento
const FORCE_PRODUCTION_API = true; // Mude para false se quiser usar API local

// Determina a URL base baseado no ambiente
// Para desenvolvimento local, você pode usar o IP da sua máquina na rede
// Exemplo: "http://192.168.1.100:8082" (substitua pelo seu IP)
const IS_DEV = __DEV__;
const API_BASE_URL = (FORCE_PRODUCTION_API || !IS_DEV) ? PRODUCTION_API_URL : LOCAL_API_URL;

export const API_CONFIG = {
  // HTTP API Base URL
  BASE_URL: API_BASE_URL,

  // WebSocket URLs
  WS_AGENT: API_BASE_URL
    .replace("https://", "wss://")
    .replace("http://", "ws://") + "/ws/agent",

  // Environment info
  IS_DEV: IS_DEV,
  ENVIRONMENT: IS_DEV ? "development" : "production"
};

export default API_CONFIG;