/* ===== 命运之书入口：真实 three.js 星门穿越 → 进入塔罗页 ===== */
// three.js 优先用网站根目录的 three.min.js（国内最稳），失败再回退到公共 CDN
const THREE_SRC = ["three.min.js", "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"];
let threeP;
const loadThree = () => threeP || (threeP = new Promise((ok, no) => {
  if (window.THREE) return ok(); let i = 0;
  (function n() { if (i >= THREE_SRC.length) { threeP = null; return no(); } const sc = document.createElement("script"); sc.src = THREE_SRC[i++]; sc.onload = () => (window.THREE ? ok() : n()); sc.onerror = n; document.head.appendChild(sc); })();
}));
// 星门：金色粒子从四面八方螺旋着被吸进魔法书，随后冲进隧道；消失点正好对准魔法书所在的位置
function warp(bx, by) {
  const cv = el("canvas"); cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:33;pointer-events:none"; document.body.append(cv);
  const W = innerWidth, H = innerHeight, R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 1.75)); R.setSize(W, H); R.setClearColor(0x000000, 0);
  const S = new THREE.Scene(), cam = new THREE.PerspectiveCamera(70, W / H, .1, 200), U = { uT: { value: 0 }, uTravel: { value: 0 }, uPR: { value: R.getPixelRatio() } };
  cam.setViewOffset(W, H, W / 2 - bx, H / 2 - by, W, H);   // 把镜头的“正前方”平移到魔法书的屏幕位置
  const N = 2600, g = new THREE.BufferGeometry(), a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) a.set([Math.random() * 6.2832, .6 + Math.pow(Math.random(), .7) * 7, Math.random()], i * 3);   // 每个粒子：[角度, 半径, 深度]，位置全部在着色器里算
  g.setAttribute("position", new THREE.BufferAttribute(a, 3));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uT,uTravel,uPR;varying vec3 vC;varying float vA;
    void main(){float z=-mod(position.z*80.-uTravel,80.),d=-z;float ang=position.x+uT*.7+d*.045*(1.+uT*.3);
    float r=position.y*(1.+d*.012)*mix(2.6,.45,smoothstep(0.,1.4,uT));
    gl_Position=projectionMatrix*modelViewMatrix*vec4(cos(ang)*r,sin(ang)*r,z,1.);
    gl_PointSize=min(26.,uPR*(1.5+(1.-d/80.)*6.5));vA=smoothstep(80.,60.,d)*smoothstep(0.,5.,d);
    vC=mix(vec3(1.,.86,.55),vec3(1.,.97,.85),fract(position.x*3.1));}`,
    fragmentShader: "varying vec3 vC;varying float vA;void main(){float a=smoothstep(.5,0.,length(gl_PointCoord-.5));gl_FragColor=vec4(vC,a*a*vA);}" }));
  pts.frustumCulled = false; S.add(pts);
  const rg = [0, 1].map(i => { const m = new THREE.Mesh(new THREE.RingGeometry(.93, 1, 96), new THREE.MeshBasicMaterial({ color: i ? 0xfff0c4 : 0xe9c97f, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.position.z = -8; S.add(m); return m; });
  const c = el("canvas"); c.width = c.height = 128; const x = c.getContext("2d"), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,245,215,1)"); gr.addColorStop(.35, "rgba(240,190,100,.55)"); gr.addColorStop(1, "rgba(240,190,100,0)"); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); gl.position.z = -9; S.add(gl);
  const st = performance.now(); let last = st;
  (function f() {
    const now = performance.now(), t = (now - st) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
    U.uT.value = t; U.uTravel.value += dt * (5 + t * t * 26);
    const e = Math.pow(Math.min(1, t / 1.7), 3);
    rg.forEach((m, i) => { m.scale.setScalar(.5 + e * (i ? 22 : 30) + Math.sin(t * 3 + i) * .03); m.rotation.z = t * (i ? -.8 : .6); });
    gl.scale.setScalar(2 + e * 40); gl.material.opacity = .4 + .6 * Math.min(1, t / 1.8);
    R.render(S, cam);
    if (t < 2.2) requestAnimationFrame(f); else { R.dispose(); cv.remove(); }
  })();
}
async function enterTarot() {
  if (entering || bOpen) return; entering = true;
  const go = () => { try { sessionStorage.setItem("pwTarot", "1"); } catch (e) {} location.href = TAROT_URL; };
  if (reduceMo()) return go();
  const t0 = performance.now(), gate = $("tarotGate"), bk = gate.querySelector(".bk"), g = bk.getBoundingClientRect(), vis = g.bottom > 40 && g.top < innerHeight - 40;
  const bx = vis ? g.left + g.width / 2 : innerWidth / 2, by = vis ? g.top + g.height / 2 : innerHeight * .46, th = loadThree().then(() => true, () => false), clone = bk.cloneNode(true);
  clone.style.cssText = "position:fixed;z-index:34;margin:0;left:" + (bx - g.width / 2) + "px;top:" + (by - g.height / 2) + "px;width:" + g.width + "px;height:" + g.height + "px";
  document.body.append(clone); gate.style.visibility = "hidden"; document.body.classList.add("sucking");
  const dark = el("div"); dark.style.cssText = "position:fixed;inset:0;z-index:30;pointer-events:none;opacity:0;background:radial-gradient(circle at " + bx + "px " + by + "px,#1a140a,#030207 70%)"; document.body.append(dark);
  dark.animate([{ opacity: 0 }, { opacity: .96 }], { duration: 1300, easing: "ease-in", fill: "forwards" });
  setTimeout(() => clone.classList.add("open"), 350);
  if (await Promise.race([th, new Promise(r => setTimeout(() => r(false), 700))])) { try { warp(bx, by); } catch (e) {} }   // three.js 没来得及加载就跳过星门，其余动画照常
  await new Promise(r => setTimeout(r, Math.max(0, 1250 - (performance.now() - t0))));
  clone.animate([{ transform: "scale(1)" }, { transform: "scale(1.6)" }], { duration: 320, easing: "ease-out", fill: "forwards" });
  const fl = el("div"); fl.style.cssText = "position:fixed;inset:0;z-index:36;pointer-events:none;opacity:0;background:radial-gradient(circle at " + bx + "px " + by + "px,#fff,#f3d99b 60%)"; document.body.append(fl);
  fl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "forwards" });
  await new Promise(r => setTimeout(r, 340)); go();
}
$("bTarot").onclick = enterTarot; $("tarotGate").onclick = enterTarot;
["pointerenter", "touchstart"].forEach(ev => [$("bTarot"), $("tarotGate")].forEach(n => n.addEventListener(ev, () => loadThree().catch(() => {}), { once: true, passive: true })));   // 手指/鼠标一靠近就开始预加载 three.js
