import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import Scene from './scene/Scene.jsx'
import { S } from './scene/state.js'
import { info } from './data/tarot.js'
import { pickRandom } from './data/questions.js'

const get = (k) => { try { return sessionStorage.getItem(k) } catch { return null } }
const put = (k, v) => { try { sessionStorage.setItem(k, v) } catch { /* 隐私模式下忽略 */ } }
const del = (k) => { try { sessionStorage.removeItem(k) } catch { /* 忽略 */ } }
const LABEL = ['过去', '现在', '未来']

export default function App() {
  // 从首页传送门进来 / 点了“换个问题再抽”
  const arrive = useMemo(() => { const v = get('pwTarot') === '1'; if (v) del('pwTarot'); return v }, [])
  const again = useMemo(() => { const v = get('ttAgain') === '1'; if (v) del('ttAgain'); return v }, [])
  const [phase, setPhase] = useState(() => { S.phase = again ? 'ask' : 'idle'; return S.phase })
  const [six, setSix] = useState(() => pickRandom(6))
  const [q, setQ] = useState(null)
  const [count, setCount] = useState(0)
  const [cards, setCards] = useState([])
  const [read, setRead] = useState(false)
  const [ready, setReady] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const go = (p) => { S.phase = p; setPhase(p) }
  const start = () => { if (S.phase !== 'idle') return; go('open'); S.api.open(() => go('ask')) }
  const confirm = () => { if (!q || S.phase !== 'ask') return; go('deal'); S.api.deal(() => go('pick')) }
  const onPick = (n) => {
    setCount(n)
    if (n === 3) { setCards([...S.picks]); setTimeout(() => { go('reveal'); S.api.reveal(() => setRead(true)) }, 1000) }
  }
  const leave = (e) => {
    e.preventDefault(); put('pwBack', '1'); setLeaving(true)
    setTimeout(() => { location.href = import.meta.env.DEV ? '/' : '../' }, 600)
  }
  const retry = () => { put('ttAgain', '1'); location.reload() }

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) gsap.globalTimeline.timeScale(2.5)
    if (!again) return
    const t = setInterval(() => { if (S.api.openNow) { S.api.openNow(); clearInterval(t) } }, 50)   // 等 3D 场景就绪后，直接把书摆成打开状态
    return () => clearInterval(t)
  }, [again])

  const hint = phase === 'idle' ? '轻触魔法书' : phase === 'pick' ? `左右拖动牌阵，轻触一张牌（${count}/3）` : ''

  return (
    <>
      <div className="cv">
        <Canvas camera={{ fov: 40, near: 0.1, far: 100, position: [0, 5, 6.5] }} dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={() => setTimeout(() => setReady(true), 400)}>
          <Scene arrive={arrive} onStart={start} onPick={onPick} />
        </Canvas>
      </div>

      <a className="back" href="../" onClick={leave}>‹ 照片墙</a>
      <p className={'qline' + (q && phase !== 'ask' && phase !== 'idle' && phase !== 'open' ? ' on' : '')}>{q}</p>
      <p className={'hint' + (hint ? '' : ' off')}>{hint}</p>

      <section className={'sheet' + (phase === 'ask' ? ' show' : '')}>
        <h2><i>TAROT</i>你想问什么？</h2>
        <ul>
          {six.map((t) => (
            <li key={t}><button type="button" className={'q' + (q === t ? ' on' : '')} onClick={() => setQ(t)}>{t}</button></li>
          ))}
        </ul>
        <div className="row">
          <button type="button" className="ghost" onClick={() => { setSix(pickRandom(6, six)); setQ(null) }}>换一批</button>
          <button type="button" className="go" disabled={!q} onClick={confirm}>带着这个问题抽牌</button>
        </div>
      </section>

      <section className={'sheet read' + (read ? ' show' : '')}>
        <div className="cols">
          {cards.map((d, k) => { const i = info(d.id); return (
            <article key={d.id}><h3>{LABEL[k]}<b>{i.n}{d.rev ? '（逆位）' : ''}</b></h3><p>{i.k}{d.rev ? '。能量受阻、延迟，或转向内在。' : '。'}</p></article>
          ) })}
        </div>
        <div className="row"><button type="button" className="go" onClick={retry}>换个问题再抽</button><a className="ghost" href="../" onClick={leave}>回到照片墙</a></div>
        <small>占卜仅供娱乐，别太当真。</small>
      </section>

      <div className={'flash' + (arrive && !ready ? ' on' : '')} />
      <div className={'cover' + (ready ? ' gone' : '')}>星象校准中…</div>
      <div className={'fade' + (leaving ? ' on' : '')} />
    </>
  )
}
