// Luna Mobile API Configuration
// Connects directly to Railway backend

export const API_CONFIG = {
    // HTTP API Base URL (Railway production)
    BASE_URL: "https://luna-production-94f2.up.railway.app",

    // WebSocket URL for agent streaming
    WS_AGENT: "wss://luna-production-94f2.up.railway.app/ws/agent",

    // WebSocket URL for link service (not used in mobile MVP)
    WS_LINK: "wss://luna-production-94f2.up.railway.app/ws/link",
};
