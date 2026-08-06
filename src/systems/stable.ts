// 마방 — 내 말과 강화. 렌더 비의존.
//
// 이 시스템의 전부는 **세 갈래**다:
//   성공(+1) / 실패·보존(그대로) / 실패·감소(−1)
// 두 갈래였다면 실패가 곧 재앙이라 8단계부터 아무도 안 누른다.
// 보존이 끼어야 "기대값은 나쁘지만 최악은 아닌" 구간이 생기고,
// 그래야 9단계가 계산이 아니라 **결정**이 된다 (CON-001).
//
// **강화 결과는 사적 정보다.** 관중(배당)은 이 파일이 만든 값을 못 본다 —
// 그것이 이 게임의 핵심이라 `race` 가 겉으로 보이는 강함만 쓴다.

export type StatKey = "speed" | "accel" | "stamina" | "grit" | "poise";

/**
 * 능력치 5종. **축이 둘이다** (HT-006).
 *
 * 셋(속력·가속·체력)은 **거리** 축이다 — 어느 거리에 강한가.
 * 넷째를 또 거리 스탯으로 넣으면 선택지만 늘고 판단은 안 는다. 그래서 다른 축을 뒀다.
 *
 *  · **근성** — *경합* 축. 막판에 선두와 가까울 때만 값을 한다.
 *    체력은 혼자 안 무너지는 것이고 근성은 붙어 있을 때 안 밀리는 것이다.
 *  · **안정** — *기복* 축. 컨디션 폭을 줄인다. **국면에 따라 값이 뒤집히는 유일한 스탯** —
 *    강할 때는 상금을 지키고 약할 때는 이변을 못 낸다.
 */
export const STATS: StatKey[] = ["speed", "accel", "stamina", "grit", "poise"];

/** 거리 가중치가 걸리는 셋. **근성·안정은 여기 없다** — 별도 보정이다. */
export const DISTANCE_STATS: StatKey[] = ["speed", "accel", "stamina"];

export const STAT_NAME: Record<StatKey, string> = {
  speed: "속력", accel: "가속", stamina: "체력", grit: "근성", poise: "안정",
};

export const STAT_HINT: Record<StatKey, string> = {
  speed: "최고 속도", accel: "출발과 초반", stamina: "후반 유지",
  grit: "막판 경합에서 안 밀린다", poise: "컨디션 기복이 줄어든다",
};

export const MIN_LV = 1;
export const MAX_LV = 10;
export const START_LV = 3;

/** 강화 한 번의 결과. 이름이 곧 사연이다. */
export type ForgeResult = "success" | "keep" | "drop";

/**
 * 단계별 확률(%). 인덱스 = 현재 단계, 즉 `ODDS[6]` 은 6 → 7 이다.
 * **행마다 합이 100 이어야 하고, 감소는 단계에 따라 단조 증가해야 한다** — 테스트가 못 박는다.
 *
 * 1~2 단계에 감소가 없는 이유: 초반에 말이 망가지면 시작도 못 한다.
 * **전부 근거 없이 고른 값이다.** 시뮬레이션으로 다시 잰다.
 */
export const ODDS: Record<number, { success: number; keep: number; drop: number }> = {
  1: { success: 95, keep: 5, drop: 0 },
  2: { success: 88, keep: 12, drop: 0 },
  3: { success: 78, keep: 20, drop: 2 },
  4: { success: 68, keep: 26, drop: 6 },
  5: { success: 58, keep: 30, drop: 12 },
  6: { success: 48, keep: 33, drop: 19 },
  7: { success: 38, keep: 35, drop: 27 },
  8: { success: 30, keep: 34, drop: 36 },
  9: { success: 22, keep: 33, drop: 45 },
};

/** 강화 비용(G). 단계에 비례한다 — 근거 없다, M2 에서 조정. */
export const forgeCost = (lv: number) => lv * 100;

export interface Horse {
  name: string;
  stats: Record<StatKey, number>;
}

export function newHorse(name: string): Horse {
  const stats = {} as Record<StatKey, number>;
  for (const k of STATS) stats[k] = START_LV;
  return { name, stats };
}

/** 이 단계에서 강화가 가능한가. 꼭대기면 못 한다. */
export const canForge = (lv: number) => lv < MAX_LV;

/** 화면에 그대로 적을 확률 셋. 사용자 요청 — 숨기면 판단 재료가 사라진다. */
export function forgeOdds(lv: number) {
  return ODDS[lv] ?? { success: 0, keep: 0, drop: 0 };
}

/**
 * 강화 한 번. `rnd` 는 0~1 을 주는 함수다(시드 주입용).
 * **단계를 실제로 바꾸고** 무슨 일이 있었는지 돌려준다.
 */
export function forge(horse: Horse, key: StatKey, rnd: () => number): ForgeResult {
  const lv = horse.stats[key];
  if (!canForge(lv)) return "keep";
  const o = forgeOdds(lv);
  const roll = rnd() * 100;
  if (roll < o.success) { horse.stats[key] = lv + 1; return "success"; }
  if (roll < o.success + o.keep) return "keep";
  horse.stats[key] = Math.max(MIN_LV, lv - 1);
  return "drop";
}

// ── 이름 생성 ────────────────────────────────────────────────────────────
// 절차 생성이다. 수작업 콘텐츠 0 을 유지한다(projectGates.length-from-state-not-content).
const HEAD = ["그린", "블랙", "실버", "황금", "번개", "새벽", "질풍", "하늘", "붉은", "은하"];
const TAIL = ["라이트", "스타", "윈드", "러너", "블레이즈", "샤워", "크라운", "애로우", "댄서", "웨이브"];

export function randomName(rnd: () => number): string {
  return HEAD[Math.floor(rnd() * HEAD.length)] + TAIL[Math.floor(rnd() * TAIL.length)];
}
