/* 魔法书的贴图：封面（黑皮烫金：满月 + 飞蛾 + 月相环）、封里、右页（发光法阵）、左页（星图）
   图形用 SVG 画，文字（THE / TAROT）用 Canvas 画，这样能用上网站已加载的标题字体 */
(function () {
  const f = n => +n.toFixed(1), R = Math.PI / 180, TAU = Math.PI * 2;
  const pt = (x, y, r, a) => [f(x + r * Math.cos(a * R)), f(y + r * Math.sin(a * R))];
  const spark = (x, y, r) => `<path class="g" d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z"/>`;
  const seeded = s => { let a = s * 2654435761 >>> 0; return () => (a = a * 1664525 + 1013904223 >>> 0) / 4294967296; };
  const DEFS = `<defs>
    <linearGradient id="gg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="420"><stop offset="0" stop-color="#fff2c4"/><stop offset=".5" stop-color="#e6c06e"/><stop offset="1" stop-color="#a8772e"/></linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#17141c"/><stop offset=".55" stop-color="#0b0a0f"/><stop offset="1" stop-color="#050407"/></linearGradient>
    <radialGradient id="mn" cx=".38" cy=".34" r=".8"><stop offset="0" stop-color="#f6e8bd"/><stop offset=".7" stop-color="#cdb27a"/><stop offset="1" stop-color="#97804f"/></radialGradient>
    <radialGradient id="hl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd98f" stop-opacity=".34"/><stop offset="1" stop-color="#ffd98f" stop-opacity="0"/></radialGradient>
    <style>.l{fill:none;stroke:url(#gg);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.t{fill:none;stroke:url(#gg);stroke-width:.8;stroke-opacity:.7;stroke-linecap:round}.f{fill:#f1e6c8}.g{fill:url(#gg)}.d{fill:#09080c;stroke:url(#gg);stroke-width:1.5;stroke-linejoin:round}</style></defs>`;
  const grain = (n, seed, w = 300, h = 420) => { const r = seeded(seed); return `<g fill="#fff">` + Array.from({ length: n }, () => `<rect x="${f(r() * w)}" y="${f(r() * h)}" width="1.3" height="1" opacity="${f(r() * .07)}"/>`).join("") + `</g>`; };
  const phase = (x, y, r, k) => { // 与牌面同样的月相画法
    const th = k * Math.PI / 4, rx = f(r * Math.abs(Math.cos(th)));
    if (k === 0) return `<circle class="t" cx="${x}" cy="${y}" r="${r}"/>`;
    if (k === 4) return `<circle class="f" cx="${x}" cy="${y}" r="${r}"/>`;
    const wan = k > 4, kk = wan ? 8 - k : k, sw = kk < 2 ? 0 : 1;
    const d = `M${x} ${y - r}A${r} ${r} 0 0 1 ${x} ${y + r}` + (kk === 2 ? `L${x} ${y - r}Z` : `A${rx} ${r} 0 0 ${sw} ${x} ${y - r}Z`);
    return `<g ${wan ? `transform="translate(${2 * x} 0) scale(-1 1)"` : ""}><path class="f" d="${d}"/></g><circle class="t" cx="${x}" cy="${y}" r="${r + 1.4}"/>`;
  };
  const fleuron = (x, y, sx, sy) => `<g transform="translate(${x} ${y}) scale(${sx} ${sy})"><path class="l" d="M0 46Q0 0 46 0M10 36Q10 10 36 10M0 20C14 20 18 14 18 0"/><circle class="g" cx="5" cy="5" r="2.6"/>${spark(22, 22, 4)}</g>`;
  const moth = (cx, cy, s) => { // 飞蛾：左右对称的翅膀 + 翅脉 + 眼斑
    const w = m => `<g transform="scale(${m} 1)"><path class="d" d="M5-3C24-62 98-76 130-40C144-24 124 4 54 8Z"/><path class="d" d="M5 5C38 8 98 28 90 66C80 86 36 68 5 20Z"/>` +
      `<path class="t" d="M8 0Q70-8 118-38M8 0Q60-24 96-52M8 0Q50 6 78-14M8 8Q60 30 82 58M8 12Q40 44 56 66"/>` +
      `<circle class="t" cx="88" cy="-30" r="6"/><circle class="f" cx="88" cy="-30" r="2.2"/><circle class="t" cx="70" cy="42" r="5"/><circle class="f" cx="70" cy="42" r="1.8"/><circle class="f" cx="108" cy="-16" r="2"/></g>`;
    return `<g transform="translate(${cx} ${cy}) scale(${s})">${w(1)}${w(-1)}<ellipse class="d" cx="0" cy="16" rx="6" ry="34"/><path class="t" d="M-5 0h10M-5.5 8h11M-5.5 16h11M-5 24h10M-4 32h8"/><circle class="d" cx="0" cy="-22" r="6"/><path class="t" d="M-2-27Q-14-52-28-54M2-27Q14-52 28-54"/></g>`;
  };

  function coverSvg() {
    const cx = 150, cy = 214, r = rnd => rnd;
    const ring = Array.from({ length: 8 }, (_, i) => { const p = pt(cx, cy, 100, -90 + i * 45); return phase(p[0], p[1], 9, [4, 5, 6, 7, 0, 1, 2, 3][i]); }).join("");
    const ticks = Array.from({ length: 96 }, (_, i) => { const p = pt(cx, cy, 116, i * 3.75), q = pt(cx, cy, i % 4 ? 119 : 123, i * 3.75); return `<path class="t" d="M${p[0]} ${p[1]}L${q[0]} ${q[1]}"/>`; }).join("");
    const rays = Array.from({ length: 48 }, (_, i) => { const p = pt(cx, cy, 70, i * 7.5), q = pt(cx, cy, i % 2 ? 80 : 88, i * 7.5); return `<path class="t" d="M${p[0]} ${p[1]}L${q[0]} ${q[1]}"/>`; }).join("");
    const rd = seeded(9), stars = Array.from({ length: 16 }, () => spark(f(24 + rd() * 252), f(24 + rd() * 372), f(1.6 + rd() * 3))).join("");
    return `<svg viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg">${DEFS}<rect width="300" height="420" fill="url(#bg)"/><circle cx="${cx}" cy="${cy}" r="150" fill="url(#hl)"/>${grain(900, 3)}` +
      `<rect class="l" x="10" y="10" width="280" height="400" rx="12" stroke-width="3"/><rect class="t" x="18" y="18" width="264" height="384" rx="8"/>` +
      fleuron(20, 20, 1, 1) + fleuron(280, 20, -1, 1) + fleuron(20, 400, 1, -1) + fleuron(280, 400, -1, -1) + stars +
      `<circle class="l" cx="${cx}" cy="${cy}" r="112"/>${ticks}${rays}${ring}` +
      `<circle cx="${cx}" cy="${cy}" r="64" fill="url(#mn)"/><g fill="#6d5a34" opacity=".45"><circle cx="124" cy="190" r="11"/><circle cx="176" cy="180" r="7"/><circle cx="184" cy="236" r="12"/><circle cx="116" cy="246" r="8"/><circle cx="150" cy="268" r="6"/></g>` +
      moth(cx, cy + 4, .78) + `</svg>`;
  }
  function pageSvg(kind) { // 'R' 右页：发光法阵；'L' 左页：星图；'cover' 封里
    const cx = 150, cy = 190, rd = seeded(kind === 'R' ? 5 : 8);
    let art = "";
    if (kind === "R") {
      art = `<circle cx="${cx}" cy="${cy}" r="110" fill="url(#hl)"/><circle class="l" cx="${cx}" cy="${cy}" r="86"/><circle class="t" cx="${cx}" cy="${cy}" r="78" stroke-dasharray="1 4"/>` +
        [0, 1].map(d => `<path class="l" d="${Array.from({ length: 3 }, (_, i) => { const p = pt(cx, cy, 78, -90 + i * 120 + (d ? 60 : 0)); return (i ? "L" : "M") + p[0] + " " + p[1]; }).join("")}Z"/>`).join("") +
        Array.from({ length: 72 }, (_, i) => { const p = pt(cx, cy, 86, i * 5), q = pt(cx, cy, i % 6 ? 91 : 98, i * 5); return `<path class="t" d="M${p[0]} ${p[1]}L${q[0]} ${q[1]}"/>`; }).join("") +
        `<path class="l" d="M${cx} ${cy - 22}A22 22 0 1 0 ${cx} ${cy + 22}A14 22 0 1 1 ${cx} ${cy - 22}Z"/>` + spark(cx + 12, cy - 12, 6) + [0, 1, 2, 3, 4].map(k => `<path class="t" d="M64 ${330 + k * 11}H${236 - k * 14}"/>`).join("");
    } else if (kind === "L") {
      const P = Array.from({ length: 13 }, () => [f(44 + rd() * 212), f(50 + rd() * 230)]);
      art = `<path class="t" d="M${P.map(p => p.join(" ")).join("L")}"/>` + P.map(p => spark(p[0], p[1], f(2 + rd() * 5))).join("") +
        `<circle class="t" cx="${cx}" cy="${cy}" r="120" stroke-dasharray="2 5"/>` + [0, 1, 2, 3, 4, 5].map(k => `<path class="t" d="M54 ${312 + k * 12}H${246 - (k % 3) * 36}"/>`).join("");
    }
    return `<svg viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg">${DEFS}<rect width="300" height="420" fill="${kind === "cover" ? "#0c0b11" : "#12101a"}"/>${kind === "R" ? `<rect width="300" height="420" fill="url(#hl)" opacity=".5"/>` : ""}${grain(700, 4)}` +
      `<rect class="l" x="12" y="12" width="276" height="396" rx="8" stroke-width="2.4"/><rect class="t" x="19" y="19" width="262" height="382" rx="5"/>${art}${spark(150, 28, 4)}${spark(150, 392, 4)}</svg>`;
  }
  function spineSvg() { // 书脊：黑皮 + 金色凸带 + 星
    return `<svg viewBox="0 0 60 420" xmlns="http://www.w3.org/2000/svg">${DEFS.replace('y2="420"', 'y2="420"')}<rect width="60" height="420" fill="#0a090d"/><rect width="60" height="420" fill="url(#bg)" opacity=".7"/>${grain(300, 6, 60, 420)}` +
      [24, 120, 210, 300, 396].map(y => `<path class="l" d="M0 ${y}H60M0 ${y + 7}H60"/>`).join("") + [72, 165, 255, 348].map(y => spark(30, y, 8)).join("") + `</svg>`;
  }
  const raster = (svg, w, h) => new Promise((ok, no) => {
    const im = new Image(), cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    im.onload = () => { cv.getContext("2d").drawImage(im, 0, 0, w, h); ok(cv); }; im.onerror = no;
    im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
  window.BOOK = {
    coverSvg, pageSvg, spineSvg,
    async cover(w = 600) {
      try { await Promise.all([document.fonts.load("40px TitleEN"), document.fonts.load("16px TitleZH")]); } catch (e) { }
      const h = Math.round(w * 1.4), cv = await raster(coverSvg(), w, h), x = cv.getContext("2d"), k = w / 300;
      x.textAlign = "center"; x.fillStyle = "#e6c06e";
      const g = x.createLinearGradient(0, 40 * k, 0, 110 * k); g.addColorStop(0, "#fff2c4"); g.addColorStop(.55, "#e6c06e"); g.addColorStop(1, "#a8772e");
      x.shadowColor = "rgba(0,0,0,.6)"; x.shadowBlur = 6 * k; x.shadowOffsetY = 2 * k;
      x.fillStyle = g; x.font = `${13 * k}px TitleEN,Italiana,"Times New Roman",serif`; if ("letterSpacing" in x) x.letterSpacing = 9 * k + "px"; x.fillText("THE", 150 * k + 4 * k, 56 * k);
      x.font = `${56 * k}px TitleEN,Italiana,"Times New Roman",serif`; if ("letterSpacing" in x) x.letterSpacing = 7 * k + "px"; x.fillText("TAROT", 150 * k + 3 * k, 106 * k);
      x.shadowColor = "transparent"; x.fillStyle = "#d8c48f"; x.font = `${7.2 * k}px TitleEN,Italiana,serif`; if ("letterSpacing" in x) x.letterSpacing = 3 * k + "px";
      x.fillText("TAROT · ASTROLOGY · GUIDANCE", 150 * k, 356 * k); x.fillText("SELF DISCOVERY", 150 * k, 368 * k);
      x.font = `${10 * k}px TitleZH,"ZCOOL XiaoWei","Noto Serif SC",serif`; if ("letterSpacing" in x) x.letterSpacing = 6 * k + "px"; x.fillStyle = "#e6c06e"; x.fillText("命运之书", 150 * k + 3 * k, 386 * k);
      return cv;
    },
    page: (kind, w = 512) => raster(pageSvg(kind), w, Math.round(w * 1.4)),
    spine: (w = 128) => raster(spineSvg(), w, Math.round(w * 7))
  };
})();
