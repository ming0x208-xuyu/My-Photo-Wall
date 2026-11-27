/* ============ 私人后台：手机上传照片 → 自动同步到网站 ============
   流程：登录（密码）→ 选照片 → 浏览器里先去掉位置信息 → 逐张发给后台 Worker → Worker 转交 GitHub
        → 全部发完后“合并成一次提交” → GitHub Actions 自动生成缩略图 → Cloudflare 自动部署。 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id), sleep = ms => new Promise(r => setTimeout(r, ms));
  const API = (window.ADMIN_API || "/api/admin").replace(/\/+$/, "");
  const KEY = "pw_admin_token", CATKEY = "pw_admin_cat";
  const MB = 1048576, MAXN = 40, MAXSIZE = 25 * MB;
  const fmtMB = b => b >= MB / 10 ? (b / MB).toFixed(2) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get: k => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } } };
  let tto; const toast = m => { const t = $("toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tto); tto = setTimeout(() => t.classList.remove("on"), 3400); };
  let token = store.get(KEY), cats = [], known = new Set(), busy = false, wake = null;

  /* ---------- 请求 ---------- */
  async function api(path, opt = {}) {
    const r = await fetch(API + path, { method: opt.json ? "POST" : "GET", headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(opt.json ? { "Content-Type": "application/json" } : {}) }, body: opt.json ? JSON.stringify(opt.json) : undefined });
    let d = {}; try { d = await r.json(); } catch (e) { }
    if (r.status === 401 && path !== "/login") { logout(); throw Object.assign(new Error("登录已失效，请重新登录"), { auth: true }); }
    if (r.status === 404 || r.status === 405) throw Object.assign(new Error("没有连上后台 Worker（返回 " + r.status + "）：Cloudflare 里的路由「你的域名/api/admin/*」还没生效，或没有指向 photo-admin。请按 ADMIN-README 第 3 步第 6 点检查。"), { status: r.status, data: d, route: true });
    if (!r.ok) throw Object.assign(new Error(d.message || d.error || "请求失败（" + r.status + "）"), { status: r.status, data: d });
    return d;
  }

  /* ---------- 登录 / 退出 ---------- */
  function showLogin(msg) { $("app").hidden = true; $("loginBox").hidden = false; $("pwErr").hidden = !msg; $("pwErr").textContent = msg || ""; }
  function logout() { token = ""; store.del(KEY); showLogin(); }
  async function enter() { $("loginBox").hidden = true; $("app").hidden = false; await refreshCats(); }
  async function login() {
    const pw = $("pw").value; if (!pw) return;
    $("pwGo").disabled = true; $("pwErr").hidden = true;
    try { const d = await api("/login", { json: { password: pw } }); token = d.token; store.set(KEY, token); $("pw").value = ""; await enter(); }
    catch (e) { $("pwErr").hidden = false; $("pwErr").textContent = e.status === 401 && e.data && e.data.left != null ? "密码不对（还可以再试 " + e.data.left + " 次）" : e.message; }
    finally { $("pwGo").disabled = false; }
  }
  $("pwGo").onclick = login; $("pw").onkeydown = e => { if (e.key === "Enter") login(); };
  $("logout").onclick = () => { logout(); toast("已退出登录"); };

  /* ---------- 标签 ---------- */
  document.querySelectorAll(".tabs button").forEach(b => { b.onclick = () => { document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("on", x === b)); document.querySelectorAll(".panel").forEach(p => p.classList.toggle("on", p.id === b.dataset.tab)); if (b.dataset.tab === "mg") loadManage(); }; });

  /* ---------- 分类 ---------- */
  let curCat = store.get(CATKEY);   // "" = 不分类；"__new" = 新建
  const cleanCat = s => String(s || "").replace(/[\\\/:*?"<>|\x00-\x1f]/g, "").replace(/^[.\s]+|\s+$/g, "").slice(0, 30);
  function renderCats() {
    const box = $("catChips"); box.replaceChildren();
    const add = (label, val) => { const b = el("button", curCat === val ? "on" : ""); b.type = "button"; b.textContent = label; b.onclick = () => { curCat = val; store.set(CATKEY, val === "__new" ? "" : val); renderCats(); if (val === "__new") $("newCat").focus(); }; box.append(b); };
    add("不分类", ""); cats.forEach(c => add(c, c)); add("＋ 新分类", "__new");
    $("newCatBox").hidden = curCat !== "__new";
  }
  async function refreshCats() {
    try { const d = await api("/list"); cats = d.categories || []; known = new Set((d.photos || []).map(p => p.path)); if (curCat && curCat !== "__new" && !cats.includes(curCat)) curCat = ""; }
    catch (e) { if (!e.auth) toast("读取分类失败：" + e.message); }
    renderCats();
  }
  const pickedCat = () => curCat === "__new" ? cleanCat($("newCat").value) : curCat;

  /* ---------- 选择照片 ---------- */
  const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", avif: "image/avif", bmp: "image/bmp", gif: "image/gif" };
  const mime = f => f.type || MIME[(f.name.split(".").pop() || "").toLowerCase()] || "";
  const items = []; let uid = 0;
  function bindDrop(drop, input, onFiles) {   // 和工具箱一样：input 透明铺满选择区，手机上直接点到它
    drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } };
    input.onclick = () => { input.value = ""; };
    input.onchange = () => { const fs = [...input.files]; if (fs.length) onFiles(fs); };
    ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", e => { const fs = [...e.dataTransfer.files]; if (fs.length) onFiles(fs); });
  }
  bindDrop($("upDrop"), $("upIn"), addFiles);
  function addFiles(files) {
    if (busy) return toast("正在上传，请稍候");
    $("upDone").hidden = true;
    let skipped = 0;
    for (const f of files) {
      const t = mime(f);
      if (!/^image\//.test(t) || /gif|svg/.test(t)) { skipped++; continue; }
      if (items.length >= MAXN) { toast("一次最多 " + MAXN + " 张"); break; }
      if (f.size > MAXSIZE) { toast(f.name + " 超过 25MB，已跳过"); continue; }
      const it = { id: ++uid, file: f, state: "wait", pct: 0, node: null, url: URL.createObjectURL(f) }; items.push(it); it.node = makeNode(it); $("upList").append(it.node); paint(it);
    }
    if (skipped) toast("已跳过 " + skipped + " 个不支持的文件（GIF / 非图片）");
    sync();
  }
  function makeNode(it) {
    const n = el("div", "it", '<img alt="" decoding="async"><div class="mid"><div class="nm"></div><div class="sz"></div><div class="mini" hidden><i></i></div></div><div class="act"><button class="x" type="button">移除</button></div>');
    n.querySelector("img").src = it.url; n.querySelector(".nm").textContent = it.file.name;
    n.querySelector(".x").onclick = () => { if (busy) return; const i = items.indexOf(it); if (i >= 0) items.splice(i, 1); URL.revokeObjectURL(it.url); n.remove(); sync(); };
    return n;
  }
  const LABEL = { wait: "等待上传", prep: "正在处理…", up: "正在上传…", ok: "已提交 ✓", err: "失败" };
  function paint(it) {
    const sz = it.node.querySelector(".sz"), mini = it.node.querySelector(".mini");
    sz.className = "sz" + (it.state === "ok" ? " ok" : it.state === "err" ? " er" : "");
    sz.innerHTML = (it.state === "prep" || it.state === "up" ? '<span class="spin"></span>' : "") + esc(it.state === "err" ? (it.err || "失败") : (LABEL[it.state] + (it.state === "up" ? " " + Math.round(it.pct * 100) + "%" : "")) + "　" + fmtMB(it.file.size)) + (it.gps ? "　· 已去除位置信息" : "");
    mini.hidden = it.state !== "up"; mini.firstChild.style.width = Math.round(it.pct * 100) + "%";
  }
  function sync() {
    const n = items.filter(i => i.state !== "ok").length;
    $("upCtl").hidden = !items.length; $("upCount").textContent = "已选 " + items.length + " 张，" + fmtMB(items.reduce((s, i) => s + i.file.size, 0));
    $("upGo").disabled = busy || !n; $("upGo").textContent = busy ? "上传中…" : "上传 " + n + " 张"; $("upClear").disabled = busy;
  }
  $("upClear").onclick = () => { if (busy) return; items.forEach(i => URL.revokeObjectURL(i.url)); items.length = 0; $("upList").replaceChildren(); $("upProg").hidden = true; $("upStatus").textContent = ""; sync(); };

  /* ---------- 去掉 JPEG 里的 GPS 位置（只清空 GPS 那一块，拍摄时间、相机型号等保留）---------- */
  function wipeGps(u, t0, end) {
    if (t0 + 8 > end) return false;
    const le = u[t0] === 0x49 && u[t0 + 1] === 0x49, be = u[t0] === 0x4D && u[t0 + 1] === 0x4D; if (!le && !be) return false;
    const r16 = o => le ? (u[o] | (u[o + 1] << 8)) : ((u[o] << 8) | u[o + 1]);
    const r32 = o => (le ? (u[o] | (u[o + 1] << 8) | (u[o + 2] << 16) | (u[o + 3] << 24)) : ((u[o] << 24) | (u[o + 1] << 16) | (u[o + 2] << 8) | u[o + 3])) >>> 0;
    if (r16(t0 + 2) !== 42) return false;
    const ifd0 = t0 + r32(t0 + 4); if (ifd0 + 2 > end) return false;
    let gpsOff = 0; const n0 = r16(ifd0);
    for (let i = 0; i < n0; i++) { const e = ifd0 + 2 + i * 12; if (e + 12 > end) return false; if (r16(e) === 0x8825) { gpsOff = r32(e + 8); break; } }
    if (!gpsOff) return false;
    const g = t0 + gpsOff; if (g + 2 > end) return false;
    const n = r16(g), SZ = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
    for (let i = 0; i < n; i++) {
      const e = g + 2 + i * 12; if (e + 12 > end) break;
      const sz = (SZ[r16(e + 2)] || 1) * r32(e + 4);
      if (sz > 4) { const o = t0 + r32(e + 8); if (o >= t0 && o + sz <= end) u.fill(0, o, o + sz); }   // 经纬度数值本体
      u.fill(0, e, e + 12);                                                                              // 条目本身
    }
    u[g] = 0; u[g + 1] = 0;                                                                              // GPS 目录改成“空”
    return n > 0;
  }
  function stripJpegGps(buf) {
    const u = new Uint8Array(new Uint8Array(buf)); let removed = false;   // 复制一份再改，不动原文件
    if (u[0] !== 0xFF || u[1] !== 0xD8) return { buf, removed: false };
    let p = 2;
    while (p + 4 <= u.length) {
      if (u[p] !== 0xFF) break; const m = u[p + 1];
      if (m === 0xFF) { p++; continue; } if (m === 0xDA || m === 0xD9) break; if (m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { p += 2; continue; }
      const len = (u[p + 2] << 8) | u[p + 3]; if (len < 2) break; const end = Math.min(u.length, p + 2 + len);
      if (m === 0xE1 && u[p + 4] === 0x45 && u[p + 5] === 0x78 && u[p + 6] === 0x69 && u[p + 7] === 0x66 && u[p + 8] === 0 && u[p + 9] === 0 && wipeGps(u, p + 10, end)) removed = true;
      p += 2 + len;
    }
    return { buf: u.buffer, removed };
  }

  /* ---------- 其它格式（HEIC 等）转成 JPEG ---------- */
  function toJpegBlob(file) {
    return new Promise((ok, no) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => {
        try {
          const k = Math.min(1, Math.sqrt(16e6 / (im.naturalWidth * im.naturalHeight))), c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
          const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
          c.toBlob(b => { URL.revokeObjectURL(url); c.width = c.height = 1; b ? ok(b) : no(new Error("转换失败")); }, "image/jpeg", .92);
        } catch (e) { URL.revokeObjectURL(url); no(e); }
      };
      im.onerror = () => { URL.revokeObjectURL(url); no(new Error("这张图片格式浏览器读不了（HEIC 请先在相册里“导出为 JPG”）")); };
      im.src = url;
    });
  }
  async function prepare(it, strip) {
    const t = mime(it.file);
    if (/^image\/(jpeg|png|webp)$/.test(t)) {
      let buf = await it.file.arrayBuffer(), gps = false;
      if (t === "image/jpeg" && strip) { const r = stripJpegGps(buf); buf = r.buf; gps = r.removed; }
      return { buf, ext: t === "image/png" ? "png" : t === "image/webp" ? "webp" : "jpg", gps };
    }
    return { buf: await (await toJpegBlob(it.file)).arrayBuffer(), ext: "jpg", gps: false };
  }

  /* ---------- 上传一张：做成 GitHub 要的格式，用 XHR 发给 Worker（能显示进度）---------- */
  function b64(buf) { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  function sendBlob(buf, onProg) {
    return new Promise((ok, no) => {
      const body = new Blob(['{"encoding":"base64","content":"', b64(buf), '"}'], { type: "application/json" }), x = new XMLHttpRequest();
      x.open("POST", API + "/blob"); x.setRequestHeader("Authorization", "Bearer " + token); x.setRequestHeader("Content-Type", "application/json"); x.timeout = 240000;
      x.upload.onprogress = e => { if (e.lengthComputable) onProg(e.loaded / e.total); };
      x.onload = () => { let d = {}; try { d = JSON.parse(x.responseText); } catch (e) { } if (x.status === 401) return no(Object.assign(new Error("登录已失效，请重新登录"), { auth: true })); x.status >= 200 && x.status < 300 && d.sha ? ok(d.sha) : no(new Error(d.message || d.error || "上传失败（" + x.status + "）")); };
      x.onerror = () => no(new Error("网络中断，请检查网络后重试")); x.ontimeout = () => no(new Error("上传超时")); x.send(body);
    });
  }
  const pad = n => String(n).padStart(2, "0");
  function makePath(cat, ext, seq) {
    const d = new Date(), r = Math.random().toString(16).slice(2, 6).padEnd(4, "0");
    const name = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + "-" + r + seq + "." + ext;   // 数字开头的名字，网站会自动起好听的标题
    return "photos/" + (cat ? cat + "/" : "") + name;
  }

  $("upGo").onclick = async () => {
    if (busy) return; const todo = items.filter(i => i.state !== "ok"); if (!todo.length) return;
    if (curCat === "__new" && !pickedCat()) return toast("请先输入新分类的名字");
    const cat = pickedCat(), strip = $("optGps").checked, total = todo.reduce((s, i) => s + i.file.size, 0); let doneBytes = 0, seq = 0;
    busy = true; sync(); $("upDone").hidden = true; $("upProg").hidden = false; $("upBar").style.width = "0%";
    try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then(l => { wake = l; }, () => { }); } catch (e) { }
    const added = [];
    try {
      for (let k = 0; k < todo.length; k++) {
        const it = todo[k]; $("upStatus").textContent = "正在上传第 " + (k + 1) + " / " + todo.length + " 张…（请保持页面打开）";
        try {
          it.state = "prep"; it.pct = 0; it.err = ""; paint(it); await sleep(0);
          const p = await prepare(it, strip); it.gps = p.gps; it.path = makePath(cat, p.ext, seq++ ? "-" + seq : "");
          it.state = "up"; paint(it);
          for (let t = 1; ; t++) {
            try { it.sha = await sendBlob(p.buf, v => { it.pct = v; paint(it); $("upBar").style.width = Math.round((doneBytes + it.file.size * v) / total * 100) + "%"; }); break; }
            catch (e) { if (e.auth || t >= 3) throw e; await sleep(900 * t); }
          }
          it.pct = 1; doneBytes += it.file.size; added.push(it); paint(it);
        } catch (e) { if (e.auth) throw e; it.state = "err"; it.err = e.message; it.sha = null; doneBytes += it.file.size; paint(it); }
      }
      if (added.length) {
        $("upStatus").textContent = "正在提交到 GitHub…"; $("upBar").style.width = "100%";
        try { await api("/commit", { json: { add: added.map(i => ({ path: i.path, sha: i.sha })), message: "后台上传 " + added.length + " 张照片" + (cat ? "（" + cat + "）" : "") } }); }
        catch (e) { if (e.auth) throw e; added.forEach(i => { i.state = "err"; i.err = "提交失败：" + e.message + "（点“上传”可重试）"; i.sha = null; paint(i); }); throw e; }
        added.forEach(i => { i.state = "ok"; known.add(i.path); paint(i); });
        $("upStatus").textContent = ""; showDone(added); if (cat && !cats.includes(cat)) { cats.push(cat); cats.sort(); curCat = cat; store.set(CATKEY, cat); renderCats(); }
      } else $("upStatus").textContent = "没有照片上传成功，请看每张照片下面的原因";
    } catch (e) { if (!e.auth) { $("upStatus").textContent = e.message; toast(e.message); } else toast(e.message); }
    finally { busy = false; try { wake && wake.release(); } catch (e) { } wake = null; sync(); setTimeout(() => { if (!busy) $("upProg").hidden = true; }, 1200); }
  };

  /* ---------- 上传成功后：自动检查网站是否已经更新 ---------- */
  let watchTk = 0;
  function showDone(list) {
    $("upDone").hidden = false; $("dn1").textContent = "✓ 已提交 " + list.length + " 张照片到 GitHub";
    $("dn2").innerHTML = '<span class="spin"></span>正在等待网站更新…（通常 1–3 分钟，期间可以放心关掉这个页面）';
    $("upDone").scrollIntoView({ behavior: "smooth", block: "nearest" }); watchOnline(list.map(i => i.path));
  }
  async function watchOnline(paths) {
    const tk = ++watchTk, t0 = Date.now();
    while (tk === watchTk && Date.now() - t0 < 8 * 60 * 1000) {
      await sleep(10000); if (tk !== watchTk) return;
      try { const t = await (await fetch("photos.js?_=" + Date.now(), { cache: "no-store" })).text(); if (paths.every(p => t.includes(p))) { $("dn2").innerHTML = '<b>网站已更新 ✓</b>　<a href="index.html" style="color:var(--acc)">去首页看看</a>'; return; } } catch (e) { }
    }
    if (tk === watchTk) $("dn2").textContent = "超过 8 分钟还没看到更新。可能是 GitHub Actions 还在运行或出错了，请到 GitHub 仓库的 Actions 页面查看。";
  }

  /* ---------- 管理：查看 / 删除 ---------- */
  let sel = new Set();
  async function loadBuilt() {
    try { const t = await (await fetch("photos.js?_=" + Date.now(), { cache: "no-store" })).text(); const w = {}; new Function("window", t)(w); return w.PHOTOS_BUILT || []; } catch (e) { return []; }
  }
  async function loadManage() {
    $("mgCount").textContent = "读取中…"; $("mgGrid").replaceChildren(); sel.clear(); updDel();
    try {
      const [d, built] = await Promise.all([api("/list"), loadBuilt()]);
      cats = d.categories || []; known = new Set(d.photos.map(p => p.path)); renderCats();
      const order = new Map(built.map((b, i) => [b.src, i])), thumb = new Map(built.map(b => [b.src, b.thumb]));
      const list = d.photos.slice().sort((a, b) => (order.has(a.path) ? order.get(a.path) : -1) - (order.has(b.path) ? order.get(b.path) : -1));   // 还在处理中的排最前面
      const total = list.reduce((s, p) => s + p.size, 0);
      $("mgCount").textContent = "共 " + list.length + " 张，原图合计 " + fmtMB(total) + (total > 700 * MB ? "（仓库快到 1GB 的建议上限了）" : "");
      for (const p of list) {
        const seg = p.path.split("/"), name = seg[seg.length - 1], cat = seg.length === 3 ? seg[1] : "未分类";
        const n = el("div", "mi"); n.dataset.path = p.path;
        if (thumb.has(p.path)) { const im = new Image(); im.alt = ""; im.loading = "lazy"; im.decoding = "async"; im.src = thumb.get(p.path); n.append(im); } else n.append(el("div", "ph", "处理中…<br>稍后刷新"));
        n.append(el("div", "cap", "<b>" + esc(cat) + "</b>" + esc(name.length > 22 ? name.slice(0, 10) + "…" + name.slice(-9) : name) + "<br>" + fmtMB(p.size)));
        n.onclick = () => { if (sel.has(p.path)) { sel.delete(p.path); n.classList.remove("on"); } else { sel.add(p.path); n.classList.add("on"); } updDel(); };
        $("mgGrid").append(n);
      }
      if (!list.length) $("mgGrid").innerHTML = '<p class="tip" style="grid-column:1/-1;text-align:center;padding:30px 0">还没有照片</p>';
    } catch (e) { if (!e.auth) $("mgCount").textContent = "读取失败：" + e.message; }
  }
  const updDel = () => { $("mgDel").disabled = !sel.size; $("mgDel").textContent = sel.size ? "删除选中（" + sel.size + "）" : "删除选中"; };
  $("mgRefresh").onclick = loadManage;
  $("mgDel").onclick = async () => {
    const del = [...sel]; if (!del.length) return;
    if (!confirm("确定删除选中的 " + del.length + " 张照片吗？\n原图和缩略图都会从网站移除（GitHub 的提交历史里仍可找回）。")) return;
    $("mgDel").disabled = true; $("mgDel").textContent = "删除中…";
    try { await api("/commit", { json: { del, message: "后台删除 " + del.length + " 张照片" } }); toast("已提交删除，网站约 1–3 分钟后更新"); document.querySelectorAll("#mgGrid .mi").forEach(n => { if (sel.has(n.dataset.path)) n.remove(); }); del.forEach(p => known.delete(p)); sel.clear(); updDel(); $("mgCount").textContent = "已提交删除，网站约 1–3 分钟后更新（点“刷新”可重新读取）"; }
    catch (e) { if (!e.auth) toast("删除失败：" + e.message); updDel(); }
  };

  /* ---------- 启动 ---------- */
  (async () => {
    if (!token) return showLogin();
    try { await api("/ping"); await enter(); }
    catch (e) { if (!e.auth) { showLogin("暂时连不上后台：" + e.message); } }
  })();
  window.__admin = { stripJpegGps, items };
})();
