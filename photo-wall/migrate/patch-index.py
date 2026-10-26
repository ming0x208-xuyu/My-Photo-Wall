#!/usr/bin/env python3
"""把你仓库里【现有的】首页改成 three.js 星门转场，不会动你的其他内容。
用法（在你的网站仓库根目录运行）：
    python3 migrate/patch-index.py            # 自动在根目录的 .html / .js 里找塔罗入口那一段
    python3 migrate/patch-index.py 路径/到/仓库根目录
改动前会自动备份成 xxx.bak；改错了把 .bak 改回原名即可。"""
import glob, os, re, shutil, sys

here = os.path.dirname(os.path.abspath(__file__))
block = open(os.path.join(here, 'tarot-entry.block.js'), encoding='utf-8').read().rstrip('\n')
START = '/* ===== 命运之书入口：被魔法书吸进去'
END = '$("bTarot").onclick = enterTarot; $("tarotGate").onclick = enterTarot;'
root = sys.argv[1] if len(sys.argv) > 1 else '.'
files = [f for f in glob.glob(os.path.join(root, '*.html')) + glob.glob(os.path.join(root, '*.js')) if 'three.min' not in f]

for f in files:
    s = open(f, encoding='utf-8').read()
    if '真实 three.js 星门穿越' in s:
        print('✔ 已经改过了：', f); sys.exit(0)
    if START in s and END in s:
        a = s.index(START); b = s.index(END, a) + len(END)
        shutil.copy(f, f + '.bak')
        s = s[:a] + block + s[b:]
        s, n = re.subn(r'const TAROT_URL\s*=\s*"[^"]*";[^\n]*', 'const TAROT_URL = "tarot/"; // 塔罗页（React Three Fiber 版，打包后放在 tarot/ 文件夹）', s)
        open(f, 'w', encoding='utf-8').write(s)
        print('✔ 已修改：', f, '（已备份为 .bak）')
        print('  TAROT_URL 已改为 "tarot/"' if n else '  ⚠ 没找到 const TAROT_URL，请手动把塔罗页地址改成 "tarot/"')
        sys.exit(0)

print('✘ 没在根目录的 .html/.js 里找到塔罗入口那一段。')
print('  请把你的首页文件发给 Claude，让它按你的实际代码改。')
sys.exit(1)
