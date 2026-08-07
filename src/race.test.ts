// 경주·배당·정산 검사.
//
// **패리뮤추얼은 항등식이 있는 시스템이다** — 지급 총액 = 총 판돈 × (1 − 공제율).
// 배당을 손으로 고르는 게임이 아니라서, 이 항등식이 깨지면 돈이 생기거나 사라진다.
// 값이 아니라 **관계**를 검사한다.
import { describe, it, expect } from "vitest";
import {
  buildRace, runRace, crowdBets, odds, settle, totalPayout, weights,
  truePower, publicPower, isHit, selKey, winningKeys, selectionProbs,
  POOLS, POOL_ORDER, TAKEOUT, FIELD_SIZE, PLACE_SLOTS, SEGMENTS,
  type PoolBook,
} from "./systems/race";
import { newHorse, type Horse } from "./systems/stable";


const mine = (): Horse => newHorse("그린라이트");

describe("경주 구성", () => {
  it("6두가 서고 그중 하나가 내 말이다", () => {
    const r = buildRace(1, mine(), 42);
    expect(r.runners).toHaveLength(FIELD_SIZE);
    expect(r.runners.filter((x) => x.mine)).toHaveLength(1);
    expect(new Set(r.runners.map((x) => x.gate)).size).toBe(FIELD_SIZE);
  });

  it("경주가 갈수록 상대가 세진다 — 압박 곡선", () => {
    const avg = (no: number) => {
      const r = buildRace(no, mine(), 7);
      const rivals = r.runners.filter((x) => !x.mine);
      return rivals.reduce((a, x) => a + x.stats.speed + x.stats.accel + x.stats.stamina, 0) / rivals.length;
    };
    expect(avg(8)).toBeGreaterThan(avg(1));
  });

  it("같은 시드면 같은 경주다", () => {
    const a = runRace(buildRace(3, mine(), 9), 9);
    const b = runRace(buildRace(3, mine(), 9), 9);
    expect(a.order).toEqual(b.order);
  });

  it("시드가 다르면 결과가 갈린다", () => {
    const orders = [1, 2, 3, 4, 5, 6].map((s) =>
      runRace(buildRace(1, mine(), s), s).order.join(","));
    expect(new Set(orders).size).toBeGreaterThan(3);
  });
});

describe("거리 — 스탯 가중치가 실제로 착순을 바꾼다", () => {
  it("가중치 합이 1 이다", () => {
    for (const d of [1000, 1200, 1400, 1600, 1800, 2000]) {
      const w = weights(d);
      expect(w.accel + w.speed + w.stamina).toBeCloseTo(1, 6);
    }
  });

  /**
   * **이 검사가 "다음 경주를 보고 스탯을 고른다"는 판단을 지킨다.**
   * 거리에 따라 유리한 스탯이 안 갈리면 강화 선택이 아무 의미가 없어진다.
   */
  it("가속형은 단거리에서, 체력형은 장거리에서 앞선다", () => {
    const sprinter = { speed: 3, accel: 9, stamina: 2, grit: 3, poise: 3 };
    const stayer = { speed: 3, accel: 2, stamina: 9, grit: 3, poise: 3 };
    expect(truePower({ gate: 1, name: "s", stats: sprinter, mine: false }, 1000))
      .toBeGreaterThan(truePower({ gate: 2, name: "t", stats: stayer, mine: false }, 1000));
    expect(truePower({ gate: 2, name: "t", stats: stayer, mine: false }, 2000))
      .toBeGreaterThan(truePower({ gate: 1, name: "s", stats: sprinter, mine: false }, 2000));
  });

  it("같은 말이 거리에 따라 다르게 들어온다 — 시뮬레이션에서도", () => {
    // 극단적인 단거리형 말을 내 말로 세우고 1000m 와 2000m 을 각각 40판 돌린다
    const horse: Horse = { name: "질풍", stats: { speed: 3, accel: 10, stamina: 1, grit: 3, poise: 3 } };
    const rate = (dist: number) => {
      let win = 0;
      for (let s = 1; s <= 40; s++) {
        const r = buildRace(1, horse, s);
        r.distance = dist;
        const res = runRace(r, s);
        if (res.order[0] === 1) win++;
      }
      return win / 40;
    };
    expect(rate(1000)).toBeGreaterThan(rate(2000));
  });
});

describe("결승선 — 3착까지 들어오는 것을 본다", () => {
  /**
   * **승식이 3착까지 보는데 화면이 1착에서 끊기면 판정을 못 본다.**
   * 그래서 경주는 1착 통과 뒤에도 계속 돌고, 각 말이 선을 끊는 시각을 남긴다.
   */
  const race = buildRace(1, mine(), 21);
  const res = runRace(race, 21);

  it("1착이 정확히 결승선에서 끊는다", () => {
    const w = res.splits.find((s) => s.gate === res.order[0])!;
    expect(w.progress[9]).toBeCloseTo(1, 6);
  });

  it("착순대로 통과 시각이 늦어진다", () => {
    for (let i = 1; i < res.order.length; i++) {
      expect(res.finish[res.order[i]]).toBeGreaterThanOrEqual(res.finish[res.order[i - 1]]);
    }
  });

  it("최소한 3착까지는 연장 안에 들어온다 — 승식 판정에 필요하다", () => {
    for (const g of res.order.slice(0, 3)) expect(res.finish[g]).toBeLessThan(20);
  });

  it("통과 시각 순서가 착순과 같다", () => {
    const byFinish = [...res.order].sort((a, b) => res.finish[a] - res.finish[b]);
    expect(byFinish).toEqual(res.order);
  });
});

describe("체력 — 마지막 직선에서 잡힌다", () => {
  it("체력이 낮으면 후반 구간에서 순위가 밀린다", () => {
    const weak: Horse = { name: "약체", stats: { speed: 8, accel: 8, stamina: 1, grit: 3, poise: 3 } };
    const r = buildRace(1, weak, 11);
    r.distance = 2000;
    const res = runRace(r, 11);
    const me = res.splits.find((s) => s.gate === 1)!;
    // 중간 순위 → 최종 순위. 후반에 떨어지는 것을 본다
    const rankAt = (seg: number) =>
      res.splits.slice().sort((a, b) => b.progress[seg] - a.progress[seg])
        .findIndex((s) => s.gate === 1);
    expect(me.progress.length).toBeGreaterThan(10);   // 연장 구간까지 기록된다
    expect(rankAt(9)).toBeGreaterThanOrEqual(rankAt(3));
  });
});

describe("승식 7종 — 적중 판정", () => {
  // 착순 4-2-6-1-5-3 을 기준으로 7종을 전부 본다. 도움말 오버레이의 예시와 같은 착순이다.
  const order = [4, 2, 6, 1, 5, 3];

  it("단승 — 1착만", () => {
    expect(isHit("win", [4], order)).toBe(true);
    expect(isHit("win", [2], order)).toBe(false);
  });

  it("연승 — 3착 이내", () => {
    for (const g of [4, 2, 6]) expect(isHit("place", [g], order)).toBe(true);
    expect(isHit("place", [1], order)).toBe(false);
  });

  it("복승 — 1·2착, 순서 무관", () => {
    expect(isHit("quinella", [4, 2], order)).toBe(true);
    expect(isHit("quinella", [2, 4], order)).toBe(true);
    expect(isHit("quinella", [4, 6], order)).toBe(false);   // 6 은 3착
  });

  it("쌍승 — 1·2착, 순서까지", () => {
    expect(isHit("exacta", [4, 2], order)).toBe(true);
    expect(isHit("exacta", [2, 4], order)).toBe(false);
  });

  it("복연승 — 둘 다 3착 이내", () => {
    for (const g of [[4, 2], [4, 6], [2, 6]]) expect(isHit("quinellaPlace", g, order)).toBe(true);
    expect(isHit("quinellaPlace", [4, 1], order)).toBe(false);
  });

  it("삼복승 — 1·2·3착, 순서 무관", () => {
    expect(isHit("trio", [6, 4, 2], order)).toBe(true);
    expect(isHit("trio", [4, 2, 1], order)).toBe(false);
  });

  it("삼쌍승 — 1·2·3착, 순서까지", () => {
    expect(isHit("trifecta", [4, 2, 6], order)).toBe(true);
    expect(isHit("trifecta", [4, 6, 2], order)).toBe(false);
  });

  it("순서 승식만 키에 순서가 남는다", () => {
    expect(selKey("exacta", [4, 2])).not.toBe(selKey("exacta", [2, 4]));
    expect(selKey("quinella", [4, 2])).toBe(selKey("quinella", [2, 4]));
    expect(selKey("trifecta", [4, 2, 6])).not.toBe(selKey("trifecta", [2, 4, 6]));
    expect(selKey("trio", [6, 2, 4])).toBe(selKey("trio", [2, 4, 6]));
  });

  it("적중 선택지 수가 스펙의 slots 와 같다", () => {
    for (const pool of POOL_ORDER) {
      expect(winningKeys(pool, order)).toHaveLength(POOLS[pool].slots);
    }
  });
});

describe("확률 — 순열 하나에서 7종을 유도한다", () => {
  const race = buildRace(1, mine(), 5);
  const probs = selectionProbs(race, 3, 5);

  /**
   * **승식마다 확률을 따로 계산하면 서로 모순된다**(복승 합 ≠ 쌍승 합 같은 것).
   * 순열 120개에서 유도했다는 증거가 이 검사다 — 각 승식의 합이 정확히 `slots` 여야 한다.
   */
  it("각 승식의 확률 합이 slots 와 같다", () => {
    for (const pool of POOL_ORDER) {
      const sum = Object.values(probs[pool]).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(POOLS[pool].slots, 5);
    }
  });

  it("어려운 승식일수록 선택지가 많다", () => {
    expect(Object.keys(probs.win)).toHaveLength(FIELD_SIZE);
    expect(Object.keys(probs.quinella).length).toBeLessThan(Object.keys(probs.exacta).length);
    expect(Object.keys(probs.trio).length).toBeLessThan(Object.keys(probs.trifecta).length);
  });

  it("삼쌍승이 삼복승보다 확률이 낮다 — 순서까지 맞혀야 한다", () => {
    const best = Object.entries(probs.trio).sort((a, b) => b[1] - a[1])[0];
    const gates = best[0].split("-").map(Number);
    const oneOrder = probs.trifecta[selKey("trifecta", gates)] ?? 0;
    expect(oneOrder).toBeLessThan(best[1]);
  });
});

describe("패리뮤추얼 — 배당이 판돈에서 나온다", () => {
  const race = buildRace(1, mine(), 5);
  const book = crowdBets(race, 3, 5);
  const res = runRace(race, 5);

  /**
   * **항등식.** 적중자에게 나간 돈의 합은 총 판돈 × (1 − 공제율) 이어야 한다.
   * 깨지면 돈이 생기거나 사라진다 — 승식이 7종이 되어도 그대로다.
   */
  it("모든 승식에서 지급 총액 = 총 판돈 × (1 − 공제율)", () => {
    for (const pool of POOL_ORDER) {
      const total = Object.values(book[pool]).reduce((a, b) => a + b, 0);
      expect(totalPayout(book, pool, res.order)).toBeCloseTo(total * (1 - TAKEOUT), 3);
    }
  });

  it("공제율만큼은 반드시 빠진다", () => {
    for (const pool of POOL_ORDER) {
      const total = Object.values(book[pool]).reduce((a, b) => a + b, 0);
      expect(totalPayout(book, pool, res.order)).toBeLessThan(total);
    }
  });

  it("크게 걸수록 내 배당이 내려간다", () => {
    for (const pool of POOL_ORDER) {
      const gates = res.order.slice(0, POOLS[pool].picks);
      expect(odds(book, pool, gates, 5000)).toBeLessThan(odds(book, pool, gates, 100));
    }
  });

  it("어려운 승식일수록 배당이 크다", () => {
    const g = res.order;
    expect(odds(book, "win", [g[0]], 100)).toBeGreaterThan(odds(book, "place", [g[0]], 100));
    expect(odds(book, "exacta", [g[0], g[1]], 100))
      .toBeGreaterThan(odds(book, "quinella", [g[0], g[1]], 100));
    expect(odds(book, "trifecta", g.slice(0, 3), 100))
      .toBeGreaterThan(odds(book, "trio", g.slice(0, 3), 100));
  });

  /** 실제 경마도 적중자가 없으면 환급한다. 배당을 무한대로 두지 않는 자리다. */
  it("아무도 1착을 안 걸었고 나도 못 맞혔으면 전액 환급", () => {
    const empty = {} as PoolBook;
    for (const p of POOL_ORDER) empty[p] = {};
    empty.win[selKey("win", [res.order[2]])] = 500;      // 3착 말에만 판돈이 있다
    const p = settle(empty, { pool: "win", gates: [res.order[3]], amount: 300 }, res.order);
    expect(p.refunded).toBe(true);
    expect(p.gold).toBe(300);
  });

  it("나 혼자 1착을 맞혔으면 풀을 독식한다 — 환급이 아니다", () => {
    const empty = {} as PoolBook;
    for (const p of POOL_ORDER) empty[p] = {};
    empty.win[selKey("win", [res.order[2]])] = 500;
    const p = settle(empty, { pool: "win", gates: [res.order[0]], amount: 300 }, res.order);
    expect(p.refunded).toBe(false);
    expect(p.hit).toBe(true);
    expect(p.gold).toBeGreaterThan(300);
  });

  it("맞히면 배당만큼, 틀리면 0", () => {
    const hit = settle(book, { pool: "win", gates: [res.order[0]], amount: 200 }, res.order);
    const miss = settle(book, { pool: "win", gates: [res.order[5]], amount: 200 }, res.order);
    expect(hit.hit).toBe(true);
    expect(hit.gold).toBeGreaterThan(0);
    expect(miss.gold).toBe(0);
  });
});

describe("배당은 진실이 아니다 — 컨셉의 핵심", () => {
  /**
   * **관중은 내 말의 강화 결과를 모른다.** 이 성질이 없으면
   * "내가 아는 것 ≠ 배당이 아는 것"이 사라지고 컨셉이 통째로 죽는다.
   */
  it("내 말의 공개 실력은 실제 실력과 다를 수 있다", () => {
    const strong: Horse = { name: "숨은강자", stats: { speed: 10, accel: 10, stamina: 10, grit: 3, poise: 3 } };
    const race = buildRace(1, strong, 3);
    const me = race.runners.find((r) => r.mine)!;
    const real = truePower(me, race.distance);
    const seen = publicPower(me, race.distance, 3);   // 지난 경주엔 약했다
    expect(seen).toBeLessThan(real);
  });

  it("강화를 숨긴 만큼 내 말 배당이 높게 남는다", () => {
    const strong: Horse = { name: "숨은강자", stats: { speed: 10, accel: 10, stamina: 10, grit: 3, poise: 3 } };
    const race = buildRace(1, strong, 3);
    const hidden = crowdBets(race, 3, 3);     // 관중이 약하다고 본다
    const known = crowdBets(race, 10, 3);     // 관중이 강하다고 본다
    expect(odds(hidden, "win", [1], 0)).toBeGreaterThan(odds(known, "win", [1], 0));
  });
});

/**
 * **3착이 반드시 결승선을 넘고 끝난다.**
 *
 * 전에는 `SEGMENTS + EXTRA` 만큼 고정으로 돌고 끝냈고, 그 안에 못 들어온 말에게는
 * `finish` 에 센티널을 박았다. 사용자가 화면에서 발견했다 —
 * "3착까지 안 들어왔는데 어느정도 시간이 지나면 그냥 끝내버리네".
 *
 * 실측(수정 전) — 3착 미완주 **2%** · 아무 말이라도 미완주 81% ·
 * 센티널이 둘 이상이라 **착순이 게이트 번호로 갈린 경주 34%**.
 * 검사가 못 잡은 이유는 `order` 가 항상 6개를 돌려줘서 **결과가 그럴듯해 보였기** 때문이다.
 */
describe("3착까지는 반드시 들어온다", () => {
  const N = 600;
  const races = Array.from({ length: N }, (_, i) => {
    const seed = i + 1;
    return runRace(buildRace(1 + (seed % 20), newHorse("검사마"), seed), seed);
  });

  it("상위 3착의 통과 시각이 **실제 값**이다 — 아직 달리는 중이 아니다", () => {
    for (const res of races) {
      const running = res.splits[0].progress.length;   // 미완주에 들어가는 값
      for (const gate of res.order.slice(0, PLACE_SLOTS)) {
        expect(res.finish[gate], `게이트 ${gate}`).toBeLessThan(running);
      }
    }
  });

  it("상위 3착이 실제로 결승선(1.0)을 넘었다", () => {
    for (const res of races) {
      for (const gate of res.order.slice(0, PLACE_SLOTS)) {
        const sp = res.splits.find((s) => s.gate === gate)!;
        expect(Math.max(...sp.progress), `게이트 ${gate}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  /** 같은 시각이면 정렬이 게이트 번호로 갈린다 — 그게 34% 였다. */
  it("상위 3착의 통과 시각이 서로 다르다 — 착순이 임의로 안 갈린다", () => {
    for (const res of races) {
      const t = res.order.slice(0, PLACE_SLOTS).map((g) => res.finish[g]);
      expect(new Set(t).size).toBe(PLACE_SLOTS);
      expect([...t]).toEqual([...t].sort((a, b) => a - b));   // 시각 순서 = 착순
    }
  });

  it("필요한 만큼만 더 돈다 — 대부분 짧고, 상한에 안 붙는다", () => {
    const lens = races.map((r) => r.splits[0].progress.length).sort((a, b) => a - b);
    expect(lens[0]).toBeGreaterThanOrEqual(SEGMENTS);
    expect(lens[Math.floor(N / 2)]).toBeLessThan(SEGMENTS * 2);
    expect(lens[N - 1]).toBeLessThan(SEGMENTS * 12);          // 상한에 닿으면 방어가 터진 것
  });

  /** 관중 시뮬은 1착만 쓰므로 연장을 안 돈다 — 400회를 돌리는데 느려지면 안 된다. */
  it("관중 시뮬(quick)은 연장을 안 돈다", () => {
    const r = runRace(buildRace(5, newHorse("검사마"), 1), 1, true);
    expect(r.splits[0].progress).toHaveLength(SEGMENTS);
  });
});
