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
import base64
import hashlib
import json
import os
import random
import re
import sys
import time
import urllib.request
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


# ---------- 自动生成照片的标题 / 日期 / 小故事 / 拍摄参数 ----------
# 小故事有两种来源：
#   ① 默认：词库组合生成（完全离线、免费）。不是“从几句现成的话里抽一句”，而是根据这张照片的
#      拍摄时间、季节、星期、主色调、亮度、分类、画幅、焦距光圈……把开场、场景、色调、感受、结尾
#      一段一段拼起来，组合数量极大，几乎每张都不一样。同一张照片每次生成的结果都一样（用内容哈希当种子）。
#   ② 可选：设置了环境变量 ANTHROPIC_API_KEY 时，让 AI 看着照片本身写一段故事（见下方 ai_story），
#      写好后存进 .build-cache.json，以后不会重复请求。AI 失败或没设置时，自动用 ①。
STORY_SALT = "v2"   # 想让所有照片的故事“重新抽一遍”，把这里改成任意别的字符（比如 "v3"）再运行 build.py

TOD = [(0, 5, "深夜"), (5, 8, "清晨"), (8, 11, "上午"), (11, 14, "正午"), (14, 17, "午后"), (17, 19, "黄昏"), (19, 23, "夜晚"), (23, 24, "深夜")]
SEASON = ["冬", "冬", "春", "春", "春", "夏", "夏", "夏", "秋", "秋", "秋", "冬"]
MONTH_FEEL = ["深冬", "冬末", "早春", "春深", "初夏", "仲夏", "盛夏", "夏末", "初秋", "深秋", "暮秋", "初冬"]
HOLIDAY = {(1, 1): "新年的第一天", (2, 14): "情人节这天", (5, 1): "劳动节的假期里", (10, 1): "国庆假期里", (12, 24): "平安夜", (12, 25): "圣诞节这天", (12, 31): "跨年这一天"}
CAMERA_NAME = re.compile(r"^(IMG|DSC|DSCF|DSCN|PXL|MVIMG|DJI|WP|P\d|Screenshot|微信图片|mmexport|\d[\d_\-.]{5,})", re.I)

NO_DATE_OPEN = ["不记得是哪一天了", "那天", "没有留下日期的一天", "某个平常的日子", "说不清是什么时候", "翻到这张照片的时候", "时间已经有点模糊了"]
SCENE = {  # 不同时段的“场景句”
    "深夜": ["世界安静得只剩下光", "街灯把影子拉得很长", "醒着的人，才看得见这样的风景", "整座城市像睡着了，只有零星的灯还亮着", "夜深到连风都放轻了脚步", "一天的喧闹退得很远，只剩下自己和这一点光", "困意被一点光轻轻拨开", "屏幕和路灯，是这个时刻仅有的光源", "月亮在窗外，安静得像在陪着谁", "世界像是被按下了静音键"],
    "清晨": ["天刚亮，世界还没完全醒来", "晨光很轻，像怕吵醒谁", "空气里带着刚醒来的凉意", "第一缕光落下来的时候，一切都还很安静", "路上的人还不多，连风都慢悠悠的", "露水还没干，光已经来了", "整座城市正在伸懒腰", "鸟叫声比闹钟更早，把这一天叫醒", "光从云的缝隙里一点点渗出来", "街角的早餐店刚刚冒出第一缕热气"],
    "上午": ["阳光正好，一切都很清晰", "慢慢展开的一天，从这一刻开始", "光落在肩上，暖暖的", "时间还很多，不用着急", "风是软的，光是亮的", "一天里最像“刚开始”的时刻", "精神很好，连影子都显得利落", "咖啡的香气和阳光一起漫上来", "光线干净，空气也干净", "路上的影子短短的，脚步轻轻的"],
    "正午": ["日头正高，世界亮得没有秘密", "光线最直白的时刻，连影子都缩短了", "明晃晃的一刻，却很安静", "一切都被晒得发亮", "影子缩成脚边小小的一团", "热闹和安静同时浮在光里", "空气里带着一点懒洋洋的热度", "天空高而空，像被擦过一遍", "树影浓得像泼在地上的墨", "世界像被调到了最高亮度"],
    "午后": ["时间慢下来的午后，适合发呆", "光线斜斜地落下来，很温柔", "什么都不用着急的时刻", "困意和阳光一起漫上来", "风把窗帘吹起一角，光跟着晃了晃", "最适合什么都不做的时段", "光斑在地上缓缓挪动", "时钟走得很慢，像是故意的", "光在桌角停了一会儿，又悄悄走了", "风很轻，轻得像怕打扰这份慵懒"],
    "黄昏": ["傍晚的光把一切都染成了暖色", "日落前最后的一点温柔", "天色渐暗，灯火还没亮起的间隙", "天空在慢慢换一件衣服", "归途上的人，影子都被拉得很长", "白天和夜晚交接的那几分钟", "晚风带着一天的余温", "云被点燃，又缓缓熄灭", "天边的颜色一层一层地叠上去", "回家的路被夕阳照得暖洋洋的"],
    "夜晚": ["夜色降临，城市换了一种呼吸", "灯光亮起来的时候，故事才刚开始", "安静的夜，适合把今天留住", "霓虹和星光在同一片天里相遇", "窗里的灯一盏一盏亮起", "晚风凉了，心却是暖的", "白天没说完的话，留给夜晚", "夜把轮廓变得柔软", "路灯一盏接一盏，把夜晚串成了一条线", "夜色温柔，把白天的疲惫都收走了"],
}
COLOR = {  # 按照片的主色调 / 亮度挑
    "dark": ["画面沉在深色里，却一点也不冷清", "暗部很深，像一杯放凉的黑咖啡", "大片的深色，把心事轻轻藏了起来", "很暗的一张，反而让亮处更珍贵", "黑色把周围的喧闹都吸走了", "夜色一样的底色，托住了那一点亮"],
    "white": ["通透的浅色，像被水洗过一遍", "画面很干净，留白比内容还多", "亮得很轻，像一页还没写字的纸", "亮堂堂的，连心情也跟着敞亮起来", "柔和的浅色，像一杯加了牛奶的茶"],
    "gray": ["色彩很克制，像一张旧胶片", "灰灰的调子里，藏着一点温柔", "没有太多颜色，反而更耐看", "低饱和的调子，像隔着一层薄薄的雾", "颜色安静下来，情绪反而更清楚了"],
    "warm": ["整张照片都带着一点暖意", "暖橘色的光漫过画面", "颜色像刚出炉的面包，热乎乎的", "画面里有一点焦糖色的甜", "像被夕阳顺手染了一笔", "红红黄黄的颜色，把画面烘得暖烘烘的"],
    "green": ["一片绿意，看着就让人放松", "绿色铺得很满，像把春天装进了画框", "深深浅浅的绿，让呼吸都变轻了", "绿得像刚被雨洗过", "满眼的绿，把心里的杂音都盖了过去"],
    "blue": ["清透的蓝色，像把心也洗了一遍", "冷冷的蓝调，让一切都安静下来", "蓝得很纯，像一口没有杂质的呼吸", "冷静的蓝，把画面衬得很透亮", "蓝色一层一层铺开，像深呼吸时的空气"],
    "pink": ["紫粉色的调子，温柔得有点不真实", "像把一小片晚霞收进了照片", "柔柔的粉紫，像一句没说出口的喜欢", "粉色的光晕里，连空气都甜了一点", "颜色轻轻软软的，像梦里才会有的样子"],
}
CAT = [  # (分类名里的关键词, 句子)
    (("旅", "游", "行", "山", "海", "景", "trip", "travel"), ["路过的风景，不一定会再来第二次", "旅途里最好的部分，往往是计划之外的", "走得再远，也想把这一刻带回家", "陌生的地方，却莫名有种安心", "一路向前，偶尔也该停下来看看", "行李很轻，装满了风景"]),
    (("日常", "生活", "daily"), ["日子很平常，却也值得被好好看见", "生活就藏在这些不起眼的角落里", "没有什么大事发生，这就很好", "平淡的一天，也有它的小确幸", "把普通的一天，认真地留住", "日子一页一页翻过去，总有几页想折个角"]),
    (("人像", "portrait", "自拍", "人物"), ["镜头前的神情，比任何语言都诚实", "有人的地方，故事就有了温度", "这一刻的笑意，值得被记住", "表情会变，照片不会", "眼神里藏着没拍进去的那半句话", "想被记住的，不只是样子，还有那天的气氛", "光落在脸上的时候，连沉默都是好看的"]),
    (("原神", "genshin"), ["提瓦特的风，吹到了这一页", "旅途中偶然停下的一刻，也想收藏", "屏幕里的世界，也有真实的心动", "走过的风景，都留在了这里", "背包里装着风景，也装着一点点期待", "每一次停下来看风景，都像一次小小的奖励"]),
    (("心动", "heartopia"), ["小镇的一天，也有它的慢时光", "心动小镇的日常，温柔得刚刚好", "屏幕里的小日子，过得认真又可爱", "小镇的阳光总是刚刚好", "慢悠悠的日子，也有它的甜", "今天也在小镇里，认真地生活着"]),
    (("游戏", "game", "截图", "screen"), ["另一个世界里，也有想收藏的风景", "虚拟的风景，真实的快乐", "游戏里的一瞬，同样值得被好好保存", "手柄放下的时候，风景还留在眼里", "有些风景，只有在这里才看得到", "同一个世界，每次看都有新的心情"]),
    (("美食", "吃", "food", "餐", "咖啡", "茶"), ["好好吃饭，是对生活最朴素的尊重", "味道会被忘记，画面却会替它记住", "一口下去，世界就变得具体了", "热腾腾的，是生活最直接的温度", "好吃的东西，总能让人慢下来", "认真吃饭的人，大概都很认真地爱着生活"]),
    (("宠物", "猫", "狗", "pet", "cat", "dog"), ["有它在的地方，时间总是走得很温柔", "小小的一团，占满了整颗心", "它大概不懂镜头，却把最真的一面留给了你", "和它在一起的每一天，都像被偏爱着", "毛茸茸的陪伴，让平凡的日子变得柔软", "它睡着的时候，世界也跟着变慢了"]),
]
CAT_TAG = ["关于「{t}」的一页", "「{t}」里又多了一个小片段", "又一张，放进了「{t}」"]
CAT_NONE = ["没有归类，也不必归类", "有些照片，不属于任何一类"]
ASPECT = {"tall": ["竖着拍的一张，像一扇半开的门", "竖构图，让目光自然往上走"], "wide": ["宽宽的画幅，像一卷慢慢展开的画", "横向铺开的视野，让人想多看一会儿"], "square": ["方方正正的一格，像一张小小的明信片"]}
END = ["有些瞬间不必解释，留着就好", "后来想起这一天，第一个浮现的就是这个画面", "把它挂在墙上，像给时间钉了一枚小小的图钉", "日子会过去，照片替我们记得", "大概这就是留下它的全部理由", "愿以后翻到这里，还会心里一暖", "不必刻意，也不必完美，真实就刚刚好", "一张照片，装得下一整个当时的心情", "慢慢看，慢慢想，慢慢记得", "很普通，所以才值得珍惜", "如果可以，真想把这一刻再多留一会儿", "时间往前走，这一页就留在这里", "这样的时刻，一年里也没有几次", "记下它，以后的自己会感谢现在的自己", "不是每一天都闪闪发光，但总有一些瞬间会", "想把它讲给以后的自己听", "风景会变，心动的感觉不会", "在这面墙上，它终于有了自己的位置", "就这样，又多了一个值得想起的瞬间", "没什么特别的理由，只是不想忘记", "让它留在这里，比留在相册里更像它自己", "也许多年以后，才会明白这一刻有多珍贵", "不用把每一天都过得很特别，被好好看过就够了", "喜欢的东西，就应该被认真地挂起来", "愿这一幕，能陪着以后的日子走很远", "光和时间都在走，唯独这一刻被留下了", "照片里没有说出口的，大概就是想念", "今天也要好好生活，像这张照片一样认真", "这一页，值得多看几眼", "有的画面，看一眼就知道要留下"]


def exif_info(img):
    """读取 EXIF：拍摄时间、相机参数文字、关键参数（不读取 GPS 位置）"""
    dt, parts, facts = None, [], {}
    try:
        ex = img.getexif(); sub = ex.get_ifd(0x8769)
        raw = sub.get(36867) or ex.get(306)
        if raw:
            dt = datetime.strptime(str(raw)[:19], "%Y:%m:%d %H:%M:%S")
        if str(ex.get(272, "")).strip():
            parts.append(str(ex.get(272)).strip())
        if sub.get(37386):
            facts["mm"] = float(sub.get(37386)); parts.append(f"{facts['mm']:.0f}mm")
        if sub.get(33437):
            facts["f"] = float(sub.get(33437)); parts.append(f"f/{facts['f']:.1f}")
        if sub.get(33434):
            e = float(sub.get(33434)); facts["exp"] = e; parts.append(f"1/{round(1 / e)}s" if 0 < e < 1 else f"{e:g}s")
        if sub.get(34855):
            iso = sub.get(34855); iso = iso[0] if isinstance(iso, tuple) else iso; facts["iso"] = float(iso); parts.append(f"ISO {iso}")
    except Exception:
        pass
    return dt, " · ".join(parts), facts


def color_family(hexcolor):
    """主色调 → 归类：dark / white / gray / warm / green / blue / pink"""
    import colorsys
    r, g, b = (int(hexcolor[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, sat, v = colorsys.rgb_to_hsv(r, g, b); h *= 360
    if v < 0.28: return "dark"
    if sat < 0.12: return "white" if v > 0.75 else "gray"
    if h < 60 or h >= 330: return "warm"
    if h < 170: return "green"
    if h < 260: return "blue"
    return "pink"


def make_story(rnd, dt, tag, meta, facts):
    """词库组合：开场 + 场景 + 色调 + 分类/画幅/参数 + 结尾，按 6 种句式随机拼接。"""
    pick = lambda pool: rnd.choice(pool)
    has_dt = dt is not None
    if has_dt:
        tod = next(n for a, z, n in TOD if a <= dt.hour < z)
        wd = "周末" if dt.weekday() >= 5 else "工作日"
        opens = [f"{MONTH_FEEL[dt.month - 1]}的{tod}", f"{dt.month}月{dt.day}日的{tod}", f"{wd}的{tod}", f"{MONTH_FEEL[dt.month - 1]}里的某个{tod}"]
        opener = HOLIDAY.get((dt.month, dt.day)) or pick(opens)
        scene = pick(SCENE[tod])
    else:
        opener, scene = pick(NO_DATE_OPEN), None
    color = pick(COLOR[color_family(meta["color"])])
    low = (tag or "").lower()
    cat_pool = next((pool for keys, pool in CAT if any(k in low for k in keys)), None)
    cat = pick(cat_pool) if cat_pool else (pick(CAT_TAG).format(t=tag) if tag else pick(CAT_NONE))
    extras = []  # 来自相机参数 / 画幅的补充句（有才用）
    mm, fn, iso, exp = facts.get("mm"), facts.get("f"), facts.get("iso"), facts.get("exp")
    if mm and mm <= 28: extras += ["广角把世界拉得很开", "视野被撑得很宽，像把周围的空气也装了进来"]
    if mm and mm >= 85: extras += ["长焦把远处轻轻拉到了眼前", "距离被压缩了，一切都挨得很近"]
    if fn and fn <= 2.0: extras += ["大光圈把背景化成了柔软的光斑", "焦外一片柔和，像隔着一层薄雾"]
    if iso and iso >= 1600: extras += ["光线不够的时候，颗粒也成了一种质感", "弱光里，依然把画面稳稳地留住了"]
    if exp and exp >= 0.5: extras += ["快门慢了一点，时间被拉长成了光"]
    ratio = meta["w"] / meta["h"] if meta.get("h") else 1
    extras += ASPECT["tall"] if ratio < 0.85 else ASPECT["wide"] if ratio > 1.6 else ASPECT["square"] if 0.95 <= ratio <= 1.05 else []
    extra = pick(extras) if extras else cat
    end = pick(END)
    if has_dt:
        forms = [(opener, scene, color, end), (opener, scene, cat, end), (opener, scene, extra, end), (scene, cat, color, end), (opener, color, cat), (opener, scene, color), (opener, cat, color, end), (scene, color, end), (opener, extra, color, end), (opener, scene, extra), (scene, extra, cat, end)]
    else:
        forms = [(opener, color, cat, end), (opener, color, extra), (cat, color, end), (opener, extra, cat), (opener, cat, end), (extra, color, cat, end)]
    parts = list(pick(forms))
    out, seen = "", set()
    for part in parts:
        if part in seen: continue
        seen.add(part)
        # 句式以“开场”开头时，开场和后面第一句之间用逗号连成一句，读起来更自然；其余用句号
        out += ("" if not out else "，" if (len(seen) == 2 and parts[0] == opener and len(parts) > 2) else "。") + part
    return out + "。"


def make_info(dt, cam, tag, stem, key, meta, facts, story=None):
    rnd = random.Random(key + STORY_SALT)  # 用内容哈希做种子：同一张照片每次生成的文字都一样
    info = {}
    if CAMERA_NAME.match(stem):  # 相机默认文件名（IMG_1234）换成好听的标题
        info["title"] = f"{tag or '瞬间'} · {dt.month}月{dt.day}日" if dt else (tag or "瞬间")
    if dt:
        info["date"] = dt.strftime("%Y-%m-%d")
    info["text"] = story or make_story(rnd, dt, tag, meta, facts)
    if cam:
        info["meta"] = cam
    return info


# ---------- 可选：让 AI 看着照片写故事 ----------
# 启用方法：设置环境变量 ANTHROPIC_API_KEY（GitHub 上是仓库的 Secret，见 STORY-README.md）。不设置就完全不会联网。
# 会把 600px 的缩略图发给 Anthropic 的接口；每张照片只请求一次，结果保存在 .build-cache.json 里。
AI_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
AI_MODEL = os.environ.get("STORY_AI_MODEL", "claude-haiku-5-5")
AI_BASE = os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com").rstrip("/")
AI_MAX = int(os.environ.get("STORY_AI_MAX", "40"))   # 每次运行最多给多少张新照片请求 AI（防止一次花太多）
_ai = {"calls": 0, "fails": 0}


def ai_story(thumb, tag, when):
    """成功返回故事文字，失败返回 None（调用方会改用词库生成）。"""
    if not AI_KEY or _ai["calls"] >= AI_MAX or _ai["fails"] >= 3:
        return None
    _ai["calls"] += 1
    prompt = ("这是一张照片墙里的照片。请你为它写一小段中文小故事（40～80 字），像照片墙上配的文字：有画面感，温柔、克制，可以用第一人称，也可以像旁白。\n"
              "要求：只输出这段文字本身；不要标题、不要引号、不要表情符号；不要出现具体的人名和品牌；不要提相机或拍摄参数；不要编造具体地名。\n"
              f"参考信息（可能不准确）：分类：{tag or '无'}；拍摄时间：{when or '未知'}。")
    try:
        body = json.dumps({"model": AI_MODEL, "max_tokens": 400, "messages": [{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/webp", "data": base64.b64encode(thumb.read_bytes()).decode()}},
            {"type": "text", "text": prompt}]}]}).encode()
        req = urllib.request.Request(AI_BASE + "/v1/messages", data=body, headers={"x-api-key": AI_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.loads(r.read().decode("utf-8"))
        text = re.sub(r"\s+", " ", "".join(b.get("text", "") for b in d.get("content", []) if b.get("type") == "text")).strip().strip('"“”「」')
        if 8 <= len(text) <= 240:
            _ai["fails"] = 0
            return text
        raise ValueError("返回内容长度不合适")
    except Exception as e:
        _ai["fails"] += 1
        print("AI 故事生成失败（这张改用词库生成）:", type(e).__name__, str(e)[:100])
        return None


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
            dt, cam, facts = exif_info(probe)

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

        if AI_KEY and not meta.get("story"):  # 可选：AI 写故事，写好就存进缓存，以后不再请求
            st = ai_story(tpath, tag, meta["when"])
            if st:
                meta["story"] = st; cache[digest] = meta
        info = make_info(dt, cam, tag, stem.name, digest, meta, facts, meta.get("story"))

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
