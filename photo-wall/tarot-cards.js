/* ============================================================
   塔罗牌 78 张：名称、牌义、线条插画
   每张牌的 SVG 在需要显示时才即时生成（不预先占用内存），
   大阿尔卡那 22 张各有独立的插画，小阿尔卡那 56 张按「花色 × 数字」组合出各自的构图。
   ============================================================ */
(function () {
  const f = n => +n.toFixed(1), R = Math.PI / 180;
  const pt = (x, y, r, a) => [f(x + r * Math.cos(a * R)), f(y + r * Math.sin(a * R))];
  /* ---------- 线条图元 ---------- */
  const circ = (x, y, r, e = "") => `<circle cx="${x}" cy="${y}" r="${r}" ${e}/>`;
  const path = (d, e = "") => `<path d="${d}" ${e}/>`;
  const line = (a, b, c, d, e = "") => path(`M${a} ${b}L${c} ${d}`, e);
  const pts = (arr, close) => path("M" + arr.map(p => p.join(" ")).join("L") + (close ? "Z" : ""));
  const star = (x, y, r, n = 5, k = .42, rot = -90) => pts(Array.from({ length: n * 2 }, (_, i) => pt(x, y, i % 2 ? r * k : r, rot + i * 180 / n)), 1);
  const poly = (x, y, r, n, rot = -90) => pts(Array.from({ length: n }, (_, i) => pt(x, y, r, rot + i * 360 / n)), 1);
  const rays = (x, y, r1, r2, n, rot = 0) => Array.from({ length: n }, (_, i) => { const a = rot + i * 360 / n, p = pt(x, y, r1, a), q = pt(x, y, r2, a); return line(p[0], p[1], q[0], q[1]); }).join("");
  const moon = (x, y, r, rot = 0) => path(`M${x} ${y - r}A${r} ${r} 0 1 0 ${x} ${y + r}A${f(r * .62)} ${r} 0 1 1 ${x} ${y - r}Z`, `transform="rotate(${rot} ${x} ${y})"`);
  const inf = (x, y, w = 22) => path(`M${x} ${y}c${-w * .45} ${-w * .6} ${-w} ${-w * .6} ${-w} 0s${w * .55} ${w * .6} ${w} 0 ${w * .55} ${-w * .6} ${w} 0-${w * .55} ${w * .6}-${w} 0`);
  const dots = (arr, r = 1.2) => arr.map(p => circ(p[0], p[1], r, 'fill="currentColor" stroke="none"')).join("");
  const cup = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${path("M-16-22h32c0 18-8 28-16 28S-16-4-16-22zM0 6v18M-12 26h24")}${path("M-11-12q5.5 4 11 0t11 0")}</g>`;
  const crown = (x, y, w, n) => path(`M${x - w} ${y}L${x - w + 2} ${y - 18}` + Array.from({ length: n }, (_, i) => `L${f(x - w + (i + .5) * 2 * w / n)} ${y - 6}L${f(x - w + (i + 1) * 2 * w / n)} ${y - 18}`).join("") + `L${x + w} ${y}Z`);
  /* ---------- 花色徽记 ---------- */
  const EMB = {
    wands: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${path("M0-34V40")}${path("M0-34c-7-9-5-16 0-24 5 8 7 15 0 24z")}${[-18, -4, 10, 24].map((v, i) => path(`M0 ${v}q${i % 2 ? 10 : -10}-6 ${i % 2 ? 14 : -14}-14`)).join("")}${path("M-6 40h12")}</g>`,
    cups: (x, y, s) => cup(x, y, s),
    swords: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${path("M0-44L5-32V14H-5V-32Z")}${path("M-15 14h30M0 14v16M-5 30h10")}${line(0, -38, 0, 8)}</g>`,
    pent: (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${circ(0, 0, 22)}${circ(0, 0, 17, 'stroke-dasharray="2 3"')}${star(0, 0, 15, 5, .38)}</g>`
  };
  const SUIT = [
    ["wands", "权杖", "Wands", "行动与事业", "#ffb25b", "放手去做", "把火种护好"],
    ["cups", "圣杯", "Cups", "情感与关系", "#6fd8ea", "坦诚地表达心意", "先安抚自己的情绪"],
    ["swords", "宝剑", "Swords", "思考与沟通", "#c3b2ff", "清晰地说出想法", "给思绪留一点空白"],
    ["pent", "星币", "Pentacles", "财务与现实", "#9ee6a6", "一步一步踏实积累", "重新审视资源的分配"]
  ];
  const NUM = [ // 数字牌/宫廷牌：中文名、英文名、正位含义、逆位含义、建议、逆位建议、关键词
    ["王牌", "Ace", "新的开端与潜能正在萌芽", "开端受阻，或错失了时机", "抓住这次机会，迈出第一步。", "别灰心，机会会再来。", ["开端", "潜能"]],
    ["二", "Two", "需要在两者之间取得平衡与选择", "摇摆不定，内心失衡", "听从内心，做出选择。", "别让犹豫消耗你。", ["平衡", "选择"]],
    ["三", "Three", "成长、协作与初步的成果", "协作不顺，进展缓慢", "与人同行，成果会更大。", "沟通一下，误会就会散开。", ["成长", "协作"]],
    ["四", "Four", "稳定、休整与坚实的根基", "停滞不前，固守原地", "先稳住根基，再谈远行。", "试着走出舒适圈。", ["稳定", "休整"]],
    ["五", "Five", "冲突、挑战与暂时的失落", "冲突缓和，正从挫折中恢复", "把冲突当作成长的磨刀石。", "放下执念，伤口正在愈合。", ["冲突", "挑战"]],
    ["六", "Six", "和谐、给予与顺利的过渡", "付出失衡，或沉溺于过去", "分享你拥有的，好运会回流。", "向前看，别困在旧事里。", ["和谐", "给予"]],
    ["七", "Seven", "评估、坚持与一次考验", "犹豫不决，缺乏方向", "守住立场，别被动摇。", "先想清楚目标再出发。", ["考验", "坚持"]],
    ["八", "Eight", "行动、精进与全神贯注", "急躁冒进，效率低下", "专注当下，持续精进。", "放慢一点，质量比速度更重要。", ["行动", "精进"]],
    ["九", "Nine", "接近圆满，坚韧而自足", "疲惫，或过度的忧虑", "再坚持一下，快到了。", "该休息了，别把自己逼太紧。", ["坚韧", "自足"]],
    ["十", "Ten", "圆满的收获，也是一份沉甸甸的责任", "负担过重，难以完成", "享受成果，也别忘了分担。", "学会放下一部分重担。", ["圆满", "责任"]],
    ["侍从", "Page", "带来好奇的消息，保持学习的心", "不够成熟，消息迟到", "保持好奇，去尝试新事物。", "耐心等待，别急着下结论。", ["消息", "学习"]],
    ["骑士", "Knight", "怀着热忱的追求与行动力", "冲动行事，或停滞不前", "朝目标前进，但别忘了看路。", "先停一停，整理方向。", ["追求", "行动"]],
    ["王后", "Queen", "成熟的滋养，对内心的深度掌控", "情绪化，内在失衡", "以柔和的力量照顾自己和他人。", "先回到内心，找回平静。", ["滋养", "内在"]],
    ["国王", "King", "成熟的掌控、权威与担当", "滥用权力，或过于固执", "以稳重与远见带领局面。", "放下控制，学会倾听。", ["掌控", "担当"]]
  ];
  const ROM = "0 I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX XXI".split(" "), RN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "PAGE", "KNIGHT", "QUEEN", "KING"];
  /* ---------- 大阿尔卡那：名称 + 牌义 ---------- */
  /*NAMES*/
  const MAJOR = [
    ["愚者", "The Fool", ["开始", "自由", "信任"], "新的旅程即将开始，带着纯粹的信任向前一步，你比想象中更勇敢。", "鲁莽或犹豫不决。先看清脚下的路，再出发。"],
    ["魔术师", "The Magician", ["创造", "行动", "资源"], "你已拥有所需的一切，现在正是施展才华、把想法变成现实的时刻。", "分心、虚张声势，才华被浪费。收回注意力，专注一件事。"],
    ["女祭司", "The High Priestess", ["直觉", "静默", "秘密"], "答案藏在安静之处。相信内在的声音，不必急着说出口。", "忽视直觉，或秘密被压抑。别被表面的喧嚣迷惑。"],
    ["皇后", "The Empress", ["丰盛", "滋养", "创造"], "丰盛与爱在生长。让美好自然发生，也好好享受生活。", "过度付出或停滞不前，记得也照顾自己。"],
    ["皇帝", "The Emperor", ["秩序", "权威", "稳固"], "建立规则与边界，承担起责任，稳固的结构会带来安全感。", "固执或控制欲过强。刚柔并济才是真正的力量。"],
    ["教皇", "The Hierophant", ["传统", "学习", "指引"], "向值得信赖的智慧求教，遵循经过时间检验的方法。", "想打破常规、质疑教条。走出属于你自己的信念之路。"],
    ["恋人", "The Lovers", ["爱", "契合", "抉择"], "深刻的连结，或一个重要的选择。忠于内心真正的价值。", "失衡、犹豫，价值观冲突。诚实面对真正想要的。"],
    ["战车", "The Chariot", ["意志", "胜利", "前进"], "驾驭对立的力量，凭意志冲向目标，胜利属于专注的人。", "失控或方向不明。先稳住自己，再握紧缰绳。"],
    ["力量", "Strength", ["勇气", "柔韧", "自控"], "真正的力量是温柔的坚定。以耐心与爱化解内在的猛兽。", "自我怀疑、情绪失控。重新找回内在的信心。"],
    ["隐者", "The Hermit", ["内省", "独处", "指引"], "退一步，点亮自己的灯。答案在向内的探寻里。", "孤立或逃避。走出去，让光照进更多人。"],
    ["命运之轮", "Wheel of Fortune", ["转机", "循环", "好运"], "命运的轮子正在转动，顺势而为，好的转机已在路上。", "暂时的低谷，或抗拒变化。风水轮流，这只是过程。"],
    ["正义", "Justice", ["公正", "真相", "因果"], "诚实与平衡带来清晰的结果，你种下的因正在结果。", "偏见或逃避责任。直面后果，才能重回平衡。"],
    ["倒吊人", "The Hanged Man", ["换位", "放下", "等待"], "暂停，是为了换个角度看见新的风景。放下执着，答案会浮现。", "拖延、无谓的牺牲。该放手的，就别再勉强。"],
    ["死神", "Death", ["结束", "重生", "转变"], "一个阶段落幕，新的才有空间。告别旧的，是重生的开始。", "抗拒改变，停滞不前。不肯放下，会让黑夜变长。"],
    ["节制", "Temperance", ["平衡", "调和", "耐心"], "慢慢来，把对立的部分融成和谐，耐心是最好的配方。", "失衡或过度。找回生活的节奏与分寸。"],
    ["恶魔", "The Devil", ["欲望", "束缚", "执念"], "看清那条锁链，它其实没有真的锁死你。", "挣脱与觉醒。你正在夺回属于自己的自由。"],
    ["高塔", "The Tower", ["突变", "崩塌", "觉醒"], "旧结构的瓦解，是为真相让路。震动之后，是更牢固的重建。", "逃过一劫，或拖延崩塌。别再回避必须面对的变化。"],
    ["星星", "The Star", ["希望", "疗愈", "灵感"], "保持信念，星光会为你指路。疗愈与灵感正向你流来。", "失望、缺乏信心。休息一下，希望仍在远处闪亮。"],
    ["月亮", "The Moon", ["不安", "幻象", "潜意识"], "迷雾之中看不清全貌。信任直觉，一步一步慢慢前行。", "迷雾散去，真相浮现。恐惧没有想象中那么大。"],
    ["太阳", "The Sun", ["快乐", "成功", "活力"], "光明坦荡，一切都在向好。值得好好庆祝与享受。", "暂时的阴云或过度乐观。快乐仍在，只是被遮住了。"],
    ["审判", "Judgement", ["觉醒", "召唤", "重生"], "回应内心的呼唤，对过去做个了结，迎接新的自己。", "自我批判或迟疑。原谅过去，才能听见新的召唤。"],
    ["世界", "The World", ["圆满", "完成", "整合"], "一个循环完美收束，你已走完一程，新的旅途将启。", "差一步完成，悬而未决。耐心收尾，圆满就在眼前。"]
  ];
  /*END*/
  /* ---------- 78 张牌的数据 ---------- */
  const CARDS = [];
  MAJOR.forEach((m, i) => CARDS.push({ id: i, major: 1, n: i, zh: m[0], en: m[1], kw: m[2], up: m[3], rv: m[4], sub: ROM[i], color: "#ecd29a", glow: "#8f6cff" }));
  SUIT.forEach((s, si) => NUM.forEach((n, k) => CARDS.push({
    id: 22 + si * 14 + k, major: 0, suit: s[0], n: k + 1, zh: s[1] + n[0], en: n[1] + (k < 10 ? "" : "") + " of " + s[2], kw: [s[3].slice(0, 2), n[6][0]],
    up: `在${s[3]}上，${n[2]}。${n[4]}`, rv: `在${s[3]}上，${n[3]}。${n[5]}`, sub: s[2].toUpperCase() + " · " + RN[k + 1], color: s[4], glow: s[4]
  })));  /* ============================================================
     黑金视觉系统：近黑底 + 烫金细线 + 月相 + 星座连线
     四种边框轮流使用（云纹 / 装饰艺术 / 拱门 / 星角），每张牌的月相、
     轨道、星座都由牌号生成，所以没有两张牌是一样的。
     ============================================================ */
  const ACC = { wands: "#ff9a5c", cups: "#69d6ea", swords: "#b9a8ff", pent: "#8fe3a0" };
  const VAR = { wands: 1, cups: 2, swords: 0, pent: 3 };            // 小牌：每个花色一种边框
  const CY = 140;                                                   // 圆窗圆心 (100,140)
  const spark = (x, y, r, e = 'class="g"') => path(`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`, e);
  const ell = (x, y, rx, ry, e = "") => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${e}/>`;
  const leaf = (x, y, a, s = 1, e = "") => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})">${path("M0 0C6-5 14-5 18 0 14 5 6 5 0 0Z", e)}</g>`;
  const pend = (x, y, r = 3) => circ(x, y, r, 'class="f"');
  function seeded(id) { let a = id * 2654435761 >>> 0; return () => (a = a * 1664525 + 1013904223 >>> 0) / 4294967296; }

  /* ---------- 月相：k = 0 新月 … 4 满月 … 7 残月 ---------- */
  function moonPhase(x, y, r, k) {
    const th = k * Math.PI / 4, rx = f(r * Math.abs(Math.cos(th)));
    if (k === 0) return circ(x, y, r, 'class="t"');
    if (k === 4) return circ(x, y, r, 'class="f"') + circ(x, y, r + 1.6, 'class="t"');
    const waning = k > 4, kk = waning ? 8 - k : k, sw = kk < 2 ? 0 : 1;
    const d = `M${x} ${y - r}A${r} ${r} 0 0 1 ${x} ${y + r}` + (kk === 2 ? `L${x} ${y - r}Z` : `A${rx} ${r} 0 0 ${sw} ${x} ${y - r}Z`);
    return `<g ${waning ? `transform="translate(${2 * x} 0) scale(-1 1)"` : ""}>${path(d, 'class="f"')}</g>` + circ(x, y, r + 1.6, 'class="t"');
  }
  const moonRow = (id, y) => [-2, -1, 0, 1, 2].map(o => moonPhase(100 + o * 21, y, [3.6, 5, 6.6, 5, 3.6][o + 2], ((id + o) % 8 + 8) % 8)).join("");

  /* ---------- 圆窗：同心环 + 刻度 + 倾斜轨道 + 星座 ---------- */
  function halo(c, rnd) {
    const n = 30 + (c.id % 5) * 6, tilt = -50 + (c.id * 37) % 100;
    let s = circ(100, CY, 70, 'class="l"') + circ(100, CY, 65.5, 'class="t" stroke-dasharray="1 3.4"');
    s += Array.from({ length: n }, (_, i) => { const a = i * 360 / n, p = pt(100, CY, 70, a), q = pt(100, CY, i % 5 ? 73 : 76, a); return line(p[0], p[1], q[0], q[1], 'class="t"'); }).join("");
    s += ell(100, CY, 88, 24, `class="t" transform="rotate(${tilt} 100 ${CY})"`);
    const a = rnd() * 6.28, ox = 88 * Math.cos(a), oy = 24 * Math.sin(a), cs = Math.cos(tilt * R), sn = Math.sin(tilt * R);
    s += spark(f(100 + ox * cs - oy * sn), f(CY + ox * sn + oy * cs), 4.2);
    return s;
  }
  function sky(c, rnd) {                                  // 四个角落各一组星座连线（由牌号生成）
    const zones = [[14, 46, 52, 100], [154, 186, 52, 100], [14, 44, 186, 236], [156, 186, 186, 236]];
    return zones.map(z => {
      const k = 3 + Math.floor(rnd() * 3), P = Array.from({ length: k }, () => [f(z[0] + rnd() * (z[1] - z[0])), f(z[2] + rnd() * (z[3] - z[2]))]);
      return pts(P).replace("<path", '<path class="t"') + P.map((p, i) => spark(p[0], p[1], i % 2 ? 1.8 : 2.8)).join("");
    }).join("");
  }

  /* ---------- 四种边框 ---------- */
  const scal = (x, y, n, r, dx, dy, sw) => path(`M${x} ${y}` + `a${r} ${r} 0 0 ${sw} ${dx * 2 * r} ${dy * 2 * r}`.repeat(n), 'class="t"');
  function frame(v, acc) {
    const base = {
      0: // 云纹：四角层层云朵
        path("M14 8H86Q100 18 114 8H186Q192 8 192 14V326Q192 332 186 332H114Q100 322 86 332H14Q8 332 8 326V14Q8 8 14 8Z", 'class="l"') +
        [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => { const x = sx > 0 ? 14 : 186, y = sy > 0 ? 17 : 323; return scal(x, y, 5, 5.2, sx, 0, sy > 0 ? (sx > 0 ? 0 : 1) : (sx > 0 ? 1 : 0)) + scal(x + sx * 4, y + sy * 8, 4, 4.4, sx, 0, sy > 0 ? (sx > 0 ? 0 : 1) : (sx > 0 ? 1 : 0)); }).join(""),
      1: // 装饰艺术：折线角 + 菱形
        path("M8 8H192V332H8Z", 'class="l"') + path("M13 13H187V327H13Z", 'class="t"') +
        [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => { const x = sx > 0 ? 8 : 192, y = sy > 0 ? 8 : 332; return path(`M${x} ${y + sy * 36}L${x + sx * 36} ${y}M${x} ${y + sy * 26}L${x + sx * 26} ${y}M${x + sx * 4} ${y + sy * 44}L${x + sx * 44} ${y + sy * 4}`, 'class="l"') + path(`M${x + sx * 12} ${y + sy * 12}l${3} ${-3}l${3} ${3}l${-3} ${3}z`, 'class="g"'); }).join(""),
      2: // 拱门：顶部圆拱
        path("M8 332V70Q8 8 100 8Q192 8 192 70V332Z", 'class="l"') + path("M13 332V72Q13 14 100 14Q187 14 187 72V332Z", 'class="t"') +
        spark(100, 20, 4.5) + spark(18, 322, 3) + spark(182, 322, 3),
      3: // 星角：直线边框，上下中央缺口，四角星芒
        path("M14 8H84L100 20L116 8H186Q192 8 192 14V326Q192 332 186 332H116L100 320L84 332H14Q8 332 8 326V14Q8 8 14 8Z", 'class="l"') +
        path("M16 14H82L100 27L118 14H184V326H118L100 313L82 326H16Z", 'class="t"') +
        [[16, 16], [184, 16], [16, 324], [184, 324]].map(p => spark(p[0], p[1], 5.5)).join(""),
    }[v];
    return base + `<rect x="8" y="8" width="184" height="324" rx="12" fill="none" stroke="${acc}" stroke-opacity=".0"/>`;
  }
  const cap = (c) => c.major ? ROM[c.n] : (c.n === 1 ? "A" : c.n <= 10 ? String(c.n) : ["P", "KN", "Q", "K"][c.n - 11]);

  /* ---------- 22 张大阿尔卡那：各自独立的徽记（中心 0,0，约 ±52） ---------- */
  const E = [
    /* 0 愚者：旭日、飞鸟、悬崖与脚印 */ () =>
      circ(20, -26, 14, 'class="f"') + rays(20, -26, 19, 28, 16) + path("M-50 40V16Q-26 8 0 14L16 22Q8 32 0 40Z", 'class="d"') +
      [[-8, 4], [4, -4], [16, -6], [28, 0], [37, 12], [41, 26]].map((p, i) => circ(p[0], p[1], 2.2 - i * .18, 'class="g"')).join("") +
      path("M-34 -42q7-9 14 0q7-9 14 0M26 -48q5-6 10 0q5-6 10 0") + circ(-34, 4, 4.5, 'class="d"') + path("M-34 4c-3-3-1-6 2-5M-38 8c-4 0-5-4-2-6") + path("M-50 40H16", 'class="t"'),
    /* 1 魔术师：无限符号、法杖、四元素桌 */ () =>
      inf(0, -40, 22) + line(0, -28, 0, 28) + spark(0, -28, 6) + spark(0, 28, 4) + circ(0, -2, 5, 'class="d"') +
      path("M-46 30H46M-38 30V46M38 30V46") + cup(-30, 22, .4) + circ(-10, 20, 6) + star(-10, 20, 4.4, 5, .42) + path("M10 12V28M6 16h8M10 12l-2-4M10 12l2-4") + path("M30 26L36 10", 'stroke-width="1.6"') + leaf(30, 8, -60, .8) +
      path("M-46 -10q10-14 20 0M26 -10q10-14 20 0", 'class="t"') + dots([[-46, -10], [-36, -24], [36, -24], [46, -10]], 1.6),
    /* 2 女祭司：双柱、新月、石榴帷幕 */ () =>
      path("M-42-46h14v90h-14zM28-46h14v90H28z") + path("M-44-46h18M26-46h18M-44 44h18M26 44h18") +
      path("M-28-36Q0-22 28-36M-28-20Q0-6 28-20", 'class="t"') + [[-14, -20], [0, -14], [14, -20], [-7, -6], [7, -6]].map(p => circ(p[0], p[1], 3.2, 'class="d"')).join("") +
      moon(0, 24, 18, 90) + circ(0, 8, 3, 'class="f"') + path("M-12 30h24M-9 36h18", 'class="t"'),
    /* 3 皇后：金星符号、十二星冠、麦穗 */ () =>
      circ(0, -8, 20, 'class="d"') + circ(0, -8, 14, 'class="t"') + line(0, 12, 0, 46) + line(-14, 30, 14, 30) +
      Array.from({ length: 12 }, (_, i) => { const p = pt(0, -8, 34, -165 + i * 13.6); return spark(p[0], p[1], 2.4); }).join("") +
      [-1, 1].map(s => path(`M${s * 36} 46Q${s * 38} 24 ${s * 30} 10`) + [14, 24, 34].map(y => leaf(s * (36 - (y - 10) * .08), y, s > 0 ? -150 : -30, .55)).join("")).join("") + spark(0, -8, 5),
    /* 4 皇帝：公羊双角、王座、权球 */ () =>
      path("M-12-12Q-40-12-40-30Q-40-46-26-44Q-34-34-26-28M12-12Q40-12 40-30Q40-46 26-44Q34-34 26-28") + path("M-14-14Q0-22 14-14L10 22Q0 34-10 22Z", 'class="d"') +
      path("M-7-4L-3-6M7-4L3-6M-4 12H4M0 4V12", 'class="t"') + circ(0, -38, 6, 'class="d"') + line(0, -44, 0, -52) + line(-4, -49, 4, -49) +
      path("M-44 46L-26 20L-8 46L8 46L26 20L44 46", 'class="l"') + path("M-44 46H44", 'class="t"') + spark(0, 42, 3),
    /* 5 教皇：三重十字、交叉钥匙、拱门 */ () =>
      path("M-34 46V-8Q-34-40 0-44Q34-40 34-8V46") + line(0, -34, 0, 30) + line(-9, -22, 9, -22) + line(-13, -10, 13, -10) + line(-17, 2, 17, 2) +
      path("M-30 34L22 -4M30 34L-22 -4", 'class="t"') + circ(-24, 40, 5, 'class="d"') + circ(24, 40, 5, 'class="d"') + path("M-26 24L-8 38M26 24L8 38") + spark(0, -44, 4),
    /* 6 恋人：日与月相对、天使之星、苹果树 */ () =>
      star(0, -34, 11, 8, .5) + path("M-18-24Q-8-14 0-16Q8-14 18-24", 'class="t"') +
      circ(-22, 10, 14, 'class="f"') + rays(-22, 10, 18, 25, 12) + moon(24, 10, 15, 0) + path("M-6 12Q0 22 6 12", 'class="t"') +
      path("M-30 46Q0 28 30 46") + path("M0 22V46M0 32q-8-6-10-14M0 36q8-6 10-14", 'class="t"') + pend(0, 22, 2.6),
    /* 7 战车：星幕、双月、翼日轮 */ () =>
      path("M-40-20Q0-56 40-20") + Array.from({ length: 7 }, (_, i) => { const p = pt(0, 6, 44, -160 + i * 23.3); return spark(p[0], p[1] - 10, 2.6); }).join("") +
      moon(-34, -4, 10, 20) + moon(34, -4, 10, 160) + circ(0, 22, 20, 'class="d"') + circ(0, 22, 4) + rays(0, 22, 4, 20, 8) + path("M-20 22L-44 14M20 22L44 14M-18 30L-40 30M18 30L40 30", 'class="t"') + path("M-26 44H26", 'class="t"'),
    /* 8 力量：无限、狮鬃、温柔的手 */ () =>
      inf(0, -42, 16) + circ(0, 6, 22, 'class="d"') + Array.from({ length: 18 }, (_, i) => { const a = i * 20, p = pt(0, 6, 24, a), q = pt(0, 6, i % 2 ? 36 : 42, a); return path(`M${p[0]} ${p[1]}Q${f((p[0] + q[0]) / 2 + 3)} ${f((p[1] + q[1]) / 2)} ${q[0]} ${q[1]}`); }).join("") +
      path("M-10 0h4M6 0h4M0 4l-3 8h6zM-7 16q7 6 14 0", 'class="t"'),
    /* 9 隐者：六芒星提灯、手杖、雪峰 */ () =>
      poly(0, -20, 14, 6, -90) + star(0, -20, 8, 6, .55) + path("M-6-36h12M0-44V-36", 'class="t"') + rays(0, -20, 18, 30, 12, 10) +
      path("M-50 46L-26 6L-12 28L6 -2L26 24L36 12L50 46Z", 'class="d"') + path("M6-2L0 8L10 10", 'class="t"') + line(-30, 40, -14, -34, 'class="l"') + path("M-14-34q-6-2-6 4", 'class="t"'),
    /* 10 命运之轮：十二星座刻度、八辐条、四象 */ () =>
      circ(0, 0, 44) + circ(0, 0, 33, 'class="t"') + circ(0, 0, 9, 'class="d"') + rays(0, 0, 9, 33, 8) + rays(0, 0, 44, 50, 36) +
      Array.from({ length: 8 }, (_, i) => { const p = pt(0, 0, 38.5, i * 45 + 22.5); return circ(p[0], p[1], 2, 'class="g"'); }).join("") +
      [[-38, -40], [38, -40], [-38, 40], [38, 40]].map(p => spark(p[0], p[1], 4)).join("") + path("M-52 6q8-14 0-26M52 6q-8-14 0-26", 'class="t"'),
    /* 11 正义：天平、直剑、双柱 */ () =>
      path("M-46-46H46", 'class="t"') + line(0, -46, 0, 46) + path("M-34-26H34") + circ(0, -26, 3.4, 'class="d"') + path("M-34-26L-42 2H-26ZM34-26L26 2H42Z") + path("M-44 2Q-34 10-24 2M24 2Q34 10 44 2") +
      path("M-8 40h16M0 28V40") + path("M-5 46h10", 'stroke-width="2"') + spark(0, -46, 4.4),
    /* 12 倒吊人：T 形架、倒悬者、光环 */ () =>
      path("M-44-44H44M-36-44V46M36-44V46", 'class="l"') + line(0, -44, 0, -20) + path("M-9-20H9L5 16H-5Z", 'class="d"') + path("M-5 16L-9 34M5 16L9 34M-9-8L-22-2M9-8L22-2", 'class="t"') +
      circ(0, 28, 8, 'class="d"') + circ(0, 28, 14, 'class="t"') + rays(0, 28, 16, 24, 14) + [-28, 28].map(x => leaf(x, -44, x < 0 ? 100 : 80, .5)).join(""),
    /* 13 死神：骷髅、天蛾之翼、晨曦 */ () =>
      path("M-6-4Q-30-34-50-20Q-42-4-22 2Q-36 8-34 20Q-16 22-6 8ZM6-4Q30-34 50-20Q42-4 22 2Q36 8 34 20Q16 22 6 8Z", 'class="d"') + path("M-34-14Q-22-12-14-4M34-14Q22-12 14-4", 'class="t"') +
      circ(0, -10, 14, 'class="d"') + path("M-6-14a3 3 0 1 0 .1 0M6-14a3 3 0 1 0 .1 0", 'class="f"') + path("M-4-3H4M-5 6V2M0 6V2M5 6V2M-8 6H8L6 12H-6Z") + line(0, 12, 0, 30, 'class="t"') +
      path("M-50 46H50", 'class="t"') + circ(0, 46, 12, 'class="f"') + rays(0, 46, 15, 22, 9, 180) + circ(0, 30, 3.5, 'class="d"'),
    /* 14 节制：天使之翼、双杯相倾、鸢尾 */ () =>
      path("M-10-36Q-34-56-50-30Q-40-26-36-14Q-28-18-22-8M10-36Q34-56 50-30Q40-26 36-14Q28-18 22-8", 'class="d"') + spark(0, -30, 5) +
      cup(-26, -4, .8) + cup(26, 16, .8) + path("M-14 2Q4 -10 10 8T26 6", 'class="t"') + path("M-12 8Q-2 26 8 18", 'class="t"') + dots([[-6, 14], [2, 22], [10, 28]], 1.4) + leaf(-30, 46, -70, .8) + leaf(30, 46, -110, .8) + path("M-50 46H50", 'class="t"'),
    /* 15 恶魔：倒五芒星、山羊角、锁链 */ () =>
      circ(0, 4, 32) + star(0, 4, 28, 5, .4, 90) + path("M-12-26Q-30-30-28-48Q-22-40-14-40M12-26Q30-30 28-48Q22-40 14-40") + pend(0, 10, 3) +
      path("M-48-20q4 8 0 14q-4 8 0 14M48-20q-4 8 0 14q4 8 0 14", 'class="t"') + circ(-48, 14, 3.4, 'class="d"') + circ(48, 14, 3.4, 'class="d"') + path("M-14 44L0 34L14 44", 'class="t"'),
    /* 16 高塔：裂塔、闪电、坠冠、火焰 */ () =>
      path("M-14 46L-10-26H10L14 46Z", 'class="d"') + path("M-18-26H18V-36L12-40V-34L6-40V-34L0-40V-34L-6-40V-34L-12-40V-34L-18-36Z", 'class="d"') +
      path("M30-50L2-8H16L-6 30", 'stroke-width="1.8"') + path("M-2-20v6M-2 0v6M4 14v6", 'class="t"') + crown(-34, -8, 9, 3) + path("M-34-8l-6 12M-30-8l2 10", 'class="t"') +
      path("M-6-20Q-4-28 0-24Q4-30 6-20M-4 4Q-2-4 2 0Q6-6 8 4", 'class="t"') + dots([[-44, 24], [-30, 36], [34, 22], [44, 34], [-20, -42]], 1.5),
    /* 17 星星：八芒星、七星、倾水 */ () =>
      star(0, -22, 26, 8, .46) + circ(0, -22, 5, 'class="f"') + Array.from({ length: 7 }, (_, i) => { const p = pt(0, -22, 44, -160 + i * 23.3); return spark(p[0], p[1], 3); }).join("") +
      path("M-30 34Q0 44 30 34", 'class="t"') + path("M-8 24h16l-3 10h-10z", 'class="d"') + path("M-4 34Q-10 40-18 42M4 34Q10 40 18 42", 'class="t"') + path("M-24 46Q0 38 24 46", 'class="t"'),
    /* 18 月亮：满月、窄月面、双塔、蜿蜒小径 */ () =>
      circ(0, -12, 28, 'class="d"') + moon(-3, -12, 18, 0) + rays(0, -12, 34, 44, 20) + path("M-44 46V18H-32V46M32 46V18H44V46", 'class="d"') +
      path("M-6 46Q10 34-6 26T6 14", 'class="t"') + path("M-46 46H46", 'class="t"') + path("M-26 34l3-8 3 8M20 34l3-8 3 8", 'class="t"') + dots([[-10, 30], [12, 34]], 1.3),
    /* 19 太阳：十六道光芒、面容、向日葵 */ () =>
      circ(0, -14, 20, 'class="f"') + circ(0, -14, 25, 'class="t"') +
      Array.from({ length: 16 }, (_, i) => { const a = i * 22.5, p = pt(0, -14, 29, a), q = pt(0, -14, i % 2 ? 40 : 48, a); return i % 2 ? line(p[0], p[1], q[0], q[1]) : path(`M${p[0]} ${p[1]}Q${f((p[0] + q[0]) / 2 + 4)} ${f((p[1] + q[1]) / 2 - 4)} ${q[0]} ${q[1]}`); }).join("") +
      path("M-8-18h2M6-18h2M-6-8Q0-3 6-8", 'stroke="#09080c" stroke-width="1.4" fill="none"') +
      [-30, 0, 30].map((x, i) => path(`M${x} 46V${32 + (i % 2) * 4}`, 'class="t"') + circ(x, 28 + (i % 2) * 4, 5.5, 'class="d"') + rays(x, 28 + (i % 2) * 4, 6, 10, 8)).join(""),
    /* 20 审判：号角、旗帜、云与光 */ () =>
      path("M-40-26L28-40V4L-40-8Z", 'class="d"') + path("M28-40Q46-18 28 4", 'class="d"') + rays(34, -18, 20, 40, 11, -60) + path("M-40-26L-46-30M-40-8L-46-4") +
      path("M-30-4V14M-30 4H-12", 'class="t"') + path("M-18 6h14v14h-14z", 'class="d"') + line(-11, 8, -11, 18, 'class="t"') + line(-16, 13, -6, 13, 'class="t"') +
      path("M-46 30q8-8 16 0q8-8 16 0q8-8 16 0q8-8 16 0q8-8 16 0q8-8 16 0", 'class="t"') + path("M-34 46h16M-8 46h16M18 46h16") + path("M-26 46V40M0 46V40M26 46V40", 'class="t"') + path("M-26 40l-4-8M0 40l4-8M26 40l-4-8", 'class="t"'),
    /* 21 世界：月桂环、舞者、四方使者 */ () =>
      ell(0, 0, 36, 52) + Array.from({ length: 14 }, (_, i) => { const a = i * 360 / 14, p = pt(0, 0, 1, a); return leaf(f(36 * Math.cos(a * R)), f(52 * Math.sin(a * R)), a + 90, .55, 'class="d"'); }).join("") +
      path("M0-18L8 -2L20 -6L10 6L18 20L2 14L-10 24L-8 8L-22 0L-6-4Z", 'class="d"') + circ(0, -24, 4, 'class="f"') + spark(0, 30, 3) +
      [[-40, -50], [40, -50], [-40, 50], [40, 50]].map((p, i) => [spark(p[0], p[1], 5), path(`M${p[0] - 6} ${p[1] + 6}q6-10 12 0`, 'class="t"'), circ(p[0], p[1], 7, 'class="t"'), path(`M${p[0] - 6} ${p[1] - 6}l6 4 6-4`, 'class="t"')][i % 4]).join("")
  ];

  /* ---------- 小阿尔卡那：花色背景 + 数字构图（沿用，并统一放进圆窗） ---------- */
  const MIN_BACK = {
    wands: () => rays(100, 156, 56, 120, 20, 4),
    cups: () => [0, 1, 2, 3, 4, 5].map(k => path(`M26 ${70 + k * 34}q18-10 37 0t37 0 37 0 37 0`)).join(""),
    swords: () => [40, 70, 100, 130, 160].map(x => line(x, 56, x, 258, 'stroke-dasharray="1 7"')).join("") + path("M118 54L92 150H110L84 262"),
    pent: () => [[100, 156], ...Array.from({ length: 6 }, (_, i) => pt(100, 156, 38, i * 60))].map(p => circ(p[0], p[1], 38)).join("")
  };
  const POS2 = {
    2: [[100, 114], [100, 200]], 3: [[100, 104], [66, 196], [134, 196]], 4: [[66, 118], [134, 118], [66, 200], [134, 200]],
    5: [[66, 112], [134, 112], [100, 156], [66, 202], [134, 202]], 6: [[68, 104], [132, 104], [68, 158], [132, 158], [68, 212], [132, 212]],
    7: [[68, 104], [132, 104], [100, 130], [68, 158], [132, 158], [68, 212], [132, 212]], 8: [[68, 90], [132, 90], [68, 136], [132, 136], [68, 182], [132, 182], [68, 228], [132, 228]],
    9: [[58, 100], [100, 100], [142, 100], [58, 158], [100, 158], [142, 158], [58, 216], [100, 216], [142, 216]],
    10: [[68, 86], [132, 86], [68, 124], [132, 124], [68, 160], [132, 160], [68, 196], [132, 196], [68, 232], [132, 232]]
  };
  const SC2 = { 2: .74, 3: .66, 4: .66, 5: .58, 6: .54, 7: .5, 8: .44, 9: .42, 10: .38 };
  function minorArt(c) {
    const s = c.suit, e = EMB[s], n = c.n; let g = `<g class="t" opacity=".55">${MIN_BACK[s]()}</g>`;
    const T = (inner) => `<g clip-path="url(#rg)"><g transform="translate(0 -14)">${g}</g></g><g transform="translate(0 -14)">${inner}</g>`;       // 把 (100,156) 挪到圆窗圆心
    if (n === 1) return T(circ(100, 156, 50, 'class="t" stroke-dasharray="1 4"') + e(100, 156, 1.35) + path("M52 218q48-24 96 0M60 226q40-16 80 0", 'class="t"') + spark(100, 100, 4) + dots([[56, 112], [146, 118], [60, 214], [144, 210]], 1.6));
    if (n <= 10) { const P = POS2[n]; return T(`<g class="t">${poly(100, 156, 56, n)}${n <= 5 ? pts(P, n > 3) : ""}</g>` + P.map(p => e(p[0], p[1] - 0, SC2[n])).join("")); }
    const k = n - 11, cy = 168;
    const rank = [
      () => spark(100, 92, 9) + path("M72 104q14-16 28 0q14-16 28 0") + circ(100, cy, 52, 'class="t" stroke-dasharray="2 4"'),
      () => path("M62 100Q90 76 130 94") + path("M60 110l14 12-14 12M76 110l14 12-14 12", 'class="t"') + poly(100, cy, 56, 4),
      () => path("M72 104q14-26 28 0q14-26 28 0") + line(72, 106, 128, 106) + dots([[74, 98], [100, 82], [126, 98]], 2) + ell(100, cy, 50, 58, 'class="t"'),
      () => crown(100, 108, 30, 5) + line(146, 90, 146, 232) + path("M140 90h12") + path(`M52 ${cy - 44}L100 ${cy - 66}L148 ${cy - 44}V${cy + 26}L100 ${cy + 48}L52 ${cy + 26}Z`, 'class="t"')
    ][k]();
    return T(rank + e(100, cy + 2, .95) + dots([[44, 80], [156, 84], [46, 236], [154, 234]], 1.6));
  }

  /* ---------- 整张牌 ---------- */
  function svg(c, o = {}) {
    const rnd = seeded(c.id + 7), acc = c.major ? "#ecd29a" : ACC[c.suit], v = c.major ? c.id % 4 : VAR[c.suit];
    const art = c.major ? `<g transform="translate(100 ${CY}) scale(1.14)">${E[c.n]()}</g>` : minorArt(c);
    const dust = Array.from({ length: 26 }, () => circ(f(10 + rnd() * 180), f(16 + rnd() * 308), f(.3 + rnd() * .7), 'class="f" opacity=".45"')).join("");
    const tx = o.text === false ? "" :
      `<text x="100" y="${c.zh.length > 4 ? 280 : 281}" text-anchor="middle" font-size="${c.zh.length > 4 ? 14 : 16}" letter-spacing="3" fill="#f4ead2" font-family="TitleZH,'ZCOOL XiaoWei','Noto Serif SC',serif">${c.zh}</text>` +
      `<text x="100" y="300" text-anchor="middle" font-size="6.4" letter-spacing="2.2" fill="#e6c06e" font-family="TitleEN,Italiana,serif">${c.en.toUpperCase()}</text>` +
      `<text x="100" y="236" text-anchor="middle" font-size="9" letter-spacing="4" fill="#e6c06e" font-family="TitleEN,Italiana,serif">${cap(c)}</text>`;
    return `<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${c.zh} ${c.en}"><defs>` +
      `<linearGradient id="gg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="340"><stop offset="0" stop-color="#fff2c4"/><stop offset=".5" stop-color="#e6c06e"/><stop offset="1" stop-color="#a8772e"/></linearGradient>` +
      `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e0c13"/><stop offset="1" stop-color="#050407"/></linearGradient>` +
      `<radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${acc}" stop-opacity=".30"/><stop offset=".6" stop-color="${acc}" stop-opacity=".08"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient>` +
      `<clipPath id="cp"><rect width="200" height="340" rx="14"/></clipPath><clipPath id="rg"><circle cx="100" cy="140" r="67"/></clipPath>` +
      `<style>.l{fill:none;stroke:url(#gg);stroke-width:1.15;stroke-linecap:round;stroke-linejoin:round;color:#e6c06e}.l path,.l circle,.l ellipse{vector-effect:none}.t{fill:none;stroke:url(#gg);stroke-width:.6;stroke-opacity:.65;stroke-linecap:round}.f{fill:#f1e6c8;stroke:none}.g{fill:url(#gg);stroke:none}.d{fill:#09080c;stroke:url(#gg);stroke-width:1.15;stroke-linejoin:round}</style></defs>` +
      `<g clip-path="url(#cp)"><rect width="200" height="340" fill="url(#bg)"/><circle cx="100" cy="${CY}" r="104" fill="url(#gl)"/>${dust}` +
      `<g class="l">${frame(v, acc)}${moonRow(c.id, 31)}${sky(c, rnd)}${halo(c, rnd)}${art}` +
      `<path d="M36 246H164L172 254V308L164 316H36L28 308V254Z"/><path d="M40 250H160L168 258V304L160 312H40L32 304V258Z" class="t"/><path d="M60 244h80" class="t"/>${spark(100, 244, 3.4)}${spark(30, 281, 2.6)}${spark(170, 281, 2.6)}</g>${tx}</g></svg>`;
  }
  /* ---------- 牌背：装饰艺术罗盘星 ---------- */
  const BACK = (() => {
    const cx = 100, cy = 170, big = Array.from({ length: 16 }, (_, i) => pt(cx, cy, i % 2 ? 24 : (i % 4 === 0 ? 84 : 58), -90 + i * 22.5));
    return `<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg"><defs>` +
      `<linearGradient id="gg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="340"><stop offset="0" stop-color="#fff2c4"/><stop offset=".5" stop-color="#e6c06e"/><stop offset="1" stop-color="#a8772e"/></linearGradient>` +
      `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e0c13"/><stop offset="1" stop-color="#050407"/></linearGradient>` +
      `<radialGradient id="gl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ecd29a" stop-opacity=".22"/><stop offset="1" stop-color="#ecd29a" stop-opacity="0"/></radialGradient><clipPath id="cp"><rect width="200" height="340" rx="14"/></clipPath>` +
      `<style>.l{fill:none;stroke:url(#gg);stroke-width:1.15;stroke-linecap:round;stroke-linejoin:round}.t{fill:none;stroke:url(#gg);stroke-width:.6;stroke-opacity:.65}.f{fill:#f1e6c8}.g{fill:url(#gg)}.d{fill:#09080c;stroke:url(#gg);stroke-width:1.15;stroke-linejoin:round}</style></defs>` +
      `<g clip-path="url(#cp)"><rect width="200" height="340" fill="url(#bg)"/><circle cx="${cx}" cy="${cy}" r="110" fill="url(#gl)"/><g class="l">${frame(1, "#ecd29a")}` +
      // 上下山形折线
      [[1, 36], [-1, 304]].map(([d, y]) => [0, 1, 2].map(k => path(`M${52 + k * 10} ${y + d * 0}L100 ${y - d * (34 - k * 8)}L${148 - k * 10} ${y}`, k ? 'class="t"' : "")).join("") + spark(100, y + d * 12, 3)).join("") +
      circ(cx, cy, 62) + circ(cx, cy, 55, 'class="t" stroke-dasharray="1 3"') + circ(cx, cy, 36, 'class="t"') +
      Array.from({ length: 64 }, (_, i) => { const a = i * 360 / 64, p = pt(cx, cy, 62, a), q = pt(cx, cy, i % 4 ? 66 : 71, a); return line(p[0], p[1], q[0], q[1], 'class="t"'); }).join("") +
      pts(big, 1) + pts(Array.from({ length: 8 }, (_, i) => pt(cx, cy, i % 2 ? 14 : 30, -90 + i * 45)), 1) +
      Array.from({ length: 8 }, (_, i) => { const p = pt(cx, cy, 10, i * 45); return circ(p[0], p[1], 5, 'class="t"'); }).join("") + circ(cx, cy, 4, 'class="g"') +
      [[28, 70], [172, 70], [28, 270], [172, 270]].map(p => spark(p[0], p[1], 4)).join("") +
      path("M20 120q-8 12 0 24t0 24M180 120q8 12 0 24t0 24M20 172q-8 12 0 24M180 172q8 12 0 24", 'class="t"') + `</g></g></svg>`;
  })();

  /* ---------- 对外接口 ---------- */
  const raster = (s, w) => new Promise((ok, no) => {
    const im = new Image(), cv = document.createElement("canvas"); cv.width = w; cv.height = Math.round(w * 1.7);
    im.onload = () => { cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height); ok(cv); };
    im.onerror = no; im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  });
  window.TAROT = {
    cards: CARDS, svg, backSvg: BACK, back: "data:image/svg+xml," + encodeURIComponent(BACK),
    read(c, rev) { return { name: c.zh + (rev ? " · 逆位" : " · 正位"), en: c.en, kw: c.kw, text: rev ? c.rv : c.up }; },
    // 牌面贴图：图形用 SVG 画，文字用 Canvas 画（这样能用上网站已加载的标题字体）
    async canvas(c, w = 512) {
      try { await Promise.all([document.fonts.load("16px TitleZH"), document.fonts.load("10px TitleEN")]); } catch (e) { /* 字体没加载就用后备字体 */ }
      const cv = await raster(svg(c, { text: false }), w), x = cv.getContext("2d"), k = w / 200;
      x.textAlign = "center"; x.fillStyle = "#f4ead2"; x.font = `${(c.zh.length > 4 ? 14 : 16) * k}px TitleZH,"ZCOOL XiaoWei","Noto Serif SC",serif`;
      if ("letterSpacing" in x) x.letterSpacing = 3 * k + "px";
      x.fillText(c.zh, 100 * k, (c.zh.length > 4 ? 280 : 281) * k + 5 * k);
      x.fillStyle = "#e6c06e"; x.font = `${6.4 * k}px TitleEN,Italiana,serif`; if ("letterSpacing" in x) x.letterSpacing = 2.2 * k + "px"; x.fillText(c.en.toUpperCase(), 100 * k, 300 * k + 2 * k);
      x.font = `${9 * k}px TitleEN,Italiana,serif`; if ("letterSpacing" in x) x.letterSpacing = 4 * k + "px"; x.fillText(cap(c), 100 * k, 236 * k + 3 * k);
      return cv;
    },
    backCanvas: (w = 512) => raster(BACK, w)
  };
})();
