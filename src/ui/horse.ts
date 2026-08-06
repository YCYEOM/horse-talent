// 치비 경주마. 굵은 어두운 외곽선 · 납작한 채색 (CON-001 아트 방향).
//
// **실루엣이 먼저 읽혀야 한다.** 6두가 동시에 달리므로 색보다 형태가 먼저다.
//
// 처음 판은 "말이 아닌 것 같다"는 지적을 받았다. 이유는 부품이 없어서가 아니라
// **말을 말로 만드는 세 군데가 틀렸기** 때문이다 —
//   · 목이 가는 막대라 기린이 됐다 → 어깨에서 넓고 목마루가 굵게 아치를 그려야 한다
//   · 머리가 공 + 주둥이 혹이라 개가 됐다 → **하나로 이어진 긴 쐐기**여야 한다
//   · 갈기가 목 뒤에 붙은 막대였다 → 목마루를 **타고 흐르는 면**이어야 한다
// 몸통도 타원 하나였는데, 가슴과 엉덩이가 부풀고 등이 살짝 파여야 말 등선이 된다.
//
// 표정은 **내 말에만** 준다. 상대까지 표정을 주면 시선이 분산되고,
// 이 게임에서 감정을 이입할 대상은 하나뿐이다.

import { C, shade, withAlpha } from "./tokens";

const TAU = Math.PI * 2;

export type Mood = "idle" | "happy" | "sad";

export interface Coat { body: string; mane: string }

export interface HorseOpts {
  /** 달리는 위상. 0 이면 서 있다. */
  run?: number;
  mood?: Mood;
  /** 번호포에 찍히는 게이트 번호. */
  num?: number | null;
  /** 상대 말 — 채도를 낮추고 표정을 지운다. */
  dim?: boolean;
}

/**
 * 발끝 `(x, y)` 기준 그림이 차지하는 범위. **단위**라서 `s` 를 곱하면 픽셀이다.
 * 배치 검사가 이 값을 쓴다 — 그림 크기를 눈으로 어림하다가
 * 이름 화면에서 귀가 부제를 뚫었다.
 */
export const HORSE_BOX = { top: -88, bottom: 6, left: -58, right: 74 } as const;

/** 반짝임. 강화 성공에만 쓴다 — 남발하면 판정을 가린다(DESIGN.md 원칙 5). */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, rr = i % 2 ? r * 0.4 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

/**
 * 말 한 마리. `(x, y)` 는 **발이 닿는 지점**이고 `s` 가 배율이다. 오른쪽을 본다.
 * 좌표는 전부 `HORSE_BOX` 와 같은 단위계로 적는다 — 그래야 상자가 거짓말을 안 한다.
 */
export function drawHorse(
  ctx: CanvasRenderingContext2D, x: number, y: number, s: number,
  coat: Coat, opt: HorseOpts = {},
) {
  const { run = 0, mood = "idle", num = null, dim = false } = opt;
  const body = dim ? shade(coat.body, 0.82) : coat.body;
  const mane = dim ? shade(coat.mane, 0.9) : coat.mane;
  const line = C.ink;
  const bounce = run ? Math.abs(Math.sin(run * 2)) * 5 * s : 0;
  const by = y - bounce;

  /** 단위 → 화면. 몸은 뛰면 위아래로 흔들리고(`by`), 발은 땅(`y`)에 붙는다. */
  const X = (u: number) => x + u * s;
  const Y = (u: number) => by + u * s;

  ctx.save();
  ctx.lineJoin = "round"; ctx.lineCap = "round";

  // 그림자 — 발이 어디 닿는지가 보여야 레인이 읽힌다
  ctx.fillStyle = withAlpha(C.scrim, 0.22);
  ctx.beginPath(); ctx.ellipse(x, y + 3 * s, 36 * s, 8 * s, 0, 0, TAU); ctx.fill();

  // ── 다리 넷 ─────────────────────────────────────────
  // 무릎이 접히는 방향이 앞뒤로 다르다. 뒷다리가 반대로 접히는 것이 말의 표시다.
  const gait = (k: number) => (run ? Math.sin(run * 2 + k) * 13 * s : 0);
  const legs = [
    { hip: -24, ph: 0, back: true },
    { hip: -16, ph: Math.PI, back: true },
    { hip: 12, ph: Math.PI, back: false },
    { hip: 20, ph: 0, back: false },
  ];
  const drawLeg = (l: typeof legs[number]) => {
    const sw = gait(l.ph);
    const hx = X(l.hip), hy = Y(-28);
    // 뒷다리 무릎은 뒤로, 앞다리 무릎은 앞으로 접힌다
    const kx = hx + sw * 0.5 + (l.back ? -3.5 : 2.5) * s, ky = Y(-13);
    const fx = hx + sw;
    const fy = y - (run ? Math.max(0, Math.sin(run * 2 + l.ph)) * 9 * s : 0);
    ctx.strokeStyle = line; ctx.lineWidth = 8.5 * s;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.strokeStyle = l.back ? shade(body, 0.8) : body; ctx.lineWidth = 5.2 * s;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = C.hoof; ctx.strokeStyle = line; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.ellipse(fx, fy + s, 5.2 * s, 3.6 * s, 0, 0, TAU); ctx.fill(); ctx.stroke();
  };
  legs.filter((l) => l.back).forEach(drawLeg);

  // ── 꼬리 — 엉덩이 꼭대기에서 나와 늦게 따라온다 ─────
  const lag = run ? Math.sin(run * 2 - 0.9) * 9 * s : 0;
  const tail = (w: number, col: string) => {
    ctx.strokeStyle = col; ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(X(-30), Y(-42));
    ctx.bezierCurveTo(X(-46) - lag * 0.4, Y(-44) + lag,
                      X(-54) - lag * 0.8, Y(-28) + lag,
                      X(-50) - lag, Y(-8) + lag);
    ctx.stroke();
  };
  tail(15, line); tail(10, mane);

  // ── 몸통 — 가슴과 엉덩이가 부풀고 등이 살짝 파인다 ──
  ctx.fillStyle = body; ctx.strokeStyle = line; ctx.lineWidth = 3.2 * s;
  ctx.beginPath();
  ctx.moveTo(X(14), Y(-46));                                          // 기갑
  ctx.bezierCurveTo(X(2), Y(-42), X(-10), Y(-42), X(-20), Y(-45));    // 등 — 파임
  ctx.bezierCurveTo(X(-30), Y(-47), X(-36), Y(-38), X(-34), Y(-26));  // 엉덩이
  ctx.bezierCurveTo(X(-32), Y(-19), X(-22), Y(-17), X(-10), Y(-18));  // 뒷배
  ctx.bezierCurveTo(X(2), Y(-19), X(12), Y(-19), X(19), Y(-24));      // 배
  ctx.bezierCurveTo(X(28), Y(-29), X(29), Y(-40), X(14), Y(-46));     // 가슴
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = withAlpha(C.white, 0.24);
  ctx.beginPath(); ctx.ellipse(X(-6), Y(-36), 18 * s, 7 * s, -0.05, 0, TAU); ctx.fill();

  // 번호포 — 어느 말인지가 색 말고도 읽혀야 한다(DESIGN.md 원칙 2)
  if (num !== null) {
    ctx.fillStyle = C.white; ctx.strokeStyle = line; ctx.lineWidth = 2.4 * s;
    ctx.beginPath(); ctx.roundRect(X(-13), Y(-38), 18 * s, 16 * s, 3 * s);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.font = `800 ${11 * s}px ui-monospace, monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(num), X(-4), Y(-30));
  }

  legs.filter((l) => !l.back).forEach(drawLeg);

  // ── 목 — 어깨에서 넓고 목마루가 아치를 그린다 ───────
  // 여기가 가늘면 즉시 기린이 된다. 밑변(어깨~가슴)이 머리 폭보다 넓어야 한다.
  ctx.fillStyle = body; ctx.strokeStyle = line; ctx.lineWidth = 3.2 * s;
  ctx.beginPath();
  ctx.moveTo(X(8), Y(-45));                                          // 기갑 앞
  ctx.bezierCurveTo(X(20), Y(-58), X(30), Y(-66), X(38), Y(-71));    // 목마루
  ctx.lineTo(X(48), Y(-60));                                         // 머리 붙는 곳
  ctx.bezierCurveTo(X(40), Y(-52), X(32), Y(-40), X(24), Y(-30));    // 목 앞선
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // ── 머리 — **하나로 이어진 긴 쐐기**. 공 + 주둥이로 나누면 개가 된다 ──
  ctx.beginPath();
  ctx.moveTo(X(34), Y(-74));                                         // 정수리
  ctx.bezierCurveTo(X(48), Y(-73), X(60), Y(-67), X(66), Y(-58));    // 콧등 — 곧게
  ctx.bezierCurveTo(X(71), Y(-51), X(68), Y(-45), X(60), Y(-45));    // 주둥이 끝
  ctx.bezierCurveTo(X(52), Y(-45), X(46), Y(-48), X(41), Y(-52));    // 아랫입술 · 턱
  ctx.bezierCurveTo(X(32), Y(-57), X(28), Y(-67), X(34), Y(-74));    // 볼
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // 귀 둘 — 안쪽을 어둡게 파야 귀로 읽힌다
  for (const [bx, tx] of [[30, 25], [39, 41]]) {
    ctx.fillStyle = body; ctx.strokeStyle = line; ctx.lineWidth = 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(X(bx), Y(-70));
    ctx.quadraticCurveTo(X(tx - 1), Y(-84), X(tx + 3), Y(-86));
    ctx.quadraticCurveTo(X(tx + 6), Y(-78), X(bx + 7), Y(-68));
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(mane, 1.05);
    ctx.beginPath();
    ctx.moveTo(X(bx + 2), Y(-70));
    ctx.quadraticCurveTo(X(tx + 2), Y(-80), X(tx + 3.5), Y(-82));
    ctx.quadraticCurveTo(X(tx + 4), Y(-76), X(bx + 5), Y(-69));
    ctx.closePath(); ctx.fill();
  }

  // 콧등 흰 줄(blaze) — 경주마 얼굴의 표식. 개체 구분에도 쓰인다
  ctx.fillStyle = withAlpha(C.white, 0.5);
  ctx.beginPath();
  ctx.moveTo(X(44), Y(-70));
  ctx.bezierCurveTo(X(54), Y(-68), X(62), Y(-60), X(64), Y(-52));
  ctx.bezierCurveTo(X(60), Y(-51), X(58), Y(-53), X(56), Y(-57));
  ctx.bezierCurveTo(X(52), Y(-64), X(48), Y(-67), X(43), Y(-67));
  ctx.closePath(); ctx.fill();

  // 콧구멍 · 입선
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.ellipse(X(63), Y(-51), 2.2 * s, 3 * s, 0.4, 0, TAU); ctx.fill();
  ctx.strokeStyle = withAlpha(C.ink, 0.55); ctx.lineWidth = 1.8 * s;
  ctx.beginPath(); ctx.moveTo(X(64), Y(-46.5)); ctx.lineTo(X(58), Y(-46)); ctx.stroke();

  // ── 갈기 — 목마루를 **타고 흐르는 면**. 세 갈래로 갈라 바람을 만든다 ──
  const maneShape = () => {
    ctx.fillStyle = mane; ctx.strokeStyle = line; ctx.lineWidth = 2.8 * s;
    ctx.beginPath();
    // 안쪽 선은 목마루를 그대로 타고, 바깥 선은 **목마루보다 위**로 부풀어야 한다.
    // 처음엔 바깥 선이 목 안쪽을 지나서 갈기가 목에 두른 띠처럼 보였다.
    ctx.moveTo(X(38), Y(-72));                                        // 귀 뒤
    ctx.bezierCurveTo(X(28), Y(-68), X(18), Y(-58), X(8), Y(-45));    // 안쪽 = 목마루
    ctx.lineTo(X(-2) - lag * 0.6, Y(-40) + lag * 0.5);                // 기갑 뒤로 흘러내린 끝
    ctx.bezierCurveTo(X(4) - lag * 0.5, Y(-55), X(12) - lag * 0.3, Y(-67), X(24), Y(-75));
    ctx.bezierCurveTo(X(29), Y(-71), X(33), Y(-70), X(38), Y(-72));   // 귀 뒤로 닫는다
    ctx.closePath(); ctx.fill(); ctx.stroke();
  };
  maneShape();

  // 앞머리(forelock) — 귀 사이에서 이마로 떨어진다. 이게 있으면 얼굴이 말이 된다
  ctx.fillStyle = mane; ctx.strokeStyle = line; ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  ctx.moveTo(X(34), Y(-74));
  ctx.bezierCurveTo(X(43), Y(-75), X(48), Y(-71), X(47), Y(-64));
  ctx.bezierCurveTo(X(43), Y(-67), X(38), Y(-68), X(33), Y(-67));
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // ── 눈 — 표정이 여기 다 있다. 볼 위쪽, 얼굴 옆면에 붙는다 ──
  const ex = X(43), ey = Y(-64);
  const face: Mood = dim ? "idle" : mood;
  if (face === "sad") {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.arc(ex, ey + 2 * s, 5.5 * s, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.fillStyle = C.tear; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.ellipse(ex + 6 * s, ey + 9 * s, 2.6 * s, 4 * s, 0, 0, TAU);
    ctx.fill(); ctx.stroke();
  } else {
    ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 2.6 * s;
    ctx.beginPath(); ctx.ellipse(ex, ey, 6 * s, 7 * s, 0.1, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink;
    const pupY = face === "happy" ? ey - 1.5 * s : ey;
    ctx.beginPath(); ctx.ellipse(ex + s, pupY, 3.2 * s, 4.4 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = C.white;
    ctx.beginPath(); ctx.arc(ex + 2.4 * s, pupY - 2 * s, 1.6 * s, 0, TAU); ctx.fill();
  }
  if (face === "happy") {
    ctx.fillStyle = C.gold;
    for (const [sx, sy, r] of [[16, -92, 4], [50, -80, 3], [-6, -66, 2.6]]) {
      star(ctx, X(sx), Y(sy), r * s);
    }
  }
  ctx.restore();
}
