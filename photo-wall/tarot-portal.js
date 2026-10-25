/* 首页「塔罗」按钮 → 星门穿越动画（真实 three.js）→ 跳转 tarot.html
 * 用法：在 index.html 末尾加  <script src="tarot-portal.js"></script>
 * 然后给塔罗按钮写 <a href="tarot.html">塔罗</a> 或 <button data-tarot="tarot.html">塔罗</button> 即可，无需其他代码。
 */
(()=>{
const LIB=['three.min.js','https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'];
let loading=null,busy=false,nodes=null;
function lib(){
  if(window.THREE)return Promise.resolve();
  return loading||(loading=new Promise((ok,no)=>{let i=0;(function n(){
    if(i>=LIB.length){loading=null;return no()}
    const s=document.createElement('script');s.src=LIB[i++];s.onload=()=>window.THREE?ok():n();s.onerror=n;document.head.appendChild(s)})()}));
}
const cl=x=>Math.min(1,Math.max(0,x));

function run(jump){
  const el=document.createElement('div');
  el.style.cssText='position:fixed;inset:0;z-index:99999;opacity:0;pointer-events:all';
  const fl=document.createElement('div');
  fl.style.cssText='position:absolute;inset:0;background:radial-gradient(circle,#fff,#cfd8ff 60%,#e8ecff);opacity:0';
  const cv=document.createElement('canvas');cv.style.cssText='position:absolute;inset:0;width:100%;height:100%';
  el.append(cv,fl);document.documentElement.appendChild(el);
  const bd=document.body;bd.style.transition='filter 1.9s ease,transform 1.9s ease';
  requestAnimationFrame(()=>{bd.style.filter='blur(5px) brightness(.35)';bd.style.transform='scale(1.08)'});

  const R=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true});
  R.setPixelRatio(Math.min(devicePixelRatio,1.75));R.setSize(innerWidth,innerHeight);R.setClearColor(0x070614,0);
  const S=new THREE.Scene(),cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,200),U={uT:{value:0},uTravel:{value:0},uPR:{value:R.getPixelRatio()}};
  // 粒子：position 里存 [角度, 半径, 深度]，位置完全在顶点着色器里算（CPU 几乎零开销）
  const N=2600,g=new THREE.BufferGeometry(),a=new Float32Array(N*3);
  for(let i=0;i<N;i++)a.set([Math.random()*6.2832,.6+Math.pow(Math.random(),.7)*7,Math.random()],i*3);
  g.setAttribute('position',new THREE.BufferAttribute(a,3));
  const pts=new THREE.Points(g,new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`uniform float uT,uTravel,uPR;varying vec3 vC;varying float vA;
    void main(){float z=-mod(position.z*80.-uTravel,80.),d=-z;
    float ang=position.x+uT*.6+d*.045*(1.+uT*.3);
    float r=position.y*(1.+d*.012)*mix(2.4,.5,smoothstep(0.,1.5,uT));
    gl_Position=projectionMatrix*modelViewMatrix*vec4(cos(ang)*r,sin(ang)*r,z,1.);
    gl_PointSize=min(26.,uPR*(1.5+(1.-d/80.)*6.5));
    vA=smoothstep(80.,60.,d)*smoothstep(0.,5.,d);
    vC=mix(vec3(.45,.42,1.),vec3(1.,.82,.45),fract(position.x*3.1));}`,
    fragmentShader:'varying vec3 vC;varying float vA;void main(){float a=smoothstep(.5,0.,length(gl_PointCoord-.5));gl_FragColor=vec4(vC,a*a*vA);}'}));
  pts.frustumCulled=false;S.add(pts);
  // 星门：两圈金色光环 + 中心光晕
  const rg=[0,1].map(i=>{const m=new THREE.Mesh(new THREE.RingGeometry(.92,1,96),new THREE.MeshBasicMaterial({color:i?0xcfd6ea:0xd8b86a,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));m.position.z=-8;S.add(m);return m});
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),gr=x.createRadialGradient(64,64,0,64,64,64);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(150,170,255,.55)');gr.addColorStop(1,'rgba(80,100,255,0)');x.fillStyle=gr;x.fillRect(0,0,128,128);
  const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));gl.position.z=-9;S.add(gl);

  const st=performance.now();let last=st;
  nodes={el,bd};
  (function f(){
    const now=performance.now(),t=(now-st)/1000,dt=Math.min(.05,(now-last)/1000);last=now;
    U.uT.value=t;U.uTravel.value+=dt*(5+t*t*24);
    el.style.opacity=cl(t/.5);
    const e=Math.pow(cl(t/2),3);
    rg.forEach((m,i)=>{m.scale.setScalar(.5+e*(i?22:30)+Math.sin(t*3+i)*.03);m.rotation.z=t*(i?-.8:.6)});
    gl.scale.setScalar(2+e*40);gl.material.opacity=.4+.6*cl(t/1.8);
    cam.rotation.z=Math.sin(t*1.4)*.05*t;
    fl.style.opacity=cl((t-1.65)/.4);
    R.render(S,cam);
    if(t>=2.1)return jump();
    requestAnimationFrame(f);
  })();
}

function go(url){
  if(busy)return;busy=true;
  const jump=()=>{try{sessionStorage.setItem('tarotArrive','1')}catch(e){}location.href=url};
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return jump();
  let done=false;const t=setTimeout(()=>{if(!done){done=true;jump()}},1500); // three 没及时加载就直接跳转
  lib().then(()=>{if(done)return;done=true;clearTimeout(t);try{run(jump)}catch(e){jump()}},()=>{if(!done){done=true;jump()}});
}

document.addEventListener('click',e=>{
  const t=e.target.closest('a[href$="tarot.html"],[data-tarot]');
  if(!t||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
  e.preventDefault();go(t.dataset.tarot||t.getAttribute('href')||'tarot.html');
});
// 从浏览器「返回」回到首页时，清掉残留的动画层
addEventListener('pageshow',e=>{
  if(e.persisted&&nodes){nodes.el.remove();nodes.bd.style.cssText='';nodes=null}busy=false;
});
// 页面空闲后预加载 three，点击时能立刻开始动画
addEventListener('load',()=>setTimeout(()=>lib().catch(()=>{}),800));
window.TarotPortal={go};
})();
