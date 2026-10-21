/* ============ 命运之书 · 塔罗页逻辑 ============
   性能原则：单个画布绘制星空/粒子；牌扇只有 78 个轻量的 div（牌背共用一张图），牌面 SVG 只在翻开时才生成；
   移动只用 transform；页面不可见或牌库打开时暂停画布。 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id), T = window.TAROT, C = T.cards, B = document.body;
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches, low = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 600;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 40) : ms));
  const rnd = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(",");
  let tto; const toast = m => { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tto); tto = setTimeout(() => t.classList.remove("on"), 2200); };
  const st = s => { B.dataset.st = s; };
  B.style.setProperty("--back", 'url("' + T.back + '")');

  /* ---------- 星空 + 尘埃 + 火花（同一张画布） ---------- */
  const cv = $("sky"), cx = cv.getContext("2d");
  let W = 0, H = 0, stars = [], motes = [], sparks = [], mx = 0, my = 0, tx = 0, ty = 0, last = 0, skyOn = true;
  function sizeSky() {
    const d = Math.min(devicePixelRatio || 1, low ? 1.25 : 1.6); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
    stars = Array.from({ length: low ? 90 : 170 }, () => ({ x: rnd() * W, y: rnd() * H, z: .25 + rnd() * .75, p: rnd() * 6.28, s: .6 + rnd() * 1.4 }));
    motes = Array.from({ length: low ? 24 : 54 }, () => ({ x: rnd() * W, y: rnd() * H, v: 6 + rnd() * 14, p: rnd() * 6.28, r: .6 + rnd() * 1.6 }));
  }
  function burst(x, y, n, col) {
    for (let i = 0; i < n; i++) { const a = rnd() * 6.283, v = 40 + rnd() * 190; sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50, l: 1, d: .8 + rnd() * .9, c: col || "236,210,154", r: 1 + rnd() * 1.8 }); }
    if (sparks.length > 420) sparks.splice(0, sparks.length - 420);
  }
  function frame(t) {
    requestAnimationFrame(frame);
    if (document.hidden || !skyOn || (low && t - last < 32)) return;
    const dt = Math.min((t - last) / 1000, .05) || .016; last = t; tx += (mx - tx) * .06; ty += (my - ty) * .06;
    cx.clearRect(0, 0, W, H); cx.fillStyle = "#fff8e6";
    for (const s of stars) { cx.globalAlpha = (.3 + .7 * (.5 + .5 * Math.sin(t / 700 * s.s + s.p))) * s.z; cx.fillRect(((s.x - tx * 40 * s.z) % W + W) % W, ((s.y - ty * 26 * s.z) % H + H) % H, s.z * 1.8, s.z * 1.8); }
    cx.fillStyle = "#ecd29a";
    for (const m of motes) { m.y -= m.v * dt; m.x += Math.sin(t / 1800 + m.p) * 6 * dt; if (m.y < -4) { m.y = H + 4; m.x = rnd() * W; } cx.globalAlpha = .2 + .35 * Math.sin(t / 900 + m.p) ** 2; cx.beginPath(); cx.arc(m.x, m.y, m.r, 0, 6.283); cx.fill(); }
    cx.globalCompositeOperation = "lighter";
    for (let i = sparks.length - 1; i >= 0; i--) { const p = sparks[i]; p.l -= dt / p.d; if (p.l <= 0) { sparks.splice(i, 1); continue; } p.vy += 150 * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt; cx.globalAlpha = p.l; cx.fillStyle = "rgb(" + p.c + ")"; cx.fillRect(p.x, p.y, p.r * 1.6, p.r * 1.6); }
    cx.globalCompositeOperation = "source-over"; cx.globalAlpha = 1;
  }
  let pr = 0; // 指针视差：整个 3D 场景随鼠标微微转动
  addEventListener("pointermove", e => { mx = e.clientX / W - .5; my = e.clientY / H - .5; if (pr) return; pr = requestAnimationFrame(() => { pr = 0; $("par").style.setProperty("--py", (mx * 5).toFixed(2) + "deg"); $("par").style.setProperty("--px", (-my * 3).toFixed(2) + "deg"); }); }, { passive: true });

  /* ---------- 牌桌布局（单位：牌桌宽度的 1/1000） ---------- */
  const table = $("table"), fan = $("fan"), slots = $("slots"), TILT = 62, ARC = 42, FR = 470, FCY = 600;
  let U = 1, fanEls = [], spread = null, deck = [], picks = [], used = new Set(), state = "intro", revealing = false;
  const SP = {
    one: { n: 1, labels: ["指引"], pos: [[0, -90]], t: "单张 · 今日指引" },
    three: { n: 3, labels: ["过去", "现在", "未来"], pos: [[-230, -90], [0, -90], [230, -90]], t: "三张 · 过去 现在 未来" }
  };
  const fanPos = (i, n) => { const a = -ARC + 2 * ARC * i / (n - 1), r = a * Math.PI / 180; return { x: FR * Math.sin(r) * U, y: (FCY - FR * Math.cos(r)) * U, r: a }; };
  const tf = p => `translate3d(${p.x}px,${p.y}px,${p.z || 0}px) rotate(${p.r || 0}deg)`;
  const slotXY = k => ({ x: spread.pos[k][0] * U, y: spread.pos[k][1] * U, r: 0 });
  const standTf = k => { const p = slotXY(k); return `translate3d(${p.x}px,${p.y - 14 * U}px,150px) rotateX(-${TILT}deg) scale(1.32)`; };
  const pose = p => p.revealed ? standTf(picks.indexOf(p)) : tf(slotXY(picks.indexOf(p)));
  function metrics() {
    const tw = Math.min(innerWidth * 1.6, 1050); U = tw / 1000;
    table.style.setProperty("--tw", tw + "px"); table.style.setProperty("--cw", Math.round(100 * U) + "px"); table.style.setProperty("--ch", Math.round(100 * U * 1.7) + "px");
    fanEls.forEach((e, i) => { const p = fanPos(i, fanEls.length); e.style.setProperty("--x", p.x + "px"); e.style.setProperty("--y", p.y + "px"); e.style.setProperty("--r", p.r + "deg"); });
    if (spread) { slots.querySelectorAll(".slot").forEach((s, i) => { s.style.setProperty("--x", spread.pos[i][0] * U + "px"); s.style.setProperty("--y", spread.pos[i][1] * U + "px"); }); picks.forEach(p => { p.cw.style.transform = pose(p); }); }
  }
  function buildFan() { fan.replaceChildren(); fanEls = Array.from({ length: 78 }, (_, i) => { const e = el("div", "fc"); e.dataset.i = i; fan.append(e); return e; }); metrics(); }
  function makeCard(c, rev) { const w = el("div", "cw"), d = el("div", "cd"), f = el("div", "cf" + (rev ? " rv" : ""), T.svg(c)); d.append(el("div", "cb"), f); w.append(d); return w; }
  const tableCenter = () => { const r = table.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

  /* ---------- 开场：魔法书打开，把牌“吐”出来，视角转为 3D ---------- */
  async function intro() {
    let from = false; try { from = sessionStorage.getItem("pwTarot") === "1"; sessionStorage.removeItem("pwTarot"); } catch (e) {}
    sizeSky(); buildFan(); requestAnimationFrame(frame); fanEls.forEach(e => { e.style.opacity = 0; });
    const ibk = $("ibk"), r = ibk.getBoundingClientRect();
    await wait(from ? 300 : 800); ibk.classList.add("open"); burst(r.left + r.width / 2, r.top + r.height / 2, 46, "255,222,150"); await wait(1500);
    B.classList.add("spit", "on-scene");
    fanEls.forEach((e, i) => {
      e.style.opacity = ""; if (reduce) return; const p = fanPos(i, fanEls.length);
      e.animate([{ transform: tf({ x: 0, y: -40 * U, z: 280, r: (rnd() - .5) * 140 }) + " scale(.3)", opacity: 0 }, { opacity: 1, offset: .25 }, { transform: tf(p), opacity: 1 }], { duration: 950, delay: 320 + i * 9, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
    });
    await wait(2000); state = "menu"; st("menu");
  }

  /* ---------- 选牌阵 → 洗牌 → 抽牌 → 翻牌 ---------- */
  document.querySelectorAll("[data-sp]").forEach(b => { b.onclick = () => chooseSpread(b.dataset.sp); });
  function chooseSpread(k) {
    spread = SP[k]; slots.replaceChildren();
    spread.pos.forEach((p, i) => { const s = el("div", "slot", `<span>${spread.labels[i]}</span>`); slots.append(s); requestAnimationFrame(() => s.classList.add("on")); });
    metrics(); state = "ready"; st("ready");
    $("mReadyT").innerHTML = `${spread.t}<small>${spread.n === 1 ? "Take a breath, hold your question" : "Past · Present · Future"} — 深呼吸，在心里默念问题，然后洗牌</small>`;
  }
  $("bBackSp").onclick = () => { slots.replaceChildren(); spread = null; state = "menu"; st("menu"); };
  $("bShuf").onclick = async () => {
    if (state !== "ready") return; state = "shuffle"; st("shuffle"); fan.classList.add("off"); deck = shuffle(C.map(c => c.id)); used.clear();
    const n = fanEls.length, dur = 1500;
    if (!reduce) fanEls.forEach((e, i) => { // 牌扇收拢、绕圈、再散开
      const p = fanPos(i, n), a = i / n * 6.283, mid = { x: (rnd() - .5) * 36 * U, y: 60 * U + (rnd() - .5) * 24 * U, r: (rnd() - .5) * 40 }, orb = { x: Math.cos(a * 2) * 90 * U, y: 40 * U + Math.sin(a * 2) * 50 * U, r: a * 57 };
      e.animate([{ transform: tf(p) }, { transform: tf(mid), offset: .32 }, { transform: tf(orb), offset: .62 }, { transform: tf(mid), offset: .8 }, { transform: tf(p) }], { duration: dur, delay: i * 5, easing: "cubic-bezier(.45,0,.3,1)" });
    });
    const [sx, sy] = tableCenter(); for (let k = 0; k < 7; k++) setTimeout(() => burst(sx, sy, 24, "190,150,255"), 350 + k * 170);
    await wait(dur + n * 5 + 150); fan.classList.remove("off"); state = "pick"; st("pick"); updPickT();
  };
  const updPickT = () => { $("mPickT").innerHTML = `凭直觉，从牌扇里抽出 <b>${spread.n - picks.length}</b> 张牌<small>Trust your intuition · ${picks.length} / ${spread.n}</small>`; };
  fan.addEventListener("click", e => { const f = e.target.closest(".fc"); if (f) pick(+f.dataset.i); });
  $("bAuto").onclick = async () => { while (state === "pick" && picks.length < spread.n) { const free = fanEls.map((_, i) => i).filter(i => !used.has(i)); pick(free[Math.floor(rnd() * free.length)]); await wait(420); } };
  async function pick(i) {
    if (state !== "pick" || picks.length >= spread.n || used.has(i)) return; used.add(i);
    const k = picks.length, c = C[deck[i]], p = fanPos(i, fanEls.length), pk = { cw: makeCard(c, rnd() < .3), c, rev: 0, revealed: false, landed: false };
    pk.rev = pk.cw.querySelector(".cf").classList.contains("rv"); fanEls[i].style.visibility = "hidden"; slots.append(pk.cw); pk.cw.style.transform = tf(p); picks.push(pk); updPickT();
    if (picks.length === spread.n) { state = "reveal"; st("reveal"); }
    const to = slotXY(k), mid = { x: (p.x + to.x) / 2, y: (p.y + to.y) / 2 - 40 * U, z: 130, r: p.r / 2 };
    const a = pk.cw.animate([{ transform: tf(p) }, { transform: tf(mid), offset: .5 }, { transform: tf(to) }], { duration: reduce ? 1 : 760, easing: "cubic-bezier(.3,.7,.2,1)" });
    await a.finished.catch(() => {}); pk.cw.style.transform = tf(to); pk.landed = true;
    if (state === "reveal" && picks.every(q => q.landed) && !revealing) { revealing = true; reveal(); }
  }
  async function reveal() {
    await wait(500);
    for (let k = 0; k < picks.length; k++) {
      const p = picks[k]; st("read");
      const a = p.cw.animate([{ transform: tf(slotXY(k)) }, { transform: standTf(k) }], { duration: reduce ? 1 : 950, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" });
      p.cw.querySelector(".cd").classList.add("flip"); await wait(520);
      const r = p.cw.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 34, rgb(p.c.color));
      p.revealed = true; showReading(k); a.finished.then(() => { p.cw.style.transform = standTf(k); a.cancel(); }).catch(() => {});
      await wait(1500);
    }
    state = "done"; st("done"); showSummary();
  }
  /* ---------- 解读面板 ---------- */
  let shown = 0;
  function showReading(k) {
    shown = k; const p = picks[k], r = T.read(p.c, p.rev), q = $("q").value.trim();
    $("pQ").textContent = q ? "你的问题：" + q : ""; $("pName").textContent = (spread.n > 1 ? spread.labels[k] + " · " : "") + r.name; $("pEn").textContent = r.en;
    $("pKw").replaceChildren(...r.kw.map(w => el("span", "", w))); $("pTx").textContent = r.text; $("pSum").textContent = "";
    const tabs = $("pTabs"); tabs.replaceChildren();
    if (spread.n > 1) picks.forEach((x, j) => { if (!x.revealed && j !== k) return; const b = el("button", j === k ? "on" : "", spread.labels[j]); b.onclick = () => { showReading(j); if (B.dataset.st === "done") showSummary(); }; tabs.append(b); });
  }
  function showSummary() {
    const kw = picks.map((p, i) => i && p.c.kw[0] === picks[i - 1].c.kw[0] ? p.c.kw[1] || p.c.kw[0] : p.c.kw[0]); // 相邻两张关键词相同时换一个，读起来不重复
    $("pSum").textContent = spread.n === 1 ? `愿「${kw[0]}」陪你度过今天。牌只是镜子，答案始终在你心里。` : `过去的「${kw[0]}」，造就了现在的「${kw[1]}」，也在指向未来的「${kw[2]}」。把三张牌连起来读，故事就浮现了。`;
  }
  $("bAgain").onclick = () => {
    picks.forEach(p => p.cw.remove()); picks = []; used.clear(); revealing = false; slots.replaceChildren(); spread = null; $("q").value = "";
    fanEls.forEach(e => { e.style.visibility = ""; }); state = "menu"; st("menu");
  };

  /* ---------- 牌库：78 张牌的全部样式（滚动到才生成 SVG） ---------- */
  const gal = $("gal"), galg = $("galg"), det = $("det"); let tab = "all";
  const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const g = e.target; io.unobserve(g); g.firstChild.innerHTML = T.svg(C[g.dataset.id]); }), { root: gal, rootMargin: "400px" });
  function buildGal() {
    galg.replaceChildren(); C.filter(c => tab === "all" || (tab === "major" ? c.major : c.suit === tab)).forEach(c => { const g = el("button", "g", "<div class=\"gs\"></div>"); g.dataset.id = c.id; g.setAttribute("aria-label", c.zh); g.onclick = () => detail(c); galg.append(g); io.observe(g); });
  }
  function detail(c) { $("detc").innerHTML = T.svg(c); $("dett").innerHTML = `<h3>${c.zh}</h3><p><em>${c.en}</em></p><p>${c.kw.map(w => "「" + w + "」").join(" ")}</p><p><em>正位</em>　${c.up}</p><p><em>逆位</em>　${c.rv}</p>`; det.classList.add("on"); }
  det.onclick = () => det.classList.remove("on");
  document.querySelectorAll("#galt button").forEach(b => { b.onclick = () => { document.querySelectorAll("#galt button").forEach(x => x.classList.toggle("on", x === b)); tab = b.dataset.t; gal.scrollTop = 0; buildGal(); }; });
  $("bGal").onclick = () => { gal.classList.add("on"); skyOn = false; buildGal(); };
  $("galx").onclick = () => { gal.classList.remove("on"); det.classList.remove("on"); skyOn = true; };
  addEventListener("keydown", e => { if (e.key === "Escape") { if (det.classList.contains("on")) det.classList.remove("on"); else if (gal.classList.contains("on")) $("galx").click(); } });

  /* ---------- 返回照片墙 ---------- */
  $("back").onclick = async e => { e.preventDefault(); try { sessionStorage.setItem("pwBack", "1"); } catch (e) {} B.classList.add("leave"); await wait(650); location.href = "index.html"; };
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { sizeSky(); metrics(); }, 150); });
  window.__tarot = { state: () => state, pick, burst };
  intro();
})();
