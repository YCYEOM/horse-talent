// 밸런스 — **분포를 검사한다.**
//
// 이 파일이 생긴 이유: 처음 구현은 경주가 능력치 순서대로 끝났고(인기마 승률 84% ·
// 최약체 0% · 3착 이내 99.6%), 단승 인기마 수익률이 **+54% 인 돈 찍는 기계**였다.
// 그런데 **검사 43개가 전부 통과했다.** 각 함수가 동작하는지만 봤지
// **어느 결과가 실제로 얼마나 나오는지**는 아무도 안 봤기 때문이다.
//
// 인기마 승률을 84% → 34% 로 바꿔도 기존 검사는 하나도 안 깨졌다.
// 그래서 여기서는 값이 아니라 **분포와 기대수익률**을 못 박는다.
import { describe, it, expect } from "vitest";
import {
  buildRace, runRace, crowdBets, settle, truePower, POOLS, POOL_ORDER,
  type Pool,
} from "./systems/race";
import { newHorse, STATS, type Horse, type StatKey } from "./systems/stable";
import { rivalForm, RACES } from "./systems/scale";

const flat = (lv: number): Horse => ({ name: "내말", stats: { speed: lv, accel: lv, stamina: lv, grit: 3, poise: 3 } });
/**
 * 그 라운드의 상대 평균 = 관중이 내 말을 그 정도로 본다는 뜻.
 * **공식을 복사하지 않고 엔진에서 가져온다** — 0.45 를 손으로 적어뒀다가
 * 엔진이 0.32 로 바뀐 뒤에도 안 따라와서 **"인기마 단승 +8%"** 라는 가짜 결과가 나왔다.
 * HT-009 에서 곡선이 기울기에서 끝점 파생으로 바뀌었는데, `rivalForm` 을 부르므로 따라왔다.
 */
const formOf = (no: number) => rivalForm(no);

/**
 * 상대 평균이 `lv` 쯤 되는 경주 번호. **"평판과 실력이 같은 순간"을 찾는 도구다.**
 *
 * 예전에는 `5경주 · 5단계` 를 손으로 적어뒀는데, 12경주에서는 그 지점의 상대가 4.28 이라
 * 우위가 거의 없었지만 20경주에서는 3.74 로 내려가 **우위가 생겨버렸다**(HT-009).
 * 경주 번호가 아니라 **뜻**을 적는다.
 */
function raceWhereRivalsAre(lv: number): number {
  for (let no = 1; no <= RACES; no++) if (rivalForm(no) >= lv) return no;
  return RACES;
}

/** 능력치 순위별 승률. 인덱스 0 이 인기마다. */
function winRateByRank(no: number, n = 800): number[] {
  const hit = [0, 0, 0, 0, 0, 0];
  for (let s = 1; s <= n; s++) {
    const race = buildRace(no, newHorse("x"), s);
    const rank = race.runners
      .map((r) => ({ g: r.gate, p: truePower(r, race.distance) }))
      .sort((a, b) => b.p - a.p);
    const win = runRace(race, s).order[0];
    hit[rank.findIndex((r) => r.g === win)]++;
  }
  return hit.map((v) => v / n);
}

/** 그 능력치 순위에 매 경주 걸었을 때의 수익률. 1.0 이면 본전. */
function roiByRank(pool: Pool, no: number, n = 1200): number[] {
  const got = [0, 0, 0, 0, 0, 0];
  for (let s = 1; s <= n; s++) {
    const race = buildRace(no, newHorse("x"), s);
    const book = crowdBets(race, formOf(no), s);
    const res = runRace(race, s);
    race.runners
      .map((r) => ({ g: r.gate, p: truePower(r, race.distance) }))
      .sort((a, b) => b.p - a.p)
      .forEach((r, i) => {
        got[i] += settle(book, { pool, gates: [r.g], amount: 100 }, res.order).gold;
      });
  }
  return got.map((v) => v / (n * 100));
}

describe("경주는 시작 전에 정해져 있지 않다", () => {
  const rank = winRateByRank(5);

  /**
   * **이 검사가 이 게임의 존재 이유를 지킨다.** 인기마가 항상 이기면
   * 베팅은 예측이 아니라 산수가 되고, 강화도 "이기는 말 만들기"라는 한 줄이 된다.
   * 실제 경마의 인기마 승률이 30~35% 라 그 근처를 목표로 한다.
   */
  it("인기마 승률이 25~45% 다 — 결정론도 무작위(16.7%)도 아니다", () => {
    expect(rank[0]).toBeGreaterThan(0.25);
    expect(rank[0]).toBeLessThan(0.45);
  });

  it("능력치가 승률을 민다 — 1위가 5위보다 확실히 자주 이긴다", () => {
    expect(rank[0]).toBeGreaterThan(rank[4] * 2);
  });

  it("능력치 순위가 승률에 대체로 단조로 듣는다", () => {
    for (let i = 1; i < 5; i++) expect(rank[i]).toBeLessThanOrEqual(rank[i - 1] + 0.03);
  });

  it("2~5위도 실제로 이긴다 — 이변이 난다", () => {
    for (let i = 1; i <= 4; i++) expect(rank[i]).toBeGreaterThan(0.03);
  });

  it("같은 출주표라도 시드가 다르면 우승마가 갈린다 — 컨디션이 듣는다", () => {
    const mine = flat(4);
    const winners = new Set(
      Array.from({ length: 30 }, (_, i) => runRace(buildRace(5, mine, 5), i + 1).order[0]));
    expect(winners.size).toBeGreaterThan(2);
  });
});

describe("경제 — 공개 정보로는 못 번다", () => {
  /**
   * **공제율 20% 가 있는 게임에서 어느 승식이든 +EV 면 돈 찍는 기계다.**
   * 처음 구현이 여기서 무너졌다 — 관중이 판돈을 실력에 **비례**해서 걸었는데
   * 승률은 실력에 **초비례**해서, 인기마가 판돈의 20% 를 먹고 39% 를 이겼다.
   */
  it("단승 — 어느 능력치 순위에 걸어도 이득이 아니다", () => {
    for (const r of roiByRank("win", 5)) expect(r).toBeLessThan(1.15);
  });

  it("연승 — 마찬가지로 이득이 아니다", () => {
    for (const r of roiByRank("place", 5)) expect(r).toBeLessThan(1.1);
  });
});

describe("경제 — 숨긴 정보로는 번다", () => {
  /** 이 게임의 이득은 **관중이 못 보는 것**에서만 나와야 한다. 그것이 컨셉의 전부다. */
  function myRoi(pool: Pool, no: number, lv: number, form: number, n = 1200) {
    let got = 0;
    for (let s = 1; s <= n; s++) {
      const race = buildRace(no, flat(lv), s);
      const book = crowdBets(race, form, s);
      got += settle(book, { pool, gates: [1], amount: 100 }, runRace(race, s).order).gold;
    }
    return got / (n * 100);
  }

  it("관중이 모르는 강한 말에 걸면 크게 번다", () => {
    expect(myRoi("win", 5, 8, formOf(5))).toBeGreaterThan(1.4);
  });

  it("관중이 제대로 아는 말에 걸면 공제율만큼 잃는다", () => {
    // 실력과 평판이 같으면 정보 우위가 없다 — 그러면 하우스가 이긴다
    const roi = myRoi("win", 5, 5, truePower(
      { gate: 1, name: "x", stats: flat(5).stats, mine: false }, 1400));
    expect(roi).toBeLessThan(1.15);
  });

  /** 내 말이 상대 평균과 같은 수준이면 관중의 평판이 맞는 것이고, 그러면 우위가 없다. */
  it("강화를 안 하면 정보 우위도 없다", () => {
    const lv = 5, no = raceWhereRivalsAre(lv);
    expect(myRoi("place", no, lv, formOf(no))).toBeLessThan(1.05);
  });
});

describe("승식 7종 — 어느 것도 돈 찍는 기계가 아니다", () => {
  /**
   * **경주와 배당을 승식끼리 재사용한다.** 승식마다 새로 뽑으면 관중 몬테카를로를
   * 7배 돌리게 되어 표본을 못 키운다 — 그래서 처음엔 n=700 이었고,
   * 조합 승식이 표본 변동으로 **+6% 처럼 보였다**(n=3000 에서는 −8%).
   * 공유하니 같은 시간에 표본을 4배로 키울 수 있다.
   */
  function roiAll(no: number, n: number): Record<Pool, number> {
    const got = {} as Record<Pool, number>;
    for (const p of POOL_ORDER) got[p] = 0;
    for (let s = 1; s <= n; s++) {
      const race = buildRace(no, newHorse("x"), s);
      const book = crowdBets(race, formOf(no), s);
      const res = runRace(race, s);
      const rank = race.runners
        .map((r) => ({ g: r.gate, p: truePower(r, race.distance) }))
        .sort((a, b) => b.p - a.p).map((x) => x.g);
      for (const pool of POOL_ORDER) {
        got[pool] += settle(book,
          { pool, gates: rank.slice(0, POOLS[pool].picks), amount: 100 }, res.order).gold;
      }
    }
    for (const p of POOL_ORDER) got[p] /= n * 100;
    return got;
  }

  const roi = roiAll(5, 2500);

  /**
   * **공제율 20% 가 있는 게임에서 어느 승식이든 +EV 면 돈 찍는 기계다.**
   * M1 이 여기서 무너졌다 — 관중이 판돈을 실력에 **비례**해서 걸었는데
   * 승률은 실력에 **초비례**해서 인기마 단승이 +54% 였다.
   */
  it("공개 정보만으로는 어느 승식도 +EV 가 아니다", () => {
    for (const pool of POOL_ORDER) expect(roi[pool]).toBeLessThan(1.02);
  });

  it("어려운 승식일수록 잃는 폭이 크다 — 공제율이 조합에서 더 문다", () => {
    expect(roi.trifecta).toBeLessThan(roi.win);
  });

  /** 실제 경마의 favorite-longshot bias — 인기마가 대박마보다 덜 손해다. */
  it("인기마가 최하위 인기마보다 수익률이 낫다", () => {
    const byRank = roiByRank("win", 5);
    expect(byRank[0]).toBeGreaterThan(byRank[5]);
  });
});

describe("숨긴 정보의 우위는 모든 승식에 있지만 조합에서 희석된다", () => {
  /** 내 말을 1착 자리에 넣고 나머지는 인기 순으로 채운다. */
  function myRoi(pool: Pool, lv: number, form: number, n = 700) {
    let got = 0;
    for (let s = 1; s <= n; s++) {
      const mine: Horse = { name: "내말", stats: { speed: lv, accel: lv, stamina: lv, grit: 3, poise: 3 } };
      const race = buildRace(5, mine, s);
      const book = crowdBets(race, form, s);
      const res = runRace(race, s);
      const others = race.runners.filter((r) => !r.mine)
        .map((r) => ({ g: r.gate, p: truePower(r, race.distance) }))
        .sort((a, b) => b.p - a.p).map((x) => x.g);
      got += settle(book, { pool, gates: [1, ...others].slice(0, POOLS[pool].picks), amount: 100 },
        res.order).gold;
    }
    return got / (n * 100);
  }

  /**
   * **강화를 숨긴 채로 걸면 어느 승식에서든 안 숨겼을 때보다 낫다.**
   * 이것이 성립하지 않으면 컨셉("내가 아는 것과 배당이 아는 것의 차이")이 죽는다.
   */
  it("관중이 모르면 모든 승식에서 수익률이 오른다", () => {
    for (const pool of POOL_ORDER) {
      const hidden = myRoi(pool, 8, formOf(5));   // 관중은 4.8 로 본다
      const known = myRoi(pool, 8, 8);            // 관중이 제대로 안다
      expect(hidden).toBeGreaterThan(known);
    }
  });

  /**
   * **다만 조합 승식에서는 우위가 희석된다** — 내 말 말고 다른 말들의 착순도
   * 맞혀야 하는데 거기엔 정보 우위가 없기 때문이다.
   * 컨셉이 "후반엔 삼쌍승으로 크게 번다"고 적었는데, 실측은 그렇게 단순하지 않다.
   */
  it("단승 우위가 삼쌍승 우위보다 크다", () => {
    expect(myRoi("win", 8, formOf(5))).toBeGreaterThan(myRoi("trifecta", 8, formOf(5)));
  });
});

describe("안전망 — 연승이 실제로 안전망인가", () => {
  /**
   * `projectGates.quit-point-known` 의 대책이 이것이다.
   * 강화가 연달아 실패해도 상대 수준을 따라가고 있으면 3착은 든다.
   */
  it("상대와 비슷한 수준이면 3착 이내에 절반 가까이 든다", () => {
    let top3 = 0;
    const n = 800;
    for (let s = 1; s <= n; s++) {
      const res = runRace(buildRace(1, flat(3), s), s);
      if (res.order.slice(0, 3).includes(1)) top3++;
    }
    expect(top3 / n).toBeGreaterThan(0.4);
  });

  it("강화가 3착 확률을 실제로 올린다", () => {
    const rate = (lv: number) => {
      let t = 0;
      for (let s = 1; s <= 800; s++) {
        if (runRace(buildRace(5, flat(lv), s), s).order.slice(0, 3).includes(1)) t++;
      }
      return t / 800;
    };
    expect(rate(8)).toBeGreaterThan(rate(4) + 0.1);
  });

  /**
   * **스탯 5종이 전부 실제로 경주에 반영되는가** (사용자 질문, 2026-08-06).
   *
   * 하나만 3(거리 스탯은 6) → 10 으로 올리고 1,200판을 돌린 실측 —
   *
   * | 스탯 | 승률 변화 | 3착 변화 |
   * |---|---|---|
   * | 속력 | +26.0%p | +14.5%p |
   * | 체력 | +21.2%p | +12.1%p |
   * | 가속 | +19.0%p |  +9.9%p |
   * | 근성 | +13.2%p |  +4.7%p |
   * | 안정 | **−1.8%p** |  +4.4%p |
   *
   * **안정만 승률이 안 오른다 — 그게 설계다.** 안정은 컨디션 폭을 줄이므로
   * 요행 우승도 같이 깎는다. 강한 말에게는 "이변으로 이기는 일"이 줄고
   * "이변으로 지는 일"이 더 줄어서 **3착이 오른다.** 그래서 안정만 3착으로 본다.
   */
  it("스탯 5종이 전부 경주 결과를 움직인다 — 안정만 승률 아닌 3착으로", () => {
    const base: Record<StatKey, number> = { speed: 6, accel: 6, stamina: 6, grit: 3, poise: 3 };
    const measure = (stats: Record<StatKey, number>) => {
      let win = 0, top3 = 0;
      const n = 700;
      for (let s = 1; s <= n; s++) {
        const o = runRace(buildRace(6, { name: "t", stats }, s), s).order;
        if (o[0] === 1) win++;
        if (o.slice(0, 3).includes(1)) top3++;
      }
      return { win: win / n, top3: top3 / n };
    };
    const b = measure(base);
    for (const k of STATS) {
      const m = measure({ ...base, [k]: 10 });
      // 안정은 요행 우승을 같이 깎으므로 승률이 아니라 3착으로 본다
      const gain = k === "poise" ? m.top3 - b.top3 : m.win - b.win;
      expect(gain, `${k} 가 결과를 안 움직인다`).toBeGreaterThan(0.03);
    }
  });
});
