// horse-talent 전역 순위 — Cloudflare Workers + D1.
//
// 게임은 GitHub Pages 의 정적 페이지라 서버가 없다. 순위를 여러 사람이 나눠 보려면
// 어딘가에 쌓아야 하고, 그 어딘가가 여기다.
//
//   GET  /runs?limit=20   상위 N
//   POST /runs            한 판 기록 → { rank, total }
//
// **점수는 근본적으로 위조된다.** 클라이언트만 있는 게임이라 누구든 이 주소로
// 아무 값이나 보낼 수 있다. 서버가 경주를 다시 돌려 대조하지 않는 한 못 막는다.
// 여기서 하는 것은 **장난을 걸러내는 정도**다 —
//   · 값의 모양과 범위 (음수·NaN·터무니없는 점수)
//   · 이름 길이와 제어문자
//   · 같은 기기에서 몰아넣기 (IP 해시 기준 속도 제한)
// 작정하면 여전히 뚫린다. 그 값을 알고 택했다.

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/** 이름 최대 글자 수. 게임의 `Game.MAX_NAME` 과 같아야 한다. */
const MAX_NAME = 10;

/**
 * 받아들일 최대 골드.
 * 실측 — 참조 플레이어 최대 15,904 · 매 경주 1착만 해도 상금이 63,990 이다.
 * 사람은 베팅으로 그 위를 갈 수 있으므로 **넉넉히** 잡는다.
 * 낮게 잡으면 잘한 판이 거부되고, 그건 위조보다 나쁜 실패다.
 */
const MAX_GOLD = 10_000_000;

/** 한 기기가 이 시간 안에 넣을 수 있는 기록 수. 한 판이 8분이니 여유가 크다. */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;

const ALLOWED_ORIGINS = [
  "https://ycyeom.github.io",
  "http://localhost:5173",
  "http://localhost:5174",
];

function cors(origin) {
  // 목록에 없는 출처는 **에코하지 않는다** — 아무나 이 API 를 자기 사이트에 붙이지 못하게
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(origin) },
  });

/** IP 를 그대로 안 남긴다. 속도 제한에 필요한 건 "같은 곳인가"뿐이다. */
async function hashIp(ip, salt) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 보낸 값이 쓸 만한가. **모양이 틀리면 이유를 돌려준다** —
 * 조용히 버리면 클라이언트가 왜 기록이 안 남는지 영영 모른다.
 */
function validate(body) {
  if (!body || typeof body !== "object") return "본문이 객체가 아니다";

  const name = typeof body.name === "string" ? body.name.trim() : "";
  // 제어문자를 지운다 — 순위표에 줄바꿈이 들어가면 화면이 깨진다
  const clean = [...name.replace(/[\u0000-\u001f\u007f]/g, "")].slice(0, MAX_NAME).join("");
  if (!clean) return "이름이 비었다";

  const gold = Number(body.gold);
  if (!Number.isFinite(gold) || !Number.isInteger(gold)) return "골드가 정수가 아니다";
  if (gold < 0) return "골드가 음수다";
  if (gold > MAX_GOLD) return `골드가 상한(${MAX_GOLD})을 넘었다`;

  const races = Number(body.races);
  if (!Number.isInteger(races) || races < 1 || races > 100) return "경주 수가 범위 밖이다";

  let bestOdds = Number(body.bestOdds);
  if (!Number.isFinite(bestOdds) || bestOdds < 0) bestOdds = 0;
  if (bestOdds > 100_000) bestOdds = 100_000;

  return { name: clean, gold, races, bestOdds };
}

async function listRuns(env, limit) {
  const { results } = await env.DB.prepare(
    "SELECT name, gold, races, best_odds AS bestOdds, created_at AS at " +
    "FROM runs ORDER BY gold DESC, created_at ASC LIMIT ?1"
  ).bind(limit).all();
  return results ?? [];
}

async function totalRuns(env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM runs").first();
  return row?.n ?? 0;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") ?? "";
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (url.pathname !== "/runs") return json({ error: "없는 경로" }, 404, origin);

    if (req.method === "GET") {
      const n = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_LIMIT));
      const [runs, total] = await Promise.all([listRuns(env, n), totalRuns(env)]);
      return json({ runs, total }, 200, origin);
    }

    if (req.method !== "POST") return json({ error: "안 되는 메서드" }, 405, origin);

    let body;
    try { body = await req.json(); } catch { return json({ error: "JSON 이 아니다" }, 400, origin); }

    const ok = validate(body);
    if (typeof ok === "string") return json({ error: ok }, 400, origin);

    const ip = req.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
    const ipHash = await hashIp(ip, env.IP_SALT ?? "horse-talent");
    const now = Date.now();

    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM runs WHERE ip_hash = ?1 AND created_at > ?2"
    ).bind(ipHash, now - RATE_WINDOW_MS).first();
    if ((recent?.n ?? 0) >= RATE_MAX) {
      return json({ error: "너무 자주 보냈다. 잠시 뒤에 다시" }, 429, origin);
    }

    await env.DB.prepare(
      "INSERT INTO runs (name, gold, races, best_odds, created_at, ip_hash) VALUES (?1,?2,?3,?4,?5,?6)"
    ).bind(ok.name, ok.gold, ok.races, ok.bestOdds, now, ipHash).run();

    // **몇 등인지 서버가 센다.** 클라이언트가 목록만 보고 세면 상위 N 밖은 알 수 없다.
    const better = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM runs WHERE gold > ?1 OR (gold = ?1 AND created_at < ?2)"
    ).bind(ok.gold, now).first();

    const [runs, total] = await Promise.all([listRuns(env, DEFAULT_LIMIT), totalRuns(env)]);
    return json({ rank: (better?.n ?? 0) + 1, total, runs, at: now }, 200, origin);
  },
};
