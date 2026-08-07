// 한 판 — 경주 8~12회. 렌더 비의존.
//
// **M1 은 경주 하나만 봤다.** 그래서 알 수 없던 것이 있다 — **경제가 도는가.**
// 시작 골드와 강화 비용은 2경주 기준으로 고른 값이라 12경주에서는 거의 확실히 틀렸다.
// 이 파일은 한 판의 진행 규칙만 담고, 값은 `session.test.ts` 의 실측이 정한다.

import { rng } from "../kits/rng";
import { forgeCost, STATS, type Horse } from "./stable";
import { DISTANCES } from "./race";
import { RACES } from "./scale";

/**
 * 한 판의 경주 수. **`scale.ts` 에서 온다** — 규모를 한 곳에서만 정한다.
 *
 * 8~12 랜덤 → 12 고정(HT-007) → **20 고정(HT-009)**.
 * 랜덤이었던 이유는 "마지막 경주에 전 재산" 을 막는 것이었고 **고정하면서 그 방어를 잃었다.**
 * 남은 제동은 패리뮤추얼(크게 걸면 내 배당이 내려간다)뿐이다.
 * 20 이 된 이유는 길이다 — 12경주 완주가 5분이라 목표 10~20분의 절반이었다.
 */
export const RACES_MIN = RACES;
export const RACES_MAX = RACES;

/**
 * 시작 골드. 실측으로 유도했다(HT-004).
 */
export const START_GOLD = 1600;

/**
 * **상금.** M2 측정에서 드러난 것 — 이게 없으면 게임이 성립하지 않는다.
 *
 * 베팅은 공제율 때문에 **모든 승식이 −EV** 이고 강화는 골드를 태우기만 한다.
 * 그래서 정책 넷(안 걸기 · 인기마 연승 · 항상 내 말 · 정보 우위일 때만)을
 * 12경주 × 400판 돌렸더니 **넷 다 졌다** — 안 거는 전략조차 0.19배로 끝났다.
 * **이 게임에는 수입원이 없었다.**
 *
 * 빠진 것은 실제 경마에 있다 — **마주는 베팅이 아니라 상금으로 번다.**
 * 상금이 들어오자 강화가 4~6회에서 8회로 늘고 참여율이 98% 가 됐다.
 *
 * 두 수입원의 성격이 다른 것이 이 게임에 좋다 —
 * **상금은 강화의 직접 보상**(확실하지만 작다), **베팅은 정보 우위의 레버리지**(위험하지만 크다).
 */
export const PURSE_BASE = 5100;
/**
 * 경주마다 **소폭** 커진다 — 1R 5,220 → 12R 6,540 (1.25배).
 *
 * 처음엔 420/경주(2.15배)로 뒀는데 **후반 쏠림이 과했다.**
 * 상금이 후반에만 크면 초반이 버리는 구간이 되고, 후반은 "상금 극대화" 하나로
 * 판단이 수렴한다. 평평하게 하니 **국면 차이가 상금 크기가 아니라
 * 내 말이 실제로 3착 안에 드는가**에서 나온다 — 그쪽이 더 정직한 곡선이다.
 *
 * 총 수입은 유지했다. 평평하게 만들면서 기본을 올려 맞췄고,
 * 경제 지표(강화 8회 · 참여율 98% · 파산 11%)는 어느 곡선에서도 같았다.
 */
export const PURSE_GROW = 120;
/** 1·2·3착 몫. 실제 경마의 배분과 비슷하게 잡았다. */
export const PURSE_SHARE = [0.60, 0.22, 0.12] as const;

/** 그 경주의 총 상금. 대상경주는 3배다. */
export const purse = (no: number, feature?: Feature) =>
  (PURSE_BASE + no * PURSE_GROW) * (feature && no === feature.no ? FEATURE_MULT : 1);

/** 내 말이 `place` 착(0-기반)으로 들어왔을 때 받는 상금. 4착부터는 없다. */
export function prizeFor(no: number, place: number, feature?: Feature): number {
  if (place < 0 || place >= PURSE_SHARE.length) return 0;
  return Math.round(purse(no, feature) * PURSE_SHARE[place]);
}

/**
 * **대상경주 (G1).** 판의 마지막 경주이고 상금이 3배다.
 *
 * 핵심은 상금이 아니라 **거리를 판 시작에 공개한다**는 것이다.
 * 그래야 초반이 "버티는 구간"에서 **"준비하는 구간"** 이 되고,
 * 특화(장거리형 5/2/20 은 2000m 에서 3,939 G · 1000m 에서 382 G)가
 * **도박에서 계산으로** 바뀐다.
 *
 * **거리만** 공개한다. 출주표까지 열면 계획은 정교해지지만
 * 정보 우위(내 말만 안다)가 흐려진다 — 이 게임의 유일한 우위다.
 */
export const FEATURE_MULT = 3;

export interface Feature { no: number; distance: number }

export function featureRace(seed: number): Feature {
  const races = raceCount(seed);
  const r = rng(seed * 40503 + 7);
  return { no: races, distance: DISTANCES[Math.floor(r() * DISTANCES.length)] };
}

export const isFeature = (no: number, f: Feature) => no === f.no;

export function raceCount(seed: number): number {
  const r = rng(seed * 2654435761);
  return RACES_MIN + Math.floor(r() * (RACES_MAX - RACES_MIN + 1));
}

/**
 * 화면에 보여줄 진행 표시. **남은 경주 수를 정확히 알리지 않는다** —
 * 정확히 알면 마지막 경주에 전 재산을 걸면 되고, 그러면 후반 판단이 하나로 수렴한다.
 */
export function progressLabel(no: number): string {
  return RACES_MIN === RACES_MAX ? `${no} / ${RACES_MAX} R` : `${no}R / ${RACES_MIN}~${RACES_MAX}`;
}

/** 지금 강화가 가능한가. 골드가 모자라면 마방에서 할 일이 없다. */
export const canAfford = (gold: number, lv: number) => gold >= forgeCost(lv);

/**
 * **파산.** 베팅도 강화도 못 하는 상태다.
 * 판은 끝까지 간다 — 중간에 끊으면 "얼마나 버텼나"가 안 남는다.
 * 최소 베팅액도 못 내면 그때부터는 구경이다.
 */
export const MIN_BET = 100;
export const isBroke = (gold: number) => gold < MIN_BET;

/**
 * **파산은 끝이 아니다 — 3착 한 번이면 다시 건다.**
 *
 * 실측: 파산은 판의 8% 에서 일어나고 **거의 항상 마지막 1~2경주**다
 * (파산 시점 중앙 9R / 전체 10R). 그래서 89% 가 회복 못 하는데,
 * 이유는 회복이 어려워서가 아니라 **남은 경주가 없어서**다 —
 * 한 번 마르면 회복까지 걸리는 건 중앙값 **1경주**다.
 *
 * 그러니 판을 끊지 않는다. 대신 **회복이 한 발 앞이라는 것을 화면이 말해야** 한다 —
 * 그게 없으면 비활성 버튼만 남아 "고장난 화면"으로 읽힌다.
 */
export const recoveryPrize = (no: number, f?: Feature) => prizeFor(no, PURSE_SHARE.length - 1, f);
export const canRecoverHere = (no: number, f?: Feature) => recoveryPrize(no, f) >= MIN_BET;

/** 한 판의 성적. 결산과 실측이 같은 것을 본다. */
export interface Tally {
  races: number;
  gold: number;
  /** 파산한 경주 번호. 끝까지 버텼으면 `null`. */
  brokeAt: number | null;
  forges: { success: number; keep: number; drop: number };
  bets: { placed: number; hit: number };
  /** 실제로 베팅할 수 있었던 경주 수. **끝까지 선택했는가**가 이 게임의 건강 지표다. */
  acted: number;
  /** 상금으로 번 총액. 베팅 수익과 갈라서 본다 — 성격이 다른 수입이다. */
  prize: number;
  /** 그중 대상경주에서 번 것. 3배 경주가 판을 지배하는지 보는 지표다. */
  featurePrize: number;
  /** 한 판에서 가장 크게 먹은 한 건. 페이오프가 숫자가 아니라 사건이 되는 자리다. */
  best: { race: number; pool: string; odds: number; gold: number } | null;
}

export function newTally(races: number, gold: number): Tally {
  return {
    races, gold, brokeAt: null,
    forges: { success: 0, keep: 0, drop: 0 },
    bets: { placed: 0, hit: 0 },
    acted: 0,
    prize: 0,
    featurePrize: 0,
    best: null,
  };
}

/** 강화 이력 요약 한 줄. 12경주면 로그를 다 못 보여준다. */
export function forgeSummary(t: Tally): string {
  const f = t.forges, n = f.success + f.keep + f.drop;
  if (!n) return "강화 없음";
  return `강화 ${n}회 — 성공 ${f.success} · 보존 ${f.keep} · 감소 ${f.drop}`;
}

/** 남은 능력치 합. 강화가 실제로 쌓였는지를 한 숫자로 본다. */
export const statTotal = (h: Horse) => STATS.reduce((a, k) => a + h.stats[k], 0);
