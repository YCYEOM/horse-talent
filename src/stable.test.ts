// 강화 검사. 사용자가 지정한 성질 셋을 못 박는다 —
// 세 갈래로 갈린다 / 확률이 화면에 적힌 그대로다 / 단계가 오를수록 감소가 잦아진다.
import { describe, it, expect } from "vitest";
import {
  newHorse, forge, forgeOdds, forgeCost, canForge, randomName,
  ODDS, STATS, MIN_LV, MAX_LV, START_LV, type ForgeResult,
} from "./systems/stable";
import { rng } from "./kits/rng";

/** 정해진 값을 돌려주는 가짜 난수 — 세 갈래를 각각 정확히 겨냥한다. */
const fixed = (v: number) => () => v;

describe("확률표 — 값이 아니라 관계를 검사한다", () => {
  it("행마다 합이 100 이다", () => {
    for (let lv = MIN_LV; lv < MAX_LV; lv++) {
      const o = ODDS[lv];
      expect(o).toBeDefined();
      expect(o.success + o.keep + o.drop).toBe(100);
    }
  });

  /** 사용자 지정 — "강화가 높아질수록 능력치 감소의 확률은 올라가게". */
  it("감소 확률이 단계에 따라 단조 증가한다", () => {
    for (let lv = MIN_LV + 1; lv < MAX_LV; lv++) {
      expect(ODDS[lv].drop).toBeGreaterThanOrEqual(ODDS[lv - 1].drop);
    }
    expect(ODDS[MAX_LV - 1].drop).toBeGreaterThan(ODDS[MIN_LV].drop);
  });

  it("성공 확률은 단조 감소한다", () => {
    for (let lv = MIN_LV + 1; lv < MAX_LV; lv++) {
      expect(ODDS[lv].success).toBeLessThan(ODDS[lv - 1].success);
    }
  });

  /** 초반에 말이 망가지면 시작도 못 한다. */
  it("1~2단계에는 감소가 없다", () => {
    expect(ODDS[1].drop).toBe(0);
    expect(ODDS[2].drop).toBe(0);
  });

  /**
   * **세 갈래인 이유를 검사가 지킨다.** 보존이 사라지면 실패가 곧 재앙이 되고
   * 8단계부터 아무도 안 누른다 — "기대값은 나쁘지만 최악은 아닌" 구간이 있어야 한다.
   */
  it("보존이 어느 단계에서도 사라지지 않는다", () => {
    for (let lv = MIN_LV; lv < MAX_LV; lv++) expect(ODDS[lv].keep).toBeGreaterThan(0);
  });

  it("후반에는 감소가 성공을 넘는다 — 손이 떨리는 자리가 있다", () => {
    expect(ODDS[9].drop).toBeGreaterThan(ODDS[9].success);
  });

  it("비용이 단계에 비례한다", () => {
    expect(forgeCost(1)).toBeLessThan(forgeCost(9));
  });
});

describe("강화 세 갈래", () => {
  it("성공하면 한 단계 오른다", () => {
    const h = newHorse("테스트");
    const r: ForgeResult = forge(h, "speed", fixed(0.1));   // 3단계 성공률 78%
    expect(r).toBe("success");
    expect(h.stats.speed).toBe(START_LV + 1);
  });

  it("보존이면 아무것도 안 바뀐다 — 골드만 나간다", () => {
    const h = newHorse("테스트");
    // 3단계: 성공 78 / 보존 20 / 감소 2 → 0.85 는 보존 구간
    const r = forge(h, "speed", fixed(0.85));
    expect(r).toBe("keep");
    expect(h.stats.speed).toBe(START_LV);
  });

  it("감소면 한 단계만 내려간다", () => {
    const h = newHorse("테스트");
    const r = forge(h, "speed", fixed(0.99));   // 3단계 감소 구간
    expect(r).toBe("drop");
    expect(h.stats.speed).toBe(START_LV - 1);
  });

  it("감소해도 1 밑으로는 안 간다", () => {
    const h = newHorse("테스트");
    h.stats.speed = MIN_LV;
    forge(h, "speed", fixed(0.999));
    expect(h.stats.speed).toBe(MIN_LV);
  });

  it("꼭대기에서는 강화할 수 없다", () => {
    const h = newHorse("테스트");
    h.stats.speed = MAX_LV;
    expect(canForge(MAX_LV)).toBe(false);
    forge(h, "speed", fixed(0.99));
    expect(h.stats.speed).toBe(MAX_LV);   // 감소도 안 한다
  });

  it("고른 능력치만 바뀐다", () => {
    const h = newHorse("테스트");
    forge(h, "accel", fixed(0.1));
    expect(h.stats.accel).toBe(START_LV + 1);
    expect(h.stats.speed).toBe(START_LV);
    expect(h.stats.stamina).toBe(START_LV);
  });

  /** 표에 적힌 확률이 실제 분포와 같은가 — 화면에 적는 숫자가 거짓이면 안 된다. */
  it("실제 분포가 표에 적힌 확률과 맞는다 (4000회)", () => {
    const rnd = rng(1234);
    const N = 4000;
    let ok = 0, keep = 0, drop = 0;
    for (let i = 0; i < N; i++) {
      const h = newHorse("t");
      h.stats.speed = 6;                       // 6→7: 48 / 33 / 19
      const r = forge(h, "speed", rnd);
      if (r === "success") ok++; else if (r === "keep") keep++; else drop++;
    }
    expect(ok / N).toBeCloseTo(0.48, 1);
    expect(keep / N).toBeCloseTo(0.33, 1);
    expect(drop / N).toBeCloseTo(0.19, 1);
  });
});

describe("말", () => {
  it("세 능력치가 3에서 시작한다", () => {
    const h = newHorse("그린라이트");
    for (const k of STATS) expect(h.stats[k]).toBe(START_LV);
    expect(h.name).toBe("그린라이트");
  });

  it("화면에 적을 확률 셋이 항상 나온다", () => {
    for (let lv = MIN_LV; lv < MAX_LV; lv++) {
      const o = forgeOdds(lv);
      expect(o.success + o.keep + o.drop).toBe(100);
    }
  });

  it("이름이 절차 생성된다 — 수작업 콘텐츠 0", () => {
    const names = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => randomName(rng(s))));
    expect(names.size).toBeGreaterThan(4);
  });
});
