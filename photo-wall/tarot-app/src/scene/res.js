// 共用资源（只创建一次）：牌的几何体、牌背材质、光点贴图、桌布贴图
import * as THREE from 'three'
import * as A from '../art.js'

let r
export const res = () =>
  r || (r = (() => {
    const back = A.tex(A.backCv())
    return {
      cardGeo: A.roundedGeo(1, 1.75, 0.06),
      backMat: new THREE.MeshStandardMaterial({ map: back, metalnessMap: A.metalOf(back), metalness: 1, roughness: 0.5, envMapIntensity: 0.9 }),
      glow: A.tex(A.dotCv('glow')),
      dot: A.tex(A.dotCv('dot')),
      flame: A.tex(A.dotCv('flame')),
      beam: A.tex(A.dotCv('beam')),
      table: A.tex(A.tableCv()),
    }
  })())
