// success-emoji-confetti.js
export function emojiConfetti(anchorEl, {mode = 'down'} = {}) {
  // портал поверх всего в body
  const layer = ensureLayer();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  layer.appendChild(canvas);

  const DPR = Math.min(2, window.devicePixelRatio || 1); // не выше 2 ради батареи
  function resize() {
    canvas.width = Math.max(1, window.innerWidth * DPR);
    canvas.height = Math.max(1, window.innerHeight * DPR);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  // Параметры (px/сек и сек)
  const N = 28;
  const SPEED = [220, 420];
  const LIFE = [1.6, 2.2];
  const GRAVITY = 900;     // вниз, px/s^2
  const DRAG = 0.12;       // коэффициент затухания в сек^-1
  const SIZE = [18, 26];

  const origin = centerOf(anchorEl);
  const parts = [];
  for (let i = 0; i < N; i++) {
    const angle = mode === 'down'
      ? (Math.PI / 2) + (Math.random() - 0.5) * Math.PI  // 90° ± 90°
      : Math.random() * Math.PI * 2;                      // 0..360°
    const speed = rand(SPEED[0], SPEED[1]);
    parts.push({
      x: origin.x, y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(LIFE[0], LIFE[1]),
      age: 0,
      rot: Math.random() * Math.PI * 2,
      rps: (Math.random() * 2 - 1) * 3, // вращение рад/сек
      size: rand(SIZE[0], SIZE[1]),
      emoji: '🎉'
    });
  }

  let last = performance.now();
  (function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.033); // сек, с хард-кэпом
    last = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    for (const p of parts) {
      p.age += dt;
      if (p.age <= p.life) {
        alive = true;
        // физика
        p.vy += GRAVITY * dt;
        const k = Math.max(0, 1 - DRAG * dt); // простое затухание
        p.vx *= k; p.vy *= k;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.rps * dt;

        const alpha = 1 - p.age / p.life;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x * DPR, p.y * DPR);
        ctx.rotate(p.rot);
        ctx.font = `${p.size * DPR}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();
      }
    }

    if (alive) requestAnimationFrame(tick);
    else {
      window.removeEventListener('resize', resize);
      layer.removeChild(canvas);
    }
  })(last);

  // helpers
  function rand(a, b) { return a + Math.random() * (b - a); }
  function ensureLayer() {
    let layer = document.querySelector('#confetti-portal');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'confetti-portal';
      Object.assign(layer.style, {
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,      // поверх всего
        overflow: 'visible'
      });
      document.body.appendChild(layer);
    }
    return layer;
  }
  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; // координаты во viewport
  }
}
