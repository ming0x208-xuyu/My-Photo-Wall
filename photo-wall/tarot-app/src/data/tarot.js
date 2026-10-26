// 78 张牌的名称与牌义
export const MJ = '愚者 魔术师 女祭司 皇后 皇帝 教皇 恋人 战车 力量 隐者 命运之轮 正义 倒吊人 死神 节制 恶魔 高塔 星星 月亮 太阳 审判 世界'.split(' ')
export const MJE = 'The Fool|The Magician|The High Priestess|The Empress|The Emperor|The Hierophant|The Lovers|The Chariot|Strength|The Hermit|Wheel of Fortune|Justice|The Hanged Man|Death|Temperance|The Devil|The Tower|The Star|The Moon|The Sun|Judgement|The World'.split('|')
const MK = '新的旅程，勇敢起步|资源齐备，把想法变成现实|直觉与秘密，向内倾听|丰盛与滋养，孕育成长|秩序与权威，建立结构|传统与指引，寻求共识|选择与连结，忠于内心|意志与前进，掌控方向|温柔的勇气，驯服内在|独处与寻光，沉淀智慧|转机降临，顺势而变|公平与因果，权衡后决断|换个角度，暂停与放下|结束与重生，告别旧章|调和与耐心，找到平衡|执念与诱惑，看清束缚|突变与觉醒，旧结构崩塌|希望与疗愈，静静闪光|不安与幻象，穿过迷雾|喜悦与明朗，充满活力|召唤与复盘，做出回应|圆满与完成，抵达新的起点'.split('|')
export const SU = ['权杖', '圣杯', '宝剑', '星币']
export const SUE = ['Wands', 'Cups', 'Swords', 'Pentacles']
const SK = ['行动与热情', '情感与关系', '思考与沟通', '物质与现实']
export const SM = ['wand', 'cup', 'sword', 'coin']
const RK = '王牌 二 三 四 五 六 七 八 九 十 侍从 骑士 王后 国王'.split(' ')
const RKE = 'Ace|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Page|Knight|Queen|King'.split('|')
const RW = '全新的开端|抉择与平衡|成形与合作|稳固与停顿|摩擦与挑战|顺畅与分享|考验与坚持|加速与专注|接近完成|圆满或重负|好奇与消息|追逐与行动|成熟与包容|掌控与责任'.split('|')
// 大阿卡纳每张牌的主图案
export const MOT = 'star infinity moon rings scale key rings wheel infinity lamp wheel scale tri eye cup tri tower star moon sun eye coin'.split(' ')

export const info = (id) => {
  if (id < 22) return { n: MJ[id], k: MK[id] }
  const s = ((id - 22) / 14) | 0, r = (id - 22) % 14
  return { s, r, n: SU[s] + RK[r], k: SK[s] + '：' + RW[r] }
}
export const enName = (id) => (id < 22 ? MJE[id] : RKE[(id - 22) % 14] + ' of ' + SUE[((id - 22) / 14) | 0])
export const rom = (n) => {
  let o = ''
  ;[[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].forEach(([v, s]) => { while (n >= v) { o += s; n -= v } })
  return o || '0'
}
