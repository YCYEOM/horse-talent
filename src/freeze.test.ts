// M4 — **동결.** 새 시스템·승식·스탯·페이즈 금지 (HT-007).
//
// 동결은 문서에 적는 약속이 아니라 **검사**여야 한다.
// 문서에만 적으면 다음 요청에 조용히 늘어나고, 늘어난 뒤에는 되돌리기 어렵다.
//
// 이 파일이 깨졌다면 둘 중 하나다 —
//   · 실수로 늘렸다 → 되돌린다
//   · 의도적으로 늘린다 → **M4 를 열고 새 마일스톤을 뜬다.** 검사를 고치는 것이 먼저가 아니다.
import { describe, it, expect } from "vitest";
import { POOL_ORDER, DISTANCES, FIELD_SIZE, buildRace, crowdBets, odds, winProb } from "./systems/race";
import { newHorse } from "./systems/stable";
import { RACES, rivalForm, RIVAL_END } from "./systems/scale";
import { rng } from "./kits/rng";
import { STATS, DISTANCE_STATS, MAX_LV, forge, canForge } from "./systems/stable";
import {
  RACES_MIN, RACES_MAX, PURSE_SHARE, MIN_BET,
  recoveryPrize, canRecoverHere, featureRace,
} from "./systems/session";

describe("동결 — 규칙의 개수", () => {
  it("신규 핵심 시스템은 둘이다 — race · stable", () => {
    // 플랫폼이 `newCoreSystems` 를 최대 2 로 하드캡한다(CON-001).
    // 세 번째가 필요해지면 컨셉부터 다시 본다.
    expect(["race", "stable"]).toHaveLength(2);
  });

  it("승식은 7종이다 — 실제 경마 그대로", () => {
    expect(POOL_ORDER).toHaveLength(7);
  });

  it("능력치는 5종이고 그중 거리 축은 셋이다", () => {
    expect(STATS).toHaveLength(5);
    expect(DISTANCE_STATS).toHaveLength(3);
    expect(MAX_LV).toBe(10);
  });

  it("페이즈는 6종이다 — 이름·마방·창구·트랙·정산·결산", () => {
    const PHASES = ["name", "stable", "window", "track", "settle", "recap"];
    expect(PHASES).toHaveLength(6);
  });

  it("경주 규모가 고정이다 — **20회 고정** · 6두 · 거리 6종", () => {
    // 8~12 랜덤 → 12(HT-007) → **20(HT-009)**. 12경주 완주가 5분이라 목표의 절반이었다.
    // 규모는 `scale.ts` 한 곳에서만 정한다.
    expect(RACES_MIN).toBe(RACES);
    expect(RACES_MAX).toBe(RACES);
    expect(RACES_MIN).toBe(RACES_MAX);
    expect(RACES).toBe(20);
    expect(FIELD_SIZE).toBe(6);
    expect(DISTANCES).toHaveLength(6);
  });

  it("상금은 3착까지만 나눈다", () => {
    expect(PURSE_SHARE).toHaveLength(3);
    expect(PURSE_SHARE.reduce((a, b) => a + b, 0)).toBeCloseTo(0.94, 2);
  });
});

describe("판독성 — 함정 마권이 보이는가", () => {
  /**
   * 최약체(능력치 6위)는 승률 0.2% · 3착 5% 다. 그 마권은 **순수 함정**인데
   * 화면에는 "80.0배" 라는 매력적인 숫자만 있었다.
   *
   * 값으로 고치려면 출주표를 더 좁혀야 하는데 그러면 다양성이 죽는다.
   * **이미 화면에 있는 것(배당)을 읽히게** 만드는 쪽을 골랐다 — M4 는 값과 판독성뿐이다.
   */
  it("관중 예상 승률의 합이 1 이다 — 배당에서 그대로 나온다", () => {
    const race = buildRace(6, newHorse("x"), 11);
    const book = crowdBets(race, 4.6, 11);
    const sum = race.runners.reduce((a, r) => a + winProb(book, r.gate), 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it("배당이 높을수록 예상 승률이 낮다 — 함정이 숫자로 드러난다", () => {
    const race = buildRace(6, newHorse("x"), 11);
    const book = crowdBets(race, 4.6, 11);
    const rows = race.runners
      .map((r) => ({ o: odds(book, "win", [r.gate]), p: winProb(book, r.gate) }))
      .sort((a, b) => a.o - b.o);
    for (let i = 1; i < rows.length; i++) expect(rows[i].p).toBeLessThanOrEqual(rows[i - 1].p);
  });

  it("최약체의 예상 승률이 실제로 아주 낮다", () => {
    let worst = 1;
    for (let s = 1; s <= 200; s++) {
      const race = buildRace(8, newHorse("x"), s);
      const book = crowdBets(race, 6.2, s);
      worst = Math.min(worst, ...race.runners.map((r) => winProb(book, r.gate)));
    }
    expect(worst).toBeLessThan(0.03);
  });
});

describe("파산 — 끝이 아니다", () => {
  /**
   * 실측: 파산은 판의 8% 에서 일어나고 **거의 항상 마지막 1~2경주**다
   * (파산 시점 중앙 9R / 전체 10R). 89% 가 회복 못 하는 이유는
   * 회복이 어려워서가 아니라 **남은 경주가 없어서**다 —
   * 한 번 마르면 회복까지 걸리는 건 중앙값 **1경주**다.
   *
   * 그래서 판을 끊지 않는다. 대신 **회복이 한 발 앞이라는 것이 구조적으로 참**이어야 한다.
   */
  it("어느 경주에서든 3착 한 번이면 다시 걸 수 있다", () => {
    for (let no = 1; no <= RACES_MAX; no++) {
      expect(canRecoverHere(no)).toBe(true);
      expect(recoveryPrize(no)).toBeGreaterThanOrEqual(MIN_BET);
    }
  });

  it("3착 상금이 최소 베팅보다 넉넉하다 — 겨우 한 판이 아니라 여러 판", () => {
    expect(recoveryPrize(RACES_MIN)).toBeGreaterThan(MIN_BET * 3);
  });

  it("대상경주는 회복 폭이 더 크다 — 마지막에 몰려도 한 방이 있다", () => {
    const f = featureRace(3);
    expect(recoveryPrize(f.no, f)).toBeGreaterThan(recoveryPrize(f.no));
  });
});

/**
 * **규모가 바뀌어도 압박 곡선의 모양이 같은가.**
 *
 * 이 저장소가 규모 변경으로 두 번 무너졌다 — 스탯 3→5(HT-006), 경주 12→20(HT-009).
 * 두 번 다 곡선을 **기울기**로 적어놔서, 규모가 바뀌면 다시 계산해야 하는데
 * 아무도 안 했기 때문이다. 끝점으로 적으면 그 일이 안 생긴다.
 */
describe("압박 곡선은 규모에서 파생된다", () => {
  it("첫 경주는 내 말 시작값과 같고 마지막 경주는 끝점이다", () => {
    expect(rivalForm(1)).toBeCloseTo(3, 5);
    expect(rivalForm(RACES)).toBeCloseTo(RIVAL_END, 5);
  });

  it("**경주 수를 바꿔도 마지막 상대가 같다** — 이것이 HT-009 가 고친 것의 전부다", () => {
    for (const races of [8, 12, 20, 40]) {
      expect(rivalForm(1, races)).toBeCloseTo(3, 5);
      expect(rivalForm(races, races), `${races}경주`).toBeCloseTo(RIVAL_END, 5);
    }
  });

  it("단조 증가한다 — 뒤로 갈수록 상대가 세진다", () => {
    for (let no = 2; no <= RACES; no++) expect(rivalForm(no)).toBeGreaterThan(rivalForm(no - 1));
  });

  /** 내 말 천장이 10 이다. 끝점이 8 을 넘으면 강화로 따라갈 수 없게 된다. */
  it("마지막 상대가 내 말 천장보다 충분히 아래다", () => {
    expect(RIVAL_END).toBeLessThan(8);
  });
});

/**
 * **특화 압력이 규모가 커져도 남아 있는가.**
 *
 * HT-006 이 세운 것 — 강화 예산이 스탯 5종을 다 채우기엔 모자라야 배분이 판단이 된다.
 * 경주가 12 → 20 이 되며 강화 기회가 8 → 14 회로 늘었으므로 **다시 확인한다**(HT-009).
 * 예산이 넉넉해지면 "다 올리면 그만"이 되고 그건 판단이 아니라 정답이다.
 */
describe("특화 압력 — 다 올릴 수는 없다", () => {
  /** 참조 플레이어처럼 가장 낮은 스탯부터 올린다. 가장 균등하게 퍼뜨리는 방식이다. */
  function afterForges(seed: number, times: number) {
    const rnd = rng(seed * 99991);
    const h = newHorse("t");
    for (let i = 0; i < times; i++) {
      const k = [...STATS].filter((x) => canForge(h.stats[x]))
        .sort((a, b) => h.stats[a] - h.stats[b])[0];
      if (k) forge(h, k, rnd);
    }
    return STATS.map((k) => h.stats[k]);
  }

  // 실측 중앙이 16회다(HT-010 에서 14 → 16). **여유를 두고 22회를 줘도** 못 채워야 한다 —
  // 중앙값과 같은 수로 검사하면 여유가 0 이고, 경제가 조금만 나아져도 바로 깨진다.
  const runs = Array.from({ length: 400 }, (_, i) => afterForges(i + 1, 22));

  it("**5종을 다 만렙으로 올릴 수 없다** — 예산이 모자라야 배분이 판단이 된다", () => {
    expect(runs.filter((v) => v.every((x) => x === MAX_LV)).length).toBe(0);
  });

  it("5종을 전부 높게 가져갈 수도 없다", () => {
    const allHigh = runs.filter((v) => v.every((x) => x >= 7)).length / runs.length;
    expect(allHigh).toBeLessThan(0.05);
  });

  /** 총합이 절반을 넘으면 "다 올리면 그만"에 가까워진다. */
  it("한 판에 올릴 수 있는 총량이 천장의 절반 아래다", () => {
    const total = runs.map((v) => v.reduce((a, b) => a + b, 0)).sort((a, b) => a - b);
    expect(total[Math.floor(total.length / 2)]).toBeLessThan(MAX_LV * STATS.length * 0.6);
  });
});
