import * as THREE from 'three'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import * as A from '../art.js'
import { res } from './res.js'
import { S, askCam } from './state.js'

const BN = 14, SW = 1.4, TAU = Math.PI * 2
const gold = new THREE.MeshStandardMaterial({ color: '#d9b45a', metalness: 1, roughness: 0.34, envMapIntensity: 1.3 })

// 书页弯曲：从书脊开始逐段累加角度，翻动时页尖会“拖在后面”，像真的纸一样柔软
function bend(sh, f) {
  const th = f * Math.PI, pos = sh.g.attributes.position, dx = SW / BN, c = 0.45 * Math.sin(th), z0 = THREE.MathUtils.lerp(sh.zr, sh.zl, f)
  let x = 0.03, z = 0
  for (let j = 0; j <= BN; j++) {
    if (j > 0) { const a = th * (1 - c * (j / BN) * 0.9); x += Math.cos(a) * dx; z += Math.sin(a) * dx }
    pos.setXYZ(j, x, 1.0, z0 + z); pos.setXYZ(j + BN + 1, x, -1.0, z0 + z)
  }
  pos.needsUpdate = true
}

export default function Book({ onClick }) {
  const root = useRef(), tilt = useRef(), bk = useRef(), hinge = useRef(), beam = useRef(), halo = useRef(), motes = useRef(), lamp = useRef()
  const R = res()

  const m = useMemo(() => {
    const cvC = document.createElement('canvas'); cvC.width = 640; cvC.height = 896; A.drawCover(cvC)
    const cover = A.tex(cvC); cover.repeat.set(1 / 1.5, 1 / 2.1); cover.offset.set(0.5, 0.5)   // 挤出几何体的 UV 是形状坐标，这里换算成 0~1
    const coverM = A.metalOf(cover)
    const leather = new THREE.MeshStandardMaterial({ color: '#0b0a0f', roughness: 0.7, metalness: 0.15, envMapIntensity: 0.6 })
    const shape = A.roundedShape(1.5, 2.1, 0.06)
    const ex = (d) => { const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 10 }); g.translate(0, 0, -d / 2); return g }
    const edgeV = A.tex(A.edgeCv(true)), edgeH = A.tex(A.edgeCv(false))
    const pm = (t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, metalness: 0.3, envMapIntensity: 0.5 })
    const spineT = A.tex(A.spineCv())
    const pageR = A.tex(A.innerCv('R')), pageLt = A.tex(A.innerCv('L'))
    pageLt.repeat.x = -1; pageLt.offset.x = 1   // 背面看过去是镜像的，这里翻回来
    const cs = new THREE.Shape(); cs.moveTo(0, 0); cs.lineTo(0.26, 0); cs.quadraticCurveTo(0.1, 0.1, 0, 0.26); cs.closePath()
    return {
      cover, coverM, shape,
      coverGeo: ex(0.04), backGeo: ex(0.04),
      coverMat: [new THREE.MeshStandardMaterial({ map: cover, metalnessMap: coverM, metalness: 1, roughness: 0.55, envMapIntensity: 0.9 }), leather],
      backMat: [leather, leather],
      innerGeo: A.roundedGeo(1.46, 2.06, 0.05),
      innerMat: new THREE.MeshStandardMaterial({ map: A.tex(A.innerCv('cover')), roughness: 0.85, metalness: 0.2 }),
      cornerGeo: new THREE.ExtrudeGeometry(cs, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }),
      blockMats: [pm(edgeV), pm(edgeV), pm(edgeH), pm(edgeH), new THREE.MeshStandardMaterial({ color: '#2a2230' }), new THREE.MeshStandardMaterial({ color: '#2a2230' })],
      spineMat: new THREE.MeshStandardMaterial({ map: spineT, metalnessMap: A.metalOf(spineT), metalness: 1, roughness: 0.5, envMapIntensity: 0.9 }),
      frontMat: new THREE.MeshBasicMaterial({ map: pageR, toneMapped: false }),
      backPageMat: new THREE.MeshBasicMaterial({ map: pageLt, side: THREE.BackSide, toneMapped: false }),
      ribbon: new THREE.MeshStandardMaterial({ color: '#0d0b12', roughness: 0.6, side: THREE.DoubleSide }),
    }
  }, [])

  // 标题字体加载好后，重绘封面（字体文件缺失就保持后备字体，不报错）
  useEffect(() => {
    if (!document.fonts) return
    document.fonts.load('bold 100px TarotTitle').then(() => { A.drawCover(m.cover.image); m.cover.needsUpdate = true; m.coverM.needsUpdate = true }).catch(() => {})
  }, [m])

  const sheets = useMemo(() => [0, 1, 2, 3, 4].map((k) => ({ k, g: new THREE.PlaneGeometry(SW, 2, BN, 1), f: 0, last: -1, zr: 0.125 - 0.009 * k, zl: -0.125 + 0.009 * k })), [])
  useLayoutEffect(() => { sheets.forEach((s) => { bend(s, 0); s.last = 0 }) }, [sheets])

  // 漂浮的金色光点（书打开后从书页升起）
  const mote = useMemo(() => { const n = 90, a = new Float32Array(n * 3), seed = Array.from({ length: n }, () => [Math.random(), Math.random() * TAU, 0.3 + Math.random() * 1.1]); return { n, a, seed } }, [])

  useEffect(() => {
    const b = S.bk
    S.api.open = (done) => {
      const a = S.dims.a, ac = askCam(a)
      return gsap.timeline({ onComplete: done })
        .to(b, { cover: 1, duration: 1.7, ease: 'back.out(1.4)' }, 0)
        .to(b, { shift: 1, duration: 1.5, ease: 'power2.inOut' }, 0)
        .to(b, { glow: 1, duration: 1.4 }, 0.3).to(b, { beam: 1, duration: 1.4 }, 0.6)
        .to(sheets[0], { f: 1, duration: 1.1, ease: 'power2.inOut' }, 0.55).to(sheets[1], { f: 1, duration: 1.1, ease: 'power2.inOut' }, 0.85)
        .to(S.cam, { ty: ac.ty, duration: 1.3, ease: 'power2.inOut' }, 1.5)
    }
    S.api.openNow = () => { Object.assign(b, { cover: 1, shift: 1, glow: 1, beam: 1 }); sheets[0].f = 1; sheets[1].f = 1; Object.assign(S.cam, askCam(S.dims.a)) }
    S.api.flurry = (tl, at) => {      // 书页哗啦翻动 + 一次光爆
      ;[2, 3, 4].forEach((k, i) => tl.to(sheets[k], { f: 1, duration: 0.7, ease: 'power2.in' }, at + i * 0.14))
      tl.to(b, { burst: 1, duration: 0.5, ease: 'power2.out' }, at).to(b, { burst: 0, duration: 1, ease: 'power2.in' }, at + 0.5)
    }
    return () => { S.api.open = S.api.openNow = S.api.flurry = null }
  }, [sheets])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime, b = S.bk
    root.current.position.set(0, -0.55 + Math.sin(t * 1.1) * 0.05 * (1 - b.sink) - b.sink * 0.8, 0)
    root.current.scale.setScalar(Math.max(0.0001, b.scale))
    tilt.current.rotation.set(-1.15 + Math.sin(t * 0.7) * 0.02, THREE.MathUtils.lerp(-0.4, 0, b.shift) + Math.sin(t * 0.5) * 0.05, 0)
    bk.current.position.x = -0.75 * (1 - b.shift)
    hinge.current.rotation.y = -b.cover * Math.PI
    hinge.current.position.z = 0.17 - 0.34 * b.cover
    for (const s of sheets) {
      let f = s.f
      if (s.k === 2 && S.phase === 'ask') f += 0.025 + 0.025 * Math.sin(t * 1.7)   // 等待时右页轻轻颤动
      if (f !== s.last) { bend(s, f); s.last = f }
    }
    halo.current.material.opacity = 0.12 + 0.5 * b.glow + 0.6 * b.burst
    halo.current.scale.setScalar(5 + 3 * b.glow + 4 * b.burst)
    beam.current.material.opacity = 0.75 * b.beam * (1 + 0.6 * b.burst)
    lamp.current.intensity = 3 + 22 * b.glow + 60 * b.burst
    const p = motes.current.geometry.attributes.position
    for (let i = 0; i < mote.n; i++) {
      const [u, ang, sp] = mote.seed[i], ph = (u + t * 0.12 * sp) % 1
      p.setXYZ(i, Math.cos(ang + t * 0.5 * sp) * (0.25 + ph * 1.1), Math.sin(ang + t * 0.5 * sp) * (0.3 + ph * 0.9), 0.1 + ph * 2.4)
    }
    p.needsUpdate = true
    motes.current.material.opacity = 0.9 * b.beam
  })

  return (
    <group ref={root} onClick={(e) => { e.stopPropagation(); onClick && onClick() }}>
      <group ref={tilt}>
        <sprite ref={halo} position={[0, 0, -0.3]}><spriteMaterial map={R.glow} color="#ffd998" transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
        <sprite ref={beam} position={[0, 0, 1.7]} scale={[1.9, 3.4, 1]}><spriteMaterial map={R.beam} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
        <pointLight ref={lamp} position={[0, 0, 1.4]} color="#ffcf8a" distance={8} decay={2} />
        <points ref={motes} frustumCulled={false}>
          <bufferGeometry><bufferAttribute attach="attributes-position" count={mote.n} array={mote.a} itemSize={3} /></bufferGeometry>
          <pointsMaterial map={R.dot} size={0.11} color="#ffe2a8" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>

        <group ref={bk}>
          {/* 封底 */}
          <mesh geometry={m.backGeo} material={m.backMat} position={[0.75, 0, -0.17]} />
          {/* 书页块：侧边是旧金色纸边 */}
          <mesh position={[0.74, 0, -0.035]} material={m.blockMats}><boxGeometry args={[1.4, 2.0, 0.23]} /></mesh>
          {/* 圆润的书脊 */}
          <mesh position={[0, 0, 0]} material={m.spineMat}><cylinderGeometry args={[0.2, 0.2, 2.1, 28, 1, false, Math.PI, Math.PI]} /></mesh>
          {/* 会弯曲的书页 */}
          {sheets.map((s) => (
            <group key={s.k}>
              <mesh geometry={s.g} material={m.frontMat} frustumCulled={false} />
              <mesh geometry={s.g} material={m.backPageMat} frustumCulled={false} />
            </group>
          ))}
          {/* 书签丝带 + 金色月牙坠 */}
          <mesh position={[0.5, -1.3, -0.02]} material={m.ribbon}><planeGeometry args={[0.07, 0.62]} /></mesh>
          <mesh position={[0.5, -1.64, -0.02]} material={gold}><torusGeometry args={[0.05, 0.012, 8, 20]} /></mesh>

          {/* 封面（绕书脊旋转） */}
          <group ref={hinge} position={[0, 0, 0.17]}>
            <mesh geometry={m.coverGeo} material={m.coverMat} position={[0.75, 0, 0]} />
            <mesh geometry={m.innerGeo} material={m.innerMat} position={[0.75, 0, -0.034]} rotation={[0, Math.PI, 0]} />
            {[[0.015, -1.035, 0], [0.015, 1.035, -Math.PI / 2], [1.485, 1.035, Math.PI], [1.485, -1.035, Math.PI / 2]].map(([x, y, r], i) => (
              <mesh key={i} geometry={m.cornerGeo} material={gold} position={[x, y, 0.034]} rotation={[0, 0, r]} />
            ))}
            <mesh material={gold} position={[1.47, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 0.03, 28]} /></mesh>
            <mesh material={gold} position={[1.4, 0, 0.042]}><boxGeometry args={[0.16, 0.09, 0.014]} /></mesh>
            <mesh material={gold} position={[1.47, 0, 0.068]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.06, 0.008, 8, 24]} /></mesh>
          </group>
        </group>
      </group>
    </group>
  )
}
