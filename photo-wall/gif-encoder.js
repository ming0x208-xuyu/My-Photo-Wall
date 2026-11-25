/* ============================================================
   GIF 编码器（纯 JavaScript，无依赖）：颜色量化（中位切分）+ LZW 压缩 + GIF89a 写入
   - 全局调色板：先从若干帧里取样算出一套 64/128/256 色调色板，所有帧共用，文件更小、颜色更稳定
   - 抖动：可选 4×4 有序抖动，让渐变更平滑（文件会略大）
   ============================================================ */
(function (root) {
  "use strict";
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  /** 由取样像素（RGBA 数据）生成调色板和 15 位颜色查找表 */
  function buildPalette(samples, colors) {
    const hist = new Uint32Array(32768);
    for (const px of samples) for (let i = 0; i < px.length; i += 4) hist[(px[i] >> 3) << 10 | (px[i + 1] >> 3) << 5 | px[i + 2] >> 3]++;
    const cells = []; for (let c = 0; c < 32768; c++) if (hist[c]) cells.push(c);
    const rc = c => c >> 10, gc = c => c >> 5 & 31, bc = c => c & 31, chv = [rc, gc, bc];
    const info = list => { let mn = [31, 31, 31], mx = [0, 0, 0], tot = 0; for (const c of list) { const v = [rc(c), gc(c), bc(c)]; for (let k = 0; k < 3; k++) { if (v[k] < mn[k]) mn[k] = v[k]; if (v[k] > mx[k]) mx[k] = v[k]; } tot += hist[c]; } const sp = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], ch = sp[0] >= sp[1] && sp[0] >= sp[2] ? 0 : sp[1] >= sp[2] ? 1 : 2; return { list, ch, span: sp[ch], tot }; };
    let boxes = [info(cells)];
    while (boxes.length < colors) {
      let bi = -1, best = -1; boxes.forEach((b, i) => { if (b.list.length > 1) { const s = b.span * 4 + Math.log2(b.tot + 1); if (s > best) { best = s; bi = i; } } }); if (bi < 0) break;
      const b = boxes[bi], f = chv[b.ch]; b.list.sort((x, y) => f(x) - f(y)); let acc = 0, cut = 1; for (let i = 0; i < b.list.length; i++) { acc += hist[b.list[i]]; if (acc >= b.tot / 2) { cut = Math.min(Math.max(i + 1, 1), b.list.length - 1); break; } }
      boxes.splice(bi, 1, info(b.list.slice(0, cut)), info(b.list.slice(cut)));
    }
    const pal = new Uint8Array(colors * 3), n = boxes.length;
    boxes.forEach((b, i) => { let r = 0, g = 0, bl = 0; for (const c of b.list) { const w = hist[c]; r += rc(c) * w; g += gc(c) * w; bl += bc(c) * w; } const t = b.tot || 1; pal[i * 3] = Math.round(r / t * 8 + 4); pal[i * 3 + 1] = Math.round(g / t * 8 + 4); pal[i * 3 + 2] = Math.round(bl / t * 8 + 4); });
    const lut = new Uint8Array(32768); for (let c = 0; c < 32768; c++) { const r = (c >> 10) * 8 + 4, g = (c >> 5 & 31) * 8 + 4, b = (c & 31) * 8 + 4; let bd = 1e9, bk = 0; for (let k = 0; k < n; k++) { const dr = r - pal[k * 3], dg = g - pal[k * 3 + 1], db = b - pal[k * 3 + 2], d = dr * dr * 2 + dg * dg * 4 + db * db * 3; if (d < bd) { bd = d; bk = k; } } lut[c] = bk; }
    return { palette: pal, lut, colors };
  }

  /** 把一帧 RGBA 像素映射成调色板索引 */
  function mapFrame(rgba, w, h, lut, dither) {
    const out = new Uint8Array(w * h); let o = 0;
    if (dither) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++, o++) { const i = o * 4, t = (BAYER[(y & 3) << 2 | (x & 3)] - 7.5) * 1.6; let r = rgba[i] + t, g = rgba[i + 1] + t, b = rgba[i + 2] + t; r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; b = b < 0 ? 0 : b > 255 ? 255 : b; out[o] = lut[(r >> 3) << 10 | (g >> 3) << 5 | b >> 3]; } }
    else for (let i = 0; i < out.length; i++) { const p = i * 4; out[i] = lut[(rgba[p] >> 3) << 10 | (rgba[p + 1] >> 3) << 5 | rgba[p + 2] >> 3]; }
    return out;
  }

  const TABLE = new Int32Array(1 << 20);
  /** GIF 的 LZW 压缩（返回压缩后的字节） */
  function lzw(idx, minCode) {
    const clear = 1 << minCode, eoi = clear + 1, out = new Uint8Array(Math.ceil(idx.length * 1.6) + 1024); let p = 0, cur = 0, shift = 0, size = minCode + 1, next = eoi + 1; TABLE.fill(0);
    const emit = c => { cur |= c << shift; shift += size; while (shift >= 8) { out[p++] = cur & 255; cur >>>= 8; shift -= 8; } };
    emit(clear); let ib = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i], key = ib << 8 | k, code = TABLE[key];
      if (code === 0) { emit(ib); if (next === 4096) { emit(clear); next = eoi + 1; size = minCode + 1; TABLE.fill(0); } else { if (next >= (1 << size)) size++; TABLE[key] = next++; } ib = k; } else ib = code;
    }
    emit(ib); emit(eoi); if (shift > 0) out[p++] = cur & 255; return out.subarray(0, p);
  }

  /** GIF 文件写入器 */
  class Writer {
    constructor(w, h, pal, loop) {
      this.w = w; this.h = h; this.colors = pal.colors; this.bits = Math.max(1, Math.round(Math.log2(pal.colors))); this.parts = []; this.frames = 0; this.size = 0;
      const head = [71, 73, 70, 56, 57, 97, w & 255, w >> 8, h & 255, h >> 8, 0x80 | 7 << 4 | this.bits - 1, 0, 0]; this.push(new Uint8Array(head)); this.push(pal.palette);
      if (loop !== 1) this.push(new Uint8Array([0x21, 0xFF, 0x0B, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, loop === 0 || loop === undefined ? 0 : loop & 255, loop >> 8 & 255 || 0, 0]));
    }
    push(a) { this.parts.push(a); this.size += a.length; }
    addFrame(idx, delayCs) {
      this.push(new Uint8Array([0x21, 0xF9, 4, 0x04, delayCs & 255, delayCs >> 8, 0, 0])); this.push(new Uint8Array([0x2C, 0, 0, 0, 0, this.w & 255, this.w >> 8, this.h & 255, this.h >> 8, 0]));
      const min = Math.max(2, this.bits), data = lzw(idx, min), blocks = [min]; for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); blocks.push(n); for (let k = 0; k < n; k++) blocks.push(data[i + k]); } blocks.push(0); this.push(new Uint8Array(blocks)); this.frames++;
    }
    finish() { this.push(new Uint8Array([0x3B])); return new Blob(this.parts, { type: "image/gif" }); }
    bytes() { const r = new Uint8Array(this.size + 1); let o = 0; for (const p of this.parts) { r.set(p, o); o += p.length; } r[o] = 0x3B; return r; }
  }
  root.GifKit = { buildPalette, mapFrame, lzw, Writer };
  if (typeof module !== "undefined") module.exports = root.GifKit;
})(typeof window !== "undefined" ? window : globalThis);
