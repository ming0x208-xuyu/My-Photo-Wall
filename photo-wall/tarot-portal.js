/* 首页「命运之书」入口的 three.js 星门：金色粒子从四面八方螺旋着被吸进魔法书，随后冲进隧道。
   消失点正好对准魔法书在屏幕上的位置。由 index.html 的 enterTarot() 调用：TarotPortal.warp(x, y) */
(function () {
  var LIB = ['vendor/three.min.js', 'three.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'];
  var loading = null;
  function load() {
    if (window.THREE) return Promise.resolve();
    return loading || (loading = new Promise(function (ok, no) {
      var i = 0;
      (function n() {
        if (i >= LIB.length) { loading = null; return no(); }
        var s = document.createElement('script'); s.src = LIB[i++];
        s.onload = function () { window.THREE ? ok() : n(); }; s.onerror = n; document.head.appendChild(s);
      })();
    }));
  }
  function run(bx, by) {
    var cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:33;pointer-events:none'; document.body.appendChild(cv);
    var W = innerWidth, H = innerHeight, R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
    R.setPixelRatio(Math.min(devicePixelRatio, 1.75)); R.setSize(W, H); R.setClearColor(0x000000, 0);
    var S = new THREE.Scene(), cam = new THREE.PerspectiveCamera(70, W / H, .1, 200), U = { uT: { value: 0 }, uTravel: { value: 0 }, uPR: { value: R.getPixelRatio() } };
    cam.setViewOffset(W, H, W / 2 - bx, H / 2 - by, W, H);          // 把镜头“正前方”平移到魔法书的屏幕位置
    var N = 2600, g = new THREE.BufferGeometry(), a = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) a.set([Math.random() * 6.2832, .6 + Math.pow(Math.random(), .7) * 7, Math.random()], i * 3);   // 每个粒子：[角度, 半径, 深度]；位置全部在着色器里算
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    var pts = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'uniform float uT;uniform float uTravel;uniform float uPR;varying vec3 vC;varying float vA;' +
        'void main(){float z=-mod(position.z*80.0-uTravel,80.0);float d=-z;float ang=position.x+uT*0.7+d*0.045*(1.0+uT*0.3);' +
        'float r=position.y*(1.0+d*0.012)*mix(2.6,0.45,smoothstep(0.0,1.4,uT));' +
        'gl_Position=projectionMatrix*modelViewMatrix*vec4(cos(ang)*r,sin(ang)*r,z,1.0);' +
        'gl_PointSize=min(26.0,uPR*(1.5+(1.0-d/80.0)*6.5));vA=smoothstep(80.0,60.0,d)*smoothstep(0.0,5.0,d);' +
        'vC=mix(vec3(1.0,0.86,0.55),vec3(1.0,0.97,0.85),fract(position.x*3.1));}',
      fragmentShader: 'varying vec3 vC;varying float vA;void main(){float a=smoothstep(0.5,0.0,length(gl_PointCoord-0.5));gl_FragColor=vec4(vC,a*a*vA);}'
    }));
    pts.frustumCulled = false; S.add(pts);
    var rg = [0, 1].map(function (i) { var m = new THREE.Mesh(new THREE.RingGeometry(.93, 1, 96), new THREE.MeshBasicMaterial({ color: i ? 0xfff0c4 : 0xe9c97f, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.position.z = -8; S.add(m); return m; });
    var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,245,215,1)'); gr.addColorStop(.35, 'rgba(240,190,100,.55)'); gr.addColorStop(1, 'rgba(240,190,100,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    var gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); gl.position.z = -9; S.add(gl);
    var st = performance.now(), last = st;
    (function f() {
      var now = performance.now(), t = (now - st) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
      U.uT.value = t; U.uTravel.value += dt * (5 + t * t * 26);
      var e = Math.pow(Math.min(1, t / 1.7), 3);
      rg.forEach(function (m, i) { m.scale.setScalar(.5 + e * (i ? 22 : 30) + Math.sin(t * 3 + i) * .03); m.rotation.z = t * (i ? -.8 : .6); });
      gl.scale.setScalar(2 + e * 40); gl.material.opacity = .4 + .6 * Math.min(1, t / 1.8);
      R.render(S, cam);
      if (t < 2.2) requestAnimationFrame(f); else { R.dispose(); cv.remove(); }
    })();
  }
  window.TarotPortal = {
    preload: function () { return load().catch(function () { }); },
    // 库没来得及加载（>0.9 秒）就直接放弃星门，不影响首页的其他转场动画
    warp: function (bx, by) {
      return Promise.race([load().then(function () { return true; }, function () { return false; }), new Promise(function (r) { setTimeout(function () { r(false); }, 900); })])
        .then(function (ok) { if (ok) { try { run(bx, by); } catch (e) { } } });
    }
  };
})();
