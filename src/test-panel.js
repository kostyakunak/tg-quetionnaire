// Test Panel for development - disabled in production
import { CONFIG, logger, parseGameParams } from './config.js';

export class TestPanel {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
        this.isVisible = false;
        this.panel = null;

        // Only show in test mode
        if (CONFIG.USE_TEST_MODE && CONFIG.SHOW_TEST_PANEL) {
            this.createPanel();
        }
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'test-panel';
        this.panel.innerHTML = `
            <div class="test-panel-header">
                <h4>🧪 Test Panel</h4>
                <button class="test-toggle">▼</button>
            </div>
            <div class="test-panel-content">
                <div class="test-section">
                    <h5>Session Info</h5>
                    <div id="session-info">No session</div>
                </div>

                <div class="test-section">
                    <h5>Multi-User Emulator</h5>
                    <button id="open-window-btn">Открыть второе окно</button>
                    <div class="window-list" id="window-list"></div>
                </div>

                <div class="test-section">
                    <h5>Game Params</h5>
                    <div id="game-params"></div>
                </div>

                <div class="test-section">
                    <h5>Logs</h5>
                    <div class="logs-container">
                        <button id="clear-logs">Clear</button>
                        <div id="logs" class="logs"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.panel);
        this.attachEventListeners();
        this.updateDisplay();

        // Override logger to capture logs
        this.originalLogger = { ...logger };
        const self = this;
        Object.keys(logger).forEach(level => {
            const original = logger[level];
            logger[level] = function(...args) {
                self.addLog(level, ...args);
                original.apply(this, args);
            };
        });
    }

    attachEventListeners() {
        const toggle = this.panel.querySelector('.test-toggle');
        toggle.addEventListener('click', () => this.toggle());

        const openWindowBtn = this.panel.querySelector('#open-window-btn');
        openWindowBtn.addEventListener('click', () => this.openTestWindow());

        const clearLogsBtn = this.panel.querySelector('#clear-logs');
        clearLogsBtn.addEventListener('click', () => this.clearLogs());

        // Listen to session manager events
        this.sessionManager.on('sessionUpdate', (snapshot) => this.updateSessionInfo(snapshot));
        this.sessionManager.on('sessionJoined', (data) => this.updateSessionInfo(data.session));
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.panel.classList.toggle('collapsed', !this.isVisible);
    }

    openTestWindow() {
        // Generate unique user ID for new window
        const userId = `test_window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const url = new URL(window.location);
        url.searchParams.set('testUser', userId);

        const newWindow = window.open(url.toString(), `test_${userId}`, 'width=800,height=600');

        if (newWindow) {
            this.addWindowToList(userId, newWindow);
            logger.info(`Opened test window: ${userId}`);
        }
    }

    addWindowToList(userId, windowRef) {
        const list = this.panel.querySelector('#window-list');
        const item = document.createElement('div');
        item.className = 'window-item';
        item.innerHTML = `
            <span>${userId.slice(-8)}</span>
            <button onclick="this.parentElement.remove(); window.close();">×</button>
        `;
        list.appendChild(item);

        // Check if window is closed
        const checkClosed = setInterval(() => {
            if (windowRef.closed) {
                item.remove();
                clearInterval(checkClosed);
            }
        }, 1000);
    }

    updateDisplay() {
        if (!this.panel) return;

        const params = parseGameParams();
        const paramsDiv = this.panel.querySelector('#game-params');
        paramsDiv.innerHTML = `
            Meeting ID: ${params.meetingId || 'null'}<br>
            Total Players: ${params.totalPlayers}<br>
            Game ID: ${params.gameId}<br>
            Test Mode: ${CONFIG.USE_TEST_MODE}<br>
            Telegram Available: ${CONFIG.TELEGRAM_AVAILABLE}
        `;
    }

    updateSessionInfo(data) {
        const infoDiv = this.panel.querySelector('#session-info');
        if (data && data.id) {
            infoDiv.innerHTML = `
                Session ID: ${data.id}<br>
                Status: ${data.status}<br>
                Players: ${data.currentPlayers}/${data.totalPlayers}<br>
                Meeting: ${data.meetingId}
            `;
        } else {
            infoDiv.textContent = 'No active session';
        }
    }

    addLog(level, ...args) {
        if (!this.panel) return;

        const logsDiv = this.panel.querySelector('#logs');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${level}`;
        logEntry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-level">[${level.toUpperCase()}]</span>
            <span class="log-message">${args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ')}</span>
        `;

        logsDiv.appendChild(logEntry);
        logsDiv.scrollTop = logsDiv.scrollHeight;

        // Limit log entries
        while (logsDiv.children.length > 100) {
            logsDiv.removeChild(logsDiv.firstChild);
        }
    }

    clearLogs() {
        const logsDiv = this.panel.querySelector('#logs');
        logsDiv.innerHTML = '';
    }
}