(()=>{
const cv=$('#c'),AD=THREE.AdditiveBlending,R=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance'});
R.setPixelRatio(Math.min(devicePixelRatio,1.75));R.outputEncoding=THREE.sRGBEncoding;R.setClearColor(0x070614,1);
const S=new THREE.Scene(),cam=new THREE.PerspectiveCamera(50,1,.1,400),U={time:{value:0},pr:{value:R.getPixelRatio()}};
const lm=(c,o)=>new THREE.LineBasicMaterial({color:c,transparent:true,opacity:o,blending:AD,depthWrite:false});

/* ---------- 星云天空 + 闪烁星辰 + 流星 ---------- */
S.add(new THREE.Mesh(new THREE.SphereGeometry(150,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:U,
vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
fragmentShader:`uniform float time;varying vec3 p;
float h(vec3 q){q=fract(q*.3183+.1);q*=17.;return fract(q.x*q.y*q.z*(q.x+q.y+q.z));}
float n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){vec3 d=normalize(p);float t=time*.015;
float a=n(d*2.+t)*.55+n(d*4.5-t*1.3)*.3+n(d*9.+t)*.15;
vec3 c=vec3(.027,.024,.08);
c+=mix(vec3(.2,.1,.48),vec3(.08,.28,.55),n(d*3.+9.))*smoothstep(.42,.85,a)*.7;
c+=vec3(.5,.14,.34)*smoothstep(.58,.9,n(d*2.5-t-5.))*.28;
c+=vec3(.1,.07,.22)*smoothstep(.1,-.7,d.y);
gl_FragColor=vec4(c,1.);}`})));
(()=>{const n=1500,g=new THREE.BufferGeometry(),p=new Float32Array(n*3),c=new Float32Array(n*3),s=new Float32Array(n),f=new Float32Array(n),pal=[[1,1,1],[.7,.82,1],[1,.86,.6],[1,.7,.85]];
for(let i=0;i<n;i++){const r=60+Math.random()*80,u=Math.random()*2-1,th=Math.random()*TAU,q=Math.sqrt(1-u*u),k=pal[Math.random()*4|0];
p.set([r*q*Math.cos(th),r*u,r*q*Math.sin(th)],i*3);c.set(k,i*3);s[i]=1.2+Math.pow(Math.random(),3)*4;f[i]=Math.random()*TAU}
g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('col',new THREE.BufferAttribute(c,3));g.setAttribute('sz',new THREE.BufferAttribute(s,1));g.setAttribute('ph',new THREE.BufferAttribute(f,1));
S.add(new THREE.Points(g,new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,blending:AD,
vertexShader:'attribute vec3 col;attribute float sz,ph;uniform float time,pr;varying vec3 c;varying float tw;void main(){c=col;tw=.6+.4*sin(time*1.7+ph);gl_PointSize=sz*tw*pr;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
fragmentShader:'varying vec3 c;varying float tw;void main(){float a=smoothstep(.5,0.,length(gl_PointCoord-.5));gl_FragColor=vec4(c*tw,a*a);}'})))})();
const ss=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V(),new V()]),lm(0xcfe0ff,0));ss.frustumCulled=false;S.add(ss);
let ssT=0,ssNext=3;const ssP=new V(),ssD=new V();
function shoot(now){
  if(now>ssNext&&ssT<=0){ssP.set((Math.random()-.5)*120,20+Math.random()*30,-60-Math.random()*40);ssD.set(-1-Math.random(),-.4-Math.random()*.3,0).normalize();ssT=1;ssNext=now+4+Math.random()*6}
  if(ssT>0){ssT-=.02;ssP.addScaledVector(ssD,2.2);const a=ss.geometry.attributes.position;a.setXYZ(0,ssP.x,ssP.y,ssP.z);a.setXYZ(1,ssP.x-ssD.x*14,ssP.y-ssD.y*14,ssP.z);a.needsUpdate=true;ss.material.opacity=Math.max(0,ssT)}
}
// 近处尘埃（开场被吸入魔法书）
const dust=(()=>{const n=360,g=new THREE.BufferGeometry(),a=new Float32Array(n*3);
  for(let i=0;i<n;i++){const r=3+Math.random()*10,u=Math.random()*2-1,th=Math.random()*TAU,q=Math.sqrt(1-u*u);a.set([r*q*Math.cos(th),r*u,r*q*Math.sin(th)],i*3)}
  g.setAttribute('position',new THREE.BufferAttribute(a,3));
  const p=new THREE.Points(g,new THREE.PointsMaterial({size:.09,color:0xb4c4ff,transparent:true,opacity:.8,depthWrite:false,blending:AD}));p.userData.base=a.slice();return p})();
S.add(dust);
function suck(s){const b=dust.userData.base,p=dust.geometry.attributes.position.array,k=1-s;
  for(let i=0;i<p.length;i+=3){const a=s*5*(1+(i/3%7)*.08),co=Math.cos(a),si=Math.sin(a);p[i]=(b[i]*co-b[i+2]*si)*k;p[i+1]=b[i+1]*k;p[i+2]=(b[i]*si+b[i+2]*co)*k}
  dust.geometry.attributes.position.needsUpdate=true}

/* ---------- 线条工具 ---------- */
const V3=(a,r,z=0)=>new V(Math.cos(a)*r,Math.sin(a)*r,z);
function ringLine(r,ticks,col,op){const p=[],N=96;
  for(let i=0;i<N;i++)p.push(V3(i/N*TAU,r),V3((i+1)/N*TAU,r));
  for(let i=0;i<ticks;i++){const a=i/ticks*TAU,l=i%6?.07:.2;p.push(V3(a,r),V3(a,r+l))}
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(p),lm(col,op))}
function starLine(n,k,r,col,op){const q=[];for(let i=0;i<n;i++)q.push(V3(i/n*TAU+Math.PI/2,r),V3(((i+k)%n)/n*TAU+Math.PI/2,r));
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(q),lm(col,op))}
const rad=(stops)=>{const c=mk(128,128),x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);stops.forEach(([o,s])=>g.addColorStop(o,s));x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)};
const glowTex=rad([[0,'rgba(255,255,255,1)'],[.3,'rgba(150,170,255,.5)'],[1,'rgba(80,100,255,0)']]);

/* ---------- 魔法书 ---------- */
const bw=1.6,bh=2.2,coverC=mk(320,440),book=new THREE.Group();
function drawCover(){
  const c=coverC.getContext('2d'),W=320,H=440,g=c.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#2b2268');g.addColorStop(.55,'#1a1546');g.addColorStop(1,'#0e0c2c');c.fillStyle=g;c.fillRect(0,0,W,H);
  c.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<500;i++)c.fillRect(Math.random()*W,Math.random()*H,1.4,1.4);
  c.strokeStyle=c.fillStyle=G;c.lineWidth=4;c.strokeRect(14,14,W-28,H-28);c.lineWidth=1.2;c.strokeRect(26,26,W-52,H-52);
  [[26,26,1,1],[W-26,26,-1,1],[26,H-26,1,-1],[W-26,H-26,-1,-1]].forEach(([x,y,sx,sy])=>{c.beginPath();c.moveTo(x,y+sy*46);c.quadraticCurveTo(x+sx*4,y+sy*4,x+sx*46,y);O(c,x+sx*14,y+sy*14,4);c.stroke()});
  c.lineWidth=2;const cx=160,cy=172;
  c.beginPath();O(c,cx,cy,76);O(c,cx,cy,64);c.stroke();
  c.beginPath();for(let i=0;i<32;i++){const a=i*TAU/32,l=i%2?10:22;c.moveTo(cx+Math.cos(a)*80,cy+Math.sin(a)*80);c.lineTo(cx+Math.cos(a)*(80+l),cy+Math.sin(a)*(80+l))}c.stroke();
  [0,1].forEach(d=>{c.beginPath();for(let i=0;i<3;i++){const a=i*TAU/3+(d?Math.PI/3:0)-Math.PI/2;i?c.lineTo(cx+Math.cos(a)*58,cy+Math.sin(a)*58):c.moveTo(cx+Math.cos(a)*58,cy+Math.sin(a)*58)}c.closePath();c.stroke()});
  motif(c,'eye',cx,cy,24);
  c.textAlign='center';c.font='bold 62px TarotTitle,Georgia,"Times New Roman",serif';
  if('letterSpacing' in c)c.letterSpacing='6px';
  const tg=c.createLinearGradient(0,310,0,360);tg.addColorStop(0,'#f6e3a8');tg.addColorStop(1,'#b8923f');c.fillStyle=tg;c.fillText('TAROT',cx+3,356);
  if('letterSpacing' in c)c.letterSpacing='0px';
  c.fillStyle=G;c.fillRect(92,376,136,1.5);c.beginPath();O(c,cx,376,4);c.fill();
}
drawCover();const coverTex=tex(coverC);
document.fonts&&document.fonts.load('bold 62px TarotTitle').then(()=>{drawCover();coverTex.needsUpdate=true}).catch(()=>{});
const innerC=mk(256,352),ix=innerC.getContext('2d');
ix.fillStyle='#16123a';ix.fillRect(0,0,256,352);ix.strokeStyle='#bcd0ff';ix.lineWidth=1.5;ix.lineJoin='round';
ix.beginPath();O(ix,128,176,90);O(ix,128,176,76);ix.stroke();
[0,1].forEach(d=>{ix.beginPath();for(let i=0;i<3;i++){const a=i*TAU/3+(d?Math.PI/3:0)-Math.PI/2;i?ix.lineTo(128+Math.cos(a)*76,176+Math.sin(a)*76):ix.moveTo(128+Math.cos(a)*76,176+Math.sin(a)*76)}ix.closePath();ix.stroke()});
motif(ix,'star',128,176,34);
const ec=mk(64,64),ex=ec.getContext('2d');ex.fillStyle='#e9dfc3';ex.fillRect(0,0,64,64);ex.fillStyle='rgba(120,100,60,.35)';for(let i=0;i<64;i+=3)ex.fillRect(0,i,64,1);
const mEdge=new THREE.MeshBasicMaterial({map:tex(ec)}),mDark=new THREE.MeshBasicMaterial({color:0x1b1740}),mGold=new THREE.MeshBasicMaterial({color:0x8a7236});
const back=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,.08),mDark);back.position.z=-.17;
const pages=new THREE.Mesh(new THREE.BoxGeometry(bw-.1,bh-.1,.24),[mEdge,mDark,mEdge,mEdge,new THREE.MeshBasicMaterial({map:tex(innerC)}),mDark]);pages.position.z=-.01;
const pivot=new THREE.Group();pivot.position.set(-bw/2,0,.15);
const front=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,.08),[mGold,mGold,mGold,mGold,new THREE.MeshBasicMaterial({map:coverTex}),mDark]);front.position.x=bw/2;
const clasp=new THREE.Mesh(new THREE.BoxGeometry(.1,.34,.12),new THREE.MeshBasicMaterial({color:0xd8b86a}));clasp.position.set(bw/2,0,.04);front.add(clasp);
const spine=new THREE.Mesh(new THREE.BoxGeometry(.14,bh,.5),mGold);spine.position.set(-bw/2-.02,0,-.01);
const ribbon=new THREE.Mesh(new THREE.PlaneGeometry(.07,.55),new THREE.MeshBasicMaterial({color:0xa4376b,side:THREE.DoubleSide}));ribbon.position.set(.25,-bh/2-.2,.08);
pivot.add(front);book.add(back,pages,spine,pivot,ribbon);book.rotation.x=-.2;S.add(book);
const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,opacity:.45,depthWrite:false,blending:AD}));glow.scale.setScalar(7);glow.position.z=-.6;S.add(glow);
const bc=mk(64,256),b2=bc.getContext('2d'),bgd=b2.createLinearGradient(0,0,64,0);
bgd.addColorStop(0,'rgba(160,180,255,0)');bgd.addColorStop(.5,'rgba(225,232,255,.95)');bgd.addColorStop(1,'rgba(160,180,255,0)');b2.fillStyle=bgd;b2.fillRect(0,0,64,256);
b2.globalCompositeOperation='destination-in';const bvg=b2.createLinearGradient(0,0,0,256);bvg.addColorStop(0,'rgba(0,0,0,0)');bvg.addColorStop(1,'rgba(0,0,0,1)');b2.fillStyle=bvg;b2.fillRect(0,0,64,256);
const beam=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(bc),transparent:true,opacity:0,depthWrite:false,blending:AD}));beam.scale.set(1.7,7,1);beam.position.set(0,3.1,0);S.add(beam);
// 浑天仪：三道倾斜旋转的刻度环
const arm=new THREE.Group();S.add(arm);
[[1.95,60,1.2,0],[2.35,90,.3,1.1],[2.75,120,0,0]].forEach(([r,t,rx,ry],i)=>{const g=new THREE.Group(),l=ringLine(r,t,i===1?0xcfd6ea:0xd8b86a,.7);g.add(l);g.rotation.set(rx,ry,0);arm.add(g)});

/* ---------- 星盘牌桌：多层刻度环 + 六芒星 + 十二星芒 ---------- */
const table=new THREE.Group(),tr=new THREE.Group();tr.rotation.x=-Math.PI/2;table.position.y=-1.85;table.visible=false;table.add(tr);S.add(table);
const tl=[[ringLine(2.8,72,0xd8b86a,.5),ringLine(3.1,0,0xd8b86a,.3),starLine(6,2,2.6,0xcfd6ea,.35)],
          [ringLine(5.4,120,0xd8b86a,.45),starLine(12,5,5.2,0xd8b86a,.28)],
          [ringLine(8.8,144,0xd8b86a,.4),ringLine(9.3,0,0xcfd6ea,.25),starLine(12,5,7.4,0xcfd6ea,.22)]].map(a=>{const g=new THREE.Group();a.forEach(x=>g.add(x));tr.add(g);return g});
const disc=new THREE.Mesh(new THREE.CircleGeometry(10.5,48),new THREE.MeshBasicMaterial({map:glowTex,color:0x6a5cff,transparent:true,opacity:.28,depthWrite:false,blending:AD}));disc.position.z=-.02;tr.add(disc);
{const p=[],a=new Float32Array(36);for(let i=0;i<12;i++){const t=i/12*TAU;a.set([Math.cos(t)*8.8,Math.sin(t)*8.8,0],i*3)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));tl[2].add(new THREE.Points(g,new THREE.PointsMaterial({size:.22,color:0xf6e3a8,transparent:true,opacity:.9,depthWrite:false,blending:AD})))}

/* ---------- 牌：两层月牙形阶梯排阵 ---------- */
const geo=new THREE.PlaneGeometry(1,1.75),backMat=new THREE.MeshBasicMaterial({map:tex(backCv())});
const deck=new THREE.Group();deck.position.y=-.5;S.add(deck);
const order=[...Array(78).keys()].sort(()=>Math.random()-.5);
const cards=order.map((id,i)=>{const g=new THREE.Group(),b=new THREE.Mesh(geo,backMat);g.add(b);g.rotation.order='YXZ';
  const u={id,i,g,b,picked:false,rev:Math.random()<.3,anim:null};g.userData=u;b.userData=u;g.visible=false;deck.add(g);return g});
const backs=cards.map(g=>g.userData.b);
const halo=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.6),new THREE.MeshBasicMaterial({map:glowTex,color:0xd8b86a,transparent:true,opacity:.5,blending:AD,depthWrite:false}));halo.rotation.order='YXZ';halo.visible=false;deck.add(halo);
function addFront(u){const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex(face(u.id))}));m.rotation.set(0,Math.PI,u.rev?Math.PI:0);m.position.z=-.001;u.g.add(m)}
const RR=7.2,STEP=TAU/78;let offset=0,vel=0;
function ring(dt,now){let best=9,bg=null;
  for(const g of cards){const u=g.userData;if(u.picked)continue;
    let a=((u.i*STEP+offset)%TAU+TAU)%TAU;if(a>Math.PI)a-=TAU;const aa=Math.abs(a),p=ease(cl((dt-u.i*.022)/.9));
    g.visible=aa<.95&&p>0;if(!g.visible)continue;
    const up=u.i&1,r=(RR+(up?-.45:.45))*p,fo=Math.exp(-a*a/.01),y=(up?.78:0)+a*a*1.5+fo*.35+Math.sin(now*1.3+u.i)*.04;
    g.position.set(Math.sin(a)*r,y*p,Math.cos(a)*r);g.rotation.set(-.1,a,a*.38);
    g.scale.setScalar(Math.max(.001,p*cl((.95-aa)/.2)*(1+fo*.12)));
    if(aa<best){best=aa;bg=g}}
  if(bg&&st==='pick'){halo.visible=true;halo.position.copy(bg.position);halo.rotation.copy(bg.rotation);halo.scale.setScalar(bg.scale.x);halo.translateZ(-.05);halo.material.opacity=.45+.15*Math.sin(now*2)}else halo.visible=false}

/* ---------- 状态与流程 ---------- */
const hint=$('#hint'),panel=$('#panel'),askEl=$('#ask'),qline=$('#qline');
let st='idle',t0=0,picks=[],ct=null,dn=null,sel=null,cat='',tIntro=nowS(),spin=1,arrive=false;
try{arrive=!!sessionStorage.getItem('tarotArrive')}catch(e){}
const P0=new V(0,.6,6),Lask=new V(0,-.9,0),P1=new V(),L1=new V(0,0,6),look=new V(),aspect=()=>innerWidth/innerHeight;
const camZ=()=>Math.min(18,12.5+(aspect()<1?(1/aspect()-1)*1.6:0));
cam.position.copy(P0);

function flash(){const f=$('#flash');f.style.transition='none';f.style.opacity=1;requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.transition='opacity 1.2s';f.style.opacity=0}))}
function start(){if(st!=='idle')return;st='open';t0=nowS();hint.classList.add('off')}
function setHint(){hint.textContent=`左右拖动转动牌阵，轻触一张牌（${picks.length}/3）`;hint.classList.remove('off')}
const QS=window.TAROT_QUESTIONS||[],cats=[...new Set(QS.map(x=>x.c))];cat=cats[0];
function showAsk(){
  $('#chips').innerHTML=cats.map(c=>`<button type="button" class="chip${c===cat?' on':''}" data-c="${c}">${c}</button>`).join('');
  $('#qs').innerHTML=QS.filter(x=>x.c===cat).map(x=>`<li><button type="button" class="q${x.q===sel?' on':''}" data-q="${x.q}">${x.q}</button></li>`).join('');
  askEl.classList.add('show');$('#go').disabled=!sel}
askEl.addEventListener('click',e=>{const c=e.target.closest('[data-c]'),q=e.target.closest('[data-q]');
  if(c){cat=c.dataset.c;showAsk()}if(q){sel=q.dataset.q;showAsk()}});
$('#go').onclick=()=>{if(!sel||st!=='ask')return;askEl.classList.remove('show');qline.textContent=sel;qline.classList.add('on');st='suck';t0=nowS()};
function mv(u,pos,sc,ry,dur,delay){u.anim={t:nowS()+delay*K,d:dur*K,fp:u.g.position.clone(),tp:pos,fs:u.g.scale.x,ts:sc,fy:u.g.rotation.y,ty:ry}}
function reveal(){
  st='reveal';hint.classList.add('off');halo.visible=false;
  const d=6.5,vh=2*d*Math.tan(25*Math.PI/180),sp=Math.min(1.25,vh*aspect()/3.25),sc=sp/1.15;
  picks.forEach((u,k)=>{addFront(u);u.g.rotation.order='YXZ';mv(u,new V((k-1)*sp,.8,4.5),sc,Math.PI,1,.2+k*.55)});
  ct={t:nowS(),d:1.4*K,fp:cam.position.clone(),tp:new V(0,2.2,4.5+d),fl:look.clone(),tl:new V(0,-.9,4.5)};
  const L=['过去','现在','未来'];
  $('#read').innerHTML=picks.map((u,k)=>{const i=info(u.id);return `<article><h3>${L[k]}<b>${i.n}${u.rev?'（逆位）':''}</b></h3><p>${i.k}${u.rev?'。能量受阻、延迟，或转向内在。':'。'}</p></article>`}).join('');
  setTimeout(()=>panel.classList.add('show'),2300*K)}
const rc=new THREE.Raycaster(),mvv=new THREE.Vector2();
function tap(x,y){
  if(st==='idle')return start();
  if(st!=='pick'||picks.length>=3)return;
  mvv.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);rc.setFromCamera(mvv,cam);
  const h=rc.intersectObjects(backs.filter(b=>b.userData.g.visible&&!b.userData.picked),false)[0];if(!h)return;
  const u=h.object.userData,k=picks.length;u.picked=true;picks.push(u);
  mv(u,new V((k-1)*.8,2.7,7.6),.5,0,.8,0);setHint();
  if(picks.length===3)setTimeout(reveal,1000*K)}

cv.addEventListener('pointerdown',e=>{dn={t:performance.now(),lx:e.clientX,m:0};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!dn)return;const dx=e.clientX-dn.lx;dn.lx=e.clientX;dn.m+=Math.abs(dx);if(st==='pick'&&dn.m>8){offset+=dx*.0032;vel=dx*.0032}});
cv.addEventListener('pointerup',e=>{if(!dn)return;const d=dn;dn=null;if(d.m<8&&performance.now()-d.t<500)tap(e.clientX,e.clientY)});
addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')start();if(st==='pick'){if(e.key==='ArrowLeft')vel=-.02;if(e.key==='ArrowRight')vel=.02}});
$('#again').onclick=()=>{location.hash='again';location.reload()};
function resize(){R.setSize(innerWidth,innerHeight);cam.aspect=aspect();cam.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
if(location.hash==='#again'){history.replaceState(null,'',location.pathname);pivot.rotation.y=-2.8;glow.material.opacity=1;beam.material.opacity=.6;st='ask';hint.classList.add('off');showAsk()}

/* ---------- 主循环 ---------- */
function loop(){
  requestAnimationFrame(loop);
  const now=nowS(),T=(now-t0)/K;U.time.value=now;shoot(now);
  tl[0].rotation.z+=.0016;tl[1].rotation.z-=.0009;tl[2].rotation.z+=.0004;
  arm.children.forEach((g,i)=>{g.rotation.z+=(.004+i*.002)*spin*(i%2?-1:1);g.rotation.x+=.0012*spin});
  if(st==='idle'){
    const s=ease(cl((now-tIntro)/1.6));book.scale.setScalar(Math.max(.001,s));arm.scale.setScalar(Math.max(.001,s));
    book.position.y=Math.sin(now*1.2)*.08;book.rotation.y=Math.sin(now*.5)*.12;dust.rotation.y+=.0006;look.set(0,0,0);
  }else if(st==='open'){
    const e=ease(cl(T/1.8));pivot.rotation.y=-e*2.8;glow.material.opacity=.45+.55*e;glow.scale.setScalar(7+2*e);beam.material.opacity=.6*e;spin=1+2*e;
    if(T>2.1){st='ask';showAsk()}
  }else if(st==='ask'){
    look.lerp(Lask,.06);spin=1.5;book.position.y=Math.sin(now*1.2)*.06;dust.rotation.y+=.001;
  }else if(st==='suck'){
    const s=ease(cl(T/2.2));suck(s);arm.scale.setScalar(1-.6*s);spin=1+5*s;
    if(T>2.4){flash();suck(0);dust.material.opacity=0;table.visible=true;st='deal';t0=now}
  }else if(st==='deal'){
    const be=cl(T/1),sh=Math.max(.001,1-ease(be));book.scale.setScalar(sh);glow.material.opacity=sh;beam.material.opacity=.6*sh;arm.scale.setScalar(Math.max(.001,.4*sh));
    if(be>=1)book.visible=glow.visible=beam.visible=arm.visible=false;
    dust.material.opacity=.8*cl(T/1.5);dust.rotation.y+=.0006;table.scale.setScalar(Math.max(.001,ease(cl(T/1.8))));
    P1.set(0,2.6,camZ());const p=ease(cl((T-.2)/2.4));cam.position.lerpVectors(P0,P1,p);look.lerpVectors(Lask,L1,p);
    ring(T,now);if(T>3.2){st='pick';setHint()}
  }else if(st==='pick'){
    if(!dn){offset+=vel+.0008;vel*=.94}
    P1.set(Math.sin(now*.25)*.6,2.6,camZ());cam.position.copy(P1);look.copy(L1);dust.rotation.y+=.0006;ring(99,now);
  }else if(st==='reveal'){
    if(ct){const p=ease(cl((now-ct.t)/ct.d));cam.position.lerpVectors(ct.fp,ct.tp,p);look.lerpVectors(ct.fl,ct.tl,p)}
    for(const g of cards){const u=g.userData;if(u.picked||!g.visible)continue;g.scale.multiplyScalar(.88);if(g.scale.x<.02)g.visible=false}
  }
  for(const u of picks){const a=u.anim;if(!a)continue;const p=ease(cl((now-a.t)/a.d)),g=u.g;
    g.position.lerpVectors(a.fp,a.tp,p);g.scale.setScalar(lp(a.fs,a.ts,p));g.rotation.y=lp(a.fy,a.ty,p);g.rotation.x=lp(g.rotation.x,0,.2*p);g.rotation.z=lp(g.rotation.z,0,.2*p);if(p>=1)u.anim=null}
  cam.lookAt(look);R.render(S,cam);
  const l=$('#load');if(l&&!l.classList.contains('gone')){l.classList.add('gone');if(arrive){arrive=false;try{sessionStorage.removeItem('tarotArrive')}catch(e){}flash()}}
}
loop();
})();
