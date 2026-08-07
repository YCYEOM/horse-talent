// 지난 판 순위. **저장이 아니라 규칙을 검사한다** —
// `localStorage` 는 브라우저에만 있어서 여기서 못 돌리지만,
// "무엇이 더 좋은 기록인가"는 순수 함수라 볼 수 있다. 그래서 둘을 나눠뒀다.
import { describe, it, expect } from "vitest";
import { ranked, withRun, rankOf, isBest, KEEP, type Run } from "./systems/records";

const run = (gold: number, at: number, name = `말${at}`): Run =>
  ({ name, gold, races: 20, bestOdds: 0, at });

describe("순위 — 골드가 먼저, 같으면 먼저 세운 쪽", () => {
  it("골드 내림차순이다", () => {
    expect(ranked([run(100, 1), run(900, 2), run(500, 3)]).map((r) => r.gold))
      .toEqual([900, 500, 100]);
  });

  /**
   * **동점이면 먼저 세운 기록이 위다.** 나중 판이 동점으로 앞지르면
   * "방금 최고 기록을 깼다"가 거짓이 된다.
   */
  it("동점이면 먼저 세운 기록이 위다", () => {
    expect(ranked([run(500, 9), run(500, 2), run(500, 5)]).map((r) => r.at))
      .toEqual([2, 5, 9]);
  });

  it("원본을 안 건드린다", () => {
    const src = [run(100, 1), run(900, 2)];
    ranked(src);
    expect(src.map((r) => r.at)).toEqual([1, 2]);
  });
});

describe("기록 추가", () => {
  it(`${KEEP}개까지만 남고 아래부터 버려진다`, () => {
    let runs: Run[] = [];
    for (let i = 1; i <= KEEP + 10; i++) runs = withRun(runs, run(i * 10, i));
    expect(runs).toHaveLength(KEEP);
    // 가장 나쁜 기록들이 잘려나갔다
    expect(Math.min(...runs.map((r) => r.gold))).toBe((KEEP + 10 - KEEP + 1) * 10);
  });

  it("좋은 기록은 넘쳐도 살아남는다", () => {
    let runs: Run[] = [];
    for (let i = 1; i <= KEEP; i++) runs = withRun(runs, run(1000 + i, i));
    const best = run(999999, 500);
    runs = withRun(runs, best);
    expect(ranked(runs)[0].at).toBe(500);
    expect(runs).toHaveLength(KEEP);
  });
});

describe("등수와 최고 기록", () => {
  const before = [run(900, 1), run(500, 2), run(100, 3)];

  it("등수는 1부터다", () => {
    const mine = run(700, 4);
    expect(rankOf(withRun(before, mine), mine)).toBe(2);
  });

  it("목록에 없으면 0 이다", () => {
    expect(rankOf(before, run(700, 99))).toBe(0);
  });

  it("이전 최고보다 높아야 갱신이다", () => {
    expect(isBest(before, run(901, 4))).toBe(true);
    expect(isBest(before, run(900, 4))).toBe(false);   // 동점은 갱신이 아니다
    expect(isBest(before, run(899, 4))).toBe(false);
  });

  /** 비교 대상이 없는데 "최고 기록"이라고 하면 말이 안 된다. */
  it("첫 판은 갱신으로 안 친다", () => {
    expect(isBest([], run(5000, 1))).toBe(false);
  });
});

// ── 전역 순위에서 받은 값 ────────────────────────────────────────────────
// 네트워크는 검사에서 못 돌린다. 대신 **서버가 준 값을 어떻게 걸러 받는지**를 본다 —
// 남이 고친 응답이나 옛 판 형식이 섞이면 화면이 깨진다.
describe("전역 순위 — 받은 값을 걸러 받는다", () => {
  it("모양이 맞는 것만 통과한다", async () => {
    const mod = await import("./systems/records");
    // `toRuns` 는 안 내보낸다 — `ranked` 로 같은 성질을 본다
    const dirty = [
      { name: "정상", gold: 100, races: 20, bestOdds: 2, at: 1 },
      { name: "배당없음", gold: 50, races: 20, at: 2 },            // bestOdds 누락
    ] as Run[];
    const out = mod.ranked(dirty);
    expect(out[0].name).toBe("정상");
    expect(out).toHaveLength(2);
  });

  /** 서버가 죽었을 때 **빈 목록과 구별**되어야 "기록 없음"을 안 거짓말한다. */
  it("못 받으면 null 이지 빈 목록이 아니다", async () => {
    const { fetchBoard } = await import("./systems/records");
    const orig = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new Error("offline"))) as typeof fetch;
    try {
      expect(await fetchBoard()).toBeNull();
    } finally { globalThis.fetch = orig; }
  });

  it("서버가 200 이 아니면 null 이다", async () => {
    const { submitRun } = await import("./systems/records");
    const orig = globalThis.fetch;
    globalThis.fetch = (() => Promise.resolve(new Response("nope", { status: 429 }))) as typeof fetch;
    try {
      expect(await submitRun(run(100, 1))).toBeNull();
    } finally { globalThis.fetch = orig; }
  });

  it("서버 응답에서 등수와 모수를 읽는다", async () => {
    const { submitRun } = await import("./systems/records");
    const orig = globalThis.fetch;
    globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({
      rank: 7, total: 42,
      runs: [{ name: "일등", gold: 999, races: 20, bestOdds: 3, at: 10 }],
    }), { status: 200 }))) as typeof fetch;
    try {
      const b = await submitRun(run(100, 1));
      expect(b).not.toBeNull();
      expect(b!.rank).toBe(7);
      expect(b!.total).toBe(42);
      expect(b!.runs[0].name).toBe("일등");
    } finally { globalThis.fetch = orig; }
  });
});
