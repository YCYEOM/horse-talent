// 트랙 전용 말 스프라이트. **달릴 때만 쓴다.**
//
// 왜 여기만인가 — 갤럽은 손으로 그린 사인파 다리보다 실제 프레임이 압도적으로 낫고,
// 트랙에서는 말이 작아서(높이 56px) 픽셀이 안 도드라진다.
// 이름·마방·결산은 말이 크게 보이고 **표정이 필요해서** 벡터(`horse.ts`)를 그대로 쓴다.
// 같은 말이 화면마다 다르게 생기는 값은 치른다 — 사용자 판정(2026-08-07).
//
// 출처와 라이선스는 `docs/CREDITS.md`. CC0 라 표기 의무는 없지만 어디서 왔는지는 남긴다.
//
// **받아온 파일에 함정이 둘 있었다** —
//   1. 페이지에 적힌 `horse_run_cycle.png` 는 HTML 을 돌려준다. 실제 파일은 `_0` 가 붙는다.
//   2. RGBA 인데 **알파가 전부 불투명**이다. 흰 배경을 안 빼면 잔디 위에 흰 사각형이 뜬다.

import { C, hsl, withAlpha, SPRITE_BASE } from "./tokens";
import type { Coat } from "./horse";

const SHEET = `${import.meta.env.BASE_URL}horse-run.png`;
const FRAME_W = 82, FRAME_H = 66;
export const FRAMES = 5;

/**
 * 프레임 안에서 말이 실제로 차지하는 자리. **눈으로 어림하지 않고 픽셀을 셌다** —
 * 5프레임 전부에서 불투명 픽셀의 경계가 `x 22..77 · y 26..56` 이었다.
 * 82×66 중 절반이 빈 여백이라, 이걸 모르면 말이 발밑에 떠 있게 그려진다.
 */
const FOOT_Y = 56, MID_X = 49.5;

/** 발끝 기준 범위. `horse.ts` 의 `HORSE_BOX` 와 같은 단위계 — 배치 검사가 쓴다. */
export const SPRITE_BOX = {
  top: 26 - FOOT_Y, bottom: 0, left: 22 - MID_X, right: 77 - MID_X,
} as const;

/**
 * 색조 회전의 기준점. 말 색을 `coat.body` 에 맞추려면 이 색에서 얼마나 돌려야 하는지를
 * 알아야 한다. **각도를 손으로 적어두지 않고 런타임에 계산한다** — 팔레트를 바꾸면 따라온다.
 */
const BASE = hsl(SPRITE_BASE);

let sheet: HTMLCanvasElement | null = null;

export const spriteReady = () => sheet !== null;

/**
 * 시트를 받아 **흰 배경을 빼서** 캔버스에 담아둔다. 실패하면 조용히 포기한다 —
 * 그러면 트랙이 벡터 말로 돌아가고 게임은 계속된다.
 */
export function loadHorseSprite(): void {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const x = c.getContext("2d");
    if (!x) return;
    x.drawImage(img, 0, 0);
    let d: ImageData;
    try { d = x.getImageData(0, 0, c.width, c.height); } catch { return; }
    for (let i = 0; i < d.data.length; i += 4) {
      if (d.data[i] > 243 && d.data[i + 1] > 243 && d.data[i + 2] > 243) d.data[i + 3] = 0;
    }
    x.putImageData(d, 0, 0);
    sheet = c;
  };
  img.src = SHEET;
}

/** 이 말 색을 내려면 기준색에서 얼마나 돌리고 얼마나 진하게 할지. */
function tint(coat: Coat, dim: boolean): string {
  const t = hsl(coat.body);
  const d = ((t.h - BASE.h) % 360 + 360) % 360;
  const sat = Math.max(0.25, t.s / Math.max(0.01, BASE.s)) * (dim ? 0.75 : 1);
  const bri = Math.max(0.6, t.l / Math.max(0.01, BASE.l)) * (dim ? 0.9 : 1);
  return `hue-rotate(${d.toFixed(0)}deg) saturate(${sat.toFixed(2)}) brightness(${bri.toFixed(2)})`;
}

export interface SpriteOpts {
  /** 달리는 위상. 프레임을 고르는 데만 쓴다. */
  run?: number;
  num?: number | null;
  dim?: boolean;
}

/**
 * 말 한 마리. `(x, y)` 는 **발이 닿는 지점**, `s` 가 배율 — `drawHorse` 와 같은 약속이다.
 * `spriteReady()` 가 거짓이면 아무것도 안 그린다. 부르는 쪽이 벡터로 대신해야 한다.
 */
export function drawHorseSprite(
  ctx: CanvasRenderingContext2D, x: number, y: number, s: number,
  coat: Coat, opt: SpriteOpts = {},
) {
  if (!sheet) return;
  const { run = 0, num = null, dim = false } = opt;
  const f = Math.abs(Math.floor(run * 2)) % FRAMES;

  ctx.save();
  // 그림자 — 벡터 말과 같은 규칙. 발이 어디 닿는지가 보여야 레인이 읽힌다
  ctx.fillStyle = withAlpha(C.scrim, 0.22);
  ctx.beginPath(); ctx.ellipse(x - 3 * s, y + 2 * s, 20 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();

  // **픽셀 아트라 보간을 끈다.** 켜두면 확대에서 뭉개진다
  ctx.imageSmoothingEnabled = false;
  ctx.filter = tint(coat, dim);
  ctx.drawImage(sheet, f * FRAME_W, 0, FRAME_W, FRAME_H,
    x - MID_X * s, y - FOOT_Y * s, FRAME_W * s, FRAME_H * s);
  ctx.filter = "none";
  ctx.imageSmoothingEnabled = true;

  // 번호포 — 스프라이트에는 없으니 위에 얹는다. 색 말고도 구분되어야 한다(DESIGN.md 원칙 2)
  if (num !== null) {
    ctx.fillStyle = C.white; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6 * s;
    // 몸통 위에 얹는다. 처음엔 `x - 9` 였는데 그 자리가 **목이라 얼굴을 덮었다**
    ctx.beginPath(); ctx.roundRect(x - 17 * s, y - 23 * s, 12 * s, 10 * s, 2.5 * s);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.font = `800 ${7.5 * s}px ui-monospace, monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(String(num), x - 11 * s, y - 17.7 * s);
  }
  ctx.restore();
}
