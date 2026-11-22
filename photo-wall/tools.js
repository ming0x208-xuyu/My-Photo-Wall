/* ============ 工具箱：图片压缩 + 视频转 GIF（全部在浏览器本地完成，不上传文件） ============ */
(() => {
  "use strict";
  const $ = id => document.getElementById(id), sleep = ms => new Promise(r => setTimeout(r, ms));
  const MB = 1048576, fmtMB = b => (b / MB).toFixed(2) + " MB" + (b < MB / 10 ? "（" + Math.max(1, Math.round(b / 1024)) + " KB）" : "");
  let tto; const toast = m => { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tto); tto = setTimeout(() => t.classList.remove("on"), 2600); };
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const saveBlob = (blob, name) => { const a = el("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const stripExt = n => n.replace(/\.[^.]+$/, "");

  /* ---------- 标签切换 ---------- */
  document.querySelectorAll(".tabs button").forEach(b => { b.onclick = () => { document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("on", x === b)); document.querySelectorAll(".panel").forEach(p => p.classList.toggle("on", p.id === b.dataset.tab)); }; });
  /* 选择文件 / 拖拽（两个标签共用） */
  function bindDrop(drop, input, onFiles) {
    drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } };
    drop.onclick = e => { if (e.target !== input) input.click(); };
    input.onchange = () => { onFiles([...input.files]); input.value = ""; };
    ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => onFiles([...e.dataTransfer.files]));
  }

  /* =====================================================================
     图片压缩
     ===================================================================== */
  const imgs = []; let uid = 0, token = 0, timer = 0;
  const cv = document.createElement("canvas"), cx = cv.getContext("2d");
  const webpOK = (() => { try { return document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp"); } catch (e) { return false; } })();
  const EXT = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" };
  const opt = () => ({ q: +$("imgQ").value / 100, fmt: $("imgFmt").value, max: +$("imgMax").value });
  const pickType = (file, fmt) => {
    let t = fmt === "jpeg" ? "image/jpeg" : fmt === "webp" ? "image/webp" : fmt === "png" ? "image/png" : (file.type === "image/png" || file.type === "image/webp" ? "image/webp" : "image/jpeg");
    if (t === "image/webp" && !webpOK) t = file.type === "image/png" ? "image/png" : "image/jpeg"; // 浏览器不支持导出 WebP 时的退路
    return t;
  };
  const decode = file => createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => createImageBitmap(file));

  bindDrop($("imgDrop"), $("imgIn"), addImages);
  async function addImages(files) {
    const ok = files.filter(f => /^image\/(jpeg|png|webp|gif|bmp|avif)$/.test(f.type));
    if (files.length && !ok.length) return toast("请选择图片文件（JPG / PNG / WebP）");
    if (ok.length < files.length) toast("已跳过 " + (files.length - ok.length) + " 个不是图片的文件");
    for (const f of ok) {
      if (imgs.length >= 30) { toast("最多同时处理 30 张"); break; }
      const it = { id: ++uid, file: f, node: null, res: null, state: "wait" }; imgs.push(it); it.node = makeNode(it); $("imgList").append(it.node);
      try { const b = await decode(f); it.w = b.width; it.h = b.height; const k = Math.min(1, 160 / Math.max(b.width, b.height)); cv.width = Math.round(b.width * k); cv.height = Math.round(b.height * k); cx.drawImage(b, 0, 0, cv.width, cv.height); it.thumb = cv.toDataURL("image/jpeg", .7); b.close && b.close(); } catch (e) { it.state = "err"; it.err = "浏览器无法读取这张图片（常见于 HEIC 格式，请先转成 JPG）"; }
      paint(it);
    }
    $("imgCtl").hidden = !imgs.length; schedule();
  }
  function makeNode(it) {
    const n = el("div", "it", '<img alt=""><div class="mid"><div class="nm"></div><div class="sz"></div><div class="dm"></div></div><div class="act"><button class="btn dl">下载</button><button class="x">移除</button></div>');
    n.querySelector(".nm").textContent = it.file.name; n.querySelector(".dl").onclick = () => dlOne(it);
    n.querySelector(".x").onclick = () => { const i = imgs.indexOf(it); if (i >= 0) imgs.splice(i, 1); n.remove(); $("imgCtl").hidden = !imgs.length; sumUp(); }; return n;
  }
  function paint(it) {
    const n = it.node, sz = n.querySelector(".sz"), dm = n.querySelector(".dm"), im = n.querySelector("img"), dl = n.querySelector(".dl"); if (it.thumb && im.src !== it.thumb) im.src = it.thumb;
    dl.disabled = !(it.state === "done");
    if (it.state === "err") { sz.textContent = it.err; dm.textContent = ""; return; }
    if (it.state !== "done") { sz.innerHTML = '<span class="spin"></span>' + (it.state === "work" ? "正在压缩…" : "等待压缩…") + "　原图 " + fmtMB(it.file.size); dm.textContent = it.w ? it.w + " × " + it.h : ""; return; }
    const r = it.res, out = r.useOriginal ? it.file.size : r.blob.size, pct = Math.round((1 - out / it.file.size) * 100);
    sz.innerHTML = "原图 " + fmtMB(it.file.size) + " → 压缩后 <b>" + fmtMB(out) + "</b>" + (pct > 0 ? "<em>−" + pct + "%</em>" : '<em class="bad">已经很小，保留原图</em>');
    dm.textContent = it.w + " × " + it.h + (r.w !== it.w ? " → " + r.w + " × " + r.h : "") + "　格式 " + (r.useOriginal ? it.file.type.replace("image/", "").toUpperCase() : EXT[r.type].toUpperCase());
  }
  function sumUp() {
    const done = imgs.filter(i => i.state === "done"); $("imgSum").hidden = !done.length; if (!done.length) return;
    const a = done.reduce((s, i) => s + i.file.size, 0), b = done.reduce((s, i) => s + (i.res.useOriginal ? i.file.size : i.res.blob.size), 0);
    $("sumFrom").textContent = fmtMB(a); $("sumTo").textContent = fmtMB(b); $("sumPct").textContent = b < a ? "节省 " + Math.round((1 - b / a) * 100) + "%" : "";
  }
  async function compressOne(it, o) {
    const b = await decode(it.file); let w = b.width, h = b.height, k = o.max ? Math.min(1, o.max / Math.max(w, h)) : 1; k = Math.min(k, Math.sqrt(16e6 / (w * h)), 1); // 同时限制总像素，避免手机内存不够
    const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k)), type = pickType(it.file, o.fmt); cv.width = cw; cv.height = ch; cx.imageSmoothingQuality = "high";
    if (type === "image/jpeg") { cx.fillStyle = "#fff"; cx.fillRect(0, 0, cw, ch); } else cx.clearRect(0, 0, cw, ch); // 转 JPEG 时透明区域填白
    cx.drawImage(b, 0, 0, cw, ch); b.close && b.close();
    let blob = await new Promise(r => cv.toBlob(r, type, o.q)), t = type; if (!blob) throw new Error("编码失败");
    if (blob.type && blob.type !== type) t = blob.type; // 浏览器自动换了格式
    const useOriginal = t === it.file.type && cw === w && ch === h && blob.size >= it.file.size;
    it.res = { blob, type: t, w: cw, h: ch, useOriginal };
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(runAll, 220); imgs.forEach(i => { if (i.state !== "err") { i.state = "wait"; paint(i); } }); }
  async function runAll() {
    const tk = ++token, o = opt();
    for (const it of imgs.slice()) {
      if (tk !== token) return; if (it.state === "err" || !imgs.includes(it)) continue; it.state = "work"; paint(it);
      try { await compressOne(it, o); if (tk !== token) return; it.state = "done"; } catch (e) { it.state = "err"; it.err = "压缩失败：" + (e.message || e); }
      paint(it); sumUp(); await sleep(0);
    }
  }
  const outName = it => stripExt(it.file.name) + (it.res.useOriginal ? "" : "-compressed") + "." + (it.res.useOriginal ? (it.file.name.split(".").pop()) : EXT[it.res.type]);
  const dlOne = it => saveBlob(it.res.useOriginal ? it.file : it.res.blob, outName(it));
  // 控件：预设按钮、滑块、格式、尺寸
  $("imgPre").querySelectorAll("button").forEach(b => { b.onclick = () => { $("imgQ").value = b.dataset.q; syncQ(); schedule(); }; });
  function syncQ() { const v = +$("imgQ").value; $("qv").textContent = v; $("imgPre").querySelectorAll("button").forEach(b => b.classList.toggle("on", +b.dataset.q === v)); }
  $("imgQ").oninput = () => { syncQ(); schedule(); }; $("imgFmt").onchange = schedule; $("imgMax").onchange = schedule;
  $("imgClear").onclick = () => { imgs.length = 0; token++; $("imgList").replaceChildren(); $("imgCtl").hidden = true; $("imgSum").hidden = true; };
  $("imgZip").onclick = async () => {
    const done = imgs.filter(i => i.state === "done"); if (!done.length) return; const used = new Set(), entries = done.map(it => { let n = outName(it), k = 1; while (used.has(n)) n = outName(it).replace(/(\.[^.]+)$/, "-" + (++k) + "$1"); used.add(n); return { name: n, blob: it.res.useOriginal ? it.file : it.res.blob }; });
    $("imgZip").disabled = true; try { saveBlob(await makeZip(entries), "compressed-images.zip"); } finally { $("imgZip").disabled = false; }
  };
  /* 极简 ZIP（只存储不再压缩，因为图片本身已经是压缩格式） */
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = crcT[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function makeZip(entries) {
    const enc = new TextEncoder(), parts = [], cd = []; let off = 0, d = new Date(), dt = (d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate(), tm = d.getHours() << 11 | d.getMinutes() << 5 | d.getSeconds() >> 1;
    for (const e of entries) {
      const data = new Uint8Array(await e.blob.arrayBuffer()), name = enc.encode(e.name), crc = crc32(data), lh = new DataView(new ArrayBuffer(30)), ch = new DataView(new ArrayBuffer(46));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(10, tm, true); lh.setUint16(12, dt, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(12, tm, true); ch.setUint16(14, dt, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      parts.push(new Uint8Array(lh.buffer), name, data); cd.push(new Uint8Array(ch.buffer), name); off += 30 + name.length + data.length;
    }
    const size = cd.reduce((s, a) => s + a.length, 0), end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true); end.setUint32(12, size, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...cd, new Uint8Array(end.buffer)], { type: "application/zip" });
  }

  /* =====================================================================
     视频转 GIF
     ===================================================================== */
  let vurl = null, vfile = null, vw = 0, vh = 0, vdur = 0, busy = false, cancelled = false, estT = 0, estTk = 0;
  const pv = document.createElement("video"); pv.muted = true; pv.playsInline = true; pv.preload = "auto"; // 专门用来逐帧截图的隐藏视频
  const gc = document.createElement("canvas"), gx = gc.getContext("2d", { willReadFrequently: true });
  const gopt = () => { const W = +$("gifW").value, fps = +$("gifFps").value, span = +$("gifDur").value, start = +$("gifStart").value, H = Math.max(2, Math.round(W * vh / vw)); return { W: Math.min(W, vw), H: Math.round(Math.min(W, vw) * vh / vw), fps, span, start, n: Math.max(1, Math.round(span * fps)), colors: +$("gifCol").value, loop: +$("gifLoop").value, dither: $("gifDither").checked }; };

  bindDrop($("gifDrop"), $("gifIn"), async files => {
    const f = files.find(x => x.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|mkv)$/i.test(x.name)); if (!f) return files.length && toast("请选择视频文件（MP4 / WebM / MOV）");
    if (vurl) URL.revokeObjectURL(vurl); vfile = f; vurl = URL.createObjectURL(f); const v = $("gifVid"); v.src = vurl; pv.src = vurl; $("gifRes").hidden = true; $("gifStatus").textContent = "";
    try {
      await Promise.all([new Promise((ok, no) => { v.onloadedmetadata = ok; v.onerror = () => no(new Error("decode")); }), new Promise((ok, no) => { pv.onloadeddata = ok; pv.onerror = () => no(new Error("decode")); })]);
    } catch (e) { $("gifBody").hidden = true; return toast("这个浏览器无法解码这个视频，请换 MP4（H.264）或 WebM，或换个浏览器"); }
    vw = v.videoWidth; vh = v.videoHeight; vdur = v.duration; if (!(vw > 0 && vdur > 0 && isFinite(vdur))) { $("gifBody").hidden = true; return toast("无法读取这个视频的信息"); }
    $("gifBody").hidden = false; $("gifStart").max = Math.max(0, (vdur - 1).toFixed(1)); $("gifStart").value = 0; $("gifDur").max = Math.min(15, Math.floor(vdur * 2) / 2 || 1); $("gifDur").value = Math.min(4, $("gifDur").max); syncG();
    $("gifMeta").textContent = f.name + "　" + vw + " × " + vh + "　" + vdur.toFixed(1) + " 秒　" + fmtMB(f.size); if (vdur > 20) toast("视频较长，请用“起始时间”和“截取时长”选出想转换的片段");
  });
  function syncG() { // 保证起始时间 + 时长不超过视频长度，并刷新数字
    let st = +$("gifStart").value, du = +$("gifDur").value; if (st + du > vdur) { du = Math.max(.5, Math.floor((vdur - st) * 2) / 2); $("gifDur").value = du; }
    $("stv").textContent = (+$("gifStart").value).toFixed(1); $("dtv").textContent = (+$("gifDur").value).toFixed(1); estimateLater();
  }
  ["gifStart", "gifDur"].forEach(i => { $(i).oninput = syncG; }); ["gifW", "gifFps", "gifCol", "gifLoop", "gifDither"].forEach(i => { $(i).onchange = estimateLater; });
  $("gifStart").onchange = () => { const v = $("gifVid"); v.currentTime = +$("gifStart").value; };

  async function seek(v, t) {
    t = Math.min(Math.max(0, t), Math.max(0, vdur - .04)); if (Math.abs(v.currentTime - t) < .001 && v.readyState >= 2) return;
    await new Promise(res => { const fin = () => { v.removeEventListener("seeked", fin); res(); }; v.addEventListener("seeked", fin); v.currentTime = t; setTimeout(fin, 5000); });
    await Promise.race([new Promise(r => requestAnimationFrame(() => r())), sleep(60)]);
  }
  function grab(o) { gc.width = o.W; gc.height = o.H; gx.drawImage(pv, 0, 0, o.W, o.H); return gx.getImageData(0, 0, o.W, o.H).data; }
  /* 预估大小：取 3 帧真的编码一下，按帧数推算 */
  function estimateLater() { clearTimeout(estT); $("gifEst").className = "est"; $("gifEst").textContent = "预计大小：计算中…"; estT = setTimeout(estimate, 700); }
  async function estimate() {
    if (busy || !vurl) return; const tk = ++estTk, o = gopt(); if (o.span * o.fps > 150) { $("gifEst").textContent = "帧数过多，请缩短时长或降低帧率（最多 150 帧）"; $("gifEst").classList.add("warn"); return; }
    try {
      const k = Math.min(3, o.n), fr = []; for (let i = 0; i < k; i++) { await seek(pv, o.start + (i + .5) * o.span / k); if (tk !== estTk || busy) return; fr.push(new Uint8ClampedArray(grab(o))); }
      const pal = GifKit.buildPalette(fr, o.colors), w = new GifKit.Writer(o.W, o.H, pal, o.loop), base = w.size; fr.forEach(f => w.addFrame(GifKit.mapFrame(f, o.W, o.H, pal.lut, o.dither), 5)); const per = (w.size - base) / k, est = base + per * o.n;
      if (tk !== estTk) return; $("gifEst").innerHTML = "预计大小：约 <b>" + fmtMB(est) + "</b>（" + o.n + " 帧，" + o.W + " × " + o.H + "）" + (est > 15 * MB ? "　⚠ 偏大，建议减小宽度、帧率或时长" : ""); $("gifEst").classList.toggle("warn", est > 15 * MB);
    } catch (e) { $("gifEst").textContent = "预计大小：暂时无法估算"; }
  }

  $("gifGo").onclick = async () => {
    if (busy || !vurl) return; const o = gopt(); if (o.n > 150) return toast("帧数过多（最多 150 帧），请缩短时长或降低帧率");
    busy = true; cancelled = false; estTk++; $("gifGo").disabled = true; $("gifCancel").hidden = false; $("gifProg").hidden = false; $("gifRes").hidden = true; setProg(0, "正在分析颜色…"); $("gifVid").pause();
    try {
      const k = Math.min(8, o.n), samp = []; // 第一遍：取样几帧，算出一套共用调色板
      for (let i = 0; i < k; i++) { if (cancelled) throw 0; await seek(pv, o.start + (i + .5) * o.span / k); samp.push(new Uint8ClampedArray(grab(o))); setProg(.1 * (i + 1) / k, "正在分析颜色…"); }
      const pal = GifKit.buildPalette(samp, o.colors); samp.length = 0; const w = new GifKit.Writer(o.W, o.H, pal, o.loop), delay = Math.max(2, Math.round(100 / o.fps));
      for (let i = 0; i < o.n; i++) { // 第二遍：逐帧截图 → 映射颜色 → 压缩写入
        if (cancelled) throw 0; await seek(pv, o.start + i / o.fps); w.addFrame(GifKit.mapFrame(grab(o), o.W, o.H, pal.lut, o.dither), delay); setProg(.1 + .9 * (i + 1) / o.n, "正在处理第 " + (i + 1) + " / " + o.n + " 帧…"); if (i % 2) await sleep(0);
      }
      const blob = w.finish(), url = URL.createObjectURL(blob); if ($("gifOut").dataset.u) URL.revokeObjectURL($("gifOut").dataset.u); $("gifOut").src = url; $("gifOut").dataset.u = url; $("gifDl").href = url; $("gifDl").download = stripExt(vfile.name) + ".gif";
      $("gifResInfo").innerHTML = "转换完成<br>文件大小 <b>" + fmtMB(blob.size) + "</b><br>" + o.W + " × " + o.H + "　" + o.n + " 帧　" + o.fps + " 帧/秒" + (blob.size > 15 * MB ? '<br><span style="color:#d1573b">文件偏大，可以减小宽度/帧率/时长后重试</span>' : "");
      $("gifRes").hidden = false; setProg(1, "完成"); $("gifRes").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) { setProg(0, e === 0 ? "已取消" : "转换失败：" + (e && e.message || e)); if (e !== 0) toast("转换失败，请换个视频或降低设置再试"); }
    finally { busy = false; $("gifGo").disabled = false; $("gifCancel").hidden = true; setTimeout(() => { if (!busy) $("gifProg").hidden = true; }, 800); }
  };
  $("gifCancel").onclick = () => { cancelled = true; };
  function setProg(p, t) { $("gifBar").style.width = Math.round(p * 100) + "%"; $("gifStatus").textContent = t; }
  window.__tools = { addImages, imgs, GifKit: window.GifKit };
})();
