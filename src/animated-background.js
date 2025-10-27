class AnimatedBackground {
    constructor(canvasId) {
        console.log('🎨 AnimatedBackground: Constructor called with canvasId:', canvasId);
        this.canvas = document.getElementById(canvasId);
        console.log('🎨 AnimatedBackground: Canvas element found:', this.canvas ? 'yes' : 'no', this.canvas);
        if (!this.canvas) {
            console.error('🎨 AnimatedBackground: Canvas element not found with ID:', canvasId);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        console.log('🎨 AnimatedBackground: Canvas context obtained:', this.ctx ? 'yes' : 'no');
        if (!this.ctx) {
            console.error('🎨 AnimatedBackground: Failed to get 2D context');
            return;
        }
        this.lines = [];
        this.activeLines = 0;
        this.maxActiveLines = 3;
        this.spawnInterval = null;
        this.animationFrame = null;
        this.isRunning = false;
        this.time = 0;
        
        // Mobile detection and adaptive parameters
        this.isMobile = window.innerWidth <= 768;
        this.dashLength = this.isMobile ? 13 : 20; // 1.5x smaller on mobile
        this.minGap = this.isMobile ? 17 : 25; // proportionally smaller gap
        this.baseThickness = this.isMobile ? 4.5 : 7; // 1.5x smaller thickness
        this.thicknessVariation = this.isMobile ? 0.7 : 1; // proportionally smaller variation
        
        // Listen for resize events to update mobile detection
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            
            // Update parameters if mobile state changed
            if (wasMobile !== this.isMobile) {
                this.dashLength = this.isMobile ? 13 : 20;
                this.minGap = this.isMobile ? 17 : 25;
                this.baseThickness = this.isMobile ? 4.5 : 7;
                this.thicknessVariation = this.isMobile ? 0.7 : 1;
                console.log(`🎨 AnimatedBackground: Mobile state changed to ${this.isMobile}, updated parameters`);
            }
        });

        // Parallax scrolling state
        this.isInParallaxTransition = false;
        this.parallaxDirection = null;
        this.parallaxStartTime = 0;
        this.parallaxDuration = 600; // Match CSS transition duration
        this.parallaxOffset = { x: 0, y: 0 }; // Global parallax offset for all lines
        this.holdLines = []; // Track lines in hold phase for continuation

        // Canvas dimensions protection during transitions
        this.transitionCanvasWidth = null;
        this.transitionCanvasHeight = null;
        this.pendingResize = null;

        // Object pooling for dashes
        this.dashPool = [];
        this.maxDashes = 100;

        this.init();
    }

    init() {
        console.log('🎨 AnimatedBackground: Initializing animation canvas (resize will be called externally)');
        // Don't resize immediately - will be called after DOM layout
        window.addEventListener('resize', () => this.resize());
        this.start();
    }

    resize() {
        // Получаем размеры от родительского контейнера (#questionnaire)
        const container = this.canvas.parentElement;
        if (!container) {
            console.error('🎨 AnimatedBackground: No parent container found');
            return;
        }

        const rect = container.getBoundingClientRect();
        const computedStyle = getComputedStyle(this.canvas);
        console.log('🎨 AnimatedBackground: Resizing canvas from container');
        console.log('  - Container element:', container);
        console.log('  - Container getBoundingClientRect:', { width: rect.width, height: rect.height, top: rect.top, left: rect.left });
        console.log('  - Canvas computed style position:', computedStyle.position, 'display:', computedStyle.display, 'visibility:', computedStyle.visibility);

        // Check if canvas is actually visible
        const isVisible = rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
        console.log('  - Canvas appears visible:', isVisible);

        // If in parallax transition, delay the resize until after transition completes
        if (this.isInParallaxTransition) {
            console.log('🎨 AnimatedBackground: Delaying resize during parallax transition');
            this.pendingResize = { width: rect.width, height: rect.height };
            return;
        }

        // Используем devicePixelRatio для четкости на retina дисплеях
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(rect.width * dpr);
        this.canvas.height = Math.round(rect.height * dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Настраиваем контекст для четкости
        const ctx = this.canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        this.width = rect.width;
        this.height = rect.height;
        console.log('🎨 AnimatedBackground: Canvas size set to width:', this.width, 'height:', this.height, 'dpr:', dpr);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('🎨 AnimatedBackground: Starting animation');
        console.log('🎨 AnimatedBackground: Canvas z-index:', getComputedStyle(this.canvas).zIndex);
        console.log('🎨 AnimatedBackground: Canvas position:', getComputedStyle(this.canvas).position);
        this.spawnInterval = setInterval(() => this.spawnLine(), 6000); // 6s average
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    spawnLine() {
        if (this.activeLines >= this.maxActiveLines) {
            console.log('🎨 AnimatedBackground: Not spawning line, max active lines reached');
            return;
        }

        const line = {
            id: Date.now() + Math.random(),
            phase: 'appear', // appear, hold, disappear
            phaseProgress: 0,
            duration: {
                appear: 5000 + Math.random() * 2500, // 5-7.5s
                hold: 4500,   // 4.5s
                disappear: 500 + Math.random() * 500 // 0.5-1s
            },
            path: this.generatePath(),
            dashes: [],
            pulsationPhase: Math.random() * 2 * Math.PI
        };

        // Initialize dashes along the path
        this.initializeDashes(line);
        console.log(`🎨 AnimatedBackground: Line ${line.id} initialized with ${line.dashes.length} dashes`);
        this.lines.push(line);
        this.activeLines++;
        console.log(`🎨 AnimatedBackground: Spawned line ${line.id}, active lines: ${this.activeLines}`);
    }

    generatePath() {
        const segments = 2 + Math.floor(Math.random() * 3); // 2-4 segments
        const points = [];

        // Random start edge: 0=top, 1=right, 2=bottom, 3=left
        const startEdge = Math.floor(Math.random() * 4);
        let startPoint = { x: 0, y: 0 };
        switch (startEdge) {
            case 0: // top
                startPoint.x = Math.random() * this.width;
                startPoint.y = -50;
                break;
            case 1: // right
                startPoint.x = this.width + 50;
                startPoint.y = Math.random() * this.height;
                break;
            case 2: // bottom
                startPoint.x = Math.random() * this.width;
                startPoint.y = this.height + 50;
                break;
            case 3: // left
                startPoint.x = -50;
                startPoint.y = Math.random() * this.height;
                break;
        }
        points.push(startPoint);

        // Generate intermediate points
        for (let i = 1; i < segments; i++) {
            points.push({
                x: (this.width / segments) * i + (Math.random() - 0.5) * 100,
                y: Math.random() * this.height
            });
        }

        // Random end edge
        const endEdge = Math.floor(Math.random() * 4);
        let endPoint = { x: 0, y: 0 };
        switch (endEdge) {
            case 0: // top
                endPoint.x = Math.random() * this.width;
                endPoint.y = -50;
                break;
            case 1: // right
                endPoint.x = this.width + 50;
                endPoint.y = Math.random() * this.height;
                break;
            case 2: // bottom
                endPoint.x = Math.random() * this.width;
                endPoint.y = this.height + 50;
                break;
            case 3: // left
                endPoint.x = -50;
                endPoint.y = Math.random() * this.height;
                break;
        }
        points.push(endPoint);

        return points;
    }

    calculatePathLength(points) {
        let length = 0;
        for (let i = 1; i < points.length; i++) {
            length += Math.sqrt((points[i].x - points[i-1].x)**2 + (points[i].y - points[i-1].y)**2);
        }
        return length;
    }

    initializeDashes(line) {
        const totalLength = this.calculatePathLength(line.path);
        console.log(`🎨 AnimatedBackground: Path length: ${totalLength.toFixed(2)}`);
        const dashLength = this.dashLength; // use adaptive dash length
        const minGap = this.minGap; // use adaptive gap
        const spacing = dashLength + minGap;
        const numDashes = Math.floor(totalLength / spacing);
        console.log(`🎨 AnimatedBackground: Calculated numDashes: ${numDashes} (spacing: ${spacing}, mobile: ${this.isMobile})`);
        line.dashes = [];

        for (let i = 0; i < numDashes; i++) {
            const startPos = i * spacing;
            const dash = this.getDashFromPool();
            dash.startT = startPos / totalLength;
            dash.endT = (startPos + dashLength) / totalLength;
            if (dash.endT > 1) break;
            dash.opacity = 0;
            dash.drawProgress = 0; // for growing effect
            line.dashes.push(dash);
        }
    }

    getDashFromPool() {
        if (this.dashPool.length > 0) {
            return this.dashPool.pop();
        }
        return {};
    }

    returnDashToPool(dash) {
        if (this.dashPool.length < this.maxDashes) {
            this.dashPool.push(dash);
        }
    }

    animate = () => {
        if (!this.isRunning) return;

        this.time += 16; // increment time for pulsation

        // Use transition dimensions for canvas clearing during parallax transitions
        const clearWidth = this.isInParallaxTransition ? this.transitionCanvasWidth : this.width;
        const clearHeight = this.isInParallaxTransition ? this.transitionCanvasHeight : this.height;
        this.ctx.clearRect(0, 0, clearWidth, clearHeight);

        // Handle parallax transition movement
        if (this.isInParallaxTransition) {
            // this.updateParallaxMovement();
        }

        // Update hold lines tracking
        this.updateHoldLinesTracking();

        // Update and draw lines
        for (let i = this.lines.length - 1; i >= 0; i--) {
            const line = this.lines[i];
            this.updateLine(line);

            if (line.phase === 'complete') {
                this.lines.splice(i, 1);
                this.activeLines--;
                // Return dashes to pool
                line.dashes.forEach(dash => this.returnDashToPool(dash));
                continue;
            }

            this.drawLine(line);
        }

        this.animationFrame = requestAnimationFrame(this.animate);
    }

    updateLine(line) {
        const deltaTime = 16; // ~60fps

        if (line.phase === 'appear') {
            line.phaseProgress += deltaTime / line.duration.appear;
            if (line.phaseProgress >= 1) {
                line.phase = 'hold';
                line.phaseProgress = 0;
            }
        } else if (line.phase === 'hold') {
            line.phaseProgress += deltaTime / line.duration.hold;
            if (line.phaseProgress >= 1) {
                line.phase = 'disappear';
                line.phaseProgress = 0;
            }
        } else if (line.phase === 'disappear') {
            line.phaseProgress += deltaTime / line.duration.disappear;
            if (line.phaseProgress >= 1) {
                line.phase = 'complete';
            }
        }

        // Update dash opacities and drawProgress
        if (line.phase === 'appear') {
            // Reveal dashes sequentially and grow each
            line.dashes.forEach((dash, index) => {
                const revealT = index / line.dashes.length;
                dash.drawProgress = Math.max(0, Math.min(1, (line.phaseProgress - revealT) * line.dashes.length));
                dash.opacity = dash.drawProgress > 0 ? 1 : 0;
            });
        } else if (line.phase === 'hold') {
            line.dashes.forEach(dash => {
                dash.opacity = 1;
                dash.drawProgress = 1;
            });
        } else if (line.phase === 'disappear') {
            const opacity = Math.max(0, 1 - line.phaseProgress);
            line.dashes.forEach(dash => {
                dash.opacity = opacity;
                dash.drawProgress = 1;
            });
        }
    }

    // Track lines in hold phase for parallax continuation
    updateHoldLinesTracking() {
        this.holdLines = [];
        this.lines.forEach(line => {
            if (line.phase === 'hold') {
                this.holdLines.push(line);
            }
        });
    }

    // Get current hold lines for parallax operations
    getHoldLines() {
        return this.holdLines;
    }

    // Start parallax transition synchronized with slide animation
    startParallaxTransition(direction, duration = 600) {
        if (this.isInParallaxTransition) return;

        console.log(`🎨 AnimatedBackground: Starting parallax transition ${direction}, duration: ${duration}ms`);
        console.log(`🎨 AnimatedBackground: Current active lines: ${this.activeLines}, hold lines: ${this.holdLines.length}`);
        console.log(`🎨 AnimatedBackground: Canvas size: ${this.width}x${this.height}`);
        this.isInParallaxTransition = true;
        this.parallaxDirection = direction;
        this.parallaxStartTime = performance.now();
        this.parallaxDuration = duration;

        // Store current canvas dimensions for the transition
        this.transitionCanvasWidth = this.width;
        this.transitionCanvasHeight = this.height;
        console.log(`🎨 AnimatedBackground: Stored transition dimensions: ${this.transitionCanvasWidth}x${this.transitionCanvasHeight}`);

        // Pause normal spawning during transition
        this.pauseSpawning();

        // Update hold lines tracking
        this.updateHoldLinesTracking();
        // Store hold lines for continuation, to handle lines that transition phases during transition
        this.transitionHoldLines = [...this.holdLines];
        console.log(`🎨 AnimatedBackground: After start, hold lines: ${this.holdLines.length}`);
    }

    // End parallax transition and restart animations from hold line endpoints
    endParallaxTransition() {
        if (!this.isInParallaxTransition) return;

        console.log('🎨 AnimatedBackground: Ending parallax transition');
        console.log(`🎨 AnimatedBackground: Hold lines before continuation: ${this.holdLines.length}`);
        this.isInParallaxTransition = false;
        this.parallaxDirection = null;

        // Apply any pending resize that occurred during transition
        if (this.pendingResize) {
            console.log('🎨 AnimatedBackground: Applying pending resize after transition');
            this.canvas.width = this.pendingResize.width;
            this.canvas.height = this.pendingResize.height;
            this.width = this.pendingResize.width;
            this.height = this.pendingResize.height;
            this.pendingResize = null;
            console.log('🎨 AnimatedBackground: Canvas size updated to width:', this.width, 'height:', this.height);
        }

        // Clear transition dimensions
        this.transitionCanvasWidth = null;
        this.transitionCanvasHeight = null;

        // Restart spawning
        this.resumeSpawning();

        // Create new lines from endpoints of transition hold lines
        this.continueLinesFromTransitionHoldEndpoints();
        console.log(`🎨 AnimatedBackground: After continuation, active lines: ${this.activeLines}`);

        this.parallaxStartTime = 0;
    }

    // Create new lines starting from the endpoints of transition hold lines
    continueLinesFromTransitionHoldEndpoints() {
        console.log(`🎨 AnimatedBackground: Continuing ${this.transitionHoldLines.length} transition hold lines`);

        this.transitionHoldLines.forEach((holdLine, index) => {
            // Get the endpoint of the hold line
            const endPoint = this.getLineEndpoint(holdLine);
            console.log(`🎨 AnimatedBackground: Transition hold line ${index} endpoint: (${endPoint?.x?.toFixed(1)}, ${endPoint?.y?.toFixed(1)}), direction: ${this.parallaxDirection}`);

            // Filter out lines ending outside viewport
            if (!this.isPointInViewport(endPoint)) {
                console.log(`🎨 AnimatedBackground: Skipping continuation for line ${index}, endpoint outside viewport`);
                return;
            }

            // Create a new line starting from this endpoint
            this.createContinuationLine(endPoint, this.parallaxDirection);
        });

        // Clear transition hold lines tracking after continuation
        this.transitionHoldLines = [];
    }

    // Create new lines starting from the endpoints of hold lines
    continueLinesFromHoldEndpoints() {
        console.log(`🎨 AnimatedBackground: Continuing ${this.holdLines.length} hold lines`);

        this.lines.forEach((holdLine, index) => {
            // Get the endpoint of the hold line
            const endPoint = this.getLineEndpoint(holdLine);
            console.log(`🎨 AnimatedBackground: Hold line ${index} endpoint: (${endPoint?.x?.toFixed(1)}, ${endPoint?.y?.toFixed(1)}), direction: ${this.parallaxDirection}`);

            // Create a new line starting from this endpoint
            this.createContinuationLine(endPoint, this.parallaxDirection);
        });

        // Clear hold lines tracking after continuation
        this.holdLines = [];
    }

    // Get the visual endpoint of a line (end of path for hold lines)
    getLineEndpoint(line) {
        if (line.path.length === 0) return null;

        const endPoint = line.path[line.path.length - 1];

        return {
            x: endPoint.x,
            y: endPoint.y,
            direction: this.parallaxDirection // Use transition direction for continuation
        };
    }

    // Create a new line starting from a specific point
    createContinuationLine(startPoint, direction) {
        if (this.activeLines >= this.maxActiveLines) {
            console.log('🎨 AnimatedBackground: Not creating continuation line, max active lines reached');
            return;
        }

        // Only create continuation if the endpoint is within viewport
        if (!this.isPointInViewport(startPoint)) {
            console.log('🎨 AnimatedBackground: Skipping continuation line, endpoint outside viewport');
            return;
        }

        const line = {
            id: Date.now() + Math.random(),
            phase: 'appear',
            phaseProgress: 0,
            duration: {
                appear: 5000 + Math.random() * 2500,
                hold: 4500,
                disappear: 500 + Math.random() * 500
            },
            path: this.generatePathFromPoint(startPoint, direction),
            dashes: [],
            pulsationPhase: Math.random() * 2 * Math.PI
        };

        // Initialize dashes along the path
        this.initializeDashes(line);
        console.log(`🎨 AnimatedBackground: Created continuation line ${line.id} with ${line.dashes.length} dashes, path points: ${line.path.length}`);

        this.lines.push(line);
        this.activeLines++;
    }

    // Check if a point is within reasonable bounds for creating continuation lines
    isPointInReasonableBounds(point) {
        const margin = 100; // Allow some margin outside viewport
        return point.x >= -margin &&
                point.x <= this.width + margin &&
                point.y >= -margin &&
                point.y <= this.height + margin;
    }

    // Check if a point is within the viewport
    isPointInViewport(point) {
        return point.x >= 0 &&
                point.x <= this.width &&
                point.y >= 0 &&
                point.y <= this.height;
    }

    // Generate a path starting from a specific point
    generatePathFromPoint(startPoint, direction) {
        const segments = 2 + Math.floor(Math.random() * 3);
        const points = [];

        // Start from the given point
        points.push({ x: startPoint.x, y: startPoint.y });

        // Generate intermediate points based on direction
        for (let i = 1; i < segments; i++) {
            let x, y;

            if (direction === 'next') {
                // For next transitions, tend to move upward (since next slides come from bottom)
                x = (this.width / segments) * i + (Math.random() - 0.5) * 150;
                y = startPoint.y - 50 - Math.random() * 100; // Move upward
            } else {
                // For prev transitions, tend to move downward
                x = (this.width / segments) * i + (Math.random() - 0.5) * 150;
                y = startPoint.y + 50 + Math.random() * 100; // Move downward
            }

            points.push({ x: Math.max(0, Math.min(this.width, x)), y: Math.max(0, Math.min(this.height, y)) });
        }

        // Random end edge
        const endEdge = Math.floor(Math.random() * 4);
        let endPoint = { x: 0, y: 0 };
        switch (endEdge) {
            case 0: // top
                endPoint.x = Math.random() * this.width;
                endPoint.y = -50;
                break;
            case 1: // right
                endPoint.x = this.width + 50;
                endPoint.y = Math.random() * this.height;
                break;
            case 2: // bottom
                endPoint.x = Math.random() * this.width;
                endPoint.y = this.height + 50;
                break;
            case 3: // left
                endPoint.x = -50;
                endPoint.y = Math.random() * this.height;
                break;
        }
        points.push(endPoint);

        return points;
    }

    // Pause spawning during parallax transitions
    pauseSpawning() {
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
            console.log('🎨 AnimatedBackground: Spawning paused for parallax transition');
        }
    }

    // Resume spawning after parallax transitions
    resumeSpawning() {
        if (!this.spawnInterval && this.isRunning) {
            this.spawnInterval = setInterval(() => this.spawnLine(), 4000);
            console.log('🎨 AnimatedBackground: Spawning resumed after parallax transition');
        }
    }

    // Update line positions during parallax transition to sync with CSS animation
    // Update line positions during parallax transition to sync with CSS animation
    updateParallaxMovement() {
        const elapsed = performance.now() - this.parallaxStartTime;
        const progress = Math.min(elapsed / this.parallaxDuration, 1);
        
        // Use the same cubic-bezier easing as CSS transition: cubic-bezier(0.4, 0, 0.2, 1)
        const easedProgress = this.cubicBezierEase(progress, 0.4, 0, 0.2, 1);

        // Calculate translateY offset (similar to CSS transform)
        let translateY = 0;
        if (this.parallaxDirection === 'next') {
            // Next slides: current goes up (-100%), next comes from bottom
            translateY = -easedProgress * this.height;
        } else if (this.parallaxDirection === 'prev') {
            // Prev slides: current goes down (+100%), next comes from top
            translateY = easedProgress * this.height;
        }

        // Apply offset to all lines
        this.lines.forEach(line => {
            // Store original offset if not set
            if (line.parallaxOffset === undefined) {
                line.parallaxOffset = 0;
            }
            // Update parallax offset
            line.parallaxOffset = translateY;
        });

        // Auto-end transition when complete
        if (progress >= 1.0) {
            console.log('🎨 AnimatedBackground: Parallax transition completed');
            this.endParallaxTransition();
        }
    }
    // Cubic Bezier easing function matching CSS cubic-bezier(0.4, 0, 0.2, 1)
    cubicBezierEase(t, p1x, p1y, p2x, p2y) {
        function lnFactorial(n) { let sum = 0; for (let i = 1; i <= n; i++) sum += Math.log(i); return sum; }
        const cx = 3 * p1x;
        const bx = 3 * (p2x - p1x) - cx;
        const ax = 1 - cx - bx;

        const cy = 3 * p1y;
        const by = 3 * (p2y - p1y) - cy;
        const ay = 1 - cy - by;

        function sampleCurveX(t) {
            return ((ax * t + bx) * t + cx) * t;
        }

        function sampleCurveY(t) {
            return ((ay * t + by) * t + cy) * t;
        }

        function sampleCurveDerivativeX(t) {
            return (3 * ax * t + 2 * bx) * t + cx;
        }

        function solveCurveX(x, epsilon = 0.000001) {
            let t = x;
            for (let i = 0; i < 8; i++) {
                const x2 = sampleCurveX(t) - x;
                if (Math.abs(x2) < epsilon) return t;
                const d2 = sampleCurveDerivativeX(t);
                if (Math.abs(d2) < epsilon) break;
                t = t - x2 / d2;
            }
            return t;
        }

        return sampleCurveY(solveCurveX(t));
    }

    getPointOnPath(points, t) {
        if (points.length === 2) {
            // Linear interpolation for 2 points
            return {
                x: points[0].x + (points[1].x - points[0].x) * t,
                y: points[0].y + (points[1].y - points[0].y) * t
            };
        }

        // Bezier curve interpolation for multiple points
        const n = points.length - 1;
        let x = 0, y = 0;

        for (let i = 0; i <= n; i++) {
            const bernstein = this.bernstein(n, i, t);
            x += points[i].x * bernstein;
            y += points[i].y * bernstein;
        }

        return { x, y };
    }

    bernstein(n, i, t) {
        return this.binomial(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i);
    }

    binomial(n, k) {
        let result = 1;
        for (let i = 1; i <= k; i++) {
            result *= (n - k + i) / i;
        }
        return result;
    }

    drawLine(line) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(139, 111, 71, 0.8)'; // warm brown color
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        let drawnDashes = 0;

        // Apply parallax offset during transitions
        const offsetX = this.parallaxOffset.x || 0;
        const offsetY = this.parallaxOffset.y || 0;

        line.dashes.forEach(dash => {
            if (dash.opacity > 0.01 && dash.drawProgress > 0) {
                drawnDashes++;
                this.ctx.globalAlpha = dash.opacity;
                // Smooth pulsation: 2.5s period, adaptive thickness
                const period = 2500;
                const thickness = this.baseThickness + this.thicknessVariation * Math.sin(2 * Math.PI * this.time / period + line.pulsationPhase);
                this.ctx.lineWidth = thickness;
                this.ctx.beginPath();
                const startPos = this.getPointOnPath(line.path, dash.startT);
                const currentEndT = dash.startT + (dash.endT - dash.startT) * dash.drawProgress;
                const currentEndPos = this.getPointOnPath(line.path, currentEndT);

                // Apply parallax offset to both start and end positions
                this.ctx.moveTo(startPos.x + offsetX, startPos.y + offsetY);
                this.ctx.lineTo(currentEndPos.x + offsetX, currentEndPos.y + offsetY);
                this.ctx.stroke();
            }
        });

        this.ctx.restore();
    }

    pause() {
        this.isRunning = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    // Get point at parameter t along the path (0 to 1)
    getPointAtT(path, t) {
        if (path.length < 2) return path[0] || { x: 0, y: 0 };
        const totalLength = this.calculatePathLength(path);
        const targetLength = t * totalLength;
        let currentLength = 0;
        for (let i = 1; i < path.length; i++) {
            const segmentLength = Math.sqrt((path[i].x - path[i-1].x)**2 + (path[i].y - path[i-1].y)**2);
            if (currentLength + segmentLength >= targetLength) {
                const ratio = (targetLength - currentLength) / segmentLength;
                return {
                    x: path[i-1].x + (path[i].x - path[i-1].x) * ratio,
                    y: path[i-1].y + (path[i].y - path[i-1].y) * ratio
                };
            }
            currentLength += segmentLength;
        }
        return path[path.length - 1];
    }


    resume() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }
}

export default AnimatedBackground;