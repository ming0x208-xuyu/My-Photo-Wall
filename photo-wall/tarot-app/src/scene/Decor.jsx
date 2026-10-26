import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { res } from './res.js'
import { S } from './state.js'

const TAU = Math.PI * 2
const ADD = THREE.AdditiveBlending

// 牌桌：黑绒桌布 + 金色星盘线（发牌后沉下去）
export function Table() {
  const ref = useRef(), R = res()
  useFrame(() => { ref.current.position.y = S.tableY; ref.current.visible = S.tableY > -6 })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, -1.2, 0]}>
      <planeGeometry args={[18, 18]} />
      <meshStandardMaterial map={R.table} metalnessMap={R.table} roughness={0.85} metalness={0.5} envMapIntensity={0.5} />
    </mesh>
  )
}

// 选牌阶段的背景：竖起来的金色星盘，缓缓旋转
export function Disc() {
  const ref = useRef(), R = res()
  useFrame((_, dt) => { ref.current.material.opacity = S.disc; ref.current.visible = S.disc > 0.01; ref.current.rotation.z += dt * 0.03 })
  return (
    <mesh ref={ref} position={[0, 0.5, -8]} visible={false}>
      <planeGeometry args={[26, 26]} />
      <meshBasicMaterial map={R.table} transparent opacity={0} blending={ADD} depthWrite={false} />
    </mesh>
  )
}

// 蜡烛：火苗闪烁 + 暖色点光源
function Candle({ pos, seed }) {
  const fl = useRef(), lt = useRef(), R = res()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed, f = 1 + Math.sin(t * 9) * 0.07 + Math.sin(t * 17) * 0.04
    fl.current.scale.set(0.5 * f, 0.85 * f, 1)
    lt.current.intensity = (16 + Math.sin(t * 11) * 3 + Math.sin(t * 23) * 2) * S.candle
  })
  return (
    <group position={pos}>
      <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.42, 0.48, 0.08, 28]} /><meshStandardMaterial color="#c9a45a" metalness={1} roughness={0.35} /></mesh>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.2, 0.23, 0.9, 22]} /><meshStandardMaterial color="#e6dcc3" roughness={0.75} /></mesh>
      <sprite ref={fl} position={[0, 1.15, 0]}><spriteMaterial map={R.flame} transparent blending={ADD} depthWrite={false} /></sprite>
      <pointLight ref={lt} position={[0, 1.3, 0.2]} color="#ffb766" distance={10} decay={2} />
    </group>
  )
}
export function Candles() {
  return (<><Candle pos={[-3.3, -1.2, -1.6]} seed={0} /><Candle pos={[3.5, -1.2, -1.2]} seed={2.3} /></>)
}

// 金色轨道环 + 绕着书飘浮的小牌 + 沿轨道游走的光点（参考图里环绕魔法书的效果）
export function Orbits() {
  const g = useRef(), R = res()
  const rings = useMemo(() => [[2.7, 1.3, 0.55, 0.3], [3.5, 1.7, -0.35, -0.6], [4.3, 2.1, 0.95, 0.25]].map(([a, b, rx, rz], i) => {
    const p = []; for (let k = 0; k <= 128; k++) { const t = (k / 128) * TAU; p.push(new THREE.Vector3(Math.cos(t) * a, 0, Math.sin(t) * b)) }
    const grp = new THREE.Group(); grp.rotation.set(rx, 0, rz)
    grp.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: '#e9c97f', transparent: true, opacity: 0.42, blending: ADD, depthWrite: false })))
    const sp = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(15), 3)), new THREE.PointsMaterial({ map: R.dot, size: 0.2, color: '#ffe7b0', transparent: true, depthWrite: false, blending: ADD }))
    sp.frustumCulled = false; grp.add(sp)
    const cards = [0, 1].map((n) => { const m = new THREE.Mesh(R.cardGeo, R.backMat); m.scale.setScalar(0.4); grp.add(m); return { m, ph: (n * 0.5 + i * 0.17) % 1 } })
    return { a, b, grp, sp, cards, spd: 0.035 + i * 0.012 }
  }), [R])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    g.current.scale.setScalar(Math.max(0.0001, S.hero)); g.current.visible = S.hero > 0.01
    rings.forEach((r, i) => {
      const pos = r.sp.geometry.attributes.position
      for (let k = 0; k < 5; k++) { const u = (t * r.spd * (i % 2 ? -1 : 1) + k / 5) * TAU; pos.setXYZ(k, Math.cos(u) * r.a, 0, Math.sin(u) * r.b) }
      pos.needsUpdate = true
      r.cards.forEach((c) => {
        const u = (t * r.spd * 0.7 * (i % 2 ? -1 : 1) + c.ph) * TAU
        c.m.position.set(Math.cos(u) * r.a, Math.sin(t * 1.2 + c.ph * 9) * 0.12, Math.sin(u) * r.b)
        c.m.lookAt(0, 4, 8); c.m.rotateZ(Math.sin(t * 0.6 + c.ph * 5) * 0.4)
      })
    })
  })
  return <group ref={g}>{rings.map((r, i) => <primitive key={i} object={r.grp} />)}</group>
}

// 金色尘埃 + 远处暖色虚化光斑
export function Dust() {
  const a = useRef(), b = useRef(), R = res()
  const [p1, p2] = useMemo(() => {
    const mk = (n, w, h, d) => { const x = new Float32Array(n * 3); for (let i = 0; i < n; i++) { x[i * 3] = (Math.random() - 0.5) * w; x[i * 3 + 1] = (Math.random() - 0.5) * h; x[i * 3 + 2] = -d * Math.random() + 1 } return x }
    return [mk(420, 18, 14, 10), mk(26, 22, 12, 14)]
  }, [])
  useFrame(({ clock }, dt) => { const t = clock.elapsedTime; a.current.rotation.y += dt * 0.012; a.current.position.y = Math.sin(t * 0.3) * 0.15; b.current.position.x = Math.sin(t * 0.1) * 0.5 })
  return (
    <>
      <points ref={a}><bufferGeometry><bufferAttribute attach="attributes-position" count={420} array={p1} itemSize={3} /></bufferGeometry><pointsMaterial map={R.dot} size={0.07} color="#ffe2a0" transparent opacity={0.75} depthWrite={false} blending={ADD} /></points>
      <points ref={b} position={[0, 0, -4]}><bufferGeometry><bufferAttribute attach="attributes-position" count={26} array={p2} itemSize={3} /></bufferGeometry><pointsMaterial map={R.glow} size={1.1} color="#ffbe6a" transparent opacity={0.22} depthWrite={false} blending={ADD} /></points>
    </>
  )
}
