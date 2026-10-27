/* 命运之书 · 塔罗占卜 —— three.js + GSAP（无框架）
   流程：魔法书（待机）→ 翻开 → 选问题（随机 6 个）→ 发牌（78 张扇形牌阵）→ 选 3 张 → 翻牌解读 */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), TAU = Math.PI * 2, AD = THREE.AdditiveBlending;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, easeOut3 = t => 1 - Math.pow(1 - t, 3);
  const T = window.TAROT, B = window.BOOK, QS = (window.TAROT_QUESTIONS || []).slice();
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) gsap.globalTimeline.timeScale(2.5);
  const get = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { } };
  const del = k => { try { sessionStorage.removeItem(k); } catch (e) { } };
  const arrive = get('pwTarot') === '1'; if (arrive) del('pwTarot');
  const again = get('ttAgain') === '1'; if (again) del('ttAgain');
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  /* ---------- 渲染器 / 状态 ---------- */
  const R = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(devicePixelRatio, 1.75)); R.setClearColor(0x050408, 1);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, .1, 100);
  const S = {
    phase: again ? 'ask' : 'idle', offset: 0, vel: 0, dragging: false, dealT: 0, hero: 1, tableY: -1.2, disc: 0, candle: 1, zoom: arrive ? .45 : 1, tilt: false,
    cam: { px: 0, py: 4.4, pz: 6, tx: 0, ty: -.5, tz: 0 }, bk: { cover: 0, shift: 0, glow: .35, beam: 0, burst: 0, scale: 1, sink: 0 },
    dims: { w: 6, h: 10, a: .6, D: 12 }, picks: [], q: null, ptr: { x: 0, y: 0 }, src: new THREE.Vector3(0, -.4, .4)
  };
  const fz = a => (a < 1 ? 1 + (1 / a - 1) * .5 : 1);        // 竖屏时把镜头拉远，保证打开的书完整入镜
  const heroCam = a => ({ px: 0, py: 4.4 * fz(a), pz: 6 * fz(a), tx: 0, ty: -.5, tz: 0 });
  const askCam = a => Object.assign(heroCam(a), { ty: -.5 - 1.25 * fz(a) });  // 视线压低 → 书在屏幕里上移，给底部面板让位
  const pickCam = () => ({ px: 0, py: .8, pz: S.dims.D, tx: 0, ty: 0, tz: 0 });

  /* ---------- 小贴图 ---------- */
  function soft(kind) {
    const w = kind === 'beam' ? 64 : 128, h = kind === 'beam' ? 256 : 128, c = mk(w, h), x = c.getContext('2d');
    if (kind === 'beam') {
      const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,220,150,0)'); g.addColorStop(.5, 'rgba(255,236,190,.9)'); g.addColorStop(1, 'rgba(255,220,150,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = 'destination-in'; const v = x.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
    } else {
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      if (kind === 'flame') { g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(.25, 'rgba(255,200,110,.9)'); g.addColorStop(.6, 'rgba(255,130,40,.35)'); g.addColorStop(1, 'rgba(255,100,20,0)'); }
      else if (kind === 'glow') { g.addColorStop(0, 'rgba(255,230,170,.9)'); g.addColorStop(.35, 'rgba(233,180,90,.35)'); g.addColorStop(1, 'rgba(233,180,90,0)'); }
      else { g.addColorStop(0, 'rgba(255,245,215,1)'); g.addColorStop(.35, 'rgba(255,225,160,.5)'); g.addColorStop(1, 'rgba(255,225,160,0)'); }
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(c);
  }
  function tableCanvas() {   // 牌桌：黑绒 + 金色星盘线
    const c = mk(1024, 1024), x = c.getContext('2d'), M = 512, O = (r) => { x.moveTo(M + r, M); x.arc(M, M, r, 0, TAU); };
    const g = x.createRadialGradient(M, M, 20, M, M, 520); g.addColorStop(0, '#16131c'); g.addColorStop(1, '#050408'); x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
    x.strokeStyle = '#d9b868'; x.fillStyle = '#d9b868'; x.lineCap = 'round';
    [[470, 2], [440, 1.2], [330, 1.6], [200, 1.2], [120, 1]].forEach(([r, w]) => { x.lineWidth = w; x.globalAlpha = .5; x.beginPath(); O(r); x.stroke(); });
    x.lineWidth = 1; x.globalAlpha = .55; x.beginPath(); for (let k = 0; k < 144; k++) { const a = k * TAU / 144, l = k % 6 ? 6 : 16; x.moveTo(M + Math.cos(a) * 440, M + Math.sin(a) * 440); x.lineTo(M + Math.cos(a) * (440 + l), M + Math.sin(a) * (440 + l)); } x.stroke();
    x.globalAlpha = .42; x.beginPath(); for (let k = 0; k < 12; k++) { const a = k * TAU / 12; x.moveTo(M + Math.cos(a) * 120, M + Math.sin(a) * 120); x.lineTo(M + Math.cos(a) * 330, M + Math.sin(a) * 330); x.moveTo(M + Math.cos(a + .26) * 385 + 18, M + Math.sin(a + .26) * 385); x.arc(M + Math.cos(a + .26) * 385, M + Math.sin(a + .26) * 385, 18, 0, TAU); } x.stroke();
    [0, 1].forEach(d => { x.beginPath(); for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + (d ? Math.PI / 3 : 0) - Math.PI / 2; x.lineTo(M + Math.cos(a) * 330, M + Math.sin(a) * 330); } x.closePath(); x.stroke(); });
    x.globalAlpha = .65; for (let i = 0; i < 80; i++) { const px = Math.random() * 1024, py = Math.random() * 1024, r = 2 + Math.random() * 4; x.beginPath(); x.moveTo(px, py - r); x.quadraticCurveTo(px, py, px + r, py); x.quadraticCurveTo(px, py, px, py + r); x.quadraticCurveTo(px, py, px - r, py); x.quadraticCurveTo(px, py, px, py - r); x.fill(); }
    return c;
  }
  function edgeCanvas(vertical) { const c = mk(64, 64), x = c.getContext('2d'); x.fillStyle = '#a2814a'; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(30,18,4,.5)'; for (let i = 0; i < 64; i += 2) vertical ? x.fillRect(i, 0, 1, 64) : x.fillRect(0, i, 64, 1); return c; }

  /* ---------- 烫金着色器：只在金线上扫过一道高光（封面和卡牌通用） ---------- */
  const FOIL_V = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
  const CARD_F = `uniform sampler2D uBack;uniform sampler2D uFront;uniform float uSheen;uniform float uRev;uniform float uDim;varying vec2 vUv;
float rr(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;}
void main(){
  vec2 p=(vUv-0.5)*vec2(1.0,1.7);
  if(rr(p,vec2(0.5,0.85),0.07)>0.0) discard;
  vec4 c;
  if(gl_FrontFacing){ c=texture2D(uBack,vUv); }
  else { vec2 u=vec2(1.0-vUv.x,vUv.y); if(uRev>0.5){u=vec2(1.0)-u;} c=texture2D(uFront,u); }
  float lum=dot(c.rgb,vec3(0.299,0.587,0.114));
  float band=smoothstep(0.14,0.0,abs(vUv.x*0.75+vUv.y*0.55-uSheen));
  c.rgb+=vec3(1.0,0.92,0.72)*band*smoothstep(0.22,0.75,lum)*0.85;
  c.rgb*=uDim;
  gl_FragColor=vec4(c.rgb,1.0);
}`;
  const COVER_F = `uniform sampler2D map;uniform float uSheen;varying vec2 vUv;
void main(){
  vec4 c=texture2D(map,vUv);
  float lum=dot(c.rgb,vec3(0.299,0.587,0.114));
  float band=smoothstep(0.16,0.0,abs(vUv.x*0.7+vUv.y*0.5-uSheen));
  c.rgb+=vec3(1.0,0.93,0.75)*band*smoothstep(0.25,0.8,lum)*0.9;
  gl_FragColor=vec4(c.rgb,1.0);
}`;

  /* ---------- 构建场景（等贴图都画好再开始） ---------- */
  async function init() {
    const ctex = c => { const t = new THREE.CanvasTexture(c); t.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy()); return t; };
    const [coverC, pRC, pLC, pCC, spineC, backC] = await Promise.all([B.cover(640), B.page('R', 512), B.page('L', 512), B.page('cover', 512), B.spine(128), T.backCanvas(512)]);
    const backTex = ctex(backC), glowT = soft('glow'), dotT = soft('dot'), flameT = soft('flame'), beamT = soft('beam'), tableT = new THREE.CanvasTexture(tableCanvas());
    const cardGeo = new THREE.PlaneGeometry(1, 1.7);
    const cardMat = front => new THREE.ShaderMaterial({ uniforms: { uBack: { value: backTex }, uFront: { value: front || backTex }, uSheen: { value: -.5 }, uRev: { value: 0 }, uDim: { value: 1 } }, vertexShader: FOIL_V, fragmentShader: CARD_F, side: THREE.DoubleSide });

    // 灯光（只影响金属配件）
    scene.add(new THREE.AmbientLight(0x9a96b8, .6));
    const key = new THREE.DirectionalLight(0xffe9c4, .9); key.position.set(3, 6, 4); scene.add(key);

    // 金尘 + 远处虚化光斑
    const dustPos = new Float32Array(420 * 3); for (let i = 0; i < 420; i++) dustPos.set([(Math.random() - .5) * 18, (Math.random() - .5) * 14, -10 * Math.random() + 1], i * 3);
    const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dustPos, 3)), new THREE.PointsMaterial({ map: dotT, size: .07, color: 0xffe2a0, transparent: true, opacity: .75, depthWrite: false, blending: AD })); scene.add(dust);
    const bokPos = new Float32Array(26 * 3); for (let i = 0; i < 26; i++) bokPos.set([(Math.random() - .5) * 22, (Math.random() - .5) * 12, -14 * Math.random() - 3], i * 3);
    const bok = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(bokPos, 3)), new THREE.PointsMaterial({ map: glowT, size: 1.2, color: 0xffbe6a, transparent: true, opacity: .2, depthWrite: false, blending: AD })); scene.add(bok);

    // 牌桌 + 选牌阶段的竖直星盘背景
    const table = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshBasicMaterial({ map: tableT })); table.rotation.x = -Math.PI / 2; table.position.y = -1.2; scene.add(table);
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: tableT, transparent: true, opacity: 0, blending: AD, depthWrite: false })); disc.position.set(0, .5, -8); disc.visible = false; scene.add(disc);

    // 蜡烛
    const goldPh = new THREE.MeshPhongMaterial({ color: 0xc9a24d, specular: 0xfff3c0, shininess: 90 });
    const candles = [[-3.3, -1.6, 0], [3.5, -1.2, 2.3]].map(([x, z, sd]) => {
      const g = new THREE.Group(); g.position.set(x, -1.2, z);
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(.42, .48, .08, 28), goldPh); dish.position.y = .04;
      const wax = new THREE.Mesh(new THREE.CylinderGeometry(.2, .23, .9, 22), new THREE.MeshPhongMaterial({ color: 0xe6dcc3, shininess: 12 })); wax.position.y = .5;
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameT, transparent: true, blending: AD, depthWrite: false })); fl.position.y = 1.15;
      const lt = new THREE.PointLight(0xffb766, 1.1, 10); lt.position.set(0, 1.3, .2); g.add(dish, wax, fl, lt); scene.add(g); return { fl, lt, sd };
    });

    // 环绕魔法书的金色轨道、游走的光点和漂浮的小牌
    const orbit = new THREE.Group(); scene.add(orbit);
    const rings = [[2.7, 1.3, .55, .3], [3.5, 1.7, -.35, -.6], [4.3, 2.1, .95, .25]].map(([a, b, rx, rz], i) => {
      const p = []; for (let k = 0; k <= 128; k++) { const t = k / 128 * TAU; p.push(new THREE.Vector3(Math.cos(t) * a, 0, Math.sin(t) * b)); }
      const grp = new THREE.Group(); grp.rotation.set(rx, 0, rz);
      grp.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: 0xe9c97f, transparent: true, opacity: .42, blending: AD, depthWrite: false })));
      const sp = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(15), 3)), new THREE.PointsMaterial({ map: dotT, size: .2, color: 0xffe7b0, transparent: true, depthWrite: false, blending: AD })); sp.frustumCulled = false; grp.add(sp);
      const cs = [0, 1].map(n => { const m = new THREE.Mesh(cardGeo, cardMat()); m.scale.setScalar(.4); grp.add(m); return { m, ph: (n * .5 + i * .17) % 1 }; });
      orbit.add(grp); return { a, b, sp, cs, spd: .035 + i * .012 };
    });

    /* ===== 魔法书 ===== */
    const bw = 1.5, root = new THREE.Group(), tilt = new THREE.Group(), bk = new THREE.Group(), hinge = new THREE.Group(); root.add(tilt); tilt.add(bk); scene.add(root);
    const dark = new THREE.MeshBasicMaterial({ color: 0x0a090d }), sideM = new THREE.MeshBasicMaterial({ color: 0x2b2417 });
    const coverTex = ctex(coverC), coverMat = new THREE.ShaderMaterial({ uniforms: { map: { value: coverTex }, uSheen: { value: -.5 } }, vertexShader: FOIL_V, fragmentShader: COVER_F });
    const backCover = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, .06), dark); backCover.position.set(.75, 0, -.17); bk.add(backCover);
    const eV = ctex(edgeCanvas(true)), eH = ctex(edgeCanvas(false)), eMV = new THREE.MeshBasicMaterial({ map: eV }), eMH = new THREE.MeshBasicMaterial({ map: eH });
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, .23), [eMV, eMV, eMH, eMH, dark, dark]); block.position.set(.74, 0, -.035); bk.add(block);
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, 2.1, 28, 1, false, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ map: ctex(spineC) })); bk.add(spine);
    // 会弯曲的书页
    const BN = 14, SW = 1.4, pageR = ctex(pRC), pageL = ctex(pLC); pageL.repeat.x = -1; pageL.offset.x = 1;
    const mFront = new THREE.MeshBasicMaterial({ map: pageR }), mBack = new THREE.MeshBasicMaterial({ map: pageL, side: THREE.BackSide });
    const sheets = [0, 1, 2, 3, 4].map(k => { const g = new THREE.PlaneGeometry(SW, 2, BN, 1), s = { k, g, f: 0, last: -1, zr: .125 - .009 * k, zl: -.125 + .009 * k }; [mFront, mBack].forEach(m => { const me = new THREE.Mesh(g, m); me.frustumCulled = false; bk.add(me); }); return s; });
    function bend(s, f) {   // 从书脊开始逐段累加角度：翻动时页尖“拖在后面”，像真的纸
      const th = f * Math.PI, pos = s.g.attributes.position, dx = SW / BN, c = .45 * Math.sin(th), z0 = lerp(s.zr, s.zl, f); let x = .03, z = 0;
      for (let j = 0; j <= BN; j++) { if (j > 0) { const a = th * (1 - c * (j / BN) * .9); x += Math.cos(a) * dx; z += Math.sin(a) * dx; } pos.setXYZ(j, x, 1, z0 + z); pos.setXYZ(j + BN + 1, x, -1, z0 + z); }
      pos.needsUpdate = true;
    }
    sheets.forEach(s => { bend(s, 0); s.last = 0; });
    // 封面（绕书脊旋转）
    hinge.position.set(0, 0, .17); bk.add(hinge);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, .06), [sideM, sideM, sideM, sideM, coverMat, new THREE.MeshBasicMaterial({ map: ctex(pCC) })]); cover.position.x = .75; hinge.add(cover);
    const cs = new THREE.Shape(); cs.moveTo(0, 0); cs.lineTo(.26, 0); cs.quadraticCurveTo(.1, .1, 0, .26); cs.closePath();
    const cornerGeo = new THREE.ExtrudeGeometry(cs, { depth: .012, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 2 });
    [[.015, -1.035, 0], [.015, 1.035, -Math.PI / 2], [1.485, 1.035, Math.PI], [1.485, -1.035, Math.PI / 2]].forEach(([x, y, r]) => { const m = new THREE.Mesh(cornerGeo, goldPh); m.position.set(x, y, .034); m.rotation.z = r; hinge.add(m); });
    const clasp = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .03, 28), goldPh); clasp.rotation.x = Math.PI / 2; clasp.position.set(1.47, 0, .05); hinge.add(clasp);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(.16, .09, .014), goldPh); strap.position.set(1.4, 0, .042); hinge.add(strap);
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(.07, .62), new THREE.MeshBasicMaterial({ color: 0x0d0b12, side: THREE.DoubleSide })); ribbon.position.set(.5, -1.3, -.02); bk.add(ribbon);
    const charm = new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 8, 20), goldPh); charm.position.set(.5, -1.64, -.02); bk.add(charm);
    const bookLight = new THREE.PointLight(0xffd9a0, .9, 8); bookLight.position.set(0, 1, 2.4); tilt.add(bookLight);
    // 光晕、光柱、升起的光点
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffd998, transparent: true, depthWrite: false, blending: AD })); halo.position.z = -.3; tilt.add(halo);
    const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: beamT, transparent: true, depthWrite: false, blending: AD })); beam.position.set(0, 0, 1.7); beam.scale.set(1.9, 3.4, 1); tilt.add(beam);
    const NM = 90, motePos = new Float32Array(NM * 3), moteSeed = Array.from({ length: NM }, () => [Math.random(), Math.random() * TAU, .3 + Math.random() * 1.1]);
    const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(motePos, 3)), new THREE.PointsMaterial({ map: dotT, size: .11, color: 0xffe2a8, transparent: true, depthWrite: false, blending: AD })); motes.frustumCulled = false; tilt.add(motes);
    // 封面高光：每隔几秒从左到右扫过一次烫金
    gsap.to(coverMat.uniforms.uSheen, { value: 1.5, duration: 2.6, ease: 'power1.inOut', repeat: -1, repeatDelay: 2.4 });

    /* ===== 78 张牌 ===== */
    const deckG = new THREE.Group(); scene.add(deckG);
    const ids = [...Array(78).keys()]; for (let i = 77; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const deck = ids.map((id, i) => { const m = new THREE.Mesh(cardGeo, cardMat()); m.visible = false; m.position.set(0, -99, 0); deckG.add(m); const d = { id, i, rev: Math.random() < .35, picked: false, m }; m.userData.d = d; return d; });
    const glint = new THREE.PointLight(0xffe2a8, 1, 16); glint.position.set(0, 1.5, 3.2); scene.add(glint);

    /* ---------- 动画接口 ---------- */
    const b = S.bk, api = {};
    api.open = done => {
      const a = S.dims.a, ac = askCam(a);
      return gsap.timeline({ onComplete: done })
        .to(b, { cover: 1, duration: 1.7, ease: 'back.out(1.4)' }, 0).to(b, { shift: 1, duration: 1.5, ease: 'power2.inOut' }, 0)
        .to(b, { glow: 1, duration: 1.4 }, .3).to(b, { beam: 1, duration: 1.4 }, .6)
        .to(sheets[0], { f: 1, duration: 1.1, ease: 'power2.inOut' }, .55).to(sheets[1], { f: 1, duration: 1.1, ease: 'power2.inOut' }, .85)
        .to(S.cam, { ty: ac.ty, duration: 1.3, ease: 'power2.inOut' }, 1.5);
    };
    api.openNow = () => { Object.assign(b, { cover: 1, shift: 1, glow: 1, beam: 1 }); sheets[0].f = 1; sheets[1].f = 1; Object.assign(S.cam, askCam(S.dims.a)); };
    api.deal = done => {
      S.dealT = 0; const tl = gsap.timeline({ onComplete: done });
      [2, 3, 4].forEach((k, i) => tl.to(sheets[k], { f: 1, duration: .7, ease: 'power2.in' }, i * .14));          // 书页哗啦翻过
      tl.to(b, { burst: 1, duration: .5, ease: 'power2.out' }, 0).to(b, { burst: 0, duration: 1, ease: 'power2.in' }, .5)
        .to(S.cam, Object.assign(pickCam(), { duration: 2.6, ease: 'power3.inOut' }), .9)
        .to(S, { dealT: 3.4, duration: 3.4, ease: 'none' }, .9).to(S, { hero: 0, duration: 1.2, ease: 'power2.in' }, .2)
        .to(b, { glow: 0, beam: 0, duration: 1.2 }, 1.3).to(b, { sink: 1, scale: 0, duration: 1.4, ease: 'power3.in' }, 1.3)
        .to(S, { tableY: -9, disc: .38, candle: .3, duration: 1.8, ease: 'power2.inOut' }, 1.2);
      return tl;
    };
    api.reveal = done => {
      S.phase = 'reveal'; const { w, h } = S.dims, sc = Math.min(1.9, .46 * h / 1.7, w * .92 / 3.24), sp = sc * 1.12, y = h * .2;
      const tl = gsap.timeline({ onComplete: () => { S.tilt = true; } });
      S.picks.forEach((d, k) => {
        const m = d.m;
        tl.to(m.position, { x: (k - 1) * sp, y, z: 1.2, duration: .9, ease: 'power3.inOut' }, k * .1)
          .to(m.scale, { x: sc, y: sc, z: sc, duration: .9, ease: 'power3.inOut' }, k * .1)
          .to(m.rotation, { y: Math.PI, duration: 1.2, ease: 'back.out(1.2)' }, 1 + k * .55)
          .to(m.scale, { x: sc * 1.1, y: sc * 1.1, duration: .3, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1 + k * .55);
      });
      deck.forEach(d => { if (!d.picked && d.m.visible) tl.to(d.m.scale, { x: .001, y: .001, z: .001, duration: .7, ease: 'power2.in', onComplete: () => { d.m.visible = false; } }, 0); });
      tl.call(() => done && done(), null, 2.3);
      return tl;
    };

    /* ---------- 每帧 ---------- */
    const clock = new THREE.Clock();
    function frame() {
      requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), .05), now = clock.elapsedTime, ph = S.phase, { w, h } = S.dims;
      // 镜头
      const c = S.cam, z = S.zoom;
      cam.position.set(c.tx + (c.px - c.tx) * z + S.ptr.x * .2, c.ty + (c.py - c.ty) * z + S.ptr.y * .12, c.tz + (c.pz - c.tz) * z); cam.lookAt(c.tx, c.ty, c.tz);
      // 背景
      dust.rotation.y += dt * .012; dust.position.y = Math.sin(now * .3) * .15; bok.position.x = Math.sin(now * .1) * .5;
      table.position.y = S.tableY; table.visible = S.tableY > -6; disc.visible = S.disc > .01; disc.material.opacity = S.disc; disc.rotation.z += dt * .03;
      candles.forEach(cd => { const t = now + cd.sd, f = 1 + Math.sin(t * 9) * .07 + Math.sin(t * 17) * .04; cd.fl.scale.set(.5 * f, .85 * f, 1); cd.lt.intensity = (1.1 + Math.sin(t * 11) * .2) * S.candle; });
      // 轨道
      orbit.scale.setScalar(Math.max(.0001, S.hero)); orbit.visible = S.hero > .01;
      rings.forEach((r, i) => {
        const pos = r.sp.geometry.attributes.position, dir = i % 2 ? -1 : 1;
        for (let k = 0; k < 5; k++) { const u = (now * r.spd * dir + k / 5) * TAU; pos.setXYZ(k, Math.cos(u) * r.a, 0, Math.sin(u) * r.b); } pos.needsUpdate = true;
        r.cs.forEach(cc => { const u = (now * r.spd * .7 * dir + cc.ph) * TAU; cc.m.position.set(Math.cos(u) * r.a, Math.sin(now * 1.2 + cc.ph * 9) * .12, Math.sin(u) * r.b); cc.m.lookAt(0, 4, 8); cc.m.rotateZ(Math.sin(now * .6 + cc.ph * 5) * .4); cc.m.material.uniforms.uSheen.value = .3 + Math.sin(now * .5 + cc.ph * 6) * .6; });
      });
      // 书
      root.position.set(0, -.55 + Math.sin(now * 1.1) * .05 * (1 - b.sink) - b.sink * .8, 0); root.scale.setScalar(Math.max(.0001, b.scale)); root.visible = b.scale > .002;
      tilt.rotation.set(-1.15 + Math.sin(now * .7) * .02, lerp(-.4, 0, b.shift) + Math.sin(now * .5) * .05, 0);
      bk.position.x = -.75 * (1 - b.shift); hinge.rotation.y = -b.cover * Math.PI; hinge.position.z = .17 - .34 * b.cover;
      sheets.forEach(s => { let f = s.f; if (s.k === 2 && ph === 'ask') f += .025 + .025 * Math.sin(now * 1.7); if (f !== s.last) { bend(s, f); s.last = f; } });
      halo.material.opacity = .12 + .5 * b.glow + .6 * b.burst; halo.scale.setScalar(5 + 3 * b.glow + 4 * b.burst);
      beam.material.opacity = .75 * b.beam * (1 + .6 * b.burst); bookLight.intensity = .5 + .8 * b.glow + 2 * b.burst;
      const mp = motes.geometry.attributes.position;
      for (let i = 0; i < NM; i++) { const [u, ang, sp] = moteSeed[i], p = (u + now * .12 * sp) % 1; mp.setXYZ(i, Math.cos(ang + now * .5 * sp) * (.25 + p * 1.1), Math.sin(ang + now * .5 * sp) * (.3 + p * .9), .1 + p * 2.4); }
      mp.needsUpdate = true; motes.material.opacity = .9 * b.beam;
      // 牌
      if (ph === 'reveal') {
        if (S.tilt) S.picks.forEach((d, k) => { d.m.rotation.x = lerp(d.m.rotation.x, -S.ptr.y * .18 + Math.sin(now * .8 + k) * .03, .08); d.m.rotation.y = lerp(d.m.rotation.y, Math.PI + S.ptr.x * .3, .08); d.m.material.uniforms.uSheen.value = .5 + S.ptr.x * .8 + Math.sin(now * .7 + k) * .25; });
        glint.position.set(S.ptr.x * 3.5, h * .2 + S.ptr.y * 2, 4);
      } else if (ph === 'deal' || ph === 'pick') {
        const Rf = clamp(w * 1.15, 6.5, 12), step = .62 / Rf, span = 78 * step; S.fan = { Rf, step, span };
        if (ph === 'pick' && !S.dragging) { S.offset += S.vel; S.vel *= .93; if (Math.abs(S.vel) < .0006) S.offset += (Math.round(S.offset / step) * step - S.offset) * .1; }   // 惯性滑动，停下后吸附到最近一张
        const pivotY = -h * .2 - Rf, sx = S.src;
        for (const d of deck) {
          if (d.picked) { d.m.material.uniforms.uSheen.value = .5 + Math.sin(now * .8 + d.i) * .5; continue; }
          const m = d.m; let a = ((d.i * step + S.offset) % span + span) % span; if (a > span / 2) a -= span;
          const dist = Math.abs(a) * Rf; let p = 1;
          if (ph === 'deal') p = easeOut3(clamp((S.dealT - dist * .14 - .2) / 1.1));
          if (dist > w / 2 + 1.2 || p <= 0) { m.visible = false; m.position.set(0, -99, 0); continue; }
          const fo = Math.exp(-Math.pow(a / (step * 1.7), 2)), tx = Math.sin(a) * Rf, ty = pivotY + Math.cos(a) * Rf + fo * .5 + Math.sin(now * 1.2 + d.i) * .025, tz = -dist * .05 + fo * .3;
          m.visible = true; m.position.set(lerp(sx.x, tx, p), lerp(sx.y, ty, p) + (ph === 'deal' ? Math.sin(Math.PI * p) * .9 : 0), lerp(sx.z, tz, p));
          m.rotation.set(0, 0, -a + (1 - p) * (d.i % 2 ? 3 : -3)); m.scale.setScalar((.25 + .75 * p) * (1 + fo * .16));
          m.material.uniforms.uSheen.value = .25 + a * 1.4 + Math.sin(now * .5) * .25; m.material.uniforms.uDim.value = lerp(.62, 1, clamp(1 - dist / (w * .6)));
        }
        glint.position.set(S.ptr.x * 3.5, 1.5 + S.ptr.y * 1.5, 3.2);
      }
      R.render(scene, cam);
    }

    /* ---------- 尺寸 ---------- */
    function layout() {
      const W = innerWidth, H = innerHeight, a = W / H; R.setSize(W, H, false); cam.aspect = a; cam.updateProjectionMatrix();
      const h0 = 2 * Math.tan(THREE.MathUtils.degToRad(20)), D = Math.max(11, 5.6 / a / h0); S.dims = { a, D, h: h0 * D, w: h0 * D * a };
      if (S.phase === 'idle') Object.assign(S.cam, heroCam(a)); if (S.phase === 'ask') Object.assign(S.cam, askCam(a)); if (S.phase === 'pick') S.cam.pz = D;
    }
    addEventListener('resize', layout); layout();
    return { api, deck, frame, layout, cardGeo };
  }

  /* ---------- 界面 ---------- */
  init().then(ctx => {
    const { api, deck, frame } = ctx, hint = $('#hint'), ask = $('#ask'), read = $('#read'), slots = [...document.querySelectorAll('#slots i')], qline = $('#qline'), go = $('#go');
    const LABEL = ['过去', '现在', '未来'], esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const setPhase = p => { S.phase = p; };
    let six = [];
    const shuffleSix = () => {   // 每次随机 6 个（尽量不和上一批重复）
      const pool = QS.filter(q => !six.includes(q)), src = pool.length >= 6 ? pool : QS.slice();
      for (let i = src.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [src[i], src[j]] = [src[j], src[i]]; }
      six = src.slice(0, 6); S.q = null; go.disabled = true; renderQs();
    };
    function renderQs() {
      $('#qs').innerHTML = six.map((q, i) => `<li><button type="button" class="q${q === S.q ? ' on' : ''}" data-i="${i}">${esc(q)}</button></li>`).join('');
      gsap.to('#qs .q', { opacity: 1, y: 0, duration: .5, stagger: .07, ease: 'power2.out', overwrite: true });
    }
    $('#qs').addEventListener('click', e => { const b = e.target.closest('.q'); if (!b) return; S.q = six[+b.dataset.i]; go.disabled = false; document.querySelectorAll('#qs .q').forEach(x => x.classList.toggle('on', x === b)); });
    $('#shuffle').onclick = shuffleSix;
    const showAsk = () => { setPhase('ask'); hint.classList.add('off'); if (!six.length) shuffleSix(); else renderQs(); ask.classList.add('show'); };
    const setSlots = n => slots.forEach((s, i) => s.classList.toggle('fill', i < n));

    function start() { if (S.phase !== 'idle') return; setPhase('open'); hint.classList.add('off'); api.open(showAsk); }
    go.onclick = () => {
      if (!S.q || S.phase !== 'ask') return;
      ask.classList.remove('show'); qline.textContent = S.q; qline.classList.add('on'); $('#slots').classList.add('on'); setPhase('deal');
      api.deal(() => { setPhase('pick'); hint.textContent = '左右滑动牌阵，轻触一张牌'; hint.classList.remove('off'); });
    };
    $('#back').addEventListener('click', e => { e.preventDefault(); put('pwBack', '1'); $('#fade').classList.add('on'); setTimeout(() => { location.href = 'index.html'; }, 600); });

    function showRead() {
      const cs = S.picks.map(d => T.cards[d.id]), kw = cs.map(c => c.kw[0]);
      read.innerHTML = `<p class="eyebrow">YOUR SPREAD</p><div class="sum"><small>PAST · PRESENT · FUTURE</small>从「${kw[0]}」出发，经过「${kw[1]}」，走向「${kw[2]}」</div><div class="cols">` +
        S.picks.map((d, k) => { const c = cs[k], r = T.read(c, d.rev); return `<article class="rc"><span class="pos">${LABEL[k]} · ${['PAST', 'PRESENT', 'FUTURE'][k]}</span><b>${esc(c.zh)}</b><i>${esc(c.en.toUpperCase())} · ${d.rev ? '逆位' : '正位'}</i><div class="kw">${c.kw.map(x => `<em>${esc(x)}</em>`).join('')}</div><p>${esc(r.text)}</p></article>`; }).join('') +
        `</div><div class="row"><button type="button" class="go" id="again">换个问题再抽</button><a class="ghost" href="index.html" id="home">回到照片墙</a></div><small class="foot">占卜仅供娱乐，别太当真。</small>`;
      read.classList.add('show'); gsap.to('.rc', { opacity: 1, y: 0, duration: .7, stagger: .18, ease: 'power2.out', delay: .4 });
      $('#again').onclick = () => { put('ttAgain', '1'); location.reload(); };
      $('#home').addEventListener('click', e => { e.preventDefault(); put('pwBack', '1'); $('#fade').classList.add('on'); setTimeout(() => { location.href = 'index.html'; }, 600); });
    }
    function pick(d) {
      if (S.phase !== 'pick' || d.picked || S.picks.length >= 3) return;
      d.picked = true; S.picks.push(d); const k = S.picks.length - 1, m = d.m, { w, h } = S.dims, sp = Math.min(.9, w * .26);
      m.material.uniforms.uRev.value = d.rev ? 1 : 0;
      T.canvas(T.cards[d.id], 512).then(cv => { const t = new THREE.CanvasTexture(cv); t.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy()); m.material.uniforms.uFront.value = t; });   // 只给选中的牌生成牌面贴图
      gsap.to(m.position, { x: (k - 1) * sp, y: h * .2, z: .6, duration: .9, ease: 'power3.out' }); gsap.to(m.scale, { x: .55, y: .55, z: .55, duration: .9, ease: 'power3.out' }); gsap.to(m.rotation, { z: 0, duration: .9, ease: 'power3.out' });
      setSlots(S.picks.length); hint.textContent = S.picks.length < 3 ? `已选 ${S.picks.length} / 3` : '';
      if (S.picks.length === 3) { hint.classList.add('off'); setTimeout(() => { api.reveal(showRead); }, 1000); }
    }

    /* ---------- 指针：拖动牌阵 / 点选 ---------- */
    const cvEl = $('#c'), rc = new THREE.Raycaster(), v2 = new THREE.Vector2(); let dn = null;
    cvEl.addEventListener('pointerdown', e => { dn = { t: performance.now(), lx: e.clientX, m: 0 }; if (S.phase === 'pick') { S.dragging = true; S.vel = 0; } try { cvEl.setPointerCapture(e.pointerId); } catch (x) { } });
    addEventListener('pointermove', e => {
      S.ptr.x = e.clientX / innerWidth * 2 - 1; S.ptr.y = -(e.clientY / innerHeight * 2 - 1);
      if (!dn) return; const dx = e.clientX - dn.lx; dn.lx = e.clientX; dn.m += Math.abs(dx);
      if (S.phase === 'pick' && S.dragging && S.fan) { const d = dx * (S.dims.w / innerWidth) / S.fan.Rf; S.offset += d; S.vel = d; }
    });
    addEventListener('pointerup', e => {
      const d = dn; dn = null; S.dragging = false; if (!d) return;
      if (d.m < 8 && performance.now() - d.t < 500) {
        if (S.phase === 'idle') return start();
        if (S.phase !== 'pick') return;
        v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight * 2 - 1)); rc.setFromCamera(v2, cam);
        const hit = rc.intersectObjects(deck.filter(x => x.m.visible && !x.picked).map(x => x.m), false)[0]; if (hit) pick(hit.object.userData.d);
      }
    });
    addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') start(); if (S.phase === 'pick') { if (e.key === 'ArrowLeft') S.vel = -.02; if (e.key === 'ArrowRight') S.vel = .02; } });

    /* ---------- 开场 ---------- */
    if (S.phase === 'ask') { api.openNow(); showAsk(); } else { hint.classList.remove('off'); }
    frame();
    requestAnimationFrame(() => {
      $('#load').classList.add('gone');
      if (arrive) { $('#flash').style.opacity = 0; gsap.to(S, { zoom: 1, duration: 2.8, ease: 'power3.out' }); }
    });
  }).catch(err => { console.error(err); const s = document.querySelector('#load span'); if (s) s.textContent = '加载失败，请刷新重试'; });
})();
