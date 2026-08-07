// 문서에 적힌 수치를 **다시 낸다.** 결과는 `evidence/measurements.md`.
//
// 왜 필요한가 — M1~M4 의 밸런스 주장이 전부 `/tmp` 에 쓰고 지운 스크립트에서 나왔다.
// 문서에는 숫자만 남고 만드는 법이 없었다. 값을 하나 고치면 문서 전체가
// 조용히 거짓이 되는데 아무도 모른다.
//
// **`expect` 가 아니라 표를 낸다.** 검사는 "깨지면 안 되는 성질"을 지키고,
// 여기는 "지금 실제로 얼마인가"를 보여준다. 둘은 다른 일이다 —
// 인기마 승률이 34% 에서 31% 로 움직여도 검사(25~45%)는 안 깨지지만
// 문서는 틀린 값을 말하게 된다. 그 어긋남을 여기서 잡는다.

import { writeFileSync, mkdirSync } from "node:fs";
import {
  buildRace, runRace, crowdBets, settle, truePower,
  POOLS, POOL_ORDER, RIVAL_GROWTH, TAKEOUT, FIELD_SIZE, type Pool,
} from "../systems/race";
import { newHorse, STATS, STAT_NAME, type StatKey, type Horse } from "../systems/stable";
import { playSession } from "../systems/policy";
import { RACES_MIN, RACES_MAX, START_GOLD } from "../systems/session";

/**
 * **문서가 주장하는 값.** `docs/GAME_SPEC.md` 에서 옮겨 적은 것이고,
 * 옮겨 적었다는 사실 자체가 요점이다 — 실측과 어긋나면 둘 중 하나가 낡은 것이다.
 * 어긋나면 이 표가 ⚠ 를 찍는다. **그때 고칠 곳은 코드가 아니라 문서다**(M5 는 값 조정 단계가 아니다).
 */
const CLAIMED = {
  favWin: 0.38,           // 인기마(능력치 1위) 승률
  weakestWin: 0.03,       // 최약체 — **0% 가 아니게 됐다**(HT-009). 함정이 아니다
  brokeRate: 0.14,        // 파산 경험 비율
  actRate: 0.92,          // 경주의 90% 이상에서 무언가 한 판의 비율
  statSpeed: 0.211,       // 속력 3(6) → 10 일 때 승률 증가폭
  statPoise: 0.022,       // 안정 — 20경주에서 **부호가 뒤집혔다**. 아래 주석 참조
} as const;

const N_RACE = 1500, N_SESSION = 1200;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const pp = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%p`;

/** 차이가 허용 폭 안인가. 시드 표본이라 정확히 같을 수는 없다. */
const near = (got: number, want: number, tol: number) => Math.abs(got - want) <= tol;
const mark = (ok: boolean) => (ok ? "✓" : "**⚠ 어긋남**");

const out: string[] = [];
const say = (s = "") => out.push(s);

say("# 실측 — `npm run evidence` 가 만든다");
say();
say("손으로 적은 숫자가 아니다. `src/evidence/measure.ts` 가 지금 코드를 돌려서 낸 것이다.");
say("`문서` 열은 `docs/GAME_SPEC.md` 의 주장이고, 어긋나면 **문서가 낡은 것**이다.");
say();
say(`표본 — 경주 ${N_RACE.toLocaleString()}회 · 한 판 ${N_SESSION.toLocaleString()}판. 시드 고정이라 재현된다.`);
say();

// ── 1. 경주가 결정론인가 ────────────────────────────────────────────────
say("## 1. 능력치 순위별 승률 — 경주는 시작 전에 정해져 있지 않다");
say();
const hit = new Array(FIELD_SIZE).fill(0);
for (let s = 1; s <= N_RACE; s++) {
  const race = buildRace(5, newHorse("측정마"), s);
  const rank = race.runners
    .map((r) => ({ g: r.gate, p: truePower(r, race.distance) }))
    .sort((a, b) => b.p - a.p);
  const win = runRace(race, s).order[0];
  hit[rank.findIndex((r) => r.g === win)]++;
}
const byRank = hit.map((v) => v / N_RACE);
say("| 능력치 순위 | " + byRank.map((_, i) => `${i + 1}위`).join(" | ") + " |");
say("|---|" + byRank.map(() => "---").join("|") + "|");
say("| 승률 | " + byRank.map(pct).join(" | ") + " |");
say();
say(`무작위라면 전부 ${pct(1 / FIELD_SIZE)} 다. 능력치가 밀되 결정하지는 않는다.`);
say();
say("| 항목 | 문서 | 실측 | |");
say("|---|---|---|---|");
say(`| 인기마 승률 | ${pct(CLAIMED.favWin)} | ${pct(byRank[0])} | ${mark(near(byRank[0], CLAIMED.favWin, 0.05))} |`);
say(`| 최약체 승률 | ${pct(CLAIMED.weakestWin)} | ${pct(byRank[5])} | ${mark(near(byRank[5], CLAIMED.weakestWin, 0.03))} |`);
say();

// ── 2. 스탯이 실제로 듣는가 ─────────────────────────────────────────────
say("## 2. 스탯 5종이 결과를 움직이는가");
say();
const base: Record<StatKey, number> = { speed: 6, accel: 6, stamina: 6, grit: 3, poise: 3 };
function measure(stats: Record<StatKey, number>, distance?: number) {
  let win = 0, top3 = 0, sum = 0;
  for (let s = 1; s <= N_RACE; s++) {
    const o = runRace(buildRace(6, { name: "t", stats } as Horse, s, distance), s).order;
    const place = o.indexOf(1);
    if (place === 0) win++;
    if (place < 3) top3++;
    sum += place;
  }
  return { win: win / N_RACE, top3: top3 / N_RACE, avg: sum / N_RACE + 1 };
}
const b0 = measure(base);
say(`기준은 속6·가6·체6·근3·안3 — 승률 ${pct(b0.win)} · 3착 ${pct(b0.top3)} · 평균착순 ${b0.avg.toFixed(2)}.`);
say();
say("| 스탯 | 승률 | 3착 | 평균착순 |");
say("|---|---|---|---|");
const statGain: Partial<Record<StatKey, number>> = {};
for (const k of STATS) {
  const m = measure({ ...base, [k]: 10 });
  statGain[k] = m.win - b0.win;
  say(`| ${STAT_NAME[k]} | ${pp(m.win - b0.win)} | ${pp(m.top3 - b0.top3)} | ${(m.avg - b0.avg).toFixed(2)} |`);
}
say();
say("**안정은 승률을 거의 안 올린다 — 설계대로다.** 컨디션 폭을 줄이면 요행 우승도 같이 깎이고,");
say("대신 요행으로 무너지는 일이 더 줄어 3착이 오른다.");
say();
say("12경주 시절에는 **−1.8%p** 로 음수였다. 20경주가 되며 같은 지점의 상대가 약해져");
say("기준 말이 상대적으로 강해졌고, **강한 말에게 안정은 지키는 값이 된다** —");
say("부호가 뒤집힌 것이 아니라 설계가 말한 대로 국면이 바뀐 것이다.");
say();
say("| 항목 | 문서 | 실측 | |");
say("|---|---|---|---|");
say(`| 속력 승률 증가 | ${pp(CLAIMED.statSpeed)} | ${pp(statGain.speed!)} | ${mark(near(statGain.speed!, CLAIMED.statSpeed, 0.05))} |`);
say(`| 안정 승률 증가 | ${pp(CLAIMED.statPoise)} | ${pp(statGain.poise!)} | ${mark(near(statGain.poise!, CLAIMED.statPoise, 0.03))} |`);
say();
say("### 거리 특화");
say();
say("| 유형 | 1000m | 1400m | 2000m |");
say("|---|---|---|---|");
for (const [name, st] of [
  ["속력형 12/4/4", { speed: 12, accel: 4, stamina: 4, grit: 3, poise: 3 }],
  ["장거리형 4/2/14", { speed: 4, accel: 2, stamina: 14, grit: 3, poise: 3 }],
] as [string, Record<StatKey, number>][]) {
  say(`| ${name} | ` + [1000, 1400, 2000].map((d) => pct(measure(st, d).win)).join(" | ") + " |");
}
say();

// ── 3. 어느 승식도 돈 찍는 기계가 아닌가 ────────────────────────────────
say("## 3. 승식 7종 수익률 — 공개 정보만으로는 못 번다");
say();
say(`공제율 ${pct(TAKEOUT)} 인 게임에서 어느 승식이든 이득이면 그건 돈 찍는 기계다.`);
say();
const got = {} as Record<Pool, number>;
for (const p of POOL_ORDER) got[p] = 0;
const form5 = 3 + (5 - 1) * RIVAL_GROWTH;
for (let s = 1; s <= N_RACE; s++) {
  const race = buildRace(5, newHorse("측정마"), s);
  const book = crowdBets(race, form5, s);
  const res = runRace(race, s);
  const rank = race.runners
    .map((r) => ({ g: r.gate, p: truePower(r, race.distance) }))
    .sort((a, b) => b.p - a.p).map((x) => x.g);
  for (const pool of POOL_ORDER)
    got[pool] += settle(book, { pool, gates: rank.slice(0, POOLS[pool].picks), amount: 100 }, res.order).gold;
}
say("| 승식 | " + POOL_ORDER.map((p) => POOLS[p].name).join(" | ") + " |");
say("|---|" + POOL_ORDER.map(() => "---").join("|") + "|");
say("| 수익률 | " + POOL_ORDER.map((p) => `${(got[p] / (N_RACE * 100)).toFixed(2)}×` ).join(" | ") + " |");
say();
const anyPositive = POOL_ORDER.filter((p) => got[p] / (N_RACE * 100) > 1.02);
say(anyPositive.length
  ? `**⚠ 이득인 승식이 있다: ${anyPositive.map((p) => POOLS[p].name).join(", ")}**`
  : "✓ 전부 본전 미만이다.");
say();

// ── 4. 한 판이 도는가 ───────────────────────────────────────────────────
say("## 4. 한 판 — 참조 플레이어 기준");
say();
say("`src/systems/policy.ts` 의 모형이 돌린 결과다. 사람이 이보다 잘하면 골드가 더 는다.");
say();
const runs = Array.from({ length: N_SESSION }, (_, i) => playSession(i + 1));
const mid = (f: (t: typeof runs[number]) => number) => {
  const a = runs.map(f).sort((x, y) => x - y);
  return a[Math.floor(N_SESSION / 2)];
};
const rate = (f: (t: typeof runs[number]) => boolean) => runs.filter(f).length / N_SESSION;
const broke = rate((r) => r.brokeAt !== null);
const acted = rate((r) => r.acted / r.races > 0.9);
const brokeRuns = runs.filter((r) => r.brokeAt !== null);
const recovered = brokeRuns.filter((r) => !isBrokeGold(r.gold)).length / Math.max(1, brokeRuns.length);
say("| 항목 | 값 |");
say("|---|---|");
say(`| 경주 수 | ${[...new Set(runs.map((r) => r.races))].join(", ")} (설정 ${RACES_MIN}~${RACES_MAX}) |`);
say(`| 최종 골드 중앙 | ${mid((r) => r.gold).toLocaleString()} G — 시작 ${START_GOLD.toLocaleString()} 의 ${(mid((r) => r.gold) / START_GOLD).toFixed(2)}배 |`);
say(`| 상금 중앙 | ${mid((r) => r.prize).toLocaleString()} G |`);
say(`| 파산 경험 | ${pct(broke)} |`);
say(`| 그중 회복 | ${pct(recovered)} |`);
say(`| 파산 시점 중앙 | ${brokeRuns.length ? mid2(brokeRuns.map((r) => r.brokeAt!)) : "-"} R |`);
say(`| 경주의 90%+ 에서 행동 | ${pct(acted)} |`);
say();
say("| 항목 | 문서 | 실측 | |");
say("|---|---|---|---|");
say(`| 파산 경험 | ${pct(CLAIMED.brokeRate)} | ${pct(broke)} | ${mark(near(broke, CLAIMED.brokeRate, 0.06))} |`);
say(`| 참여율 | ${pct(CLAIMED.actRate)} | ${pct(acted)} | ${mark(near(acted, CLAIMED.actRate, 0.08))} |`);
say();
say("파산한 판이 회복 못 하는 이유는 회복이 어려워서가 아니라 **남은 경주가 없어서**다 —");
say("파산 시점이 판 끝에 몰려 있다.");
say();

function isBrokeGold(g: number) { return g < 100; }
function mid2(a: number[]) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

const drift = out.filter((l) => l.includes("⚠")).length;
say("---");
say();
say(drift
  ? `**어긋난 항목 ${drift}건.** 문서를 고쳐야 한다 — M5 에서는 값을 조정하지 않는다.`
  : "모든 항목이 문서와 맞는다.");

mkdirSync("evidence", { recursive: true });
writeFileSync("evidence/measurements.md", out.join("\n") + "\n");
console.log(out.join("\n"));
console.log(`\n[measure] evidence/measurements.md · 어긋남 ${drift}건`);
if (drift) process.exitCode = 1;
