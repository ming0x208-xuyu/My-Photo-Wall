import * as THREE from 'three'
import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'
import Book from './Book.jsx'
import Cards from './Cards.jsx'
import { Table, Disc, Candles, Orbits, Dust } from './Decor.jsx'
import { S, heroCam, askCam } from './state.js'

export default function Scene({ arrive, onStart, onPick }) {
  const { gl, scene, camera, size } = useThree()

  // 尺寸 → 视野里的世界尺寸（牌阵布局、镜头距离都靠它）
  const a = size.width / size.height, h0 = 2 * Math.tan(THREE.MathUtils.degToRad(20))
  const D = Math.max(11, 5.6 / a / h0)
  S.dims = { a, D, h: h0 * D, w: h0 * D * a }

  // 程序化环境光：让金色烫金能反射出高光（不需要下载任何 HDR 图片）
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl), env = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env; scene.background = new THREE.Color('#050409')
    return () => { scene.environment = null; env.dispose(); pm.dispose() }
  }, [gl, scene])

  // 初始镜头；从首页传送门进来时，镜头从书面前快速拉远
  useEffect(() => {
    if (S.phase === 'idle') Object.assign(S.cam, heroCam(a))
    else if (S.phase === 'ask') Object.assign(S.cam, askCam(a))
    if (arrive) { S.zoom = 0.45; gsap.to(S, { zoom: 1, duration: 2.8, ease: 'power3.out' }) }
    // eslint-disable-next-line
  }, [])
  // 窗口尺寸变化时，待机/开书阶段重新摆镜头
  useEffect(() => {
    if (S.phase === 'idle') Object.assign(S.cam, heroCam(a))
    if (S.phase === 'ask') Object.assign(S.cam, askCam(a))
    if (S.phase === 'pick') Object.assign(S.cam, { pz: D })
  }, [a, D])

  useFrame(({ pointer }) => {
    const c = S.cam, z = S.zoom
    camera.position.set(c.tx + (c.px - c.tx) * z + pointer.x * 0.2, c.ty + (c.py - c.ty) * z + pointer.y * 0.12, c.tz + (c.pz - c.tz) * z)
    camera.lookAt(c.tx, c.ty, c.tz)
  })

  return (
    <>
      <ambientLight intensity={0.35} color="#b8b4d8" />
      <directionalLight position={[3, 6, 4]} intensity={1.7} color="#ffe9c4" />
      <directionalLight position={[-5, 3, -3]} intensity={0.9} color="#7a86ff" />
      <Dust />
      <Table />
      <Disc />
      <Candles />
      <Orbits />
      <Book onClick={onStart} />
      <Cards onPick={onPick} />
    </>
  )
}
