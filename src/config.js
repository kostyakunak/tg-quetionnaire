// Game configuration - centralized settings for easy deployment switching
export const CONFIG = {
    // Polling and timing
    GAME_POLL_INTERVAL_MS: 2000, // How often to poll for session updates
    INACTIVITY_TIMEOUT_MS: 10 * 60 * 1000, // 10 minutes inactivity timeout

    // Game session settings
    MIN_PLAYERS: 2, // Minimum players to start game
    MAX_PLAYERS: 5, // Maximum players per session

    // Test mode settings
    USE_TEST_MODE: window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1' ||
                   window.location.search.includes('test=1'),

    // Telegram integration
    TELEGRAM_AVAILABLE: typeof Telegram !== 'undefined' && Telegram.WebApp,

    // URLs and API
    API_BASE_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://meta-questionnaire-production.up.railway.app',

    // Feature flags for production
    SHOW_TEST_PANEL: false, // Disable test panel in production
    ENABLE_MULTI_VIEW: false, // Disable multi-user view in production
};

// Session status constants
export const SESSION_STATUS = {
    WAITING: 'waiting',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
};

// Game phases
export const GAME_PHASE = {
    LOBBY: 'lobby',
    GAME: 'game',
    RESULTS: 'results'
};

// URL parameter parsing
export function parseGameParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        meetingId: urlParams.get('m') || null,
        totalPlayers: parseInt(urlParams.get('t')) || CONFIG.MAX_PLAYERS,
        gameId: urlParams.get('g') || 'default'
    };
}

// Logging utility
export const logger = {
    info: (message, ...args) => {
        if (CONFIG.USE_TEST_MODE) {
            console.log(`[GAME] ${message}`, ...args);
        }
    },
    warn: (message, ...args) => {
        console.warn(`[GAME] ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[GAME] ${message}`, ...args);
    }
};