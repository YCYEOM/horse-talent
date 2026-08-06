// 디자인 토큰. 값은 여기, 의미와 사용 원칙은 루트 `DESIGN.md` 에 있다.
// 씬에 색 리터럴을 직접 쓰지 않는다 (DESIGN.md 원칙 6 — bass design check 가 본다).
//
// **2차 아트 방향 (HT-003).** 1차의 나무 패널 + 크림색 버튼은 낡아 보였다.
// 지금은 요즘 웹 도구(media.io 계열)의 문법을 쓴다 —
//   · 깊은 남보라 바탕에 **유리 같은 카드**(낮은 알파 흰 면 + 1px 테두리)
//   · **보라 → 청록 그라데이션**을 주 동작 하나에만
//   · 큰 라운드(14~20), 넉넉한 여백, 얇은 구분선
//   · 숫자는 tabular, 제목은 자간을 좁힌다
//
// **캐릭터는 그대로 치비다.** 바뀐 것은 UI 껍데기이지 말이 아니다 —
// 귀여운 말과 차분한 UI 가 대비되어 말이 더 눈에 든다.

export const C = {
  // 바탕 — 위아래로 아주 옅은 그라데이션을 준다
  bg0: "#0B0A16",
  bg1: "#151230",

  // 유리 카드. `withAlpha` 로 흰 면을 아주 옅게 얹는다
  card: "#FFFFFF",       // 항상 알파와 함께 쓴다
  line: "#FFFFFF",       // 테두리도 알파와 함께

  // 주 동작 그라데이션 — 화면에 하나만 둔다
  accent0: "#8B5CF6",
  accent1: "#22D3EE",

  // 글자
  text: "#F4F2FF",
  textMuted: "#A9A3C9",
  textFaint: "#6E688F",
  ink: "#120F22",        // 밝은 면 위 글자

  // 화폐
  gold: "#FFD166",
  goldDk: "#E6A700",

  // 강화 세 갈래. **색 + 밝기 + 글자**로 갈린다(DESIGN.md 원칙 3)
  success: "#34D399",
  keep: "#60A5FA",
  drop: "#FB7185",

  // 트랙
  turf: "#2FA36B",
  turfAlt: "#289259",
  turfLine: "#7BE3AE",
  stand: "#221E44",

  scrim: "#05040C",
  white: "#FFFFFF",      // 번호포·눈 흰자·결승선. 순백은 여기서만
  tear: "#8FD3FF",       // 능력치 감소 표정의 눈물
  hoof: "#4A3B2A",       // 말굽
} as const;

/** 내 말. 화면에서 유일하게 채도가 높은 말이다 — 0.1초에 찾아져야 한다. */
export const MINE_COAT = { body: "#FFD166", mane: "#8A5A3B" } as const;

/** 상대 말 색. 6두가 동시에 달리므로 서로 충분히 갈려야 한다. */
export const RIVAL_COATS = [
  { body: "#B8A9D9", mane: "#5E4C86" },
  { body: "#8FD3FF", mane: "#3D6E96" },
  { body: "#FF9FB5", mane: "#A34E67" },
  { body: "#A8E6A3", mane: "#4E8A55" },
  { body: "#FFD9A0", mane: "#9A6B3A" },
  { body: "#D9C7A0", mane: "#7A6238" },
] as const;

/** 타이포 단계. 캔버스라 px 고정. 단계 사이 값을 쓰지 않는다. */
export const F = {
  xs: 12, sm: 14, md: 16, lg: 19, xl: 23, xxl: 30, huge: 40, hero: 54,
} as const;

export const font = (size: number, weight = 700) =>
  `${weight} ${size}px "Pretendard", "Apple SD Gothic Neo", system-ui, sans-serif`;
export const mono = (size: number, weight = 700) =>
  `${weight} ${size}px ui-monospace, "SF Mono", Menlo, monospace`;

/** 토큰 색에 알파를 입힌다. rgba 리터럴을 쓰면 토큰을 바꿔도 안 따라온다. */
export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** 색을 밝게/어둡게. 치비 채색의 음영에 쓴다. */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** 주 동작 그라데이션. **화면에 하나만** 쓴다 — 여러 개면 무엇이 주인지 사라진다. */
export function accentGrad(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, C.accent0);
  g.addColorStop(1, C.accent1);
  return g;
}

/** 유리 카드 한 장. 요즘 UI 의 기본 단위다. */
export function card(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  opt: { r?: number; fill?: number; border?: number } = {},
) {
  const { r = 16, fill = 0.05, border = 0.09 } = opt;
  ctx.fillStyle = withAlpha(C.card, fill);
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = withAlpha(C.line, border); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r); ctx.stroke();
}
