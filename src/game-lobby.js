// Game Lobby UI Component
import { CONFIG, GAME_PHASE, logger } from './config.js';

export class GameLobby {
    constructor(sessionManager, container) {
        this.sessionManager = sessionManager;
        this.container = container;
        this.currentSnapshot = null;
        this.hasJoined = false;

        this.sessionManager.on('sessionJoined', this.onSessionJoined.bind(this));
        this.sessionManager.on('sessionUpdate', this.onSessionUpdate.bind(this));
        this.sessionManager.on('gameStarted', this.onGameStarted.bind(this));
        this.sessionManager.on('sessionLeft', this.onSessionLeft.bind(this));
        this.sessionManager.on('sessionTimeout', this.onSessionTimeout.bind(this));
    }

    show() {
        this.render();
        logger.info('Lobby shown');
    }

    hide() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    render() {
        if (!this.container) return;

        const html = `
            <div class="game-lobby">
                <div class="lobby-header">
                    <h2>Ожидание игроков</h2>
                    <div class="meeting-info">
                        Встреча: ${this.sessionManager.gameParams.meetingId || 'Новая'}
                    </div>
                </div>

                <div class="players-section">
                    <h3>Игроки (${this.currentSnapshot?.participants?.length || 0}/${this.sessionManager.gameParams.totalPlayers})</h3>
                    <div class="players-list" id="players-list">
                        ${this.renderPlayersList()}
                    </div>
                </div>

                <div class="lobby-controls">
                    ${this.renderEarlyStartSection()}
                    <button class="btn-leave" id="leave-btn">Выйти из игры</button>
                </div>

                <div class="status-info">
                    <p>Игра начнется автоматически при наборе ${this.sessionManager.gameParams.totalPlayers} игроков</p>
                    <p>Или проголосуйте за досрочный старт</p>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    renderPlayersList() {
        if (!this.currentSnapshot?.participants) {
            return '<div class="no-players">Ожидание игроков...</div>';
        }

        return this.currentSnapshot.participants.map(player => `
            <div class="player-item" data-player-id="${player.id}">
                <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                    <div class="player-status">
                        ${this.getPlayerStatus(player)}
                        ${this.getPlayerVoteStatus(player)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    getPlayerStatus(player) {
        if (player.id === this.sessionManager.currentUser?.id) {
            return '<span class="status-you">(вы)</span>';
        }
        return '';
    }

    getPlayerVoteStatus(player) {
        if (!this.currentSnapshot?.votes) return '';

        const vote = this.currentSnapshot.votes[player.id];
        if (vote === undefined) return '';

        return vote ?
            '<span class="vote-status vote-yes">✓ Готов</span>' :
            '<span class="vote-status vote-no">✗ Жду</span>';
    }

    renderEarlyStartSection() {
        if (!this.currentSnapshot?.consensus) return '';

        const { currentParticipants, earlyStartVotes, consensusReached, canStartEarly } = this.currentSnapshot.consensus;
        const myVote = this.currentSnapshot.votes?.[this.sessionManager.currentUser?.id];

        // Critical Fix #3: Only count votes from current participants
        const html = `
            <div class="early-start-section">
                <h4>Досрочный старт</h4>
                <div class="vote-stats">
                    Голосов за старт: ${earlyStartVotes}/${currentParticipants}
                </div>
                <div class="vote-buttons">
                    <button class="btn-vote ${myVote === true ? 'active' : ''}"
                            id="vote-yes" ${myVote === true ? 'disabled' : ''}>
                        Готов начать
                    </button>
                    <button class="btn-vote ${myVote === false ? 'active' : ''}"
                            id="vote-no" ${myVote === false ? 'disabled' : ''}>
                        Подождать еще
                    </button>
                </div>
                ${consensusReached ? '<div class="consensus-reached">🎉 Консенсус достигнут! Игра скоро начнется...</div>' : ''}
            </div>
        `;

        return html;
    }

    attachEventListeners() {
        // Vote buttons
        const voteYesBtn = this.container.querySelector('#vote-yes');
        const voteNoBtn = this.container.querySelector('#vote-no');

        if (voteYesBtn) {
            voteYesBtn.addEventListener('click', () => {
                this.sessionManager.voteEarlyStart(true);
                logger.info('Voted yes for early start');
            });
        }

        if (voteNoBtn) {
            voteNoBtn.addEventListener('click', () => {
                this.sessionManager.voteEarlyStart(false);
                logger.info('Voted no for early start');
            });
        }

        // Leave button - Critical Fix #4
        const leaveBtn = this.container.querySelector('#leave-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', () => {
                this.sessionManager.leaveSession();
                logger.info('Leave button clicked');
            });
        }
    }

    // Event handlers
    onSessionJoined(data) {
        if (data.phase === GAME_PHASE.LOBBY) {
            this.hasJoined = true;
            this.show();
        }
    }

    onSessionUpdate(snapshot) {
        this.currentSnapshot = snapshot;
        if (this.hasJoined && !this.container.querySelector('.game-lobby')) {
            this.show();
        } else {
            this.updateDisplay();
        }
    }

    onGameStarted(snapshot) {
        this.hasJoined = false;
        logger.info('Game started, hiding lobby');
        // The session manager will handle the transition to game screen
    }

    onSessionLeft() {
        this.hasJoined = false;
        this.hide();
    }

    onSessionTimeout() {
        this.hasJoined = false;
        this.hide();
        // Could show timeout message
    }

    updateDisplay() {
        if (!this.container.querySelector('.game-lobby')) return;

        // Update players list
        const playersList = this.container.querySelector('#players-list');
        if (playersList) {
            playersList.innerHTML = this.renderPlayersList();
        }

        // Update early start section
        const earlyStartSection = this.container.querySelector('.early-start-section');
        if (earlyStartSection) {
            earlyStartSection.outerHTML = this.renderEarlyStartSection();
            this.attachEventListeners(); // Re-attach listeners after HTML update
        }
    }
}