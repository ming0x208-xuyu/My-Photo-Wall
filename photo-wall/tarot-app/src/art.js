// 所有贴图都用 Canvas 现场绘制：黑底 + 金线烫金风格（不依赖任何图片文件）
import * as THREE from 'three'
import { MOT, SM, info, rom, enName } from './data/tarot.js'

const TAU = Math.PI * 2
export const GOLD = '#e9c97f'
const LITE = '#fff0c4'
const FONT = '"Noto Serif SC","Songti SC","STSong",serif'
const TITLE = 'TarotTitle,"Cinzel","Times New Roman",serif'
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
const O = (c, x, y, r) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU) }
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath() }
const sparkle = (c, x, y, r) => { c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill() }
const goldG = (c, y0, y1) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#fff3cf'); g.addColorStop(.5, '#e9c46f'); g.addColorStop(1, '#a8772e'); return g }
const glow = (c, col, b) => { c.shadowColor = col; c.shadowBlur = b }
const unglow = (c) => { c.shadowBlur = 0; c.shadowColor = 'transparent' }

export const tex = (cv, srgb = true) => {
  const t = new THREE.CanvasTexture(cv)
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}
// 金属度贴图：直接复用彩色图的蓝色通道（金线蓝通道高 → 是金属；黑皮革蓝通道低 → 非金属）
export const metalOf = (t) => { const m = t.clone(); m.colorSpace = THREE.NoColorSpace; m.needsUpdate = true; return m }

// 带圆角的平面（UV 归一化到 0~1）
export function roundedGeo(w, h, r) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false)
  s.lineTo(w / 2, h / 2 - r); s.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false)
  s.lineTo(-w / 2 + r, h / 2); s.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-w / 2, -h / 2 + r); s.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false)
  const g = new THREE.ShapeGeometry(s, 6), p = g.attributes.position, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + .5, p.getY(i) / h + .5)
  return g
}
export function roundedShape(w, h, r) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false)
  s.lineTo(w / 2, h / 2 - r); s.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false)
  s.lineTo(-w / 2 + r, h / 2); s.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-w / 2, -h / 2 + r); s.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

/* ---------------- 线条图案库（牌面主图案） ---------------- */
function motif(c, t, x, y, r) {
  c.save(); c.translate(x, y); c.beginPath()
  const L = (a, b) => c.lineTo(a * r, b * r), M = (a, b) => c.moveTo(a * r, b * r)
  switch (t) {
    case 'star': for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? .4 : 1; L(Math.cos(a) * k, Math.sin(a) * k) } c.closePath(); break
    case 'moon': c.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5); c.arc(r * .35, 0, r * .8, -Math.PI / 2, Math.PI / 2, true); c.closePath(); break
    case 'sun': O(c, 0, 0, r * .45); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.moveTo(Math.cos(a) * r * .6, Math.sin(a) * r * .6); c.lineTo(Math.cos(a) * r, Math.sin(a) * r) } break
    case 'eye': M(-1, 0); c.quadraticCurveTo(0, -r * .9, r, 0); c.quadraticCurveTo(0, r * .9, -r, 0); O(c, 0, 0, r * .28); break
    case 'wheel': O(c, 0, 0, r); O(c, 0, 0, r * .3); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.moveTo(Math.cos(a) * r * .3, Math.sin(a) * r * .3); c.lineTo(Math.cos(a) * r, Math.sin(a) * r) } break
    case 'wand': M(0, -1); L(0, 1); for (let k = 0; k < 3; k++) { const yy = (-.5 + k * .45) * r; c.moveTo(0, yy); c.quadraticCurveTo(r * .45, yy - r * .05, r * .4, yy - r * .35); c.moveTo(0, yy + r * .15); c.quadraticCurveTo(-r * .45, yy + r * .1, -r * .4, yy - r * .2) } break
    case 'cup': M(-.7, -.7); c.quadraticCurveTo(-.7 * r, .1 * r, 0, .1 * r); c.quadraticCurveTo(.7 * r, .1 * r, .7 * r, -.7 * r); c.closePath(); M(0, .1); L(0, .7); M(-.4, .75); L(.4, .75); break
    case 'sword': M(0, -1); L(.12, -.7); L(.12, .35); L(-.12, .35); L(-.12, -.7); c.closePath(); M(-.45, .35); L(.45, .35); M(0, .35); L(0, 1); break
    case 'coin': O(c, 0, 0, r); O(c, 0, 0, r * .62); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + (i * 2 % 5) * TAU / 5, px = Math.cos(a) * r * .62, py = Math.sin(a) * r * .62; i ? c.lineTo(px, py) : c.moveTo(px, py) } break
    case 'tower': M(-.4, 1); L(-.4, -.3); L(.4, -.3); L(.4, 1); M(-.5, -.3); L(-.5, -.75); L(-.2, -.75); L(-.2, -.55); L(.2, -.55); L(.2, -.75); L(.5, -.75); L(.5, -.3); c.closePath(); M(.95, -1); L(.15, -.15); L(.45, -.15); L(-.2, .6); break
    case 'scale': M(0, -1); L(0, .85); M(-.85, -.55); L(.85, -.55); M(-.85, -.55); L(-1, .1); L(-.7, .1); c.closePath(); M(.85, -.55); L(1, .1); L(.7, .1); c.closePath(); M(-.4, .85); L(.4, .85); break
    case 'infinity': for (let i = 0; i <= 60; i++) { const t2 = i / 60 * TAU, d = 1 + Math.sin(t2) ** 2, px = Math.cos(t2) / d * r, py = Math.sin(t2) * Math.cos(t2) / d * r; i ? c.lineTo(px, py) : c.moveTo(px, py) } break
    case 'lamp': M(0, -1); L(.6, .6); L(-.6, .6); c.closePath(); O(c, 0, .1 * r, r * .18); break
    case 'key': O(c, 0, -.5 * r, r * .3); M(0, -.2); L(0, 1); M(0, .6); L(.3, .6); M(0, .9); L(.3, .9); break
    case 'rings': O(c, -.3 * r, 0, .6 * r); O(c, .3 * r, 0, .6 * r); break
    case 'tri': M(-.9, -.7); L(.9, -.7); L(0, .9); c.closePath(); O(c, 0, -.2 * r, r * .15); break
  }
  c.stroke(); c.restore()
}

/* ---------------- 牌面公共元素 ---------------- */
function ink(c) {
  const g = c.createLinearGradient(0, 0, 0, 448); g.addColorStop(0, '#0d0c13'); g.addColorStop(1, '#050408'); c.fillStyle = g; c.fillRect(0, 0, 256, 448)
  const r = c.createRadialGradient(128, 230, 10, 128, 230, 190); r.addColorStop(0, 'rgba(233,201,127,.10)'); r.addColorStop(1, 'rgba(233,201,127,0)'); c.fillStyle = r; c.fillRect(0, 0, 256, 448)
  c.fillStyle = '#fff'; for (let i = 0; i < 500; i++) { c.globalAlpha = Math.random() * .07; c.fillRect(Math.random() * 256, Math.random() * 448, 1, 1) } c.globalAlpha = 1
}
function borderPath(c) {
  c.beginPath(); c.moveTo(26, 12); c.lineTo(108, 12); c.quadraticCurveTo(128, 25, 148, 12); c.lineTo(230, 12); c.quadraticCurveTo(238, 12, 238, 20)
  c.lineTo(238, 428); c.quadraticCurveTo(238, 436, 230, 436); c.lineTo(148, 436); c.quadraticCurveTo(128, 423, 108, 436); c.lineTo(26, 436); c.quadraticCurveTo(18, 436, 18, 428); c.lineTo(18, 20); c.quadraticCurveTo(18, 12, 26, 12); c.closePath()
}
function scallop(c, x, y, dx, n, r, dir) { for (let k = 0; k < n; k++) { c.beginPath(); c.arc(x + dx * (k * r * 2 + r), y, r, dir > 0 ? 0 : Math.PI, dir > 0 ? Math.PI : TAU, false); c.stroke() } }
function frameArt(c) {
  c.lineJoin = c.lineCap = 'round'; c.strokeStyle = goldG(c, 0, 448); c.lineWidth = 1.5; glow(c, GOLD, 3); borderPath(c); c.stroke()
  c.save(); c.translate(128, 224); c.scale(.955, .96); c.translate(-128, -224); c.globalAlpha = .5; c.lineWidth = .8; borderPath(c); c.stroke(); c.restore(); c.globalAlpha = 1
  c.lineWidth = 1; c.globalAlpha = .75
  ;[[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => {
    const x0 = sx > 0 ? 26 : 230, y0 = sy > 0 ? 24 : 424
    scallop(c, x0, y0, sx, 5, 6, sy); scallop(c, x0 + sx * 6, y0 + sy * 11, sx, 4, 5, sy)
  })
  c.globalAlpha = 1; unglow(c)
}
function phases(c, y) {
  const spec = [[.2, true], [.5, true], [1, false], [.5, false], [.2, false]]
  spec.forEach(([ph, mir], k) => {
    const x = 128 + (k - 2) * 30, r = k === 2 ? 10 : k % 4 === 0 ? 5.5 : 7.5
    c.save(); c.translate(x, y); if (mir) c.scale(-1, 1)
    c.strokeStyle = GOLD; c.fillStyle = goldG(c, -r, r); c.lineWidth = .9
    c.beginPath(); O(c, 0, 0, r); c.stroke()
    c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false)
    const rx = r * Math.abs(1 - 2 * ph)
    if (ph < .5) c.ellipse(0, 0, rx, r, 0, Math.PI / 2, -Math.PI / 2, true); else if (ph > .5) c.ellipse(0, 0, rx, r, 0, Math.PI / 2, Math.PI * 1.5, false)
    c.fill(); c.restore()
  })
}
function ringArt(c, cy) {
  c.strokeStyle = GOLD; c.lineWidth = 1.3; glow(c, GOLD, 4)
  c.beginPath(); O(c, 128, cy, 84); c.stroke(); c.lineWidth = .8; c.beginPath(); O(c, 128, cy, 78); c.stroke()
  c.lineWidth = .8; c.beginPath(); for (let i = 0; i < 72; i++) { const a = i * TAU / 72, l = i % 6 ? 3 : 6; c.moveTo(128 + Math.cos(a) * 78, cy + Math.sin(a) * 78); c.lineTo(128 + Math.cos(a) * (78 + l), cy + Math.sin(a) * (78 + l)) } c.stroke()
  unglow(c)
}

/* ---------------- 牌面（正面） ---------------- */
export function faceCv(id) {
  const cv = mk(512, 896), c = cv.getContext('2d'), i = info(id), CY = 232
  c.scale(2, 2); ink(c); frameArt(c); phases(c, 46); ringArt(c, CY)
  c.fillStyle = c.strokeStyle = GOLD; c.lineJoin = c.lineCap = 'round'; c.textAlign = 'center'
  // 编号
  c.font = '14px ' + TITLE; if ('letterSpacing' in c) c.letterSpacing = '4px'
  c.fillText(id < 22 ? rom(id) : (i.r === 0 ? 'A' : i.r < 10 ? String(i.r + 1) : ['PAGE', 'KNIGHT', 'QUEEN', 'KING'][i.r - 10]), 128, 100)
  if ('letterSpacing' in c) c.letterSpacing = '0px'
  c.lineWidth = .7; c.globalAlpha = .6; c.beginPath(); c.moveTo(70, 96); c.lineTo(104, 96); c.moveTo(152, 96); c.lineTo(186, 96); c.stroke(); c.globalAlpha = 1
  // 主图案
  c.strokeStyle = c.fillStyle = '#f3d995'; c.lineWidth = 1.7; glow(c, '#e9c97f', 6)
  if (id < 22) {
    c.lineWidth = .8; c.globalAlpha = .45; c.beginPath(); for (let k = 0; k < 40; k++) { const a = k * TAU / 40; c.moveTo(128 + Math.cos(a) * 54, CY + Math.sin(a) * 54); c.lineTo(128 + Math.cos(a) * 70, CY + Math.sin(a) * 70) } c.stroke(); c.globalAlpha = 1; c.lineWidth = 1.7
    motif(c, MOT[id], 128, CY, 44)
  } else {
    const sm = SM[i.s]
    if (i.r < 10) {
      const n = i.r + 1, lay = n === 1 ? [[0, 0, 44]] : n < 4 ? Array.from({ length: n }, (_, k) => [0, (k - (n - 1) / 2) * 52, 17]) : (() => {
        const rows = n <= 5 ? 2 : n <= 7 ? 3 : 4, ys = rows === 2 ? [-32, 32] : rows === 3 ? [-48, 0, 48] : [-60, -20, 20, 60], o = []
        ys.forEach((y) => o.push([-24, y, 13], [24, y, 13])); if (n === 5) o.push([0, 0, 13]); if (n === 7) o.push([0, -24, 13]); if (n === 9) o.push([0, 0, 13]); if (n === 10) o.push([0, -40, 13], [0, 40, 13]); return o
      })()
      lay.forEach(([x, y, r]) => motif(c, sm, 128 + x, CY + y, r))
    } else {
      c.save(); c.translate(128, CY)
      const k = [2, 3, 4, 5][i.r - 10]; c.beginPath(); c.moveTo(-24, -66); for (let j = 0; j < k; j++) { c.lineTo(-24 + (j + .5) * 48 / k, -86); c.lineTo(-24 + (j + 1) * 48 / k, -66) } c.closePath(); c.stroke()
      c.beginPath(); O(c, 0, -46, 17); c.stroke(); c.beginPath(); c.moveTo(-38, -4); c.lineTo(-21, -26); c.lineTo(21, -26); c.lineTo(38, -4); c.closePath(); c.stroke()
      motif(c, sm, 0, 36, 28); c.restore()
    }
  }
  unglow(c); c.fillStyle = LITE; [[52, 150], [206, 160], [48, 300], [208, 312]].forEach(([x, y]) => sparkle(c, x, y, 3.5)); c.fillStyle = GOLD
  // 名牌
  c.lineWidth = 1; c.strokeStyle = goldG(c, 366, 424); c.beginPath(); c.moveTo(48, 372); c.lineTo(208, 372); c.lineTo(208, 420); c.lineTo(48, 420); c.closePath(); c.stroke()
  c.fillStyle = goldG(c, 376, 396); c.font = '600 17px ' + FONT; c.fillText(i.n, 128, 392)
  c.fillStyle = '#d6c79f'; c.font = '8.5px ' + TITLE; if ('letterSpacing' in c) c.letterSpacing = '3px'; c.fillText(enName(id).toUpperCase(), 128, 410)
  return cv
}

/* ---------------- 牌背：装饰艺术风罗盘星 ---------------- */
export function backCv() {
  const cv = mk(512, 896), c = cv.getContext('2d'); c.scale(2, 2); ink(c); frameArt(c)
  c.lineJoin = c.lineCap = 'round'; c.strokeStyle = GOLD; glow(c, GOLD, 5)
  // 上下几何山形
  ;[[1, 70], [-1, 378]].forEach(([d, y]) => { for (let k = 0; k < 3; k++) { c.lineWidth = 1.2 - k * .25; c.globalAlpha = 1 - k * .22; c.beginPath(); c.moveTo(128 - 56 + k * 10, y + d * (k * 10 + 34) * -1 + d * 34 * 0); c.moveTo(72 + k * 12, y); c.lineTo(128, y - d * (52 - k * 12)); c.lineTo(184 - k * 12, y); c.stroke() } })
  c.globalAlpha = 1
  const CY = 224
  c.lineWidth = 1; c.globalAlpha = .6; c.beginPath(); for (let k = 0; k < 64; k++) { const a = k * TAU / 64, l = k % 2 ? 10 : 22; c.moveTo(128 + Math.cos(a) * 62, CY + Math.sin(a) * 62); c.lineTo(128 + Math.cos(a) * (62 + l), CY + Math.sin(a) * (62 + l)) } c.stroke(); c.globalAlpha = 1
  c.lineWidth = 1.4; c.beginPath(); O(c, 128, CY, 60); O(c, 128, CY, 44); c.stroke()
  c.lineWidth = 1.6; c.beginPath(); for (let k = 0; k < 32; k++) { const a = k * TAU / 32 - Math.PI / 2, r = k % 4 === 0 ? 100 : k % 2 ? 40 : 70; c.lineTo(128 + Math.cos(a) * r * .86, CY + Math.sin(a) * r * .86) } c.closePath(); c.stroke()
  c.lineWidth = .9; c.beginPath(); for (let k = 0; k < 8; k++) { const a = k * TAU / 8; for (let m = 0; m < 2; m++) O(c, 128 + Math.cos(a) * 20, CY + Math.sin(a) * 20, 11) } c.stroke()
  c.fillStyle = LITE; sparkle(c, 128, CY, 9); c.fillStyle = GOLD; [[60, 120], [196, 128], [58, 330], [198, 322], [128, 130], [128, 318]].forEach(([x, y]) => sparkle(c, x, y, 3.5))
  unglow(c); return cv
}

/* ---------------- 魔法书 ---------------- */
function moth(c, cx, cy, s) {
  c.save(); c.translate(cx, cy); c.scale(s, s); c.lineJoin = c.lineCap = 'round'
  const wing = (m) => {
    c.save(); c.scale(m, 1); c.fillStyle = 'rgba(8,7,12,.72)'; c.strokeStyle = '#f6dc9c'; c.lineWidth = 1.7 / s
    c.beginPath(); c.moveTo(6, -4); c.bezierCurveTo(30, -78, 128, -96, 168, -52); c.bezierCurveTo(186, -30, 160, 6, 70, 10); c.closePath(); c.fill(); c.stroke()
    c.beginPath(); c.moveTo(6, 6); c.bezierCurveTo(50, 10, 128, 36, 118, 86); c.bezierCurveTo(104, 112, 46, 90, 6, 26); c.closePath(); c.fill(); c.stroke()
    c.lineWidth = .9 / s; c.beginPath(); [[10, 0, 160, -50], [10, 0, 130, -70], [10, 0, 100, -20], [10, 8, 110, 70], [10, 12, 70, 88], [10, 6, 130, 30]].forEach(([a, b, x, y]) => { c.moveTo(a, b); c.quadraticCurveTo((a + x) / 2, (b + y) / 2 - 8, x, y) }); c.stroke()
    c.fillStyle = '#f6dc9c'; [[110, -40, 7], [92, 52, 6], [140, -22, 3.5], [64, -30, 4]].forEach(([x, y, r]) => { c.beginPath(); O(c, x, y, r); c.stroke(); c.beginPath(); O(c, x, y, r * .4); c.fill() })
    c.restore()
  }
  wing(1); wing(-1)
  c.fillStyle = 'rgba(8,7,12,.9)'; c.strokeStyle = '#f6dc9c'; c.lineWidth = 1.8 / s
  c.beginPath(); c.ellipse(0, 20, 8, 44, 0, 0, TAU); c.fill(); c.stroke()
  c.beginPath(); for (let k = 0; k < 6; k++) { c.moveTo(-7, 2 + k * 11); c.lineTo(7, 2 + k * 11) } c.stroke()
  c.beginPath(); O(c, 0, -26, 7); c.stroke()
  c.beginPath(); c.moveTo(-3, -32); c.quadraticCurveTo(-18, -62, -34, -66); c.moveTo(3, -32); c.quadraticCurveTo(18, -62, 34, -66); c.stroke()
  c.restore()
}
function fleuron(c, x, y, sx, sy) { // 角落卷草花饰
  c.save(); c.translate(x, y); c.scale(sx, sy); c.beginPath(); c.moveTo(0, 74); c.quadraticCurveTo(0, 0, 74, 0)
  c.moveTo(14, 56); c.quadraticCurveTo(14, 14, 56, 14); c.moveTo(0, 30); c.bezierCurveTo(24, 30, 30, 24, 30, 0)
  for (let a = 0; a < 3.2; a += .1) { const r = 20 - a * 5.2; c.lineTo(22 + Math.cos(a + 3.6) * r, 22 + Math.sin(a + 3.6) * r) }
  c.stroke(); c.beginPath(); O(c, 8, 8, 4); c.fill(); c.restore()
}
export function drawCover(cv) {
  const c = cv.getContext('2d'), W = 640, H = 896; c.clearRect(0, 0, W, H)
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#141219'); g.addColorStop(.5, '#0a090e'); g.addColorStop(1, '#050408'); c.fillStyle = g; c.fillRect(0, 0, W, H)
  c.fillStyle = '#fff'; for (let i = 0; i < 2600; i++) { c.globalAlpha = Math.random() * .06; c.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 2, 1.4) } c.globalAlpha = 1
  c.lineJoin = c.lineCap = 'round'; c.strokeStyle = c.fillStyle = goldG(c, 0, H); glow(c, '#e9c97f', 5)
  c.lineWidth = 5; rr(c, 34, 34, W - 68, H - 68, 20); c.stroke(); c.lineWidth = 1.6; c.globalAlpha = .7; rr(c, 52, 52, W - 104, H - 104, 12); c.stroke(); c.globalAlpha = 1
  c.lineWidth = 2.2; fleuron(c, 60, 60, 1.1, 1.1); fleuron(c, W - 60, 60, -1.1, 1.1); fleuron(c, 60, H - 60, 1.1, -1.1); fleuron(c, W - 60, H - 60, -1.1, -1.1)
  // 标题
  c.textAlign = 'center'; c.fillStyle = goldG(c, 100, 240)
  c.font = '500 30px ' + TITLE; if ('letterSpacing' in c) c.letterSpacing = '16px'; c.fillText('THE', 328, 134)
  c.font = 'bold 104px ' + TITLE; if ('letterSpacing' in c) c.letterSpacing = '12px'; c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowOffsetY = 4; c.shadowBlur = 6; c.fillText('TAROT', 326, 234)
  c.shadowOffsetY = 0; glow(c, '#e9c97f', 5)
  // 月亮 + 飞蛾 + 月相环
  const cx = 320, cy = 520
  const mg = c.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, 128); mg.addColorStop(0, '#f1deaa'); mg.addColorStop(1, '#a98f57'); c.fillStyle = mg; c.beginPath(); O(c, cx, cy, 124); c.fill()
  c.fillStyle = 'rgba(70,52,24,.45)'; [[-50, -40, 22], [40, -60, 14], [60, 30, 26], [-70, 40, 16], [-10, 78, 12]].forEach(([x, y, r]) => { c.beginPath(); O(c, cx + x, cy + y, r); c.fill() })
  c.strokeStyle = goldG(c, 340, 700); c.lineWidth = 2.4; c.beginPath(); O(c, cx, cy, 190); c.stroke(); c.lineWidth = 1.2; c.beginPath(); O(c, cx, cy, 176); c.stroke()
  c.lineWidth = 1.4; c.beginPath(); for (let k = 0; k < 96; k++) { const a = k * TAU / 96, l = k % 4 ? 5 : 12; c.moveTo(cx + Math.cos(a) * 190, cy + Math.sin(a) * 190); c.lineTo(cx + Math.cos(a) * (190 + l), cy + Math.sin(a) * (190 + l)) } c.stroke()
  c.fillStyle = goldG(c, 340, 700)
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8 - Math.PI / 2, x = cx + Math.cos(a) * 158, y = cy + Math.sin(a) * 158; c.save(); c.translate(x, y); c.beginPath(); O(c, 0, 0, 13); c.lineWidth = 1.6; c.stroke(); c.beginPath(); c.arc(0, 0, 13, -Math.PI / 2, Math.PI / 2); const ph = [1, .75, .5, .25, 0, .25, .5, .75][k] * 0 + (k === 0 ? 1 : k < 4 ? .5 : .15); const rx = 13 * Math.abs(1 - 2 * ph); if (ph < .5) c.ellipse(0, 0, rx, 13, 0, Math.PI / 2, -Math.PI / 2, true); else c.ellipse(0, 0, rx, 13, 0, Math.PI / 2, Math.PI * 1.5, false); c.fill(); c.restore() }
  moth(c, cx, cy + 6, 1.15)
  ;[[130, 360, 9], [510, 380, 7], [120, 650, 8], [520, 660, 10], [320, 330, 6]].forEach(([x, y, r]) => sparkle(c, x, y, r))
  // 小字
  unglow(c); c.fillStyle = '#d8c48f'; c.font = '500 19px ' + TITLE; if ('letterSpacing' in c) c.letterSpacing = '6px'
  c.fillText('TAROT · ASTROLOGY · GUIDANCE', 326, 800); c.fillText('SELF DISCOVERY', 326, 830)
}
export function innerCv(kind) { // 'cover' 封里 / 'R' 右页（发光法阵）/ 'L' 左页（星座图）
  const cv = mk(640, 896), c = cv.getContext('2d'), W = 640, H = 896
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, kind === 'cover' ? '#100e16' : '#17141f'); g.addColorStop(1, '#07060b'); c.fillStyle = g; c.fillRect(0, 0, W, H)
  const gl = c.createRadialGradient(W / 2, H * .44, 10, W / 2, H * .44, W * .75); gl.addColorStop(0, kind === 'R' ? 'rgba(255,214,140,.40)' : kind === 'L' ? 'rgba(233,201,127,.14)' : 'rgba(233,201,127,.08)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gl; c.fillRect(0, 0, W, H)
  c.fillStyle = '#fff'; for (let i = 0; i < 1600; i++) { c.globalAlpha = Math.random() * .06; c.fillRect(Math.random() * W, Math.random() * H, 2, 2) } c.globalAlpha = 1
  c.lineJoin = c.lineCap = 'round'; c.strokeStyle = goldG(c, 0, H); c.lineWidth = 3; c.globalAlpha = .8; rr(c, 34, 34, W - 68, H - 68, 14); c.stroke(); c.lineWidth = 1.2; rr(c, 48, 48, W - 96, H - 96, 8); c.stroke(); c.globalAlpha = 1
  if (kind === 'cover') return cv
  glow(c, '#ffcf7a', 16); c.strokeStyle = c.fillStyle = '#ffe2a6'
  if (kind === 'R') {
    const cy = H * .44; c.lineWidth = 3
    ;[190, 170].forEach((r) => { c.beginPath(); O(c, W / 2, cy, r); c.stroke() })
    ;[0, 1].forEach((d) => { c.beginPath(); for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + (d ? Math.PI / 3 : 0) - Math.PI / 2; c.lineTo(W / 2 + Math.cos(a) * 170, cy + Math.sin(a) * 170) } c.closePath(); c.stroke() })
    c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 72; i++) { const a = i * TAU / 72, l = i % 6 ? 8 : 20; c.moveTo(W / 2 + Math.cos(a) * 190, cy + Math.sin(a) * 190); c.lineTo(W / 2 + Math.cos(a) * (190 + l), cy + Math.sin(a) * (190 + l)) } c.stroke()
    motif(c, 'moon', W / 2 - 10, cy, 64); sparkle(c, W / 2 + 36, cy - 24, 20)
    c.lineWidth = 2; for (let k = 0; k < 5; k++) { c.globalAlpha = .55 - k * .08; c.beginPath(); c.moveTo(150, 720 + k * 26); c.lineTo(W - 150, 720 + k * 26); c.stroke() } c.globalAlpha = 1
  } else {
    const P = [...Array(14)].map(() => [90 + Math.random() * (W - 180), 120 + Math.random() * (H * .55)])
    c.lineWidth = 1.5; c.globalAlpha = .6; c.beginPath(); P.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.globalAlpha = 1
    P.forEach((p) => sparkle(c, p[0], p[1], 6 + Math.random() * 10))
    c.lineWidth = 2; for (let k = 0; k < 7; k++) { c.globalAlpha = .55 - k * .06; c.beginPath(); c.moveTo(110, 680 + k * 26); c.lineTo(W - 110 - (k % 3) * 50, 680 + k * 26); c.stroke() } c.globalAlpha = 1
  }
  unglow(c); return cv
}
export function spineCv() { // 书脊：黑皮革 + 金色凸带 + 星星
  const cv = mk(128, 512), c = cv.getContext('2d')
  const g = c.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, '#07060a'); g.addColorStop(.5, '#17141c'); g.addColorStop(1, '#07060a'); c.fillStyle = g; c.fillRect(0, 0, 128, 512)
  c.fillStyle = '#fff'; for (let i = 0; i < 500; i++) { c.globalAlpha = Math.random() * .08; c.fillRect(Math.random() * 128, Math.random() * 512, 2, 2) } c.globalAlpha = 1
  c.strokeStyle = c.fillStyle = goldG(c, 0, 512); c.lineWidth = 3
  ;[26, 150, 256, 362, 486].forEach((y) => { c.beginPath(); c.moveTo(0, y); c.lineTo(128, y); c.moveTo(0, y + 8); c.lineTo(128, y + 8); c.stroke() })
  ;[88, 204, 310, 424].forEach((y) => sparkle(c, 64, y, 14))
  return cv
}
export function edgeCv(vertical) { // 书页侧边：旧金色纸边
  const cv = mk(64, 64), c = cv.getContext('2d'); c.fillStyle = '#9a7b43'; c.fillRect(0, 0, 64, 64); c.fillStyle = 'rgba(30,18,4,.5)'
  for (let i = 0; i < 64; i += 2) vertical ? c.fillRect(i, 0, 1, 64) : c.fillRect(0, i, 64, 1)
  return cv
}
export function tableCv() { // 牌桌桌布：黑绒 + 金色星盘线
  const cv = mk(1024, 1024), c = cv.getContext('2d'), M = 512
  const g = c.createRadialGradient(M, M, 20, M, M, 520); g.addColorStop(0, '#15121b'); g.addColorStop(1, '#050408'); c.fillStyle = g; c.fillRect(0, 0, 1024, 1024)
  c.fillStyle = '#fff'; for (let i = 0; i < 6000; i++) { c.globalAlpha = Math.random() * .05; c.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 1) } c.globalAlpha = 1
  c.strokeStyle = c.fillStyle = '#d9b868'; c.lineCap = c.lineJoin = 'round'; glow(c, '#e9c97f', 4)
  ;[[470, 2], [440, 1], [330, 1.6], [200, 1.2], [120, 1]].forEach(([r, w]) => { c.lineWidth = w; c.globalAlpha = .55; c.beginPath(); O(c, M, M, r); c.stroke() })
  c.lineWidth = 1; c.globalAlpha = .6; c.beginPath(); for (let k = 0; k < 144; k++) { const a = k * TAU / 144, l = k % 6 ? 6 : 16; c.moveTo(M + Math.cos(a) * 440, M + Math.sin(a) * 440); c.lineTo(M + Math.cos(a) * (440 + l), M + Math.sin(a) * (440 + l)) } c.stroke()
  c.globalAlpha = .45; c.beginPath(); for (let k = 0; k < 12; k++) { const a = k * TAU / 12; c.moveTo(M + Math.cos(a) * 120, M + Math.sin(a) * 120); c.lineTo(M + Math.cos(a) * 330, M + Math.sin(a) * 330); O(c, M + Math.cos(a + .26) * 385, M + Math.sin(a + .26) * 385, 18) } c.stroke()
  ;[0, 1].forEach((d) => { c.beginPath(); for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + (d ? Math.PI / 3 : 0) - Math.PI / 2; c.lineTo(M + Math.cos(a) * 330, M + Math.sin(a) * 330) } c.closePath(); c.stroke() })
  c.globalAlpha = .7; for (let i = 0; i < 70; i++) sparkle(c, Math.random() * 1024, Math.random() * 1024, 2 + Math.random() * 5)
  c.globalAlpha = .35; c.lineWidth = .8; c.beginPath(); for (let i = 0; i < 22; i++) { const x = Math.random() * 900 + 60, y = Math.random() * 900 + 60; c.moveTo(x, y); c.lineTo(x + (Math.random() - .5) * 160, y + (Math.random() - .5) * 160) } c.stroke()
  unglow(c); return cv
}
export function dotCv(kind) { // 柔光贴图：'flame' 火苗 / 'glow' 光晕 / 'dot' 光点 / 'beam' 光柱
  const w = kind === 'beam' ? 64 : 128, h = kind === 'beam' ? 256 : 128, cv = mk(w, h), c = cv.getContext('2d')
  if (kind === 'beam') {
    const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,220,150,0)'); g.addColorStop(.5, 'rgba(255,236,190,.9)'); g.addColorStop(1, 'rgba(255,220,150,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h)
    c.globalCompositeOperation = 'destination-in'; const v = c.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = v; c.fillRect(0, 0, w, h); return cv
  }
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64)
  if (kind === 'flame') { g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(.25, 'rgba(255,200,110,.9)'); g.addColorStop(.6, 'rgba(255,130,40,.35)'); g.addColorStop(1, 'rgba(255,100,20,0)') }
  else if (kind === 'glow') { g.addColorStop(0, 'rgba(255,230,170,.9)'); g.addColorStop(.35, 'rgba(233,180,90,.35)'); g.addColorStop(1, 'rgba(233,180,90,0)') }
  else { g.addColorStop(0, 'rgba(255,245,215,1)'); g.addColorStop(.35, 'rgba(255,225,160,.5)'); g.addColorStop(1, 'rgba(255,225,160,0)') }
  c.fillStyle = g; c.fillRect(0, 0, 128, 128); return cv
}
