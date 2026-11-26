/* ============ 工具箱：图片压缩 + 视频转 GIF（全部在浏览器本地完成，不上传文件） ============ */
(() => {
  "use strict";
  const $ = id => document.getElementById(id), sleep = ms => new Promise(r => setTimeout(r, ms));
  const MB = 1048576, fmtMB = b => (b / MB).toFixed(2) + " MB" + (b < MB / 10 ? "（" + Math.max(1, Math.round(b / 1024)) + " KB）" : "");
  let tto; const toast = m => { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tto); tto = setTimeout(() => t.classList.remove("on"), 3200); };
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  // 手机（尤其 iOS）下载大文件时，链接要多留一会儿再释放，否则下载会失败
  const saveBlob = (blob, name) => { const a = el("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); };
  const stripExt = n => n.replace(/\.[^.]+$/, "");
  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

  /* ---------- 标签切换 ---------- */
  document.querySelectorAll(".tabs button").forEach(b => { b.onclick = () => { document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("on", x === b)); document.querySelectorAll(".panel").forEach(p => p.classList.toggle("on", p.id === b.dataset.tab)); }; });

  /* 选择文件 / 拖拽（两个标签共用）
     手机端的关键：<input type=file> 透明地铺满整个选择区，手指点到的就是它本身，由浏览器原生打开选择框。
     以前是 <label> + 脚本里再 input.click()，在手机上会触发两次、选择框被忽略；选完立刻清空 value 也会让部分安卓浏览器读不到文件。
     现在：不再手动 click；只在“下一次点击之前”清空 value（这样重复选同一个文件也能触发 change）。 */
  function bindDrop(drop, input, onFiles) {
    drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } };
    input.onclick = () => { input.value = ""; };
    input.onchange = () => { const fs = [...input.files]; if (fs.length) onFiles(fs); };
    ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => { const fs = [...e.dataTransfer.files]; if (fs.length) onFiles(fs); });
  }

  /* =====================================================================
     图片压缩
     ===================================================================== */
  const imgs = []; let uid = 0, token = 0, timer = 0, webpWarned = false;
  const cv = document.createElement("canvas"), cx = cv.getContext("2d");        // 压缩用
  const tcv = document.createElement("canvas"), tcx = tcv.getContext("2d");     // 缩略图 / 透明检测用（和压缩分开，避免互相覆盖）
  const webpOK = (() => { try { return document.createElement("canvas").toDataURL("image/webp").startsWith("data:image/webp"); } catch (e) { return false; } })();
  const EXT = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png" };
  const MIME_BY_EXT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", bmp: "image/bmp", avif: "image/avif", heic: "image/heic", heif: "image/heif" };
  const mime = f => f.type || MIME_BY_EXT[(f.name.split(".").pop() || "").toLowerCase()] || "";   // 部分安卓浏览器选出来的文件 type 是空的，用扩展名补上
  const isImg = f => /^image\//.test(mime(f));
  const isAnim = f => /^image\/(gif|svg)/.test(f.type) || /\.(gif|svg)$/i.test(f.name);
  const opt = () => ({ q: +$("imgQ").value / 100, fmt: $("imgFmt").value, max: +$("imgMax").value });
  const DECODE_ERR = "浏览器无法读取这张图片（常见于 HEIC/HEIF 格式，请先转成 JPG；iPhone 可在 设置 → 相机 → 格式 里选“最兼容”）";

  /* 读图：优先用 <img>（所有手机浏览器都能自动按 EXIF 转正照片），不行再用 createImageBitmap */
  function loadImgEl(file) {
    return new Promise((ok, no) => {
      const url = URL.createObjectURL(file), im = new Image(); let done = false;
      const fin = (f, a) => { if (done) return; done = true; f(a); };
      im.onload = async () => { try { if (im.decode) await im.decode(); } catch (e) { } fin(ok, { el: im, width: im.naturalWidth, height: im.naturalHeight, close() { URL.revokeObjectURL(url); } }); };
      im.onerror = () => { URL.revokeObjectURL(url); fin(no, new Error("img")); };
      im.src = url;
    });
  }
  async function decode(file) {
    try { return await loadImgEl(file); } catch (e) { }
    if (window.createImageBitmap) { const b = await createImageBitmap(file); return { el: b, width: b.width, height: b.height, close() { b.close && b.close(); } }; }
    throw new Error("decode");
  }
  /* 浏览器不能导出 WebP（例如 iPhone Safari）时：没有透明区域就改用 JPEG（真的能变小），有透明才用 PNG */
  function hasAlpha(src) {
    const s = Math.min(1, 256 / Math.max(src.width, src.height)), w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s));
    tcv.width = w; tcv.height = h; tcx.imageSmoothingQuality = "high"; tcx.drawImage(src.el, 0, 0, w, h);
    const d = tcx.getImageData(0, 0, w, h).data; for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true; return false;
  }
  function pickType(file, fmt, src) {
    if (fmt === "jpeg") return "image/jpeg";
    if (fmt === "png") return "image/png";
    const wantWebp = fmt === "webp" || (fmt === "auto" && /^image\/(png|webp)$/.test(mime(file)));
    if (!wantWebp) return "image/jpeg";
    if (webpOK) return "image/webp";
    if (fmt === "webp" && !webpWarned) { webpWarned = true; toast("这个浏览器不能导出 WebP，已自动改用 JPEG / PNG"); }
    return hasAlpha(src) ? "image/png" : "image/jpeg";
  }
  function makeThumb(it, src) {
    const k = Math.min(1, 160 / Math.max(src.width, src.height)); tcv.width = Math.max(1, Math.round(src.width * k)); tcv.height = Math.max(1, Math.round(src.height * k));
    tcx.fillStyle = "#fff"; tcx.fillRect(0, 0, tcv.width, tcv.height); tcx.drawImage(src.el, 0, 0, tcv.width, tcv.height); it.thumb = tcv.toDataURL("image/jpeg", .7);
  }

  bindDrop($("imgDrop"), $("imgIn"), addImages);
  function addImages(files) {
    const anim = files.filter(isAnim), ok = files.filter(f => isImg(f) && !isAnim(f)), other = files.length - anim.length - ok.length;
    if (!ok.length) return toast(anim.length ? "GIF 动图压缩会丢失动画，已跳过" : "请选择图片文件（JPG / PNG / WebP）");
    if (anim.length || other) toast("已跳过 " + (anim.length + other) + " 个不支持的文件（GIF 动图 / 非图片）");
    for (const f of ok) {
      if (imgs.length >= 30) { toast("最多同时处理 30 张"); break; }
      const it = { id: ++uid, file: f, node: null, res: null, state: "wait" }; imgs.push(it); it.node = makeNode(it); $("imgList").append(it.node); paint(it);
    }
    $("imgCtl").hidden = !imgs.length; schedule();   // 缩略图在压缩时顺便生成，每张图只解码一次，手机更省内存
  }
  function makeNode(it) {
    const n = el("div", "it", '<img alt=""><div class="mid"><div class="nm"></div><div class="sz"></div><div class="dm"></div></div><div class="act"><button class="btn dl">下载</button><button class="x">移除</button></div>');
    n.querySelector(".nm").textContent = it.file.name; n.querySelector(".dl").onclick = () => dlOne(it);
    n.querySelector(".x").onclick = () => { const i = imgs.indexOf(it); if (i >= 0) imgs.splice(i, 1); n.remove(); $("imgCtl").hidden = !imgs.length; sumUp(); }; return n;
  }
  function paint(it) {
    const n = it.node, sz = n.querySelector(".sz"), dm = n.querySelector(".dm"), im = n.querySelector("img"), dl = n.querySelector(".dl"); if (it.thumb && im.getAttribute("src") !== it.thumb) im.src = it.thumb;
    dl.disabled = !(it.state === "done");
    if (it.state === "err") { sz.textContent = it.err; dm.textContent = ""; return; }
    if (it.state !== "done") { sz.innerHTML = '<span class="spin"></span>' + (it.state === "work" ? "正在压缩…" : "等待压缩…") + "　原图 " + fmtMB(it.file.size); dm.textContent = it.w ? it.w + " × " + it.h : ""; return; }
    const r = it.res, out = r.useOriginal ? it.file.size : r.blob.size, pct = Math.round((1 - out / it.file.size) * 100);
    sz.innerHTML = "原图 " + fmtMB(it.file.size) + " → 压缩后 <b>" + fmtMB(out) + "</b>" + (pct > 0 ? "<em>−" + pct + "%</em>" : '<em class="bad">已经很小，保留原图</em>');
    dm.textContent = it.w + " × " + it.h + (r.w !== it.w ? " → " + r.w + " × " + r.h : "") + "　格式 " + (r.useOriginal ? (mime(it.file).replace("image/", "") || "原图").toUpperCase() : EXT[r.type].toUpperCase());
  }
  function sumUp() {
    const done = imgs.filter(i => i.state === "done"); $("imgSum").hidden = !done.length; if (!done.length) return;
    const a = done.reduce((s, i) => s + i.file.size, 0), b = done.reduce((s, i) => s + (i.res.useOriginal ? i.file.size : i.res.blob.size), 0);
    $("sumFrom").textContent = fmtMB(a); $("sumTo").textContent = fmtMB(b); $("sumPct").textContent = b < a ? "节省 " + Math.round((1 - b / a) * 100) + "%" : "";
  }
  async function compressOne(it, o) {
    const src = await decode(it.file);
    try {
      const w = src.width, h = src.height; if (!(w > 0 && h > 0)) throw new Error("size");
      it.w = w; it.h = h; if (!it.thumb) makeThumb(it, src);
      let k = o.max ? Math.min(1, o.max / Math.max(w, h)) : 1; k = Math.min(k, Math.sqrt(16e6 / (w * h)), 1); // 同时限制总像素（iPhone Safari 画布上限约 1677 万像素，超了会得到全黑图）
      const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k)), type = pickType(it.file, o.fmt, src);
      cv.width = cw; cv.height = ch; cx.imageSmoothingQuality = "high";
      if (type === "image/jpeg") { cx.fillStyle = "#fff"; cx.fillRect(0, 0, cw, ch); } else cx.clearRect(0, 0, cw, ch); // 转 JPEG 时透明区域填白
      cx.drawImage(src.el, 0, 0, cw, ch);
      src.close();
      const blob = await new Promise(r => cv.toBlob(r, type, o.q)); if (!blob) throw new Error("编码失败");
      const t = blob.type && blob.type !== type ? blob.type : type; // 浏览器自动换了格式
      const useOriginal = blob.size >= it.file.size; // 压缩后反而更大：直接保留原图，下载的也是原图
      it.res = { blob, type: t, w: cw, h: ch, useOriginal };
    } finally { src.close(); cv.width = cv.height = 1; /* 立刻释放画布内存，手机上很重要 */ }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(runAll, 220); imgs.forEach(i => { if (i.state !== "err") { i.state = "wait"; paint(i); } }); }
  async function runAll() {
    const tk = ++token, o = opt();
    for (const it of imgs.slice()) {
      if (tk !== token) return; if (it.state === "err" || !imgs.includes(it)) continue; it.state = "work"; paint(it);
      try { await compressOne(it, o); if (tk !== token) return; it.state = "done"; }
      catch (e) { it.state = "err"; it.err = (e && e.message === "decode") || (e && e.message === "img") || (e && e.name === "InvalidStateError") ? DECODE_ERR : "压缩失败：" + (e && e.message || e); if (!it.thumb) it.err = DECODE_ERR; }
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
     手机端的关键：只用页面上这一个 <video>（既当预览又当截帧源），所有读取/跳转都排队执行，
     并且先“静音播放一下再暂停”把第一帧解出来（iOS 不这样做，跳转后画面是黑的/不更新）。
     ===================================================================== */
  const MAXDUR = 30, MAXF = 240;   // 截取最长 30 秒；最多 240 帧（再多手机会很慢、文件也会过大）
  let vurl = null, vfile = null, vw = 0, vh = 0, vdur = 0, busy = false, cancelled = false, estT = 0, estTk = 0, pvTk = 0, wake = null;
  const vid = $("gifVid"); vid.muted = true; vid.setAttribute("playsinline", ""); vid.setAttribute("webkit-playsinline", "");
  const gc = document.createElement("canvas"), gx = gc.getContext("2d", { willReadFrequently: true });
  const r1 = x => Math.round(x * 10) / 10, f1 = x => Math.floor(x * 10 + 1e-6) / 10;
  const isVideo = f => /^video\//.test(f.type) || /\.(mp4|mov|webm|m4v|mkv|3gp|avi|mpg|mpeg)$/i.test(f.name);
  let vq = Promise.resolve();   // 视频操作队列：预览跳转、估算大小、正式转换一个接一个，绝不同时抢同一个 <video>
  const vrun = fn => { const p = vq.then(fn); vq = p.catch(() => { }); return p; };
  const gopt = () => { const Wi = +$("gifW").value, fps = +$("gifFps").value, span = +$("gifDur").value, start = +$("gifStart").value, W = Math.min(Wi, vw) || Wi; return { W, H: Math.max(2, Math.round(W * vh / vw)), fps, span, start, n: Math.max(1, Math.round(span * fps)), colors: +$("gifCol").value, loop: +$("gifLoop").value, dither: $("gifDither").checked }; };
  const setLoad = (msg, kind) => { const p = $("gifLoad"); p.hidden = !msg; p.className = "load" + (kind === "err" ? " err" : ""); p.innerHTML = (kind === "spin" ? '<span class="spin"></span>' : "") + (msg || ""); };

  /* 等视频读到时长和尺寸；带超时，永远不会“没反应” */
  function waitVideo(v, ms) {
    return new Promise((ok, no) => {
      let done = false; const evs = ["loadedmetadata", "loadeddata", "canplay", "durationchange", "error"];
      const fin = (f, a) => { if (done) return; done = true; clearTimeout(to); evs.forEach(e => v.removeEventListener(e, h)); f(a); };
      const h = e => { if (e && e.type === "error") fin(no, new Error("decode")); else if (v.videoWidth > 0 && v.duration > 0) fin(ok); };
      const to = setTimeout(() => fin(no, new Error("timeout")), ms);
      evs.forEach(e => v.addEventListener(e, h));
    });
  }
  /* 静音播放一小下再暂停：让手机浏览器真正把画面解码出来 */
  async function warm(v) { try { v.muted = true; await Promise.race([v.play(), sleep(1500)]); } catch (e) { } v.pause(); await sleep(60); }

  bindDrop($("gifDrop"), $("gifIn"), loadVideo);
  async function loadVideo(files) {
    if (busy) return toast("正在转换中，请等转换完成后再换视频");
    const f = files.find(isVideo) || (files.length === 1 && !files[0].type ? files[0] : null);
    if (!f) return toast("请选择视频文件（MP4 / WebM / MOV）");
    estTk++; clearTimeout(estT); pvTk++; await vq;   // 等上一个视频的操作收尾
    setLoad("正在读取视频…（较大的视频要等几秒）", "spin"); $("gifBody").hidden = true; $("gifRes").hidden = true; $("gifStatus").textContent = "";
    vid.pause(); if (vurl) URL.revokeObjectURL(vurl); vfile = f; vurl = URL.createObjectURL(f);
    const ready = waitVideo(vid, 15000); vid.preload = "auto"; vid.src = vurl; try { vid.load(); } catch (e) { }
    try { await ready; }
    catch (e) {
      vurl && URL.revokeObjectURL(vurl); vurl = null; vid.removeAttribute("src"); try { vid.load(); } catch (e2) { }
      return setLoad(e.message === "timeout" ? "读取视频超时了。可能是视频太大，或者这个浏览器不支持它的编码（比如 H.265/HEVC 的 MOV 在部分安卓手机上打不开）。建议换成 MP4(H.264)，或换个浏览器再试。" : "这个浏览器无法解码这个视频。请换 MP4（H.264）或 WebM，或换个浏览器再试。", "err");
    }
    vw = vid.videoWidth; vh = vid.videoHeight; vdur = vid.duration;
    if (!(vw > 0 && vh > 0 && vdur > 0 && isFinite(vdur))) { vurl && URL.revokeObjectURL(vurl); vurl = null; return setLoad("无法读取这个视频的尺寸或时长，请换一个视频试试。", "err"); }
    await warm(vid); await vrun(() => seek(vid, 0));
    setLoad("");
    const minD = Math.min(.5, f1(vdur));
    $("gifStart").min = 0; $("gifStart").max = Math.max(0, f1(vdur - minD)); $("gifDur").min = minD; $("gifDur").max = Math.max(minD, Math.min(MAXDUR, f1(vdur)));
    $("gifBody").hidden = false;
    $("gifMeta").textContent = f.name + "　" + vw + " × " + vh + "　" + vdur.toFixed(1) + " 秒　" + fmtMB(f.size);
    setTimes(0, Math.min(4, vdur));
    if (vdur > MAXDUR) toast("视频较长，请用“起始时间”和“截取时长”选出想转换的片段");
    $("gifBody").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- 起始时间 / 截取时长：滑块、数字框、快捷按钮、“以当前画面为起点/终点”，互相同步 ---------- */
  function refreshInfo() {
    const o = gopt(), st = +$("gifStart").value, du = +$("gifDur").value, over = o.n > MAXF;
    const sel = $("tlSel"); sel.style.left = (st / vdur * 100) + "%"; sel.style.width = Math.max(1, du / vdur * 100) + "%";
    $("tlInfo").textContent = "已选片段：" + st.toFixed(1) + " 秒 → " + r1(st + du).toFixed(1) + " 秒　（共 " + du.toFixed(1) + " 秒，约 " + o.n + " 帧）";
    $("gifGo").disabled = over || busy;
    if (over) { $("gifEst").className = "est warn"; $("gifEst").textContent = "帧数太多（" + o.n + " 帧，最多 " + MAXF + " 帧）：请缩短时长或降低帧率"; }
    return !over;
  }
  function setTimes(st, du) {
    const minD = Math.min(.5, f1(vdur));
    st = clamp(r1(st), 0, Math.max(0, f1(vdur - minD)));
    du = clamp(r1(du), minD, Math.max(minD, Math.min(MAXDUR, f1(vdur - st))));
    $("gifStart").value = st; $("gifDur").value = du; $("stv").value = st.toFixed(1); $("dtv").value = du.toFixed(1);
    if (refreshInfo()) estimateLater();
    return { st, du };
  }
  const num = s => { const x = parseFloat(String(s).replace(",", ".")); return isFinite(x) ? x : NaN; };
  const curT = () => ({ st: +$("gifStart").value, du: +$("gifDur").value });
  function preview(t) { const tk = ++pvTk; if (busy) return; vrun(async () => { if (tk !== pvTk || busy) return; vid.pause(); await seek(vid, t); }); }
  $("gifStart").oninput = () => { const c = curT(), r = setTimes(c.st, c.du); $("stv").value = r.st.toFixed(1); };
  $("gifDur").oninput = () => { const c = curT(); setTimes(c.st, c.du); };
  $("gifStart").onchange = () => preview(+$("gifStart").value);
  $("stv").onchange = () => { const c = curT(), x = num($("stv").value), r = setTimes(isNaN(x) ? c.st : x, c.du); if (!isNaN(x) && Math.abs(r.st - x) > .05) toast("起点已调整为 " + r.st.toFixed(1) + " 秒（不能超出视频长度）"); preview(r.st); };
  $("dtv").onchange = () => { const c = curT(), x = num($("dtv").value), r = setTimes(c.st, isNaN(x) ? c.du : x); if (!isNaN(x) && Math.abs(r.du - x) > .05) toast("时长已调整为 " + r.du.toFixed(1) + " 秒（最长 " + MAXDUR + " 秒，且不能超出视频结尾）"); };
  $("durChips").querySelectorAll("button").forEach(b => { b.onclick = () => { const c = curT(), r = setTimes(c.st, +b.dataset.d); if (Math.abs(r.du - +b.dataset.d) > .05) toast("视频剩余不够，时长已调整为 " + r.du.toFixed(1) + " 秒"); }; });
  $("setStart").onclick = () => { const t = r1(vid.currentTime), c = curT(), r = setTimes(t, c.du); toast("起点设为 " + r.st.toFixed(1) + " 秒" + (r.du < c.du - .05 ? "，时长已缩短为 " + r.du.toFixed(1) + " 秒" : "")); };
  $("setEnd").onclick = () => { const t = r1(vid.currentTime), c = curT(); if (t < c.st + .5) return toast("终点要比起点至少晚 0.5 秒，请先把播放条拖到更靠后的位置"); const r = setTimes(c.st, t - c.st); toast("终点设为 " + r1(r.st + r.du).toFixed(1) + " 秒" + (r.du < t - c.st - .05 ? "（最长 " + MAXDUR + " 秒，已自动截短）" : "")); };
  ["gifW", "gifFps", "gifCol", "gifLoop", "gifDither"].forEach(i => { $(i).onchange = () => { if (refreshInfo()) estimateLater(); }; });

  /* ---------- 跳到某一秒并等画面真的出来 ---------- */
  function seek(v, t) {
    t = clamp(t, 0, Math.max(0, vdur - .04));
    return new Promise(res => {
      const shown = async () => { await Promise.race([new Promise(r => requestAnimationFrame(() => r())), sleep(60)]); res(); };
      if (Math.abs(v.currentTime - t) < .001 && v.readyState >= 2) return shown();
      let done = false; const fin = () => { if (done) return; done = true; clearTimeout(to); v.removeEventListener("seeked", fin); shown(); };
      const to = setTimeout(fin, 3000); v.addEventListener("seeked", fin); v.currentTime = t;
    });
  }
  function grab(o) { gc.width = o.W; gc.height = o.H; gx.drawImage(vid, 0, 0, o.W, o.H); return gx.getImageData(0, 0, o.W, o.H).data; }

  /* 预估大小：取 3 帧真的编码一下，按帧数推算 */
  function estimateLater() { clearTimeout(estT); if (busy) return; $("gifEst").className = "est"; $("gifEst").textContent = "预计大小：计算中…"; estT = setTimeout(() => vrun(estimate), 700); }
  async function estimate() {
    if (busy || !vurl) return; const tk = ++estTk, o = gopt(); if (o.n > MAXF) return;
    try {
      vid.pause(); const k = Math.min(3, o.n), fr = []; for (let i = 0; i < k; i++) { await seek(vid, o.start + (i + .5) * o.span / k); if (tk !== estTk || busy) return; fr.push(new Uint8ClampedArray(grab(o))); }
      const pal = GifKit.buildPalette(fr, o.colors), w = new GifKit.Writer(o.W, o.H, pal, o.loop), base = w.size; fr.forEach(f => w.addFrame(GifKit.mapFrame(f, o.W, o.H, pal.lut, o.dither), 5)); const per = (w.size - base) / k, est = base + per * o.n;
      if (tk !== estTk) return; $("gifEst").innerHTML = "预计大小：约 <b>" + fmtMB(est) + "</b>（" + o.n + " 帧，" + o.W + " × " + o.H + "）" + (est > 15 * MB ? "　⚠ 偏大，建议减小宽度、帧率或时长" : ""); $("gifEst").classList.toggle("warn", est > 15 * MB);
      await seek(vid, o.start);   // 预览回到起点
    } catch (e) { if (tk === estTk) $("gifEst").textContent = "预计大小：暂时无法估算"; }
  }

  const lockUI = on => { $("gifBody").querySelectorAll("input,select,.btn:not(#gifCancel),.chips button").forEach(x => { if (x.id !== "gifGo") x.disabled = on; }); $("gifBody").querySelector(".vidc").classList.toggle("busy", on); $("gifGo").disabled = on; };
  $("gifGo").onclick = () => {
    if (busy || !vurl) return; const o = gopt(); if (o.n > MAXF) return toast("帧数过多（最多 " + MAXF + " 帧），请缩短时长或降低帧率");
    busy = true; cancelled = false; estTk++; clearTimeout(estT); pvTk++; lockUI(true); $("gifCancel").hidden = false; $("gifProg").hidden = false; $("gifRes").hidden = true; setProg(0, "正在准备…"); vid.pause();
    try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(l => { wake = l; }, () => { }); } catch (e) { }   // 转换时尽量不让手机息屏
    vrun(async () => {
      try {
        setProg(0, "正在分析颜色…");
        const k = Math.min(8, o.n), samp = []; // 第一遍：取样几帧，算出一套共用调色板
        for (let i = 0; i < k; i++) { if (cancelled) throw 0; await seek(vid, o.start + (i + .5) * o.span / k); samp.push(new Uint8ClampedArray(grab(o))); setProg(.1 * (i + 1) / k, "正在分析颜色…"); }
        const pal = GifKit.buildPalette(samp, o.colors); samp.length = 0; const w = new GifKit.Writer(o.W, o.H, pal, o.loop), delay = Math.max(2, Math.round(100 / o.fps));
        for (let i = 0; i < o.n; i++) { // 第二遍：逐帧截图 → 映射颜色 → 压缩写入
          if (cancelled) throw 0; await seek(vid, o.start + i / o.fps); w.addFrame(GifKit.mapFrame(grab(o), o.W, o.H, pal.lut, o.dither), delay); setProg(.1 + .9 * (i + 1) / o.n, "正在处理第 " + (i + 1) + " / " + o.n + " 帧…"); if (i % 2) await sleep(0);
        }
        const blob = w.finish(), url = URL.createObjectURL(blob); if ($("gifOut").dataset.u) URL.revokeObjectURL($("gifOut").dataset.u); $("gifOut").src = url; $("gifOut").dataset.u = url; $("gifDl").href = url; $("gifDl").download = stripExt(vfile.name) + ".gif";
        $("gifResInfo").innerHTML = "转换完成<br>文件大小 <b>" + fmtMB(blob.size) + "</b><br>" + o.W + " × " + o.H + "　" + o.n + " 帧　" + o.fps + " 帧/秒　" + o.span.toFixed(1) + " 秒" + (blob.size > 15 * MB ? '<br><span style="color:#d1573b">文件偏大，可以减小宽度/帧率/时长后重试</span>' : "");
        $("gifRes").hidden = false; setProg(1, "完成"); $("gifRes").scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (e) { setProg(0, e === 0 ? "已取消" : "转换失败：" + (e && e.message || e)); if (e !== 0) toast("转换失败，请换个视频或降低设置再试"); }
      finally {
        busy = false; lockUI(false); refreshInfo(); $("gifCancel").hidden = true; try { wake && wake.release(); } catch (e) { } wake = null; setTimeout(() => { if (!busy) $("gifProg").hidden = true; }, 800);
        try { await seek(vid, +$("gifStart").value); } catch (e) { } estimateLater();
      }
    });
  };
  $("gifCancel").onclick = () => { cancelled = true; };
  function setProg(p, t) { $("gifBar").style.width = Math.round(p * 100) + "%"; $("gifStatus").textContent = t; }
  window.__tools = { addImages, imgs, GifKit: window.GifKit, loadVideo, setTimes };
})();
