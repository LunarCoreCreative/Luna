// Luna API Configuration
// This file centralizes all API endpoints for easy switching between local dev, staging, and production.

const IS_PRODUCTION = import.meta.env.PROD;
const IS_STAGING = import.meta.env.VITE_STAGING === "true" || 
                   (typeof window !== 'undefined' && window.location.hostname.includes('staging'));

// Railway URLs
const PRODUCTION_API_URL = "https://luna-production-94f2.up.railway.app";
const STAGING_API_URL = "https://luna-staging.up.railway.app";
const LOCAL_API_URL = "http://127.0.0.1:8001";

// Select API URL based on environment
const CLOUD_API_URL = IS_STAGING ? STAGING_API_URL : PRODUCTION_API_URL;

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
    
    // Environment info
    IS_STAGING: IS_STAGING,
    ENVIRONMENT: IS_PRODUCTION ? (IS_STAGING ? "staging" : "production") : "development"
};

// Helper to check if we're running in Electron
export const IS_ELECTRON = typeof window !== 'undefined' && window.electron !== undefined;
