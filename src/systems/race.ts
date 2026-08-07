// 경주 · 배당 · 정산. 렌더 비의존.
//
// **배당이 확률에서 안 나온다.** 실제 경마와 같은 패리뮤추얼이라 판돈에서 나온다:
//
//     배당 = (승식 총 판돈 × (1 − 공제율)) ÷ 적중 판돈
//
// 여기서 이 게임의 두 성질이 공짜로 따라 나온다.
//   1) **배당은 대중의 예상이지 진실이 아니다** — 관중은 내 강화 결과를 모른다.
//      그래서 `publicPower()` 가 `truePower()` 와 다르고, 그 차이가 곧 돈이다.
//   2) **크게 걸면 내 배당이 내려간다** — 내 돈도 같은 풀에 들어가므로.
//      규칙을 더 안 만들고 몰빵에 제동이 걸린다.

import { rng } from "../kits/rng";
import { STATS, DISTANCE_STATS, type Horse, type StatKey } from "./stable";
import { rivalForm, RIVAL_START, RIVAL_END, RACES } from "./scale";

/** 승식 7종. 한국마사회 표기를 그대로 쓴다 (HT-002). */
export type Pool =
  | "win" | "place" | "quinella" | "exacta" | "quinellaPlace" | "trio" | "trifecta";

export interface PoolSpec {
  name: string;
  /** 몇 마리를 고르나. */
  picks: number;
  /** 순서가 중요한가. */
  ordered: boolean;
  /**
   * 적중하는 선택지가 한 경주에 몇 개인가. **풀을 이 수로 나눠야 EV 가 −공제율이 된다.**
   * 연승은 3착까지 3개, 복연승은 3착 중 두 마리 고르기라 C(3,2) = 3 개다.
   */
  slots: number;
  /** 항상 보이는 한 줄 설명. */
  desc: string;
  /** 도움말 오버레이의 예시. 착순이 4-2-6 일 때를 기준으로 쓴다. */
  example: string;
}

/**
 * **`example` 은 화면 폭에 갇힌다.** 창구 설명 카드 안쪽이 320px 인데
 * `"예) 4→2→6 이면 " + example` 이 복승·쌍승·삼쌍승에서 넘쳐 잘렸다 —
 * 세로 겹침만 검사하고 가로는 안 봤기 때문이다.
 * `layout.test` 가 이제 7종 전부의 폭을 잰다. 문구를 늘리면 거기서 깨진다.
 */
export const POOLS: Record<Pool, PoolSpec> = {
  place: { name: "연승", picks: 1, ordered: false, slots: 3,
    desc: "고른 말이 3착 안에 들면 적중",
    example: "4 · 2 · 6 중 하나면 적중" },
  win: { name: "단승", picks: 1, ordered: false, slots: 1,
    desc: "1착을 맞힌다",
    example: "4 만 적중. 2 나 6 은 꽝" },
  quinella: { name: "복승", picks: 2, ordered: false, slots: 1,
    desc: "1·2착 두 마리를 순서 상관없이 맞힌다",
    example: "4,2 · 2,4 적중. 4,6 은 꽝" },
  exacta: { name: "쌍승", picks: 2, ordered: true, slots: 1,
    desc: "1·2착을 순서까지 맞힌다",
    example: "4 다음 2 만 적중. 2,4 는 꽝" },
  quinellaPlace: { name: "복연승", picks: 2, ordered: false, slots: 3,
    desc: "고른 두 마리가 **둘 다** 3착 안에 들면 적중",
    example: "4,2 · 4,6 · 2,6 셋 다 적중" },
  trio: { name: "삼복승", picks: 3, ordered: false, slots: 1,
    desc: "1·2·3착 세 마리를 순서 상관없이 맞힌다",
    example: "4,2,6 이면 순서는 무관" },
  trifecta: { name: "삼쌍승", picks: 3, ordered: true, slots: 1,
    desc: "1·2·3착을 순서까지 맞힌다",
    example: "4→2→6 순서 그대로여야 적중" },
};

/** 화면에 놓는 순서 — 쉬운 것부터. 이 순서가 곧 국면의 순서다. */
export const POOL_ORDER: Pool[] = [
  "place", "win", "quinella", "exacta", "quinellaPlace", "trio", "trifecta",
];

export const POOL_NAME: Record<Pool, string> =
  Object.fromEntries(POOL_ORDER.map((p) => [p, POOLS[p].name])) as Record<Pool, string>;

/** 공제율. 실제 경마는 승식마다 다르다. 화면에 표기한다. */
export const TAKEOUT = 0.2;
/** 연승은 3착 이내다. 6두면 절반이라 배당이 낮고, 그래서 안전망이 된다. */
export const PLACE_SLOTS = 3;
export const FIELD_SIZE = 6;
export const DISTANCES = [1000, 1200, 1400, 1600, 1800, 2000] as const;

/**
 * 거리별 스탯 가중치. 합은 1 이다.
 * **이 표가 "다음 경주를 보고 스탯을 고른다"의 전부다** — 차이가 작으면 그 판단이 죽는다.
 * 테스트가 실제로 착순이 갈리는지 본다.
 */
export type DistWeights = Record<"speed" | "accel" | "stamina", number>;
export function weights(distance: number): DistWeights {
  if (distance <= 1200) return { accel: 0.55, speed: 0.30, stamina: 0.15 };
  if (distance <= 1600) return { accel: 0.25, speed: 0.50, stamina: 0.25 };
  return { accel: 0.15, speed: 0.35, stamina: 0.50 };
}

export interface Runner {
  gate: number;
  name: string;
  stats: Record<StatKey, number>;
  mine: boolean;
}

export interface Race {
  no: number;
  distance: number;
  runners: Runner[];
}

/** 구간 기록. 화면이 이걸로 애니메이션한다 — 렌더가 따로 시뮬을 돌리지 않는다. */
export interface Split { gate: number; progress: number[] }

export interface Result {
  order: number[];        // 착순대로의 gate 번호
  splits: Split[];
  distance: number;
  /** 각 말이 결승선을 통과한 시각(구간 단위, 소수). 1착이 `SEGMENTS` 다. */
  finish: Record<number, number>;
}

/** 1착이 결승선을 끊는 구간 수. 화면도 이 수로 시각을 환산한다. */
export const SEGMENTS = 10;

/**
 * **3착이 들어올 때까지 돈다.** 고정 연장이 아니다.
 *
 * 전에는 `EXTRA = 10` 을 더 돌고 끝냈는데, 그 안에 못 들어온 말에게는
 * `finish` 에 센티널(20)이 박혔다. 실측 —
 *   · 3착이 못 들어온 경주 **2%** → 화면이 3착을 보여주기 전에 끊겼다(사용자 발견)
 *   · 아무 말이라도 못 들어온 경주 81%
 *   · 센티널이 둘 이상이라 **착순이 게이트 번호로 갈린 경주 34%** — 임의였다
 *
 * 매 구간 최소 0.2 는 전진하므로(`Math.max(0.2, …)`) 언제든 끝난다.
 * 상한은 무한 루프 방어용이고, 실측 최대의 몇 배로 잡는다.
 */
const MAX_SEGMENTS = SEGMENTS * 12;

/**
 * **경주는 능력치로 정해지지 않는다. 확률이 정하고 능력치가 그 확률을 민다.**
 *
 * 처음 구현은 구간 잡음이 총 주행량의 3% 뿐이라 사실상 능력치 순서대로 들어왔다 —
 * 인기마 승률 84% · 3착 이내 99.6% · 최약체 0.0% 였고, 내 말은 스탯 3 에서 0%,
 * 5 에서 90% 로 절벽처럼 뛰었다. 그러면 베팅이 예측이 아니라 산수가 되고,
 * 연승 인기마가 공짜 돈이 된다.
 *
 * 두 겹으로 무작위를 넣는다.
 *
 *  1. **컨디션** — 경주당 말당 한 번 뽑는 배수. "오늘 잘 뛰는가"이고
 *     이게 이변의 주된 출처다. 구간마다 뽑으면 10번 평균되어 사라진다.
 *  2. **구간 잡음** — 주행량에 **비례**한다. 고정값이면 능력치가 커질수록
 *     무의미해져서 후반에 다시 결정론이 된다.
 *
 * 목표치는 실제 경마다 — 인기마 승률 30~40%. 테스트가 분포로 못 박는다.
 */
export const CONDITION = 0.42;   // 컨디션 폭 ±42% (안정 3 기준)
/**
 * **안정**이 컨디션 폭을 줄이는 비율. 3단계가 중립이다.
 * 과하면 경주가 결정론이 되고 `balance.test` 의 "인기마 승률 25~45%" 가 깨진다 —
 * 그 검사가 이 값의 상한을 강제한다.
 */
export const POISE_EFFECT = 0.035;
/**
 * **근성**이 막판 경합에서 주는 보정. 선두를 사정권에 두고 쫓을 때만 걸린다.
 *
 * 0.09 로 시작했는데 **3→10 을 올려도 승률 +2%p** 였다(속력은 +25%p) — 가짜 선택이었다.
 * 구조적으로 약할 수밖에 없다: 거리 스탯은 **10구간 전부**에 걸리는데
 * 근성은 마지막 3구간, 그것도 사정권일 때만이라 **노출이 1:7** 이다.
 * 0.7 에서 거리 스탯의 **49%** 가치가 되고 인기마 승률은 32% 로 유지된다.
 */
export const GRIT_EFFECT = 0.7;
/** 근성이 걸리기 시작하는 구간 비율. 마지막 30% 가 "막판"이다. */
export const GRIT_FROM = 0.7;
/**
 * **경합으로 치는 폭** — 선두와 이 비율 안이면 근성이 붙는다.
 * 넓으면 그냥 파워 스탯이 되어 거리 스탯과 겹치고, 좁으면 아예 안 걸린다.
 * 스윕으로 정했다(HT-007).
 */
export const GRIT_BAND = 0.30;   // 0.06 은 누적거리로 반 구간도 안 돼 아무도 안 걸렸다
export const JITTER = 0.40;      // 구간 잡음 ±40% (주행량 대비)
/** 상대 능력치가 기준선에서 벌어지는 폭. 넓으면 최약체가 이길 수 없는 말이 된다. */
export const SPREAD = 1.1;
/**
 * 경주당 상대가 세지는 폭. **이제 파생값이다** — 곡선은 `scale.ts` 가 끝점으로 정한다.
 *
 * 예전에는 이게 손으로 고른 상수(0.45 → 0.32)였고, 경주 수를 12 → 20 으로 바꾸자
 * 마지막 상대가 9.08 까지 올라가 파산이 11% → 39% 가 됐다(HT-009).
 * 검사와 문서가 이 값을 참조하므로 이름은 남기되 **계산해서 낸다.**
 */
export const RIVAL_GROWTH = (RIVAL_END - RIVAL_START) / Math.max(1, RACES - 1);

const RIVAL_HEAD = ["블랙", "하늘", "복숭아", "돌풍", "노을", "구름", "청람", "설원"];
const RIVAL_TAIL = ["아웃", "소", "핑크", "스톰", "글로우", "댄스", "라인", "체이서"];

/**
 * 한 경주를 짠다. 상대는 시드로 만들고 **경주가 갈수록 조금씩 세진다**(압박 곡선).
 * 내 말은 그대로 들어간다 — 강화 결과가 여기 반영되고, 관중은 그걸 모른다.
 */
export function buildRace(no: number, mine: Horse, seed: number, forced?: number): Race {
  const rnd = rng(seed * 7919 + no);
  // 대상경주는 거리를 판 시작에 공개하므로 밖에서 넣어준다.
  const distance = forced ?? DISTANCES[Math.floor(rnd() * DISTANCES.length)];
  const runners: Runner[] = [{ gate: 1, name: mine.name, stats: { ...mine.stats }, mine: true }];
  // 상대 평균이 내 말 시작값(3)과 비슷해야 첫 경주가 승부가 된다. no 에 따라 밀어 올린다.
  // **끝점에서 파생된다**(`scale.ts`) — 경주 수를 바꿔도 마지막 상대가 같다.
  // `3 + (no-1) * 0.32` 였을 때는 20경주에서 상대가 9.08 까지 올라가 무너졌다(HT-009).
  const base = rivalForm(no);
  for (let i = 0; i < FIELD_SIZE - 1; i++) {
    const stats = {} as Record<StatKey, number>;
    for (const k of STATS) {
      // 폭이 넓으면 최약체가 **이길 수 없는 말**이 되어 그 마권이 순수 함정이 된다.
      // 실제 경마도 비슷한 등급끼리 붙인다 — 좁혀야 경주가 승부가 된다.
      stats[k] = Math.max(1, Math.min(10, Math.round(base + (rnd() * SPREAD * 2 - SPREAD))));
    }
    runners.push({
      gate: i + 2,
      name: RIVAL_HEAD[Math.floor(rnd() * RIVAL_HEAD.length)] +
            RIVAL_TAIL[Math.floor(rnd() * RIVAL_TAIL.length)],
      stats, mine: false,
    });
  }
  return { no, distance, runners };
}

/** 거리 가중치를 먹인 실제 실력. **관중은 이 값을 모른다.** */
export function truePower(r: Runner, distance: number): number {
  const w = weights(distance);
  return DISTANCE_STATS.reduce((a, k) => a + r.stats[k] * w[k as keyof DistWeights], 0);
}

/**
 * 관중이 보는 실력. **내 말의 강화 결과가 빠진다** — 관중은 마방을 못 본다.
 * 이 한 줄이 컨셉의 핵심("내가 아는 것 ≠ 배당이 아는 것")을 코드로 만든다.
 */
export function publicPower(r: Runner, distance: number, prevForm: number): number {
  if (!r.mine) return truePower(r, distance);
  return prevForm;   // 지난 경주에서 드러난 만큼만 안다
}

/**
 * 경주를 돌린다. 트랙 기하 없이 **구간 시뮬**이다 —
 * 체력이 모자라면 후반 구간에서 속도가 떨어져 **마지막 직선에서 잡힌다.**
 */
export function runRace(race: Race, seed: number, quick = false): Result {
  // `quick` 은 관중 시뮬 전용이다 — 1착만 알면 되므로 연장 구간을 안 돈다.
  // 이걸 안 하면 배당 한 번 뽑는 데 400판 × 연장까지 돌아 검사가 몇 배 느려진다.
  const rnd = rng(seed * 104729 + race.no * 31);
  const w = weights(race.distance);
  const splits: Split[] = race.runners.map((r) => ({ gate: r.gate, progress: [] }));
  const total = race.runners.map(() => 0);

  // 컨디션은 **경주당 한 번** 뽑는다. 구간마다 뽑으면 평균되어 사라진다.
  // **안정**이 그 폭을 줄인다 — 3단계가 중립이고 올리면 좁아진다.
  const condition = race.runners.map((r) => {
    const band = CONDITION * Math.max(0.25, 1 - (r.stats.poise - 3) * POISE_EFFECT);
    return 1 + (rnd() - 0.5) * 2 * band;
  });

  /** 한 구간 전진. 아래에서 두 번 부른다 — 본 구간과 3착을 기다리는 연장. */
  const step = (s: number) => {
    const late = Math.min(1, s / (SEGMENTS - 1));   // 0 → 1, 그 뒤로는 유지
    // **구간 시작 시점의 순위를 스냅샷한다.** 루프 안에서 `total` 을 고치므로
    // 그냥 읽으면 앞 게이트는 이번 구간 값, 뒷 게이트는 지난 구간 값을 보게 된다.
    const standing = total.slice();
    const lead = Math.max(...standing);
    race.runners.forEach((r, i) => {
      // 초반은 가속이, 후반은 체력이 듣는다. 속력은 내내 듣는다.
      const early = Math.max(0, 1 - late * 1.6);
      const drive =
        r.stats.accel * w.accel * (0.5 + early) +
        r.stats.speed * w.speed +
        r.stats.stamina * w.stamina * (0.4 + late * 1.2);
      // 체력이 낮으면 후반에 무너진다 — 대표 장면이 여기서 나온다
      const fade = late > 0.6 ? Math.max(0, (6 - r.stats.stamina)) * (late - 0.6) * 0.5 : 0;
      // 잡음은 주행량에 **비례**한다 — 고정값이면 능력치가 커질수록 무의미해진다
      const jitter = 1 + (rnd() - 0.5) * 2 * JITTER;
      // **근성** — 막판에 **선두를 사정권에 두고 쫓을 때만** 붙는다.
      //
      // 처음 구현은 셋이 틀렸다 —
      //   1) `Math.max(...total)` 이 자기 자신을 포함해서 **선두가 근성을 가장 크게 받았다.**
      //      쫓는 힘이어야 하는데 도망가는 힘이 되어 있었다.
      //   2) 루프 안에서 `total` 을 고치는 중에 읽어 **게이트 순서에 결과가 달렸다.**
      //   3) 그래서 효과 계수를 5배 올려도 결과가 안 변했다 — 기전이 안 돌고 있었다.
      let grit = 0;
      if (late >= GRIT_FROM && s > 0 && lead > 0) {
        const behind = (lead - standing[i]) / lead;
        // 선두 자신(behind 0)은 못 받는다. 사정권 밖도 못 받는다.
        if (behind > 0 && behind < GRIT_BAND) {
          grit = r.stats.grit * GRIT_EFFECT * (1 - behind / GRIT_BAND);
        }
      }
      total[i] += Math.max(0.2, (drive - fade + grit) * condition[i] * jitter);
      splits[i].progress.push(total[i]);
    });
  };

  for (let s = 0; s < SEGMENTS; s++) step(s);

  // **결승선은 1착이 SEGMENTS 구간에 끊는 지점이다.** 나머지는 그 뒤에 들어온다.
  const goal = Math.max(...splits.map((sp) => sp.progress[SEGMENTS - 1]));

  // **3착이 결승선을 넘을 때까지 계속 돈다.** 관중 시뮬(`quick`)은 1착만 쓰므로 안 돈다.
  if (!quick) {
    const crossed = () => total.filter((v) => v >= goal).length;
    for (let s = SEGMENTS; crossed() < PLACE_SLOTS && s < MAX_SEGMENTS; s++) step(s);
  }

  // 0~1 로 정규화. 1.0 이 결승선이고 뒤 말들은 그 뒤 구간에서 1.0 을 넘는다.
  splits.forEach((sp) => { sp.progress = sp.progress.map((p) => p / goal); });

  // 각 말이 1.0 을 넘는 시각을 구간 사이 보간으로 찾는다.
  //
  // **3착까지는 반드시 실제 시각이 나온다** — 위에서 그때까지 돌았기 때문이다.
  // 4착 이하는 아직 달리는 중일 수 있고, 그 경우 아래 값이 들어간다.
  // 화면은 3착이 들어오면 끝나므로 그 말들은 어차피 안 보인다.
  const stillRunning = splits[0].progress.length;
  const finish: Record<number, number> = {};
  for (const sp of splits) {
    let t = stillRunning;
    for (let i = 0; i < sp.progress.length; i++) {
      if (sp.progress[i] < 1) continue;
      const prev = i > 0 ? sp.progress[i - 1] : 0;
      t = i + (prev >= 1 ? 0 : (1 - prev) / (sp.progress[i] - prev) - 1);
      break;
    }
    finish[sp.gate] = t;
  }

  // **착순은 통과 시각으로 정한다.** 결승선 시점의 위치로 정하면
  // 근성이 연장 구간에서 순위를 바꿀 때 착순과 통과 순서가 어긋난다 —
  // "먼저 들어온 말이 앞순위"가 착순의 정의다.
  const order = race.runners
    .map((r) => r.gate)
    .sort((a, b) => finish[a] - finish[b]);

  return { order, splits, distance: race.distance, finish };
}

// ── 패리뮤추얼 ────────────────────────────────────────────────────────────
//
// **배당은 확률에서 안 나오고 판돈에서 나온다.** 그러면 관중이 판돈을 어떻게 배분하는지가
// 이 게임 경제의 전부다. M1 은 "판돈 ∝ 실력^6.0" 이라는 **땜질**을 썼다 —
// 단승 EV 를 억지로 0 근처로 맞춘 값이고 조합 승식에는 대응하는 지수가 없다.
//
// 제대로 된 모델로 바꾼다 (HT-002): **관중이 자기가 아는 것으로 경주를 머릿속에서 돌린다.**
//
//   1. `publicPower` 로 만든 가상 출주표를 몬테카를로로 돌려 각 말의 승률을 얻는다.
//      **내 말은 `myForm` 만 아는 말로 세운다** — 관중은 마방을 못 본다.
//   2. 그 승률에서 Harville 모델로 1·2·3착 **순열 확률**을 만든다.
//   3. 순열에서 승식 7종의 모든 선택지 확률을 **유도한다.**
//      승식마다 따로 계산하면 서로 모순되는 확률이 나온다(복승 합 ≠ 쌍승 합).
//
// 이러면 관중이 볼 수 있는 것에 대해 **EV 가 정확히 −공제율**이 된다. 유도는 이렇다 —
// 선택지 확률 `p`, 판돈 비율 `q = p / slots`, 지급 = `T·(1−takeout)/slots`,
// 배당 = 지급/(T·q) = (1−takeout)/p, EV = p × 배당 = **1 − takeout.**
//
// 이득은 관중이 **못 보는 것**에서만 나온다. 그것이 이 게임이다.

/** 승식별 판돈. key 는 선택지 키(`selKey`)다. */
export type PoolBook = Record<Pool, Record<string, number>>;

/** 관중이 머릿속에서 경주를 몇 번 돌리나. 승률 6개를 안정시키기에 충분하면 된다. */
export const CROWD_SIMS = 400;

/**
 * **favorite-longshot bias.** 1 보다 작으면 대박마가 과대 베팅되어
 * 인기마 EV 가 상대적으로 낫다 — 실제 경마에서 관측되는 현상이다.
 * 1.0 으로 두면 모든 선택지가 정확히 −공제율이 된다.
 */
export const CROWD_BIAS = 0.92;

/** 선택지 키. 순서 승식이면 순서를 살리고, 아니면 정렬한다. */
export function selKey(pool: Pool, gates: number[]): string {
  const g = POOLS[pool].ordered ? gates.slice() : gates.slice().sort((a, b) => a - b);
  return g.join("-");
}

/** 이 선택이 적중인가. 승식 7종의 규칙이 전부 여기 있다. */
export function isHit(pool: Pool, gates: number[], order: number[]): boolean {
  const top = order.slice(0, 3);
  switch (pool) {
    case "win": return gates[0] === order[0];
    case "place": return top.includes(gates[0]);
    case "quinella": {
      const t2 = order.slice(0, 2);
      return gates.length === 2 && gates.every((g) => t2.includes(g)) && gates[0] !== gates[1];
    }
    case "exacta": return gates[0] === order[0] && gates[1] === order[1];
    case "quinellaPlace":
      return gates.length === 2 && gates[0] !== gates[1] && gates.every((g) => top.includes(g));
    case "trio":
      return gates.length === 3 && new Set(gates).size === 3 && gates.every((g) => top.includes(g));
    case "trifecta":
      return gates[0] === order[0] && gates[1] === order[1] && gates[2] === order[2];
  }
}

/** 관중이 추정하는 각 말의 승률. **몬테카를로 — 관중도 같은 경주를 상상한다.** */
export function crowdWinProbs(race: Race, myForm: number, seed: number): Record<number, number> {
  // 내 말을 "myForm 수준의 말"로 바꿔 세운다. 스탯 가중치 합이 1 이라
  // 전 스탯을 myForm 으로 두면 truePower 가 정확히 myForm 이 된다.
  // **거리 스탯 셋만** myForm 으로 세운다. 가중치 합이 1 이라 truePower 가 정확히 myForm 이 된다.
  // 근성·안정은 **관중도 본다** — 말의 기질은 관전으로 드러난다.
  // 숨기는 것은 거리 스탯뿐이고, 우위 원천을 하나로 유지한다.
  const seen: Race = {
    ...race,
    runners: race.runners.map((r) => r.mine
      ? { ...r, stats: { ...r.stats, speed: myForm, accel: myForm, stamina: myForm } }
      : r),
  };
  const hit: Record<number, number> = {};
  for (const r of race.runners) hit[r.gate] = 0;
  for (let i = 0; i < CROWD_SIMS; i++) hit[runRace(seen, seed * 7919 + i * 104729, true).order[0]]++;
  const out: Record<number, number> = {};
  // 라플라스 보정 — 한 번도 못 이긴 말도 배당이 무한대가 되지 않는다
  const denom = CROWD_SIMS + race.runners.length;
  for (const r of race.runners) out[r.gate] = (hit[r.gate] + 1) / denom;
  return out;
}

/**
 * Harville 모델 — 승률에서 1·2·3착 **순열 확률**을 만든다.
 * `P(a,b,c) = p_a · p_b/(1−p_a) · p_c/(1−p_a−p_b)`
 * 경마 분석의 표준 근사이고, 편향 방향이 favorite-longshot bias 와 같아 현실적이다.
 */
export function trifectaProbs(p: Record<number, number>): { g: number[]; p: number }[] {
  const gates = Object.keys(p).map(Number);
  const out: { g: number[]; p: number }[] = [];
  for (const a of gates) for (const b of gates) {
    if (b === a) continue;
    for (const c of gates) {
      if (c === a || c === b) continue;
      const d1 = 1 - p[a], d2 = 1 - p[a] - p[b];
      if (d1 <= 1e-9 || d2 <= 1e-9) continue;
      out.push({ g: [a, b, c], p: p[a] * (p[b] / d1) * (p[c] / d2) });
    }
  }
  const sum = out.reduce((s, x) => s + x.p, 0) || 1;
  for (const x of out) x.p /= sum;      // 순열 전체 합을 1 로
  return out;
}

/**
 * 승식별 모든 선택지의 적중 확률. **순열 하나에서 전부 유도한다** —
 * 그래야 승식끼리 모순이 없다. 각 승식의 확률 합은 `slots` 와 같아진다(검사가 본다).
 */
export function selectionProbs(race: Race, myForm: number, seed: number): Record<Pool, Record<string, number>> {
  const perms = trifectaProbs(crowdWinProbs(race, myForm, seed));
  const out = {} as Record<Pool, Record<string, number>>;
  for (const pool of POOL_ORDER) out[pool] = {};
  for (const { g, p } of perms) {
    const [a, b, c] = g;
    const add = (pool: Pool, gates: number[]) => {
      const k = selKey(pool, gates);
      out[pool][k] = (out[pool][k] ?? 0) + p;
    };
    add("win", [a]);
    add("place", [a]); add("place", [b]); add("place", [c]);
    add("quinella", [a, b]);
    add("exacta", [a, b]);
    add("quinellaPlace", [a, b]); add("quinellaPlace", [a, c]); add("quinellaPlace", [b, c]);
    add("trio", [a, b, c]);
    add("trifecta", [a, b, c]);
  }
  return out;
}

/** 승식별 총 판돈 규모. 어려운 승식일수록 얇다 — 실제 경마와 같다. */
const POOL_SIZE: Record<Pool, number> = {
  place: 2600, win: 6000, quinella: 4200, exacta: 2400,
  quinellaPlace: 2000, trio: 3000, trifecta: 1800,
};

/** 관중의 판돈. 선택지 확률에 비례하되 `CROWD_BIAS` 로 살짝 눕힌다. */
export function crowdBets(race: Race, myForm: number, seed: number): PoolBook {
  const rnd = rng(seed * 15485863 + race.no);
  const probs = selectionProbs(race, myForm, seed);
  const book = {} as PoolBook;
  for (const pool of POOL_ORDER) {
    book[pool] = {};
    const entries = Object.entries(probs[pool]);
    const weighted = entries.map(([k, p]) => [k, Math.pow(p, CROWD_BIAS)] as const);
    const sum = weighted.reduce((s, [, v]) => s + v, 0) || 1;
    for (const [k, v] of weighted) {
      book[pool][k] = Math.max(1, Math.round(POOL_SIZE[pool] * (v / sum) * (0.85 + rnd() * 0.3)));
    }
  }
  return book;
}

/**
 * 이 선택의 배당. `extra` 는 내가 추가로 걸 금액이다.
 * **`extra` 를 넣으면 배당이 내려간다** — 내 돈이 같은 풀에 들어가기 때문이고,
 * 실제 경마의 성질이자 몰빵 제동 장치다.
 */
export function odds(book: PoolBook, pool: Pool, gates: number[], extra = 0): number {
  const bets = book[pool];
  const total = Object.values(bets).reduce((a, b) => a + b, 0) + extra;
  const onIt = (bets[selKey(pool, gates)] ?? 0) + extra;
  if (onIt <= 0) return 0;
  return ((total * (1 - TAKEOUT)) / POOLS[pool].slots) / onIt;
}

/**
 * 관중이 이 말을 몇 % 로 보는가. **배당에서 그대로 유도되는 값이다** —
 * 새 정보가 아니라 사람이 암산 못 하는 것을 대신 해주는 것이다.
 * 80배 마권이 "1%" 라고 적히면 함정인 것이 보인다(HT-007 판독성).
 */
export function winProb(book: PoolBook, gate: number): number {
  const bets = book.win;
  const total = Object.values(bets).reduce((a, b) => a + b, 0);
  return total > 0 ? (bets[selKey("win", [gate])] ?? 0) / total : 0;
}

export interface Bet { pool: Pool; gates: number[]; amount: number }

export interface Payout {
  /** 돌려받는 금액. 꽝이면 0, 환급이면 건 금액 그대로. */
  gold: number;
  hit: boolean;
  /** 적중자가 아무도 없어 전액 환급된 경우. 실제 경마의 특별 배당 자리다. */
  refunded: boolean;
  odds: number;
}

/** 이 경주에서 적중한 선택지 키들. */
export function winningKeys(pool: Pool, order: number[]): string[] {
  const [a, b, c] = order;
  switch (pool) {
    case "win": return [selKey(pool, [a])];
    case "place": return [a, b, c].map((g) => selKey(pool, [g]));
    case "quinella": return [selKey(pool, [a, b])];
    case "exacta": return [selKey(pool, [a, b])];
    case "quinellaPlace": return [[a, b], [a, c], [b, c]].map((g) => selKey(pool, g));
    case "trio": return [selKey(pool, [a, b, c])];
    case "trifecta": return [selKey(pool, [a, b, c])];
  }
}

/**
 * 정산. **적중 판돈이 0 이면 전액 환급한다** — 배당을 무한대로 두지 않는다.
 * 실제 경마도 환급한다.
 */
export function settle(book: PoolBook, bet: Bet, order: number[]): Payout {
  const bets = book[bet.pool];
  const total = Object.values(bets).reduce((a, b) => a + b, 0) + bet.amount;
  const mine = selKey(bet.pool, bet.gates);
  const win = winningKeys(bet.pool, order);
  const hitPool = win.reduce((a, k) => a + (bets[k] ?? 0), 0)
    + (win.includes(mine) ? bet.amount : 0);

  if (hitPool <= 0) return { gold: bet.amount, hit: false, refunded: true, odds: 0 };
  if (!isHit(bet.pool, bet.gates, order)) return { gold: 0, hit: false, refunded: false, odds: 0 };

  const myPool = (bets[mine] ?? 0) + bet.amount;
  const o = ((total * (1 - TAKEOUT)) / POOLS[bet.pool].slots) / myPool;
  return { gold: Math.floor(bet.amount * o), hit: true, refunded: false, odds: o };
}

/**
 * 이 승식 전체의 지급 총액. **패리뮤추얼 항등식 검사용이다** —
 * 적중자에게 나간 돈의 합은 총 판돈 × (1 − 공제율) 이어야 한다.
 */
export function totalPayout(book: PoolBook, pool: Pool, order: number[]): number {
  const bets = book[pool];
  const total = Object.values(bets).reduce((a, b) => a + b, 0);
  let out = 0;
  for (const k of winningKeys(pool, order)) {
    const p = bets[k] ?? 0;
    if (p <= 0) continue;
    out += p * (((total * (1 - TAKEOUT)) / POOLS[pool].slots) / p);
  }
  return out;
}
