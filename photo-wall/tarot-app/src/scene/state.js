// 场景与界面共用的“可变状态”。动画每帧改它，不走 React 渲染，所以不会卡
import * as THREE from 'three'

export const S = {
  phase: 'idle',            // idle 待机 → open 开书 → ask 选问题 → deal 发牌 → pick 选牌 → reveal 翻牌
  offset: 0, vel: 0, dragging: false, dealT: 0,
  hero: 1, tableY: -1.2, disc: 0, candle: 1, zoom: 1, tilt: false,
  cam: { px: 0, py: 4.4, pz: 6, tx: 0, ty: -0.5, tz: 0 },
  bk: { cover: 0, shift: 0, glow: 0.35, beam: 0, burst: 0, scale: 1, sink: 0 },
  dims: { w: 6, h: 10, a: 0.6, D: 12 },
  fan: { Rf: 7, step: 0.09, span: 7 },
  src: new THREE.Vector3(0, -0.4, 0.4),
  picks: [], api: {},
}

// 竖屏时把镜头拉远，保证打开的书能完整放进屏幕
const f = (a) => (a < 1 ? 1 + (1 / a - 1) * 0.5 : 1)
export const heroCam = (a) => ({ px: 0, py: 4.4 * f(a), pz: 6 * f(a), tx: 0, ty: -0.5, tz: 0 })
export const askCam = (a) => ({ ...heroCam(a), ty: -0.5 - 1.25 * f(a) })   // 视线压低 → 书在屏幕里上移，给底部问题面板让位
export const pickCam = () => ({ px: 0, py: 0.8, pz: S.dims.D, tx: 0, ty: 0, tz: 0 })
