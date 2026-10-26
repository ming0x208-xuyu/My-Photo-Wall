import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import * as A from '../art.js'
import { res } from './res.js'
import { S } from './state.js'

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const lerp = THREE.MathUtils.lerp
const easeOut3 = (t) => 1 - Math.pow(1 - t, 3)

// 选中的牌才生成正面贴图（最多 3 张），其余 75 张一直只用共享的牌背
function addFront(g, d, R) {
  const t = A.tex(A.faceCv(d.id))
  const m = new THREE.Mesh(R.cardGeo, new THREE.MeshStandardMaterial({ map: t, metalnessMap: A.metalOf(t), metalness: 1, roughness: 0.45, envMapIntensity: 1 }))
  m.rotation.set(0, Math.PI, d.rev ? Math.PI : 0); m.position.z = -0.003; g.add(m)
}

export default function Cards({ onPick }) {
  const { gl, size } = useThree()
  const R = res(), refs = useRef([]), glint = useRef()
  const deck = useMemo(() => {
    const ids = [...Array(78).keys()]
    for (let i = 77; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [ids[i], ids[j]] = [ids[j], ids[i]] }
    return ids.map((id, i) => ({ id, i, rev: Math.random() < 0.3, picked: false }))
  }, [])

  // 拖动牌阵：手指/鼠标移动多少，牌就跟着移动多少
  useEffect(() => {
    const el = gl.domElement; let lx = 0
    const dn = (e) => { if (S.phase !== 'pick') return; S.dragging = true; lx = e.clientX; S.vel = 0 }
    const mv = (e) => { if (!S.dragging) return; const dx = e.clientX - lx; lx = e.clientX; const d = (dx * (S.dims.w / size.width)) / S.fan.Rf; S.offset += d; S.vel = d }
    const up = () => { S.dragging = false }
    el.addEventListener('pointerdown', dn); window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up)
    return () => { el.removeEventListener('pointerdown', dn); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up) }
  }, [gl, size.width])

  useEffect(() => {
    S.api.deal = (done) => {
      S.dealT = 0
      const a = S.dims.a, tl = gsap.timeline({ onComplete: done })
      S.api.flurry(tl, 0)
      tl.to(S.cam, { ...pickCamNow(), duration: 2.6, ease: 'power3.inOut' }, 0.9)
        .to(S, { dealT: 3.4, duration: 3.4, ease: 'none' }, 0.9)
        .to(S, { hero: 0, duration: 1.2, ease: 'power2.in' }, 0.2)
        .to(S.bk, { glow: 0, beam: 0, duration: 1.2 }, 1.3)
        .to(S.bk, { sink: 1, scale: 0, duration: 1.4, ease: 'power3.in' }, 1.3)
        .to(S, { tableY: -9, disc: 0.38, candle: 0.3, duration: 1.8, ease: 'power2.inOut' }, 1.2)
      return tl
    }
    S.api.reveal = (done) => {
      S.phase = 'reveal'
      const { w, h } = S.dims, sc = Math.min(1.9, (0.46 * h) / 1.75, (w * 0.92) / 3.24), sp = sc * 1.12, y = h * 0.2
      const tl = gsap.timeline({ onComplete: () => { S.tilt = true } })
      S.picks.forEach((d, k) => {
        const g = refs.current[d.i]
        tl.to(g.position, { x: (k - 1) * sp, y, z: 1.2, duration: 0.9, ease: 'power3.inOut' }, k * 0.1)
          .to(g.scale, { x: sc, y: sc, z: sc, duration: 0.9, ease: 'power3.inOut' }, k * 0.1)
          .to(g.rotation, { y: Math.PI, duration: 1.2, ease: 'back.out(1.2)' }, 1 + k * 0.55)
          .to(g.scale, { x: sc * 1.1, y: sc * 1.1, duration: 0.3, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1 + k * 0.55)
      })
      deck.forEach((d) => { if (d.picked) return; const g = refs.current[d.i]; if (g && g.visible) tl.to(g.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.7, ease: 'power2.in', onComplete: () => { g.visible = false } }, 0) })
      tl.call(() => done && done(), null, 2.3)
      return tl
    }
    return () => { S.api.deal = S.api.reveal = null }
  }, [deck])

  const click = (e, d) => {
    e.stopPropagation()
    if (S.phase !== 'pick' || e.delta > 6 || d.picked || S.picks.length >= 3) return
    d.picked = true; S.picks.push(d)
    const k = S.picks.length - 1, g = refs.current[d.i], { w, h } = S.dims, sp = Math.min(0.9, w * 0.26)
    addFront(g, d, R)
    gsap.to(g.position, { x: (k - 1) * sp, y: h * 0.2, z: 0.6, duration: 0.9, ease: 'power3.out' })
    gsap.to(g.scale, { x: 0.55, y: 0.55, z: 0.55, duration: 0.9, ease: 'power3.out' })
    gsap.to(g.rotation, { z: 0, duration: 0.9, ease: 'power3.out' })
    onPick && onPick(S.picks.length)
  }

  useFrame(({ clock, pointer }) => {
    const ph = S.phase, now = clock.elapsedTime
    if (ph === 'reveal') {   // 翻牌后：牌跟着指尖/鼠标微微倾斜，金箔高光随之流动
      if (S.tilt) S.picks.forEach((d, k) => {
        const g = refs.current[d.i]
        g.rotation.x = lerp(g.rotation.x, -pointer.y * 0.18 + Math.sin(now * 0.8 + k) * 0.03, 0.08)
        g.rotation.y = lerp(g.rotation.y, Math.PI + pointer.x * 0.3, 0.08)
      })
      glint.current.position.set(pointer.x * 3.5, S.dims.h * 0.2 + pointer.y * 2, 4)
      return
    }
    if (ph !== 'deal' && ph !== 'pick') return
    const { w, h } = S.dims
    const Rf = clamp(w * 1.15, 6.5, 12), step = 0.62 / Rf, span = 78 * step
    S.fan = { Rf, step, span }
    if (ph === 'pick' && !S.dragging) {          // 惯性滑动，停下后自动吸附到最近的一张
      S.offset += S.vel; S.vel *= 0.93
      if (Math.abs(S.vel) < 0.0006) S.offset += (Math.round(S.offset / step) * step - S.offset) * 0.1
    }
    const pivotY = -h * 0.2 - Rf, sx = S.src
    for (const d of deck) {
      const g = refs.current[d.i]; if (!g || d.picked) continue
      let a = (((d.i * step + S.offset) % span) + span) % span; if (a > span / 2) a -= span
      const dist = Math.abs(a) * Rf
      let p = 1
      if (ph === 'deal') p = easeOut3(clamp((S.dealT - dist * 0.14 - 0.2) / 1.1))
      if (dist > w / 2 + 1.2 || p <= 0) { g.visible = false; g.position.set(0, -99, 0); continue }
      const fo = Math.exp(-Math.pow(a / (step * 1.7), 2))      // 越靠近中间，牌越高、越大
      const tx = Math.sin(a) * Rf, ty = pivotY + Math.cos(a) * Rf + fo * 0.5 + Math.sin(now * 1.2 + d.i) * 0.025, tz = -dist * 0.05 + fo * 0.3
      g.visible = true
      g.position.set(lerp(sx.x, tx, p), lerp(sx.y, ty, p) + (ph === 'deal' ? Math.sin(Math.PI * p) * 0.9 : 0), lerp(sx.z, tz, p))
      g.rotation.set(0, 0, -a + (1 - p) * (d.i % 2 ? 3 : -3))
      g.scale.setScalar((0.25 + 0.75 * p) * (1 + fo * 0.16))
    }
    glint.current.position.set(pointer.x * 3.5, 1.5 + pointer.y * 1.5, 3.2)
  })

  return (
    <group>
      <pointLight ref={glint} color="#ffe2a8" intensity={22} distance={16} decay={2} position={[0, 1.5, 3.2]} />
      {deck.map((d) => (
        <group key={d.i} ref={(el) => (refs.current[d.i] = el)} visible={false} position={[0, -99, 0]}>
          <mesh geometry={R.cardGeo} material={R.backMat} onClick={(e) => click(e, d)} />
        </group>
      ))}
    </group>
  )
}

function pickCamNow() { return { px: 0, py: 0.8, pz: S.dims.D, tx: 0, ty: 0, tz: 0 } }
