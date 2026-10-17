// 照片墙后台：点赞 + 访客弹幕。部署为 Cloudflare Worker，并绑定一个 KV 命名空间（变量名必须叫 KV）
const ALLOW = ["https://mphotowall.com", "https://www.mphotowall.com"]; // 允许调用后台的网站，改成你自己的域名
const BAD_WORDS = [];                                                   // 想屏蔽的词，例如 ["某某词"]
const BAD_PATTERN = /https?:|www\.|\.com|\.cn|微信|vx|加我|qq/i;       // 屏蔽链接、广告、联系方式

const hits = new Map(); // 简单限速（同一 IP）：like 1 秒 1 次，弹幕 10 秒 1 条
const limited = (ip, key, ms) => {
  const k = ip + key, now = Date.now();
  if ((hits.get(k) || 0) > now - ms) return true;
  hits.set(k, now); if (hits.size > 5000) hits.clear();
  return false;
};

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOW.includes(origin) ? origin : ALLOW[0],
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin",
    };
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const get = async (k, d) => JSON.parse((await env.KV.get(k)) || "null") ?? d;
    const put = (k, v) => env.KV.put(k, JSON.stringify(v)).catch(() => {}); // 免费版同一个 key 每秒只能写 1 次，超了就忽略
    const ip = req.headers.get("CF-Connecting-IP") || "?", path = new URL(req.url).pathname;

    if (req.method === "GET") return json({ likes: await get("likes", {}), danmaku: (await get("danmaku", [])).slice(-60) });
    if (req.method !== "POST") return json({ error: "bad method" }, 405);
    let body; try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

    if (path === "/like") {
      const id = String(body.id || "").slice(0, 200); if (!id || limited(ip, "like", 1000)) return json({ ok: false });
      const likes = await get("likes", {});
      likes[id] = Math.max(0, (likes[id] || 0) + (body.d > 0 ? 1 : -1));
      await put("likes", likes); return json({ ok: true });
    }
    if (path === "/danmaku") {
      const text = String(body.text || "").trim().slice(0, 30);
      if (!text || BAD_PATTERN.test(text) || BAD_WORDS.some(w => text.includes(w)) || limited(ip, "dm", 10000)) return json({ ok: false });
      const list = await get("danmaku", []); list.push({ t: text, ts: Date.now() });
      await put("danmaku", list.slice(-100)); return json({ ok: true });
    }
    return json({ error: "not found" }, 404);
  },
};
