#!/usr/bin/env python3
"""标题字体裁剪脚本：把下载的完整字体裁成只含标题用到的字，体积从几 MB 降到十几 KB，手机加载更快。

用法：
  1. 把下载好的 ZCOOLXiaoWei-Regular.ttf 和 Italiana-Regular.ttf 放进 fonts/ 文件夹
  2. pip install fonttools brotli
  3. python subset_fonts.py        → 在 fonts/ 里生成 title-zh.woff2 和 title-en.woff2

以后改了标题文字（index.html 里的 SITE），重新运行一次即可。
"""
import re
import sys
from pathlib import Path

try:
    from fontTools import subset
    import brotli  # noqa: F401  woff2 压缩需要
except ImportError:
    sys.exit("缺少依赖，请先运行：pip install fonttools brotli")

ROOT = Path(__file__).resolve().parent
FONTS = ROOT / "fonts"
EXTRA_ZH = "拾光邮局来信封寄出我的照片墙"  # 页面里其它用到标题字体的文字（邮局标题等）
EN_TEXT = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,-·&'!?:"


def site_text():
    """从 index.html 的 SITE 配置里取出标题文字中的汉字"""
    html = (ROOT / "index.html").read_text("utf-8")
    m = re.search(r"const SITE = \{.*?\};", html, re.S)
    return "".join(re.findall(r"[\u4e00-\u9fff]", m.group(0))) if m else ""


def run(src, out, text):
    src, out = FONTS / src, FONTS / out
    if not src.exists():
        print(f"跳过：找不到 {src.name}（请先放进 fonts/ 文件夹）")
        return
    opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["*"]; opts.notdef_outline = True
    font = subset.load_font(str(src), opts)
    s = subset.Subsetter(opts); s.populate(text=text); s.subset(font)
    subset.save_font(font, str(out), opts)
    print(f"已生成 {out.name}：{out.stat().st_size / 1024:.1f} KB（原文件 {src.stat().st_size / 1024:.0f} KB）")


if __name__ == "__main__":
    zh = "".join(sorted(set(site_text() + EXTRA_ZH + "0123456789 ·")))
    run("ZCOOLXiaoWei-Regular.ttf", "title-zh.woff2", zh)
    run("Italiana-Regular.ttf", "title-en.woff2", EN_TEXT)
