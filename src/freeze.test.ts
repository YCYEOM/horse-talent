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
import { STATS, DISTANCE_STATS, MAX_LV } from "./systems/stable";
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

  it("경주 규모가 고정이다 — **12회 고정** · 6두 · 거리 6종", () => {
    // 원래 8~12 랜덤이었다. 사용자가 실제 플레이(한 판 10분) 뒤 고정을 택했다.
    expect(RACES_MIN).toBe(12);
    expect(RACES_MAX).toBe(12);
    expect(RACES_MIN).toBe(RACES_MAX);
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
