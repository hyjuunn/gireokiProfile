// Neon particle field + reactive CTA glow
(() => {
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  let width = 0, height = 0;
  const particles = [];
  const MAX = 120;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * DPR);
    canvas.height = Math.floor(height * DPR);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
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
    const alpha = 0.6 * p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${alpha})`;
    ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${Math.min(0.8, alpha + 0.2)})`;
    ctx.shadowBlur = 14;
    ctx.fill();
  }

  function connect(p, q) {
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    const d2 = dx*dx + dy*dy;
    if (d2 > 110*110) return;
    const alpha = 0.12 * (1 - d2 / (110*110));
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function loop() {
    ctx.clearRect(0, 0, width, height);

    // soft vignette
    const grad = ctx.createRadialGradient(width*0.5, height*0.5, 0, width*0.5, height*0.5, Math.max(width, height));
    grad.addColorStop(0, 'rgba(7,7,17,0)');
    grad.addColorStop(1, 'rgba(7,7,17,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      stepParticle(p);
      drawParticle(p);
      // connect to a few neighbors
      for (let j = i + 1; j < i + 6 && j < particles.length; j++) {
        connect(p, particles[j]);
      }
      // life shimmer
      p.life += Math.sin((Date.now() + i * 73) * 0.001) * 0.004;
      p.life = Math.max(0.2, Math.min(1, p.life));
    }

    requestAnimationFrame(loop);
  }

  function init() {
    resize();
    particles.length = 0;
    const count = Math.min(MAX, Math.floor((width * height) / 14000));
    for (let i = 0; i < count; i++) particles.push(spawnParticle());
    loop();
  }

  window.addEventListener('resize', init);
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
  ['mousemove', 'touchmove'].forEach(evt => {
    document.addEventListener(evt, (e) => {
      const point = e.touches ? e.touches[0] : e;
      if (!glowBtn) return;
      if (document.activeElement === glowBtn || glowBtn.matches(':hover')) {
        updateGlow(point);
      }
    }, { passive: true });
  });

  // Subtle confetti on click to celebrate
  const insta = document.getElementById('instaLink');
  insta.addEventListener('click', (e) => {
    splash(e.clientX, e.clientY);
  });

  function splash(x, y) {
    const bursts = 30;
    for (let i = 0; i < bursts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      const p = {
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 1.8 + 0.6,
        hue: Math.random() * 360,
        life: 1
      };
      // temporary particles that fade quickly
      const decay = () => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${Math.max(0, p.life)})`;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${Math.max(0, p.life)})`;
        ctx.shadowBlur = 8;
        ctx.fill();
        if (p.life > 0) requestAnimationFrame(decay);
      };
      requestAnimationFrame(decay);
    }
  }

  // Year
  document.getElementById('year').textContent = new Date().getFullYear();
})();
