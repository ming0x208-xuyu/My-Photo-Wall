#!/usr/bin/env python3
"""照片墙构建脚本

用法：在项目文件夹里运行  python build.py
准备：pip install pillow

目录约定：
  photos/<分类名>/xxx.jpg   原图（子文件夹名 = 分类；直接放在 photos/ 下则不属于任何分类）
  thumbs/…                  自动生成：WebP 缩略图（列表页使用）
  large/…                   自动生成：WebP 高清图（点开照片时使用）
  photos.js                 自动生成：照片清单（网页读取）

新增分类：在 photos/ 下新建一个文件夹（文件夹名就是分类名），放入照片，再运行本脚本。
"""
import hashlib
import json
import sys
import time
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
SRC, THUMB, LARGE = ROOT / "photos", ROOT / "thumbs", ROOT / "large"
CACHE = ROOT / ".build-cache.json"
EXTS = {".jpg", ".jpeg", ".png", ".webp"}
THUMB_W, THUMB_Q = 600, 72      # 缩略图：宽 600px，质量 72
LARGE_EDGE, LARGE_Q = 2000, 82  # 高清图：长边 2000px，质量 82


def shot_time(img, path):
    """拍摄时间，用于排序（新的在前）。取不到就用文件修改时间。"""
    try:
        ex = img.getexif()
        t = ex.get_ifd(0x8769).get(36867) or ex.get(306)
        if t:
            return str(t)
    except Exception:
        pass
    return time.strftime("%Y:%m:%d %H:%M:%S", time.localtime(path.stat().st_mtime))


def save_webp(im, out, quality):
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "WEBP", quality=quality, method=6)  # 不写入 EXIF，位置信息不会带进 WebP


def main():
    if not SRC.is_dir():
        sys.exit("找不到 photos 文件夹，请先创建并放入照片。")
    cache = json.loads(CACHE.read_text("utf-8")) if CACHE.exists() else {}
    items, keep, made = [], set(), 0

    for p in sorted(f for f in SRC.rglob("*") if f.is_file() and f.suffix.lower() in EXTS):
        rel = p.relative_to(SRC)
        tag = rel.parts[0] if len(rel.parts) > 1 else ""
        stem = rel.with_suffix("")
        digest = hashlib.sha1(p.read_bytes()).hexdigest()[:8]  # 内容哈希：照片变了文件名就变，缓存才安全
        tpath = THUMB / stem.parent / f"{stem.name}.{digest}.webp"
        lpath = LARGE / stem.parent / f"{stem.name}.{digest}.webp"
        keep |= {tpath, lpath}

        meta = cache.get(digest)
        if not (meta and tpath.exists() and lpath.exists()):
            src_im = Image.open(p)
            when = shot_time(src_im, p)
            im = ImageOps.exif_transpose(src_im)  # 按 EXIF 方向摆正（手机竖拍照片）
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGB")
            t = im.copy()
            t.thumbnail((THUMB_W, 20000), Image.LANCZOS)
            save_webp(t, tpath, THUMB_Q)
            big = im.copy()
            big.thumbnail((LARGE_EDGE, LARGE_EDGE), Image.LANCZOS)
            save_webp(big, lpath, LARGE_Q)
            r, g, b = t.convert("RGB").resize((1, 1), Image.BOX).getpixel((0, 0))
            meta = {"w": im.size[0], "h": im.size[1], "color": f"#{r:02x}{g:02x}{b:02x}", "when": when}
            cache[digest] = meta
            made += 1
            print("已生成:", rel.as_posix())

        items.append((meta["when"], {
            "src": ("photos" / rel).as_posix(),
            "thumb": tpath.relative_to(ROOT).as_posix(),
            "large": lpath.relative_to(ROOT).as_posix(),
            "w": meta["w"], "h": meta["h"],
            "title": stem.name, "tag": tag, "color": meta["color"],
        }))

    # 清理已经不存在的照片对应的旧缩略图
    for d in (THUMB, LARGE):
        if d.is_dir():
            for f in d.rglob("*"):
                if f.is_file() and f not in keep:
                    f.unlink()
            for sub in sorted((x for x in d.rglob("*") if x.is_dir()), reverse=True):
                try:
                    sub.rmdir()
                except OSError:
                    pass

    items.sort(key=lambda x: x[0], reverse=True)
    body = ",\n".join("  " + json.dumps(r, ensure_ascii=False) for _, r in items)
    (ROOT / "photos.js").write_text(
        "// 此文件由 build.py 自动生成，请勿手动修改\n"
        f"window.PHOTOS_BUILT = [\n{body}\n];\n", encoding="utf-8")
    CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    cats = sorted({r["tag"] for _, r in items if r["tag"]})
    print(f"完成：共 {len(items)} 张照片（本次新处理 {made} 张），分类：{'、'.join(cats) or '无'}")


if __name__ == "__main__":
    main()
