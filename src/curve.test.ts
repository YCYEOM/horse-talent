// M3 — **곡선.** 15분째가 3분째와 다른 게임인가.
//
// `projectGates.curve-not-repetition` 은 이 프로젝트가 셋업 때 스스로 지목한 1번 위험이고,
// `fail_if` 가 **"난이도 숫자만 오르고 판단의 종류가 그대로다"** 이다.
// 수익률의 *크기*가 아니라 **최선의 수가 속한 범주**를 본다.
//
// 처음 측정에서는 곡선이 없어 보였다 — 중반·후반 최선의 수가 둘 다 "단승"이었다.
// 그런데 **안 재본 것이 둘 있었다.** 재보니 곡선은 이미 있었다.
import { describe, it, expect } from "vitest";
import {
  buildRace, runRace, crowdBets, settle, truePower, POOLS, type Pool,
} from "./systems/race";
import { prizeFor } from "./systems/session";
import { RACES } from "./systems/scale";
import type { Horse, StatKey } from "./systems/stable";

const N = 500;
const flat = (lv: number): Horse => ({ name: "t", stats: { speed: lv, accel: lv, stamina: lv, grit: 3, poise: 3 } });

/** 내 말을 1착 자리에 넣고 나머지는 인기 순으로 채웠을 때의 수익률. */
/**
 * **국면을 경주 번호로 박지 않는다.** 12경주 시절 `11R = 후반` 을 손으로 적어뒀다가
 * 20경주가 되자 그게 중반이 되어 검사 셋이 깨졌다(HT-009) —
 * 이 저장소가 규모 변경으로 데는 세 번째다.
 * 비율로 적으면 경주 수를 바꿔도 "초반·중반·후반"의 뜻이 유지된다.
 */
const EARLY = Math.max(1, Math.round(RACES * 0.15));
const MID = Math.max(1, Math.round(RACES * 0.5));
const LATE = Math.max(1, RACES - 1);

function roiMine(pool: Pool, no: number, lv: number, form: number, n = N) {
  let got = 0;
  for (let s = 1; s <= n; s++) {
    const race = buildRace(no, flat(lv), s);
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

/** 내 말을 **빼고** 인기마에 걸었을 때의 수익률 — 역베팅. */
function roiFav(pool: Pool, no: number, lv: number, form: number, n = N) {
  let got = 0;
  for (let s = 1; s <= n; s++) {
    const race = buildRace(no, flat(lv), s);
    const book = crowdBets(race, form, s);
    const res = runRace(race, s);
    const fav = race.runners.filter((r) => !r.mine)
      .map((r) => ({ g: r.gate, p: truePower(r, race.distance) }))
      .sort((a, b) => b.p - a.p)[0].g;
    got += settle(book, { pool, gates: [fav], amount: 100 }, res.order).gold;
  }
  return got / (n * 100);
}

/** 그 배분으로 그 거리를 뛰었을 때의 평균 상금. */
function prizeAt(stats: Record<StatKey, number>, distance: number, no = LATE, n = N) {
  let p = 0;
  for (let s = 1; s <= n; s++) {
    const race = buildRace(no, { name: "t", stats }, s);
    race.distance = distance;
    p += prizeFor(no, runRace(race, s).order.indexOf(1));
  }
  return p / n;
}

describe("초반 — 베팅으로는 못 번다. 강화와 상금으로 버티는 구간", () => {
  /**
   * 내 말이 약하고 평판도 정확하면 **정보 우위가 0** 이다.
   * 그러면 남는 것은 공제율뿐이라 어느 승식도 마이너스다 —
   * 초반의 올바른 수는 **안 거는 것**이고, 골드는 강화로 간다.
   */
  /**
   * 조합 승식은 **표본 변동이 크다** — 삼쌍승은 120 분의 1 로 맞고 100배로 준다.
   * 단순 승식은 좁게, 조합은 넓게 본다. 좁게 잡으면 검사가 운에 흔들린다.
   */
  it("내 말이 약하고 평판이 정확하면 어느 승식도 +EV 가 아니다", () => {
    // 1마리 승식은 자주 맞아 표본이 안정적이라 좁게 본다
    for (const pool of ["place", "win"] as Pool[]) {
      expect(roiMine(pool, EARLY, 3, 3.2, 800)).toBeLessThan(1.05);
    }
    // 2~3마리 조합은 드물게 맞고 크게 주므로 표본 변동이 크다 — 넓게 본다
    for (const pool of ["quinella", "exacta", "quinellaPlace", "trio", "trifecta"] as Pool[]) {
      expect(roiMine(pool, EARLY, 3, 3.2, 800)).toBeLessThan(1.3);
    }
  });

  it("초반 상금이 후반보다 훨씬 작다 — 초반은 버티는 구간이다", () => {
    expect(prizeAt(flat(3).stats, 1400, EARLY, 300))
      .toBeLessThan(prizeAt(flat(9).stats, 1400, LATE, 300) / 2);
  });
});

describe("중반 — 정보 레버리지. 내 말 단승이 정점", () => {
  /**
   * 강화가 쌓였는데 **평판이 아직 못 따라온 구간**이 이 게임의 정점이다.
   * 여기서만 크게 벌 수 있고, 그것이 컨셉의 "내가 아는 것과 배당이 아는 것의 차이"다.
   */
  it("실력이 평판을 앞서면 내 말 단승이 크게 +EV 다", () => {
    expect(roiMine("win", MID, 8, 5.0)).toBeGreaterThan(1.4);
  });

  it("평판이 실력을 따라잡으면 그 우위가 사라진다", () => {
    const hidden = roiMine("win", MID, 8, 5.0);
    const known = roiMine("win", MID, 8, 8.0);
    expect(known).toBeLessThan(hidden);
    expect(known).toBeLessThan(1.15);
  });
});

describe("역베팅 — 강화가 감소하면 남의 말이 싸진다", () => {
  /**
   * **이 수를 한 번도 측정하지 않았었다.** 곡선이 없어 보였던 이유의 절반이다.
   *
   * 강화 감소가 나면 내 말은 실제보다 약한데 관중은 그걸 모른다.
   * 관중이 내 말에 과하게 걸어둔 만큼 **인기마가 저평가**되고, 거기가 +EV 다.
   * 컨셉의 정보 비대칭이 **양방향으로** 작동한다는 뜻이다.
   */
  it("관중이 내 말을 과대평가하면 인기마 단승이 +EV 가 된다", () => {
    expect(roiFav("win", MID, 5, 8.0)).toBeGreaterThan(1.15);
  });

  it("과대평가가 클수록 역베팅이 더 좋다", () => {
    expect(roiFav("win", MID, 5, 8.0)).toBeGreaterThan(roiFav("win", MID, 4, 7.0));
  });

  it("평판이 정확하면 역베팅도 손해다 — 우위는 오가격에서만 나온다", () => {
    expect(roiFav("win", MID, 6, 6.0)).toBeLessThan(1.0);
  });

  it("과대평가일 때 내 말에 거는 것은 최악이다", () => {
    expect(roiMine("win", MID, 5, 8.0)).toBeLessThan(roiFav("win", MID, 5, 8.0));
  });
});

describe("후반 — 상금 극대화. 판단이 베팅에서 강화 배분으로 옮겨간다", () => {
  const TOTAL = 27;
  const even = { speed: 9, accel: 9, stamina: 9, grit: 3, poise: 3 };
  const stayer = { speed: 5, accel: 2, stamina: 20, grit: 3, poise: 3 };
  const speedy = { speed: 17, accel: 5, stamina: 5, grit: 3, poise: 3 };

  it("총 스탯이 같아도 배분에 따라 상금이 크게 갈린다", () => {
    for (const b of [even, stayer, speedy]) {
      expect(b.speed + b.accel + b.stamina).toBe(TOTAL);
    }
    const spread = prizeAt(stayer, 2000) / Math.max(1, prizeAt(stayer, 1000));
    expect(spread).toBeGreaterThan(3);      // 특화는 거리를 가린다
  });

  it("균등 배분은 어느 거리에서도 비슷하다 — 안전한 대신 정점이 없다", () => {
    const ps = [1000, 1400, 2000].map((d) => prizeAt(even, d));
    const ratio = Math.max(...ps) / Math.min(...ps);
    expect(ratio).toBeLessThan(1.4);
  });

  /**
   * 여유를 1.3 → 1.2 로 내렸다. **상대 성장률을 0.45 → 0.32 로 낮추자
   * 두 배분 다 입상률이 올라 천장에 눌렸다** — 입상률은 100% 를 못 넘으므로
   * 상대가 약해질수록 배분 차이가 좁아 보인다. 성질(특화가 이긴다)은 그대로다.
   */
  it("맞는 거리에서는 특화가 균등을 이긴다", () => {
    expect(prizeAt(stayer, 2000)).toBeGreaterThan(prizeAt(even, 2000) * 1.2);
    expect(prizeAt(speedy, 1400)).toBeGreaterThan(prizeAt(even, 1400) * 1.2);
  });

  it("틀린 거리에서는 특화가 균등에 크게 진다", () => {
    expect(prizeAt(stayer, 1000)).toBeLessThan(prizeAt(even, 1000) * 0.5);
  });

  /** 후반에는 베팅 우위가 줄고 상금이 압도한다 — 그래서 판단이 옮겨간다. */
  it("후반 한 경주 상금이 베팅 기대 수익보다 크다", () => {
    const prize = prizeAt(flat(9).stats, 1400, LATE);
    const betEdge = (roiMine("win", LATE, 9, 8.0) - 1) * 100;   // 100 G 걸었을 때
    expect(prize).toBeGreaterThan(betEdge * 5);
  });
});

describe("곡선 판정 — 국면마다 최선의 수가 다른 범주다", () => {
  /**
   * **`projectGates.curve-not-repetition` 의 판정이 이 검사다.**
   * `fail_if` 는 "난이도 숫자만 오르고 판단의 종류가 그대로다" 이므로
   * 수익률 크기가 아니라 **최선의 수가 속한 범주**를 본다.
   *
   * 초반 = 안 건다(강화·상금) / 중반 = 내 말 레버리지 /
   * 감소 시 = 역베팅 / 후반 = 상금 극대화(강화 배분)
   */
  it("초반의 최선은 '안 건다' 다 — 단순 승식이 전부 본전 미만이다", () => {
    for (const p of ["place", "win"] as Pool[]) {
      expect(roiMine(p, EARLY, 3, 3.2, 800)).toBeLessThan(1.0);
    }
  });

  it("중반의 최선은 '내 말' 이다 — 역베팅보다 낫다", () => {
    expect(roiMine("win", MID, 8, 5.0)).toBeGreaterThan(roiFav("win", MID, 8, 5.0));
  });

  it("감소 상태의 최선은 '남의 말' 이다 — 내 말보다 낫다", () => {
    expect(roiFav("win", MID, 5, 8.0)).toBeGreaterThan(roiMine("win", MID, 5, 8.0));
  });

  /** 셋의 방향이 서로 다르다 = 판단의 종류가 다르다. */
  it("세 국면의 최선이 서로 다른 선택을 가리킨다", () => {
    const earlyBest = Math.max(...(["place", "win"] as Pool[])
      .map((p) => roiMine(p, EARLY, 3, 3.2, 800)));
    const midMine = roiMine("win", MID, 8, 5.0);
    const dropFav = roiFav("win", MID, 5, 8.0);
    expect(earlyBest).toBeLessThan(1.0);      // 초반: 안 건다
    expect(midMine).toBeGreaterThan(1.4);     // 중반: 내 말
    expect(dropFav).toBeGreaterThan(1.15);    // 감소: 남의 말
  });
});

describe("근성 — 막판 경합에서만 값을 한다", () => {
  /**
   * **체력과 다른 축이어야 한다.** 체력은 *혼자* 안 무너지는 것이고
   * 근성은 *붙어 있을 때* 안 밀리는 것이다. 크게 앞서거나 뒤지면 값이 0 이어야 한다.
   */
  function winRate(stats: Record<StatKey, number>, no = MID, n = 600) {
    let w = 0;
    for (let s = 1; s <= n; s++) {
      if (runRace(buildRace(no, { name: "t", stats }, s), s).order[0] === 1) w++;
    }
    return w / n;
  }

  const base = { speed: 6, accel: 6, stamina: 6, grit: 3, poise: 3 };

  it("근성을 올리면 승률이 오른다", () => {
    expect(winRate({ ...base, grit: 10 })).toBeGreaterThan(winRate(base));
  });

  /**
   * **경합이 없으면 값이 없다.** 압도적으로 강한 말은 이미 멀리 앞서므로
   * 근성이 붙을 자리가 없다 — 그 말에게는 근성보다 거리 스탯이 낫다.
   */
  it("압도적으로 강하면 근성의 값이 줄어든다 — 경합이 없으니까", () => {
    const strong = { speed: 10, accel: 10, stamina: 10, grit: 3, poise: 3 };
    const closeGain = winRate({ ...base, grit: 10 }) - winRate(base);
    const farGain = winRate({ ...strong, grit: 10 }) - winRate(strong);
    expect(closeGain).toBeGreaterThan(farGain);
  });

  it("체력과 겹치지 않는다 — 같은 투자라도 효과가 다르다", () => {
    const gritty = winRate({ ...base, grit: 9 });
    const tough = winRate({ ...base, stamina: 9 });
    expect(Math.abs(gritty - tough)).toBeGreaterThan(0.02);
  });
});

describe("안정 — 기복을 줄인다. 국면에 따라 값이 뒤집힌다", () => {
  /** 그 말의 착순 분산. 안정이 실제로 기복을 줄이는지 본다. */
  function spread(stats: Record<StatKey, number>, no: number, n = 600) {
    const places: number[] = [];
    for (let s = 1; s <= n; s++) {
      places.push(runRace(buildRace(no, { name: "t", stats }, s), s).order.indexOf(1));
    }
    const m = places.reduce((a, b) => a + b, 0) / n;
    return Math.sqrt(places.reduce((a, p) => a + (p - m) ** 2, 0) / n);
  }
  function top3(stats: Record<StatKey, number>, no: number, n = 600) {
    let t = 0;
    for (let s = 1; s <= n; s++) {
      if (runRace(buildRace(no, { name: "t", stats }, s), s).order.slice(0, 3).includes(1)) t++;
    }
    return t / n;
  }

  it("3단계가 중립이고 올리면 착순이 안정된다", () => {
    const mid = { speed: 7, accel: 7, stamina: 7, grit: 3, poise: 3 };
    expect(spread({ ...mid, poise: 10 }, MID)).toBeLessThan(spread(mid, MID));
    expect(spread({ ...mid, poise: 1 }, MID)).toBeGreaterThan(spread({ ...mid, poise: 10 }, MID));
  });

  /**
   * **이 검사가 안정을 "판단"으로 만든다.**
   * 어느 국면에서나 좋기만 하면 그건 판단이 아니라 정답이다.
   *
   * 강한 말은 기복을 줄여 **입상을 지키고**,
   * 약한 말은 기복이 있어야 **이변으로 3착에 낀다.**
   */
  it("강한 말에게는 안정이 이득이다 — 입상을 지킨다", () => {
    const strong = { speed: 9, accel: 9, stamina: 9, grit: 3, poise: 3 };
    expect(top3({ ...strong, poise: 10 }, 8)).toBeGreaterThan(top3({ ...strong, poise: 1 }, 8));
  });

  it("약한 말에게는 안정이 손해다 — 이변을 못 낸다", () => {
    const weak = { speed: 3, accel: 3, stamina: 3, grit: 3, poise: 3 };
    expect(top3({ ...weak, poise: 10 }, 9)).toBeLessThan(top3({ ...weak, poise: 1 }, 9));
  });

  it("무작위를 없애지는 않는다 — 만렙 안정도 착순이 갈린다", () => {
    const s = { speed: 7, accel: 7, stamina: 7, grit: 3, poise: 10 };
    expect(spread(s, MID)).toBeGreaterThan(0.5);
  });
});
