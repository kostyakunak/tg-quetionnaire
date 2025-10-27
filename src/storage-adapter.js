// Storage Adapter Interface and Implementations
// This allows switching between mock storage and REST API seamlessly

// Base StorageAdapter interface
export class StorageAdapter {
    // Session management
    async getActiveSession(meetingId, gameId) { throw new Error('Not implemented'); }
    async createWaitingSession(meetingId, gameId, totalPlayers) { throw new Error('Not implemented'); }
    async setSessionStatus(sessionId, status) { throw new Error('Not implemented'); }

    // Participant management
    async join(sessionId, participant) { throw new Error('Not implemented'); }
    async leave(sessionId, participantId) { throw new Error('Not implemented'); }

    // Voting
    async voteEarlyStart(sessionId, participantId, vote) { throw new Error('Not implemented'); }

    // Data retrieval
    async getSessionSnapshot(sessionId) { throw new Error('Not implemented'); }
}

// Mock/InMemory implementation for testing
export class MockStorageAdapter extends StorageAdapter {
    constructor() {
        super();
        this.sessions = new Map();
        this.participants = new Map();
        this.votes = new Map();
        this.nextSessionId = 1;
        this.nextParticipantId = 1;
    }

    async getActiveSession(meetingId, gameId) {
        // Priority: in_progress > waiting
        const inProgress = Array.from(this.sessions.values())
            .find(s => s.meetingId === meetingId && s.gameId === gameId && s.status === 'in_progress');

        if (inProgress) return inProgress;

        const waiting = Array.from(this.sessions.values())
            .find(s => s.meetingId === meetingId && s.gameId === gameId && s.status === 'waiting');

        return waiting || null;
    }

    async createWaitingSession(meetingId, gameId, totalPlayers) {
        const session = {
            id: this.nextSessionId++,
            meetingId,
            gameId,
            status: 'waiting',
            totalPlayers,
            currentPlayers: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.sessions.set(session.id, session);
        this.participants.set(session.id, new Map());
        this.votes.set(session.id, new Map());

        return session;
    }

    async setSessionStatus(sessionId, status) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = status;
            session.updatedAt = new Date();
            return true;
        }
        return false;
    }

    async join(sessionId, participant) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'waiting') return false;

        const sessionParticipants = this.participants.get(sessionId);
        if (sessionParticipants.has(participant.id)) return true; // Already joined

        sessionParticipants.set(participant.id, {
            ...participant,
            joinedAt: new Date()
        });

        session.currentPlayers = sessionParticipants.size;
        session.updatedAt = new Date();

        return true;
    }

    async leave(sessionId, participantId) {
        const sessionParticipants = this.participants.get(sessionId);
        if (!sessionParticipants) return false;

        const removed = sessionParticipants.delete(participantId);
        if (removed) {
            const session = this.sessions.get(sessionId);
            session.currentPlayers = sessionParticipants.size;
            session.updatedAt = new Date();

            // Clear votes for this participant
            const sessionVotes = this.votes.get(sessionId);
            if (sessionVotes) {
                sessionVotes.delete(participantId);
            }
        }

        return removed;
    }

    async voteEarlyStart(sessionId, participantId, vote) {
        const session = this.sessions.get(sessionId);
        const sessionParticipants = this.participants.get(sessionId);

        if (!session || !sessionParticipants || !sessionParticipants.has(participantId)) {
            return false;
        }

        const sessionVotes = this.votes.get(sessionId);
        sessionVotes.set(participantId, vote);

        session.updatedAt = new Date();
        return true;
    }

    async getSessionSnapshot(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const participants = Array.from(this.participants.get(sessionId)?.values() || []);
        const votes = Array.from(this.votes.get(sessionId)?.entries() || []);

        // Calculate consensus
        const currentParticipants = participants.length;
        const earlyStartVotes = votes.filter(([_, vote]) => vote).length;
        const consensusReached = currentParticipants > 0 && earlyStartVotes === currentParticipants;

        return {
            session: { ...session },
            participants,
            votes: Object.fromEntries(votes),
            consensus: {
                currentParticipants,
                earlyStartVotes,
                consensusReached,
                canStartEarly: consensusReached || session.currentPlayers >= session.totalPlayers
            }
        };
    }
}

// REST implementation for production
export class RestStorageAdapter extends StorageAdapter {
    constructor(baseUrl) {
        super();
        this.baseUrl = baseUrl;
    }

    async _fetch(endpoint, options = {}) {
        const response = await fetch(`${this.baseUrl}/api/game/${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async getActiveSession(meetingId, gameId) {
        return this._fetch(`session?meetingId=${meetingId}&gameId=${gameId}`);
    }

    async createWaitingSession(meetingId, gameId, totalPlayers) {
        return this._fetch('session', {
            method: 'POST',
            body: JSON.stringify({ meetingId, gameId, totalPlayers })
        });
    }

    async setSessionStatus(sessionId, status) {
        return this._fetch(`session/${sessionId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    async join(sessionId, participant) {
        return this._fetch(`session/${sessionId}/join`, {
            method: 'POST',
            body: JSON.stringify(participant)
        });
    }

    async leave(sessionId, participantId) {
        return this._fetch(`session/${sessionId}/leave/${participantId}`, {
            method: 'DELETE'
        });
    }

    async voteEarlyStart(sessionId, participantId, vote) {
        return this._fetch(`session/${sessionId}/vote`, {
            method: 'POST',
            body: JSON.stringify({ participantId, vote })
        });
    }

    async getSessionSnapshot(sessionId) {
        return this._fetch(`session/${sessionId}/snapshot`);
    }
}

// Import config synchronously since it's a module
import { CONFIG } from './config.js';

// Factory to create the appropriate adapter
export function createStorageAdapter() {
    if (CONFIG.USE_TEST_MODE) {
        return new MockStorageAdapter();
    } else {
        return new RestStorageAdapter(CONFIG.API_BASE_URL);
    }
}