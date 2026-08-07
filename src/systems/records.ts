// 지난 판 기록과 순위. **게임 규칙이 아니다** — 끝난 판의 결과를 남길 뿐이다.
//
// M4 동결은 "새 시스템·승식·스탯·페이즈 금지"인데 이건 셋 다 아니다.
// 경주·강화·배당 어디에도 안 닿고, 화면도 기존 결산(`recap`)에 얹는다.
//
// **브라우저 안에만 남는다.** 정적 사이트라 서버가 없다 —
// 전역 순위표를 하려면 백엔드가 따로 있어야 하고, 그건 남의 기기로 데이터를 보내는
// 일이라 사람이 결정할 문제다. 여기서는 아무것도 밖으로 안 나간다.
//
// **순위 계산과 저장을 나눈 이유** — 저장은 브라우저에만 있고 검사에서 못 돌린다.
// 규칙(무엇이 더 좋은 기록인가)은 순수 함수로 두어야 검사가 볼 수 있다.

export interface Run {
  /** 말 이름. 사람이 지은 것이라 기록의 얼굴이다. */
  name: string;
  /** 최종 골드. **순위의 기준이다.** */
  gold: number;
  races: number;
  /** 이 판 최고 적중 배당. 없으면 0. */
  bestOdds: number;
  /** 저장 시각(ms). 같은 골드일 때 **먼저 세운 기록이 위**다. */
  at: number;
}

/** 남겨두는 기록 수. 넘치면 아래부터 버린다. */
export const KEEP = 20;
/** 결산 화면에 보여주는 수. */
export const SHOWN = 5;

const KEY = "horse-talent.runs.v1";

/**
 * 좋은 기록이 앞. **골드가 먼저, 같으면 먼저 세운 쪽.**
 * 나중 판이 동점으로 앞지르면 "방금 깼다"가 거짓이 된다.
 */
export function ranked(runs: Run[]): Run[] {
  return [...runs].sort((a, b) => (b.gold - a.gold) || (a.at - b.at));
}

/** 새 기록을 넣은 목록. 원본을 안 건드린다. */
export function withRun(runs: Run[], run: Run): Run[] {
  return ranked([...runs, run]).slice(0, KEEP);
}

/** 그 판이 **몇 등인가**. 1부터. 목록에 없으면 0. */
export function rankOf(runs: Run[], run: Run): number {
  const i = ranked(runs).findIndex((r) => r.at === run.at && r.gold === run.gold);
  return i < 0 ? 0 : i + 1;
}

/** **최고 기록을 갈아치웠는가.** 첫 판은 갱신으로 안 친다 — 비교 대상이 없다. */
export function isBest(before: Run[], run: Run): boolean {
  if (!before.length) return false;
  return run.gold > ranked(before)[0].gold;
}

// ── 저장 ────────────────────────────────────────────────────────────────
// **깨져도 게임은 돈다.** 사생활 모드나 저장 거부에서 `localStorage` 는 던진다.
// 기록 하나 때문에 판이 멈추면 안 되므로 전부 삼키고 빈 목록으로 간다.

function store(): Storage | null {
  try {
    const s = globalThis.localStorage;
    // 있는지만 보지 않고 **실제로 써본다** — Safari 사생활 모드는 쓸 때 던진다
    s.setItem(KEY + ".probe", "1");
    s.removeItem(KEY + ".probe");
    return s;
  } catch { return null; }
}

/** 남아 있는 기록. 못 읽으면 빈 목록이다. */
export function loadRuns(): Run[] {
  try {
    const raw = store()?.getItem(KEY);
    if (!raw) return [];
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    // 남이 고쳤거나 옛 판이 섞였을 수 있다 — 모양이 맞는 것만 받는다
    return v.filter((r): r is Run =>
      !!r && typeof r.name === "string" && Number.isFinite(r.gold) &&
      Number.isFinite(r.races) && Number.isFinite(r.at)
    ).map((r) => ({ ...r, bestOdds: Number.isFinite(r.bestOdds) ? r.bestOdds : 0 }));
  } catch { return []; }
}

/** 기록을 더하고 저장한다. 저장이 안 돼도 **더해진 목록은 돌려준다** — 화면은 보여야 한다. */
export function saveRun(run: Run): Run[] {
  const next = withRun(loadRuns(), run);
  try { store()?.setItem(KEY, JSON.stringify(next)); } catch { /* 화면만 보여주고 넘어간다 */ }
  return next;
}

/** 기록을 지운다. 화면에 지우는 수단이 없으면 사람이 못 치운다. */
export function clearRuns(): void {
  try { store()?.removeItem(KEY); } catch { /* 무시 */ }
}
