/* ============================================================
   首页特效：高级烟花 + 魔法书吸入旋涡
   按需加载（点到才下载），单张全屏画布，预渲染的发光精灵 + 叠加混合，粒子数量有上限，
   结束后立刻销毁画布，不会长期占用资源。
   ============================================================ */
window.FX = (() => {
  const low = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 600, dpr = Math.min(devicePixelRatio || 1, low ? 1.25 : 1.5), CAP = low ? 320 : 560;
  const PAL = [["255,205,100", "255,244,205"], ["255,105,195", "255,210,240"], ["105,228,255", "212,248,255"], ["160,140,255", "226,222,255"], ["120,255,180", "214,255,232"], ["255,255,255", "255,236,200"]];
  const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const SPR = {};
  const sprite = c => SPR[c] || (SPR[c] = (() => { // 预渲染一颗“发光的点”，之后全部用 drawImage 复制，比逐个画渐变快得多
    const s = 48, k = document.createElement("canvas"); k.width = k.height = s; const g = k.getContext("2d"), r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.16, `rgba(${c},.95)`); r.addColorStop(.5, `rgba(${c},.26)`); r.addColorStop(1, `rgba(${c},0)`); g.fillStyle = r; g.fillRect(0, 0, s, s); return k;
  })());
  let cv, cx, W, H, P = [], R = [], F = [], V = null, raf = 0, last = 0, plan = null, resolveFn = null;

  function mount() { if (cv) return; W = innerWidth; H = innerHeight; cv = document.createElement("canvas"); cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:31;pointer-events:none"; cv.width = W * dpr; cv.height = H * dpr; document.body.appendChild(cv); cx = cv.getContext("2d"); cx.scale(dpr, dpr); last = performance.now(); raf = requestAnimationFrame(loop); }
  function unmount() { cancelAnimationFrame(raf); raf = 0; if (cv) cv.remove(); cv = cx = null; P = []; R = []; F = []; V = null; plan = null; if (resolveFn) { const f = resolveFn; resolveFn = null; f(); } }
  const add = p => { if (P.length < CAP) P.push(p); };

  /* ---------- 五种烟花 ---------- */
  const A = {
    peony(x, y, pal) { const n = low ? 54 : 88; for (let i = 0; i < n; i++) { const a = rnd(6.283), v = 70 + rnd(170) * (Math.random() < .5 ? 1 : .6); add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 80, d: .985, l: 1, m: rnd(1.3, 2), c: i % 3 ? pal[0] : pal[1], s: rnd(9, 15), cr: Math.random() < .06 }); } },
    ring(x, y, pal) { const n = low ? 34 : 54, tilt = rnd(.5, 1); for (let i = 0; i < n; i++) { const a = i / n * 6.283; add({ x, y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190 * tilt, g: 40, d: .982, l: 1, m: 1.7, c: pal[0], s: 12 }); } for (let i = 0; i < n / 2; i++) { const a = i / (n / 2) * 6.283 + .1; add({ x, y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100 * tilt, g: 40, d: .982, l: 1, m: 1.7, c: pal[1], s: 9 }); } },
    willow(x, y) { const n = low ? 46 : 74, c = PAL[0]; for (let i = 0; i < n; i++) { const a = rnd(6.283), v = 60 + rnd(150); add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: 135, d: .972, l: 1, m: rnd(2.4, 3.4), c: c[0], s: rnd(8, 13), cr: Math.random() < .12 }); } },
    heart(x, y, pal) { const n = low ? 40 : 66; for (let i = 0; i < n; i++) { const t = i / n * 6.283, k = 9.5; add({ x, y, vx: 16 * Math.sin(t) ** 3 * k, vy: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k, g: 22, d: .988, l: 1, m: 2, c: i % 2 ? pal[0] : pal[1], s: 12 }); } },
    star(x, y, pal) { const m = 5, n = low ? 40 : 60; for (let i = 0; i < n; i++) { const a = i / n * 6.283, r = 1 / (1 + .55 * Math.abs(Math.cos(a * m / 2 + Math.PI / 2 * 0))); add({ x, y, vx: Math.cos(a - Math.PI / 2) * 210 * r, vy: Math.sin(a - Math.PI / 2) * 210 * r, g: 50, d: .982, l: 1, m: 1.8, c: pal[i % 2], s: 11 }); } }
  };
  const TYPES = ["peony", "peony", "ring", "willow", "heart", "star"];
  function explode(x, y, type, big) { const pal = pick(PAL); (A[type || pick(TYPES)])(x, y, pal); F.push({ x, y, l: 1, c: pal[0], s: big ? 420 : 300 }); }
  function launch(tx, type, big) { const T = rnd(.85, 1.2), y0 = H + 10, ty = H * rnd(.16, .46); R.push({ x: tx, y: y0, vx: rnd(-18, 18), vy: (ty - y0) / T, t: 0, T, type, big }); }

  /* ---------- 主循环 ---------- */
  function loop(now) {
    raf = requestAnimationFrame(loop); const dt = Math.min((now - last) / 1000, .04); last = now; if (document.hidden) return;
    cx.globalCompositeOperation = "destination-out"; cx.fillStyle = "rgba(0,0,0,.2)"; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = "lighter";
    if (plan) { const e = (now - plan.t0) / 1000; while (plan.q.length && plan.q[0][0] <= e) { const j = plan.q.shift(); launch(j[1] * W, j[2], j[3]); } if (!plan.q.length && !R.length) plan.over = true; }
    if (V) { // 吸入旋涡：粒子绕着书旋转并不断收紧
      V.t -= dt; if (V.t > 0) for (let i = 0; i < (low ? 3 : 6); i++) add({ vort: 1, cx: V.x, cy: V.y, r: rnd(90, Math.max(W, H) * .5), a: rnd(6.283), w: rnd(2.2, 4.2), l: 1, c: pick([PAL[0][0], PAL[3][0], PAL[2][0], "255,255,255"]), s: rnd(8, 16) });
      else if (!P.length) { unmount(); return; }
    }
    for (let i = R.length - 1; i >= 0; i--) { // 升空的火箭
      const r = R[i]; r.t += dt; r.x += r.vx * dt; r.y += r.vy * dt; r.vy += 60 * dt;
      if (Math.random() < .8) add({ x: r.x, y: r.y, vx: rnd(-12, 12), vy: rnd(10, 40), g: 0, d: .95, l: 1, m: .4, c: "255,225,170", s: 6 });
      cx.globalAlpha = 1; cx.drawImage(sprite("255,240,200"), r.x - 8, r.y - 8, 16, 16);
      if (r.t >= r.T) { explode(r.x, r.y, r.type, r.big); R.splice(i, 1); }
    }
    for (let i = F.length - 1; i >= 0; i--) { const f = F[i]; f.l -= dt * 4.5; if (f.l <= 0) { F.splice(i, 1); continue; } cx.globalAlpha = f.l * .3; cx.drawImage(sprite(f.c), f.x - f.s / 2, f.y - f.s / 2, f.s, f.s); } // 爆炸瞬间的光晕
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      if (p.vort) { p.a += p.w * dt; p.r -= (p.r * 1.25 + 30) * dt; if (p.r < 6) { P.splice(i, 1); continue; } const x = p.cx + Math.cos(p.a) * p.r, y = p.cy + Math.sin(p.a) * p.r * .72, s = p.s * Math.min(1, p.r / 90) + 3; cx.globalAlpha = Math.min(1, p.r / 60); cx.drawImage(sprite(p.c), x - s / 2, y - s / 2, s, s); continue; }
      p.l -= dt / p.m; if (p.l <= 0) { if (p.cr) for (let k = 0; k < 4; k++) add({ x: p.x, y: p.y, vx: rnd(-60, 60), vy: rnd(-60, 60), g: 60, d: .96, l: 1, m: .5, c: "255,255,255", s: 6 }); P.splice(i, 1); continue; }
      p.vy += p.g * dt; const dr = Math.pow(p.d, dt * 60); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt;
      const tw = p.l < .5 && Math.random() < .25 ? .35 : 1, s = p.s * (.55 + .45 * p.l); cx.globalAlpha = Math.min(1, p.l * 1.7) * tw; cx.drawImage(sprite(p.c), p.x - s / 2, p.y - s / 2, s, s);
    }
    cx.globalAlpha = 1; if (plan && plan.over && !P.length && !R.length && !F.length) unmount();
  }

  /* ---------- 对外接口 ---------- */
  return {
    /** 烟花秀：约 7 秒；finale=true 时开场齐射、结尾大合唱 */
    fireworks({ finale = false } = {}) {
      return new Promise(res => {
        if (matchMedia("(prefers-reduced-motion:reduce)").matches) return res();
        if (resolveFn) resolveFn(); resolveFn = res; mount(); const q = []; let t = .2;
        if (finale) for (let i = 0; i < 5; i++) q.push([.3 + i * .08, .12 + i * .19, i === 2 ? "heart" : "peony", true]);
        for (let i = 0; i < (low ? 8 : 12); i++) { q.push([t, rnd(.12, .88), pick(TYPES), false]); t += rnd(low ? .55 : .4, low ? .95 : .72); }
        if (finale) for (let i = 0; i < 8; i++) q.push([t + .6 + i * .07, .08 + i * .12, pick(TYPES), true]);
        q.sort((a, b) => a[0] - b[0]); plan = { t0: performance.now(), q, over: false };
      });
    },
    /** 吸入旋涡：粒子围绕 (x,y) 旋转收紧，持续 ms 毫秒 */
    vortex(x, y, ms = 1500) { return new Promise(res => { if (matchMedia("(prefers-reduced-motion:reduce)").matches) return res(); if (resolveFn) resolveFn(); resolveFn = res; mount(); V = { x, y, t: ms / 1000 }; }); },
    stop: unmount
  };
})();
