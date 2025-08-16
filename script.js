// Neon particle field + reactive CTA glow (mobile-optimized)
(() => {
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d');

  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) < 640;
  const LOW_POWER = reduceMotion || isCoarsePointer || isSmallScreen;

  let DPR = Math.max(1, Math.min(LOW_POWER ? 1 : 2, window.devicePixelRatio || 1));

  let width = 0, height = 0;
  const particles = [];
  let gradientCache = null;

  function resize() {
    const nextW = window.innerWidth;
    const nextH = window.innerHeight;
    // Ignore tiny height-only changes (mobile address bar show/hide)
    const widthChanged = nextW !== width;
    const heightDelta = Math.abs(nextH - height);
    if (!widthChanged && heightDelta > 0 && heightDelta < 40) return;
    width = nextW;
    height = nextH;
    DPR = Math.max(1, Math.min(LOW_POWER ? 1 : 2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(width * DPR);
    canvas.height = Math.floor(height * DPR);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    gradientCache = null; // invalidate gradient
  }

  function rand(min, max) { return Math.random() * (max - min) + min; }

  function spawnParticle() {
    return {
      x: rand(0, width),
      y: rand(0, height),
      vx: rand(-0.3, 0.3),
      vy: rand(-0.3, 0.3),
      r: rand(0.6, 2.2),
      hue: rand(160, 320), // cyan-magenta spectrum
      life: rand(0.2, 1),
    };
  }

  function stepParticle(p) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -10) p.x = width + 10;
    if (p.x > width + 10) p.x = -10;
    if (p.y < -10) p.y = height + 10;
    if (p.y > height + 10) p.y = -10;
  }

  function drawParticle(p) {
    const alpha = (LOW_POWER ? 0.45 : 0.6) * p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${alpha})`;
    ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${Math.min(0.7, alpha + 0.1)})`;
    ctx.shadowBlur = LOW_POWER ? 4 : 10;
    ctx.fill();
  }

  function connect(p, q) {
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    const d2 = dx*dx + dy*dy;
    const maxDist = LOW_POWER ? 80 : 110;
    if (d2 > maxDist*maxDist) return;
    const alpha = (LOW_POWER ? 0.08 : 0.12) * (1 - d2 / (maxDist*maxDist));
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  let lastTime = 0;
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
  });

  function loop(time = 0) {
    // frame cap on low power to ~30fps
    if (!running || (LOW_POWER && time - lastTime < 33)) {
      requestAnimationFrame(loop);
      return;
    }
    lastTime = time;

    ctx.clearRect(0, 0, width, height);

    // soft vignette (cached)
    if (!gradientCache) {
      const grad = ctx.createRadialGradient(
        width*0.5, height*0.5, 0,
        width*0.5, height*0.5, Math.max(width, height)
      );
      grad.addColorStop(0, 'rgba(7,7,17,0)');
      grad.addColorStop(1, 'rgba(7,7,17,0.4)');
      gradientCache = grad;
    }
    ctx.fillStyle = gradientCache;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      stepParticle(p);
      drawParticle(p);
      // connect to a few neighbors
      const neighborSpan = LOW_POWER ? 3 : 6;
      for (let j = i + 1; j < i + neighborSpan && j < particles.length; j++) {
        connect(p, particles[j]);
      }
      // life shimmer
      p.life += Math.sin((Date.now() + i * 73) * (LOW_POWER ? 0.0007 : 0.001)) * (LOW_POWER ? 0.003 : 0.004);
      p.life = Math.max(0.2, Math.min(1, p.life));
    }

    requestAnimationFrame(loop);
  }

  function computeTargetCount() {
    const density = LOW_POWER ? 1 / 30000 : 1 / 14000;
    const hardMax = LOW_POWER ? 60 : 120;
    return Math.min(hardMax, Math.floor(width * height * density));
  }

  function init() {
    resize();
    particles.length = 0;
    const count = computeTargetCount();
    for (let i = 0; i < count; i++) particles.push(spawnParticle());
    loop();
  }

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resize();
      // adjust particle count smoothly instead of resetting
      const target = computeTargetCount();
      if (particles.length < target) {
        const add = target - particles.length;
        for (let i = 0; i < add; i++) particles.push(spawnParticle());
      } else if (particles.length > target) {
        particles.length = target;
      }
      resizeRaf = 0;
    });
  }, { passive: true });
  init();

  // Reactive button glow follows pointer
  const glowBtn = document.querySelector('.glow-btn');
  const btnGlow = document.querySelector('.btn-glow');
  function updateGlow(e) {
    const rect = glowBtn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mx = (x / rect.width) * 100 + '%';
    const my = (y / rect.height) * 100 + '%';
    btnGlow.style.setProperty('--mx', mx);
    btnGlow.style.setProperty('--my', my);
  }
  if (glowBtn) {
    glowBtn.addEventListener('pointermove', updateGlow, { passive: true });
    glowBtn.addEventListener('pointerdown', updateGlow, { passive: true });
  }

  // Subtle confetti on click to celebrate
  const insta = document.getElementById('instaLink');
  insta.addEventListener('click', (e) => {
    const x = e.clientX || (innerWidth / 2);
    const y = e.clientY || (innerHeight / 2);
    splash(x, y);
  });

  function splash(x, y) {
    const bursts = LOW_POWER ? 14 : 28;
    for (let i = 0; i < bursts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (LOW_POWER ? 1.5 : 2) + 0.8;
      const p = {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * (LOW_POWER ? 1.4 : 1.8) + 0.5,
        hue: Math.random() * 360,
        life: 1
      };
      // temporary particles that fade quickly
      const decay = () => {
        p.x += p.vx; p.y += p.vy; p.life -= LOW_POWER ? 0.03 : 0.02;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${Math.max(0, p.life)})`;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${Math.max(0, p.life)})`;
        ctx.shadowBlur = LOW_POWER ? 4 : 8;
        ctx.fill();
        if (p.life > 0) requestAnimationFrame(decay);
      };
      requestAnimationFrame(decay);
    }
  }

  // Year
  document.getElementById('year').textContent = new Date().getFullYear();
})();
