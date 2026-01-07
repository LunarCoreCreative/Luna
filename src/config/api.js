// Luna API Configuration
// This file centralizes all API endpoints for easy switching between local dev and cloud production.

const IS_PRODUCTION = import.meta.env.PROD;

// Railway URL (Production)
const CLOUD_API_URL = "https://luna-production-94f2.up.railway.app";
const LOCAL_API_URL = "http://127.0.0.1:8001";

export const API_CONFIG = {
    // HTTP API Base URL
    BASE_URL: IS_PRODUCTION ? CLOUD_API_URL : LOCAL_API_URL,

    // WebSocket URLs
    WS_AGENT: IS_PRODUCTION
        ? CLOUD_API_URL.replace("https://", "wss://") + "/ws/agent"
        : "ws://127.0.0.1:8001/ws/agent",

    WS_LINK: IS_PRODUCTION
        ? CLOUD_API_URL.replace("https://", "wss://") + "/ws/link"
        : "ws://127.0.0.1:8001/ws/link",

    // Feature Flags
    ENABLE_LOCAL_LINK: true, // Enable Luna Link for local file editing
};

// Helper to check if we're running in Electron
export const IS_ELECTRON = typeof window !== 'undefined' && window.electron !== undefined;
