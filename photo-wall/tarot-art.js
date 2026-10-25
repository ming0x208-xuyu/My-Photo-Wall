const $=s=>document.querySelector(s),G='#d8b86a',TAU=Math.PI*2,V=THREE.Vector3;
const K=matchMedia('(prefers-reduced-motion:reduce)').matches?.4:1;
const cl=x=>Math.min(1,Math.max(0,x)),ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,lp=(a,b,t)=>a+(b-a)*t;
const nowS=()=>performance.now()/1000;

/* ---------- 牌义数据 ---------- */
const MJ='愚者 魔术师 女祭司 皇后 皇帝 教皇 恋人 战车 力量 隐者 命运之轮 正义 倒吊人 死神 节制 恶魔 高塔 星星 月亮 太阳 审判 世界'.split(' ');
const MK='新的旅程，勇敢起步|资源齐备，把想法变成现实|直觉与秘密，向内倾听|丰盛与滋养，孕育成长|秩序与权威，建立结构|传统与指引，寻求共识|选择与连结，忠于内心|意志与前进，掌控方向|温柔的勇气，驯服内在|独处与寻光，沉淀智慧|转机降临，顺势而变|公平与因果，权衡后决断|换个角度，暂停与放下|结束与重生，告别旧章|调和与耐心，找到平衡|执念与诱惑，看清束缚|突变与觉醒，旧结构崩塌|希望与疗愈，静静闪光|不安与幻象，穿过迷雾|喜悦与明朗，充满活力|召唤与复盘，做出回应|圆满与完成，抵达新的起点'.split('|');
const SU=['权杖','圣杯','宝剑','星币'],SK=['行动与热情','情感与关系','思考与沟通','物质与现实'],SM=['wand','cup','sword','coin'];
const RK='王牌 二 三 四 五 六 七 八 九 十 侍从 骑士 王后 国王'.split(' ');
const RW='全新的开端|抉择与平衡|成形与合作|稳固与停顿|摩擦与挑战|顺畅与分享|考验与坚持|加速与专注|接近完成|圆满或重负|好奇与消息|追逐与行动|成熟与包容|掌控与责任'.split('|');
const MOT='star infinity moon rings scale key rings wheel infinity lamp wheel scale tri eye cup tri tower star moon sun eye coin'.split(' ');
const info=id=>id<22?{n:MJ[id],k:MK[id]}:(()=>{const s=(id-22)/14|0,r=(id-22)%14;return{s,r,n:SU[s]+RK[r],k:SK[s]+'：'+RW[r]}})();
const rom=n=>{let o='';[[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']].forEach(([v,s])=>{while(n>=v){o+=s;n-=v}});return o||'0'};

/* ---------- 画布：线条图案 ---------- */
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const O=(c,x,y,r)=>{c.moveTo(x+r,y);c.arc(x,y,r,0,TAU)};
function motif(c,t,x,y,r){
  c.save();c.translate(x,y);c.beginPath();
  const L=(a,b)=>c.lineTo(a*r,b*r),M=(a,b)=>c.moveTo(a*r,b*r);
  switch(t){
  case'star':for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,k=i%2?.4:1;L(Math.cos(a)*k,Math.sin(a)*k)}c.closePath();break;
  case'moon':c.arc(0,0,r,Math.PI/2,Math.PI*1.5);c.arc(r*.35,0,r*.8,-Math.PI/2,Math.PI/2,true);c.closePath();break;
  case'sun':O(c,0,0,r*.45);for(let i=0;i<12;i++){const a=i*TAU/12;c.moveTo(Math.cos(a)*r*.6,Math.sin(a)*r*.6);c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}break;
  case'eye':M(-1,0);c.quadraticCurveTo(0,-r*.9,r,0);c.quadraticCurveTo(0,r*.9,-r,0);O(c,0,0,r*.28);break;
  case'wheel':O(c,0,0,r);O(c,0,0,r*.3);for(let i=0;i<8;i++){const a=i*TAU/8;c.moveTo(Math.cos(a)*r*.3,Math.sin(a)*r*.3);c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}break;
  case'wand':M(0,-1);L(0,1);for(let k=0;k<3;k++){const yy=(-.5+k*.45)*r;c.moveTo(0,yy);c.quadraticCurveTo(r*.45,yy-r*.05,r*.4,yy-r*.35);c.moveTo(0,yy+r*.15);c.quadraticCurveTo(-r*.45,yy+r*.1,-r*.4,yy-r*.2)}break;
  case'cup':M(-.7,-.7);c.quadraticCurveTo(-.7*r,.1*r,0,.1*r);c.quadraticCurveTo(.7*r,.1*r,.7*r,-.7*r);c.closePath();M(0,.1);L(0,.7);M(-.4,.75);L(.4,.75);break;
  case'sword':M(0,-1);L(.12,-.7);L(.12,.35);L(-.12,.35);L(-.12,-.7);c.closePath();M(-.45,.35);L(.45,.35);M(0,.35);L(0,1);break;
  case'coin':O(c,0,0,r);O(c,0,0,r*.62);for(let i=0;i<=5;i++){const a=-Math.PI/2+(i*2%5)*TAU/5,px=Math.cos(a)*r*.62,py=Math.sin(a)*r*.62;i?c.lineTo(px,py):c.moveTo(px,py)}break;
  case'tower':M(-.4,1);L(-.4,-.3);L(.4,-.3);L(.4,1);M(-.5,-.3);L(-.5,-.75);L(-.2,-.75);L(-.2,-.55);L(.2,-.55);L(.2,-.75);L(.5,-.75);L(.5,-.3);c.closePath();M(.95,-1);L(.15,-.15);L(.45,-.15);L(-.2,.6);break;
  case'scale':M(0,-1);L(0,.85);M(-.85,-.55);L(.85,-.55);M(-.85,-.55);L(-1,.1);L(-.7,.1);c.closePath();M(.85,-.55);L(1,.1);L(.7,.1);c.closePath();M(-.4,.85);L(.4,.85);break;
  case'infinity':for(let i=0;i<=60;i++){const t2=i/60*TAU,d=1+Math.sin(t2)**2,px=Math.cos(t2)/d*r,py=Math.sin(t2)*Math.cos(t2)/d*r;i?c.lineTo(px,py):c.moveTo(px,py)}break;
  case'lamp':M(0,-1);L(.6,.6);L(-.6,.6);c.closePath();O(c,0,.1*r,r*.18);break;
  case'key':O(c,0,-.5*r,r*.3);M(0,-.2);L(0,1);M(0,.6);L(.3,.6);M(0,.9);L(.3,.9);break;
  case'rings':O(c,-.3*r,0,.6*r);O(c,.3*r,0,.6*r);break;
  case'tri':M(-.9,-.7);L(.9,-.7);L(0,.9);c.closePath();O(c,0,-.2*r,r*.15);break;
  }
  c.stroke();c.restore();
}
function frame(c){
  const g=c.createLinearGradient(0,0,0,448);g.addColorStop(0,'#17133a');g.addColorStop(1,'#09081a');
  c.fillStyle=g;c.fillRect(0,0,256,448);
  c.strokeStyle=G;c.lineWidth=3;c.strokeRect(6,6,244,436);
  c.lineWidth=1;c.globalAlpha=.6;c.strokeRect(16,16,224,416);c.globalAlpha=1;
}
function lay(n){
  if(n===1)return[[0,0,56]];
  if(n<4)return Array.from({length:n},(_,k)=>[0,(k-(n-1)/2)*110,30]);
  const rows=n<=5?2:n<=7?3:4,ys=rows===2?[-60,60]:rows===3?[-90,0,90]:[-115,-38,38,115],o=[];
  ys.forEach(y=>o.push([-48,y,26],[48,y,26]));
  if(n===5)o.push([0,0,26]);if(n===7)o.push([0,-45,26]);if(n===9)o.push([0,0,26]);
  if(n===10)o.push([0,-76,26],[0,76,26]);
  return o;
}
function face(id){
  const cv=mk(256,448),c=cv.getContext('2d'),i=info(id);
  frame(c);c.strokeStyle=c.fillStyle=G;c.lineWidth=2;c.lineJoin='round';c.textAlign='center';
  c.font='22px "Noto Serif SC","Songti SC",serif';
  if(id<22){
    c.fillText(rom(id),128,50);
    const n=id%7+4;
    c.globalAlpha=.55;for(let k=0;k<id%3+1;k++){c.beginPath();O(c,128,214,96-k*13);c.stroke()}c.globalAlpha=1;
    for(let k=0;k<n;k++){const a=k*TAU/n-Math.PI/2;c.beginPath();O(c,128+Math.cos(a)*96,214+Math.sin(a)*96,3.5);c.fill()}
    motif(c,MOT[id],128,214,50);
  }else{
    const{s,r}=i,t=SM[s];
    c.fillText(r===0?'A':r<10?String(r+1):['侍','骑','后','王'][r-10],128,50);
    if(r<10)lay(r+1).forEach(([x,y,rr])=>motif(c,t,128+x,214+y,rr));
    else{
      const k=[2,3,4,5][r-10];
      c.beginPath();c.moveTo(98,126);for(let j=0;j<k;j++){c.lineTo(98+(j+.5)*60/k,100);c.lineTo(98+(j+1)*60/k,126)}c.closePath();c.stroke();
      c.beginPath();O(c,128,152,22);c.stroke();
      c.beginPath();c.moveTo(80,236);c.lineTo(100,182);c.lineTo(156,182);c.lineTo(176,236);c.closePath();c.stroke();
      motif(c,t,128,308,40);
    }
  }
  c.font='24px "Noto Serif SC","Songti SC",serif';c.fillText(i.n,128,408);
  return cv;
}
function backCv(){
  const cv=mk(256,448),c=cv.getContext('2d');frame(c);
  c.strokeStyle=c.fillStyle=G;c.lineWidth=1.5;
  c.save();c.beginPath();c.rect(16,16,224,416);c.clip();c.globalAlpha=.45;
  for(let i=0;i<24;i++){const a=i*TAU/24;c.beginPath();c.moveTo(128+Math.cos(a)*72,224+Math.sin(a)*72);c.lineTo(128+Math.cos(a)*300,224+Math.sin(a)*300);c.stroke()}
  c.restore();
  c.beginPath();O(c,128,224,70);O(c,128,224,54);c.stroke();
  c.lineWidth=2;motif(c,'moon',121,224,34);motif(c,'star',146,214,9);
  return cv;
}
const tex=cv=>{const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;return t};

