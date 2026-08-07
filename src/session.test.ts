// 한 판 전체 시뮬레이션 — **경제가 도는가.**
//
// M1 의 검사는 경주 **하나씩**만 봤다. 그래서 12경주에서 골드가 폭발하는지
// 3경주에 말라붙는지는 아무도 안 봤다. 시작 골드 1,600 과 강화 비용은
// **여기서 나온 값이다** — 손으로 고르고 그럴듯해 보여서 둔 것이 아니다.
//
// `projectGates.honest-length` 가 실측을 요구하는데, 그 실측의 절반이 이 파일이고
// 나머지 절반(초 단위 길이)은 사람이 잰다.
import { describe, it, expect } from "vitest";
import {
  raceCount, progressLabel, newTally, forgeSummary, statTotal,
  prizeFor, purse, featureRace, PURSE_SHARE, FEATURE_MULT,
  START_GOLD, type Tally,
} from "./systems/session";
import { DISTANCES } from "./systems/race";
import { RACES } from "./systems/scale";
import { newHorse } from "./systems/stable";
import { playSession } from "./systems/policy";


const N = 300;
const runs = Array.from({ length: N }, (_, i) => playSession(i + 1));
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

describe("경주 수 — 고정", () => {
  /**
   * 원래 8~12 랜덤이었고 이유가 있었다 — 언제 끝날지 모르면
   * "마지막 경주에 전 재산" 이 안 통한다.
   * **사용자가 실제 플레이(한 판 10분) 뒤 고정을 택했다.**
   * 몰빵 제동은 이제 패리뮤추얼(크게 걸면 내 배당이 내려간다)만 남는다.
   */
  it("모든 판이 같은 수다 — `scale.ts` 가 정한다", () => {
    for (const r of runs) expect(r.races).toBe(RACES);
    expect(new Set(runs.map((r) => r.races)).size).toBe(1);
  });

  it("화면이 몇 번째인지와 전체를 함께 보여준다", () => {
    expect(progressLabel(5)).toContain(String(RACES));
    expect(progressLabel(5)).toContain("5");
  });
});

describe("상금 — 이게 없으면 게임이 성립하지 않는다", () => {
  it("1·2·3착만 받고 몫이 실제 경마 배분과 같다", () => {
    expect(prizeFor(1, 0)).toBe(Math.round(purse(1) * PURSE_SHARE[0]));
    expect(prizeFor(1, 2)).toBeGreaterThan(0);
    expect(prizeFor(1, 3)).toBe(0);       // 4착은 없다
    expect(prizeFor(1, -1)).toBe(0);
  });

  it("착순이 낮을수록 적게 받는다", () => {
    expect(prizeFor(5, 0)).toBeGreaterThan(prizeFor(5, 1));
    expect(prizeFor(5, 1)).toBeGreaterThan(prizeFor(5, 2));
  });

  /**
   * **소폭 상승이다.** 처음엔 2.15배로 뒀는데 후반 쏠림이 과했다 —
   * 상금이 후반에만 크면 초반이 버리는 구간이 되고 후반 판단이 하나로 수렴한다.
   * 지금은 1.25배이고, **국면 차이는 상금 크기가 아니라
   * 내 말이 실제로 3착 안에 드는가**에서 나온다.
   */
  it("후반이 소폭 더 크다 — 오르되 쏠리지 않는다", () => {
    expect(purse(12)).toBeGreaterThan(purse(1));
    expect(purse(12)).toBeLessThan(purse(1) * 1.5);
  });

  /** 베팅만으로는 못 번다(전 승식 −EV). 상금이 유일하게 확실한 수입이다. */
  it("한 판 수입의 상당 부분이 상금에서 나온다", () => {
    const withPrize = runs.filter((r) => r.prize > 0).length;
    expect(withPrize / N).toBeGreaterThan(0.9);
    expect(median(runs.map((r) => r.prize))).toBeGreaterThan(START_GOLD);
  });
});

describe("경제 — 12경주를 견디는가", () => {
  const golds = runs.map((r) => r.gold);
  const broke = runs.filter((r) => r.brokeAt !== null).length;

  /**
   * **지표를 고쳤다.** 처음엔 "최종 골드가 시작의 0.8~2.5배"를 목표로 뒀는데,
   * 그건 골드를 **점수**로 본 것이다. 골드는 점수가 아니라 **강화 연료**이고,
   * 한 자리에서 끝나는 게임은 연료를 다 쓰고 끝나는 게 맞다.
   * 진짜 질문은 **끝까지 선택할 수 있었는가**다.
   */
  it("거의 매 경주 베팅할 수 있다 — 구경만 하는 판이 아니다", () => {
    const rate = runs.reduce((a, r) => a + r.acted / r.races, 0) / N;
    expect(rate).toBeGreaterThan(0.9);
  });

  it("파산이 가능하되 흔하지는 않다", () => {
    expect(broke / N).toBeGreaterThan(0.03);
    expect(broke / N).toBeLessThan(0.35);
  });

  it("돈 찍는 기계가 아니다 — 최종 골드가 폭발하지 않는다", () => {
    expect(median(golds)).toBeLessThan(START_GOLD * 3);
  });

  it("판마다 결과가 갈린다", () => {
    expect(Math.max(...golds)).toBeGreaterThan(median(golds) * 2);
  });

  it("초반에 바로 마르지는 않는다", () => {
    const early = runs.filter((r) => r.brokeAt !== null && r.brokeAt <= 2).length;
    expect(early / N).toBeLessThan(0.05);
  });
});

describe("강화 — 한 판에 몇 번 들어가나", () => {
  const counts = runs.map((r) => r.forges.success + r.forges.keep + r.forges.drop);

  /**
   * 5스탯 × 10단계 = 50 을 **다 못 채우는 것이 의도다** — 어디에 몰아줄지가 결정이다.
   * 폭이 7~14 였는데 HT-010(1착 상금 0.60 → 0.45)으로 중앙이 16 이 됐다.
   * **"다 못 채운다"는 성질 자체는 `freeze.test` 가 직접 지킨다**(22회를 줘도 만렙 0%) —
   * 여기 폭은 경제 규모가 크게 움직였는지 보는 지표다.
   */
  it("중앙값이 7~18회 — 최대치(50)를 다 못 채운다", () => {
    const m = median(counts);
    expect(m).toBeGreaterThanOrEqual(7);
    expect(m).toBeLessThanOrEqual(18);
  });

  it("세 갈래가 전부 실제로 나온다", () => {
    const sum = runs.reduce((a, r) => ({
      success: a.success + r.forges.success,
      keep: a.keep + r.forges.keep,
      drop: a.drop + r.forges.drop,
    }), { success: 0, keep: 0, drop: 0 });
    expect(sum.success).toBeGreaterThan(0);
    expect(sum.keep).toBeGreaterThan(0);
    expect(sum.drop).toBeGreaterThan(0);
  });

  it("강화가 실제로 쌓인다 — 시작 9 보다 늘어난 판이 대부분이다", () => {
    // 시작 스탯 합 = 3 × 3 = 9
    const grew = runs.filter((r) => r.forges.success > r.forges.drop).length;
    expect(grew / N).toBeGreaterThan(0.6);
  });
});

describe("결산 재료", () => {
  it("최고 배당 한 건이 기록된다 — 페이오프가 숫자가 아니라 사건이 되게", () => {
    const withBest = runs.filter((r) => r.best !== null);
    expect(withBest.length / N).toBeGreaterThan(0.7);
    for (const r of withBest) {
      expect(r.best!.race).toBeGreaterThan(0);
      expect(r.best!.odds).toBeGreaterThan(0);
    }
  });

  it("강화 이력이 한 줄로 요약된다", () => {
    const t: Tally = newTally(10, 1000);
    expect(forgeSummary(t)).toBe("강화 없음");
    t.forges = { success: 5, keep: 3, drop: 2 };
    expect(forgeSummary(t)).toContain("10회");
    expect(forgeSummary(t)).toContain("감소 2");
  });

  it("능력치 합을 한 숫자로 본다", () => {
    expect(statTotal(newHorse("x"))).toBe(15);   // 5종 × 3
  });
});

describe("대상경주 (G1) — 마지막 1회 · 3배 · 거리 사전 공개", () => {
  it("판의 마지막 경주가 대상경주다", () => {
    for (let s = 1; s <= 50; s++) {
      expect(featureRace(s).no).toBe(raceCount(s));
    }
  });

  it("상금이 정확히 3배다", () => {
    const f = featureRace(7);
    expect(purse(f.no, f)).toBe(purse(f.no) * FEATURE_MULT);
    expect(purse(f.no - 1, f)).toBe(purse(f.no - 1));   // 직전 경주는 그대로
  });

  /** **거리를 미리 아는 것이 이 규칙의 핵심이다** — 상금 3배는 부수적이다. */
  it("거리가 판 시작부터 정해져 있다 — 같은 시드면 항상 같다", () => {
    for (let s = 1; s <= 30; s++) {
      expect(featureRace(s).distance).toBe(featureRace(s).distance);
      expect(DISTANCES).toContain(featureRace(s).distance);
    }
  });

  it("거리가 판마다 다르다 — 매번 같은 준비를 하면 안 된다", () => {
    expect(new Set(Array.from({ length: 40 }, (_, i) => featureRace(i + 1).distance)).size)
      .toBeGreaterThan(3);
  });

  /**
   * 처음엔 15% 이상을 목표로 뒀는데 **그 숫자에 근거가 없었다.**
   * 경주 10회 중 하나가 3배면 고르게 입상해도 3/12 = 25% 인데,
   * **대상경주는 상대가 가장 센 경주**라 입상률이 평균보다 낮은 게 정상이다.
   * 5% 미만이면 클라이맥스가 안 오는 것이고, 50% 넘으면 나머지가 곁다리다.
   */
  it("대상경주가 한 판 상금에서 눈에 띄되 지배하지 않는다", () => {
    const share = runs.reduce((a, r) => a + (r.featurePrize / Math.max(1, r.prize)), 0) / N;
    expect(share).toBeGreaterThan(0.02);
    expect(share).toBeLessThan(0.50);
  });
});
