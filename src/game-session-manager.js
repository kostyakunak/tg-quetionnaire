// Game Session Manager - Core logic for session management and polling
import { CONFIG, SESSION_STATUS, GAME_PHASE, logger, parseGameParams } from './config.js';
import { createStorageAdapter } from './storage-adapter.js';

export class GameSessionManager {
    constructor() {
        this.storage = createStorageAdapter();
        this.currentSession = null;
        this.currentUser = null;
        this.gameParams = parseGameParams();
        this.pollingInterval = null;
        this.inactivityTimer = null;
        this.listeners = new Map();

        // Generate deterministic user ID for test mode
        this.initializeUserId();

        // Activity tracking
        this.lastActivity = Date.now();
        this.trackActivity();
    }

    // Event system for UI updates
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(callback => callback(data));
    }

    // User identification
    initializeUserId() {
        if (CONFIG.TELEGRAM_AVAILABLE) {
            // Production: use Telegram user ID
            this.currentUser = {
                id: Telegram.WebApp.initDataUnsafe.user.id,
                name: Telegram.WebApp.initDataUnsafe.user.first_name,
                username: Telegram.WebApp.initDataUnsafe.user.username
            };
        } else {
            // Test mode: deterministic ID based on tab/session
            const testUserKey = 'test_user_id';
            let userId = localStorage.getItem(testUserKey);
            if (!userId) {
                userId = `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem(testUserKey, userId);
            }

            this.currentUser = {
                id: userId,
                name: `TestUser_${userId.slice(-4)}`,
                isTestUser: true
            };
        }

        logger.info('User initialized:', this.currentUser);
    }

    // Core session logic - Critical Fix #1
    async getOrCreateSession() {
        logger.info('getOrCreateSession called for meeting:', this.gameParams.meetingId);

        try {
            // 1. First try to find in_progress session (highest priority)
            let session = await this.storage.getActiveSession(this.gameParams.meetingId, this.gameParams.gameId);

            if (session && session.status === SESSION_STATUS.IN_PROGRESS) {
                logger.info('Found in_progress session:', session.id);
                this.currentSession = session;
                this.emit('sessionJoined', { session, phase: GAME_PHASE.GAME });
                return session;
            }

            // 2. If no in_progress, try waiting session
            if (!session || session.status !== SESSION_STATUS.WAITING) {
                logger.info('No active session found, checking for waiting session');
                session = await this.storage.getActiveSession(this.gameParams.meetingId, this.gameParams.gameId);
            }

            if (session && session.status === SESSION_STATUS.WAITING) {
                logger.info('Found waiting session:', session.id);
                this.currentSession = session;
                await this.attemptJoinSession();
                return session;
            }

            // 3. No active session exists, create new waiting session
            logger.info('Creating new waiting session');
            session = await this.storage.createWaitingSession(
                this.gameParams.meetingId,
                this.gameParams.gameId,
                this.gameParams.totalPlayers
            );

            this.currentSession = session;
            await this.attemptJoinSession();
            return session;

        } catch (error) {
            logger.error('Error in getOrCreateSession:', error);
            throw error;
        }
    }

    async attemptJoinSession() {
        if (!this.currentSession || !this.currentUser) return false;

        logger.info('Attempting to join session:', this.currentSession.id);

        try {
            const joined = await this.storage.join(this.currentSession.id, this.currentUser);
            if (joined) {
                logger.info('Successfully joined session');
                this.startPolling();
                this.resetInactivityTimer();
                this.emit('sessionJoined', { session: this.currentSession, phase: GAME_PHASE.LOBBY });
                return true;
            } else {
                logger.warn('Failed to join session');
                return false;
            }
        } catch (error) {
            logger.error('Error joining session:', error);
            return false;
        }
    }

    async leaveSession() {
        if (!this.currentSession || !this.currentUser) return;

        logger.info('Leaving session:', this.currentSession.id);

        try {
            await this.storage.leave(this.currentSession.id, this.currentUser.id);
            this.stopPolling();
            this.currentSession = null;
            this.emit('sessionLeft');
        } catch (error) {
            logger.error('Error leaving session:', error);
        }
    }

    async voteEarlyStart(vote) {
        if (!this.currentSession || !this.currentUser) return false;

        logger.info('Voting early start:', vote);

        try {
            const success = await this.storage.voteEarlyStart(this.currentSession.id, this.currentUser.id, vote);
            if (success) {
                this.resetInactivityTimer();
            }
            return success;
        } catch (error) {
            logger.error('Error voting early start:', error);
            return false;
        }
    }

    // Polling mechanism
    startPolling() {
        if (this.pollingInterval) return;

        logger.info('Starting polling');
        this.pollingInterval = setInterval(async () => {
            await this.pollSessionUpdate();
        }, CONFIG.GAME_POLL_INTERVAL_MS);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            logger.info('Stopped polling');
        }
    }

    async pollSessionUpdate() {
        if (!this.currentSession) return;

        try {
            const snapshot = await this.storage.getSessionSnapshot(this.currentSession.id);

            if (!snapshot) {
                logger.warn('Session no longer exists');
                this.emit('sessionEnded');
                this.stopPolling();
                return;
            }

            // Check if session status changed
            if (snapshot.session.status !== this.currentSession.status) {
                logger.info('Session status changed:', snapshot.session.status);
                this.currentSession = snapshot.session;

                if (snapshot.session.status === SESSION_STATUS.IN_PROGRESS) {
                    // Critical Fix #2: Stop polling and transition to game
                    this.stopPolling();
                    this.emit('gameStarted', snapshot);
                    return;
                }
            }

            // Emit snapshot for UI updates
            this.emit('sessionUpdate', snapshot);

        } catch (error) {
            logger.error('Error polling session:', error);
        }
    }

    // Activity tracking - Critical Fix #5
    trackActivity() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        const activityHandler = () => {
            this.lastActivity = Date.now();
            this.resetInactivityTimer();
        };

        events.forEach(event => {
            document.addEventListener(event, activityHandler, true);
        });

        // Page lifecycle handling - Critical Fix #4
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                logger.info('Page hidden, marking user as inactive');
                // Could mark user as temporarily away
            } else {
                logger.info('Page visible, resetting activity');
                this.lastActivity = Date.now();
                this.resetInactivityTimer();
            }
        });

        window.addEventListener('beforeunload', () => {
            logger.info('Page unloading, leaving session');
            this.leaveSession();
        });
    }

    resetInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }

        this.inactivityTimer = setTimeout(() => {
            logger.warn('Inactivity timeout reached, ending session');
            this.emit('sessionTimeout');
            this.leaveSession();
        }, CONFIG.INACTIVITY_TIMEOUT_MS);
    }

    // Cleanup
    destroy() {
        this.stopPolling();
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        this.leaveSession();
    }
}