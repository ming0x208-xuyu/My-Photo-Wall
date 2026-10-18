// 照片墙后台：点赞 + 访客弹幕（Cloudflare Worker + KV）
// 部署：新建 Worker → 粘贴本文件 → Settings → Bindings 添加 KV namespace，变量名必须叫 KV
// 访问：推荐给 Worker 添加路由 你的域名/api/*（和网站同一个域名，国内访问更稳），网页里 API 填 "/api"
const BAD_WORDS = [];                                              // 想屏蔽的词，例如 ["某某词"]
const BAD_PATTERN = /https?:|www\.|\.com|\.cn|微信|vx|加我|qq/i;   // 屏蔽链接、广告、联系方式
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const hits = new Map(); // 简单限速（同一 IP）：点赞 1 秒 1 次，弹幕 10 秒 1 条
const limited = (ip, key, ms) => {
  const k = ip + key, now = Date.now();
  if ((hits.get(k) || 0) > now - ms) return true;
  hits.set(k, now); if (hits.size > 5000) hits.clear();
  return false;
};

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (!env.KV) return json({ error: "KV 没有绑定：请在 Worker 的 Settings → Bindings 里添加 KV namespace，变量名必须是 KV" }, 500);
    try {
      const get = async (k, d) => JSON.parse((await env.KV.get(k)) || "null") ?? d;
      const put = (k, v) => env.KV.put(k, JSON.stringify(v)).catch(() => {}); // 免费版同一个 key 每秒只能写 1 次，超了就忽略
      const ip = req.headers.get("CF-Connecting-IP") || "?", path = new URL(req.url).pathname.replace(/\/+$/, "").replace(/^\/api(?=\/|$)/, ""); // 兼容 /api/like 和 /like

      if (req.method === "GET") return json({ ok: true, likes: await get("likes", {}), danmaku: (await get("danmaku", [])).slice(-60) });
      if (req.method !== "POST") return json({ error: "bad method" }, 405);
      let body; try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

      if (path === "/like") {
        const id = String(body.id || "").slice(0, 200);
        if (!id) return json({ ok: false, error: "bad" });
        if (limited(ip, "like", 1000)) return json({ ok: false, error: "rate" });
        const likes = await get("likes", {});
        likes[id] = Math.max(0, (likes[id] || 0) + (body.d > 0 ? 1 : -1));
        await put("likes", likes); return json({ ok: true });
      }
      if (path === "/danmaku") {
        const text = String(body.text || "").trim().slice(0, 30);
        if (!text || BAD_PATTERN.test(text) || BAD_WORDS.some(w => text.includes(w))) return json({ ok: false, error: "bad" });
        if (limited(ip, "dm", 10000)) return json({ ok: false, error: "rate" });
        const list = await get("danmaku", []); list.push({ t: text, ts: Date.now() });
        await put("danmaku", list.slice(-100)); return json({ ok: true });
      }
      return json({ error: "not found" }, 404);
    } catch (e) { return json({ error: String(e) }, 500); }
  },
};
