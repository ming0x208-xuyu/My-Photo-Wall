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
import random
import re
import sys
import time
from datetime import datetime
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


# ---------- 自动生成照片的标题 / 日期 / 小故事 / 拍摄参数（完全离线，不需要你手写）----------
TOD = [(0, 5, "深夜", ["夜深了，世界安静得只剩下光。", "醒着的人，才看得到的风景。", "深夜里的一点光，格外珍贵。"]),
       (5, 8, "清晨", ["天刚亮，世界还没完全醒来。", "晨光很轻，像怕吵醒谁。", "空气里带着刚醒来的凉意。"]),
       (8, 11, "上午", ["阳光正好，一切都很清晰。", "慢慢展开的一天，从这一刻开始。", "光落在肩上，暖暖的。"]),
       (11, 14, "正午", ["日头正高，世界亮得没有秘密。", "光线最直白的时刻，连影子都缩短了。", "明晃晃的一刻，却很安静。"]),
       (14, 17, "午后", ["时间慢下来的午后，适合发呆。", "光线斜斜地落下来，很温柔。", "懒洋洋的时刻，什么都不用着急。"]),
       (17, 19, "黄昏", ["傍晚的光把一切都染成了暖色。", "日落前最后的一点温柔。", "天色渐暗，灯火还没亮起的间隙。"]),
       (19, 23, "夜晚", ["夜色降临，城市换了一种呼吸。", "灯光亮起来的时候，故事才刚开始。", "安静的夜，适合把今天留住。"]),
       (23, 24, "深夜", ["夜深了，世界安静得只剩下光。", "醒着的人，才看得到的风景。", "深夜里的一点光，格外珍贵。"])]
SEASON = ["冬", "冬", "春", "春", "春", "夏", "夏", "夏", "秋", "秋", "秋", "冬"]
GENERIC = ["把这一刻，留在墙上。", "平凡的一天里，值得被记住的一瞬。", "没有特别的理由，只是想留下它。"]
CAMERA_NAME = re.compile(r"^(IMG|DSC|DSCF|DSCN|PXL|MVIMG|DJI|WP|P\d|Screenshot|微信图片|mmexport|\d[\d_\-.]{5,})", re.I)


def exif_info(img):
    """读取 EXIF：拍摄时间、相机参数文字（不读取 GPS 位置）"""
    dt, parts = None, []
    try:
        ex = img.getexif(); sub = ex.get_ifd(0x8769)
        raw = sub.get(36867) or ex.get(306)
        if raw:
            dt = datetime.strptime(str(raw)[:19], "%Y:%m:%d %H:%M:%S")
        if str(ex.get(272, "")).strip():
            parts.append(str(ex.get(272)).strip())
        if sub.get(37386):
            parts.append(f"{float(sub.get(37386)):.0f}mm")
        if sub.get(33437):
            parts.append(f"f/{float(sub.get(33437)):.1f}")
        if sub.get(33434):
            e = float(sub.get(33434)); parts.append(f"1/{round(1 / e)}s" if 0 < e < 1 else f"{e:g}s")
        if sub.get(34855):
            iso = sub.get(34855); parts.append(f"ISO {iso[0] if isinstance(iso, tuple) else iso}")
    except Exception:
        pass
    return dt, " · ".join(parts)


def make_info(dt, cam, tag, stem, key):
    rnd = random.Random(key)  # 用内容哈希做种子：同一张照片每次生成的文字都一样
    info = {}
    if CAMERA_NAME.match(stem):  # 相机默认文件名（IMG_1234）换成好听的标题
        info["title"] = f"{tag or '瞬间'} · {dt.month}月{dt.day}日" if dt else (tag or "瞬间")
    if dt:
        name, pool = next((n, p) for a, z, n, p in TOD if a <= dt.hour < z)
        info["date"] = dt.strftime("%Y-%m-%d")
        info["text"] = f"{SEASON[dt.month - 1]}天的{name}。{rnd.choice(pool)}"
    else:
        info["text"] = rnd.choice(GENERIC)
    if cam:
        info["meta"] = cam
    return info


def save_webp(im, out, quality):
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "WEBP", quality=quality, method=6)  # 不写入 EXIF，位置信息不会带进 WebP


def main():
    if not SRC.is_dir():
        sys.exit("找不到 photos 文件夹，请先创建并放入照片。")
    cache = json.loads(CACHE.read_text("utf-8")) if CACHE.exists() else {}
    items, keep, made = [], set(), 0

    files = sorted(f for f in SRC.rglob("*") if f.is_file() and f.suffix.lower() in EXTS)
    if not files:  # 防止在没有原图的电脑上运行时，把已生成的缩略图清空
        sys.exit("photos 文件夹里没有照片，已取消，没有改动任何文件。")
    for p in files:
        rel = p.relative_to(SRC)
        tag = rel.parts[0] if len(rel.parts) > 1 else ""
        stem = rel.with_suffix("")
        digest = hashlib.sha1(p.read_bytes()).hexdigest()[:8]  # 内容哈希：照片变了文件名就变，缓存才安全
        tpath = THUMB / stem.parent / f"{stem.name}.{digest}.webp"
        lpath = LARGE / stem.parent / f"{stem.name}.{digest}.webp"
        keep |= {tpath, lpath}
        with Image.open(p) as probe:  # 只读文件头里的 EXIF，不解码图片，很快
            dt, cam = exif_info(probe)
        info = make_info(dt, cam, tag, stem.name, digest)

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
            "title": stem.name, "tag": tag, "color": meta["color"], "info": info,
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
    if items:  # 分享卡片封面 og.jpg：优先用根目录的 cover.jpg，否则取最新一张照片，裁成 1200×630
        try:
            cover = ROOT / "cover.jpg"
            im = Image.open(cover if cover.exists() else ROOT / items[0][1]["src"])
            ImageOps.fit(ImageOps.exif_transpose(im).convert("RGB"), (1200, 630), Image.LANCZOS).save(ROOT / "og.jpg", quality=82)
        except Exception as e:
            print("og.jpg 生成失败：", e)
    cats = sorted({r["tag"] for _, r in items if r["tag"]})
    print(f"完成：共 {len(items)} 张照片（本次新处理 {made} 张），分类：{'、'.join(cats) or '无'}")


if __name__ == "__main__":
    main()
