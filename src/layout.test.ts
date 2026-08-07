// 정적 배치 검사.
//
// **이 검사가 무엇을 못 보는지가 중요하다.** 달리는 말·강화 바늘·버튼 hover 는
// 산술로 못 잡는다. 여기서 막는 것은 **좌표로 정해진 것**뿐이다 —
// 배당표 6행·능력치 3행·강화 막대가 서로/헤더/안내줄과 겹치지 않는가.
//
// nan 이 정적 화면에서만 겹침을 여섯 번 냈다. 손으로 고른 좌표를 눈으로만 확인하지 않는다.
import { describe, it, expect } from "vitest";
import { W, H, L, REVEAL, revealLevel, EXAMPLE_ORDER } from "./scenes/game";
import { RACES } from "./systems/scale";
import { RACES_MIN, RACES_MAX, START_GOLD, MIN_BET } from "./systems/session";
import { FIELD_SIZE, POOL_ORDER, POOLS } from "./systems/race";
import { STATS } from "./systems/stable";
import { textBand, checkStack, textWidth } from "./kits/layout";
import { HORSE_BOX } from "./ui/horse";
import { F } from "./ui/tokens";

describe("캔버스", () => {
  it("960×640 이다 — DESIGN.md 가 미정으로 뒀던 값을 HT-001 이 정했다", () => {
    expect(W).toBe(960);
    expect(H).toBe(640);
  });

  it("헤더와 안내줄 사이에 본문 자리가 남는다", () => {
    expect(L.bodyTop).toBeGreaterThan(L.headerBottom);
    expect(L.hint).toBeGreaterThan(L.bodyTop);
    expect(L.hint).toBeLessThan(H);
  });
});

describe("창구 — 배당표가 겹치지 않는다", () => {
  it("6행이 본문 안에 들고 안내줄을 안 침범한다", () => {
    const bands = [
      { name: "헤더", top: 0, bottom: L.headerBottom },
      { name: "평판 카드", top: L.repCardY, bottom: L.repCardY + L.repCardH },
      // **머리글이 목록에 없어서 평판 카드가 6px 덮는 것을 놓쳤다.**
      // 카드는 재면서 그 바로 밑에 앉는 글자는 안 쟀다 — 사람이 화면에서 찾았다.
      { name: "배당 머리글", ...textBand(L.oddsTop - 8, F.xs) },
      ...Array.from({ length: FIELD_SIZE }, (_, i) => ({
        name: `배당 ${i + 1}행`,
        top: L.oddsTop + i * L.oddsRowH,
        bottom: L.oddsTop + i * L.oddsRowH + (L.oddsRowH - 8),
      })),
      { name: "안내", ...textBand(L.hint, F.sm) },
    ];
    expect(checkStack(bands, H)).toEqual([]);
  });

  it("행 사이에 실제로 틈이 있다 — 붙어 있으면 클릭 대상이 헷갈린다", () => {
    expect(L.oddsRowH - (L.oddsRowH - 8)).toBeGreaterThanOrEqual(8);
  });
});

describe("창구 — 승식 그리드와 마권", () => {
  it("승식 7종 그리드 · 설명 줄 · 마권이 겹치지 않는다", () => {
    const rows = Math.ceil(POOL_ORDER.length / 2);   // 2열
    const bands = [
      { name: "헤더", top: 0, bottom: L.headerBottom },
      { name: "평판 카드", top: L.repCardY, bottom: L.repCardY + L.repCardH },
      { name: "승식 라벨", ...textBand(L.poolGridTop - 8, F.xs) },
      { name: "승식 그리드", top: L.poolGridTop,
        bottom: L.poolGridTop + (rows - 1) * L.poolRowPitch + L.poolBtnH },
      // **카드 전체를 잡는다.** 이걸 "한 줄 라벨(42px)"로 적어놨다가
      // 실제 74px 카드가 마권을 16px 덮는 것을 놓쳤다 — 화면에서 사람이 먼저 봤다.
      // 높이는 코드와 같은 상수(`L.poolDescH`)에서 읽는다.
      { name: "설명 카드", top: L.poolDescY - 26, bottom: L.poolDescY - 26 + L.poolDescH },
      { name: "마권", top: L.slipTop, bottom: L.slipTop + L.slipH },
      { name: "출발 버튼", top: L.buyTop, bottom: L.buyTop + 50 },
      { name: "안내", ...textBand(L.hint, F.sm) },
    ];
    expect(checkStack(bands, H)).toEqual([]);
  });

  /**
   * **가로 겹침도 본다.** 예상 승률이 x=590 오른쪽 정렬이었는데
   * 승식 열도 x=590 에서 시작해서 — `2%` 가 복승 버튼에 붙고,
   * 머리글 `예상`(오른쪽 정렬)과 `승식`(왼쪽 정렬)이 이어붙어 **"예상승식"** 한 단어로 읽혔다.
   * 세로만 검사하고 가로는 안 봤기 때문이다.
   */
  it("배당표 숫자 열이 카드 안에 있고 승식 열과 안 붙는다", () => {
    const cardRight = L.oddsCardX + L.oddsCardW;
    for (const x of [L.colWin, L.colPlace, L.colProb]) {
      expect(x).toBeGreaterThan(L.oddsCardX);
      expect(x).toBeLessThan(cardRight);       // 오른쪽 정렬 기준선이 카드 안
    }
    expect(L.colWin).toBeLessThan(L.colPlace);
    expect(L.colPlace).toBeLessThan(L.colProb);
    // 열 사이에 mono 4글자(≈44px)가 들어갈 틈
    expect(L.colPlace - L.colWin).toBeGreaterThan(44);
    expect(L.colProb - L.colPlace).toBeGreaterThan(44);
    // 배당표 카드와 승식 열 사이에 홈통이 있다
    expect(L.poolCol - cardRight).toBeGreaterThanOrEqual(24);
  });

  /**
   * **가로 넘침.** 사용자가 화면에서 먼저 봤다 — 쌍승 예시가 카드 밖으로 나갔다.
   * 세로 겹침은 여섯 번 데고 검사를 만들었는데 **가로는 한 번도 안 쟀다.**
   * 폭 근사는 거칠어서 여유 10% 를 두고 판정한다.
   */
  it("승식 설명 3줄이 카드 폭 안에 든다", () => {
    const inner = 172 * 2 + 8 - 32;          // 카드 폭 − 좌우 여백
    const limit = inner * 0.9;
    for (const p of POOL_ORDER) {
      const desc = POOLS[p].desc.replace(/\*\*/g, "");
      const ex = `${EXAMPLE_ORDER} 이면 ${POOLS[p].example}`;
      expect(textWidth(desc, F.sm), `${POOLS[p].name} 설명`).toBeLessThan(limit);
      expect(textWidth(ex, F.xs), `${POOLS[p].name} 예시`).toBeLessThan(limit);
    }
  });

  it("승식이 7종이다 — 실제 경마 그대로", () => {
    expect(POOL_ORDER).toHaveLength(7);
    for (const p of POOL_ORDER) {
      expect(POOLS[p].name.length).toBeGreaterThan(1);
      expect(POOLS[p].desc.length).toBeGreaterThan(5);
      expect(POOLS[p].example.length).toBeGreaterThan(5);
    }
  });

  it("고르는 수가 1~3 이고 slots 가 스펙과 맞는다", () => {
    for (const p of POOL_ORDER) {
      expect(POOLS[p].picks).toBeGreaterThanOrEqual(1);
      expect(POOLS[p].picks).toBeLessThanOrEqual(3);
      expect(POOLS[p].slots).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("마방 — 능력치 3행과 강화 막대", () => {
  it("행끼리 겹치지 않는다", () => {
    const bands = [
      { name: "헤더", top: 0, bottom: L.headerBottom },
      ...STATS.map((k, i) => ({
        name: `${k} 행`,
        top: L.statRow[i] - 26,
        bottom: L.statRow[i] - 26 + L.statH,
      })),
      { name: "창구로 버튼", top: 522, bottom: 572 },
      { name: "안내", ...textBand(L.hint, F.sm) },
    ];
    expect(checkStack(bands, H)).toEqual([]);
  });

  it("능력치가 5종이고 5행이 다 들어간다", () => {
    expect(STATS).toHaveLength(5);
    expect(L.statRow).toHaveLength(5);
    expect(L.statRow[4] - 26 + L.statH).toBeLessThan(522);   // 창구로 버튼 위
  });

  /** 강화 연출은 가운데 오버레이다 — 5행 밑에 자리가 없다. */
  it("강화 연출 카드가 캔버스 안에 든다", () => {
    expect(250).toBeGreaterThan(L.headerBottom);
    expect(250 + 200).toBeLessThan(H);
    expect(L.forgeBar - 20 + L.forgeBarH + 88).toBeLessThan(250 + 200);
  });
});

describe("M2 규모", () => {
  it("경주 수가 고정이고 `scale.ts` 에서 온다", () => {
    expect(RACES_MIN).toBe(RACES_MAX);
    expect(RACES_MIN).toBe(RACES);
  });

  it("시작 골드가 첫 경주에 강화 1~2회 + 베팅을 감당한다", () => {
    // 3단계 강화 300 + 4단계 400 + 베팅 100 = 800. 여유가 있어야 선택이 생긴다
    expect(START_GOLD).toBeGreaterThan(800);
    expect(MIN_BET).toBeLessThan(START_GOLD / 4);
  });
});

describe("강화 연출 — 판정 전에 답이 새면 안 된다", () => {
  /**
   * 엔진은 누르는 순간 이미 판정을 끝낸다(결정성 때문에 그래야 한다).
   * 그런데 화면이 그 값을 그대로 읽으면 **바늘이 돌기도 전에 스탯이 바뀌어** 답이 보인다 —
   * 연출이 통째로 무의미해진다. 실제로 그렇게 새고 있었다(플레이 지적).
   *
   * "결과를 먼저 확정하고 **화면만** 늦춘다" 에서 늦춰야 할 화면은 바늘만이 아니다.
   */
  it("판정 시각 전에는 옛 단계를 보여준다", () => {
    for (const t of [0, 0.4, 0.8, REVEAL - 0.01]) {
      expect(revealLevel(7, 6, t)).toBe(6);   // 성공했지만 아직 안 보인다
      expect(revealLevel(5, 6, t)).toBe(6);   // 감소했어도 아직 안 보인다
    }
  });

  it("판정 시각부터는 실제 단계를 보여준다", () => {
    expect(revealLevel(7, 6, REVEAL)).toBe(7);
    expect(revealLevel(5, 6, REVEAL + 0.5)).toBe(5);
  });

  it("보존이면 어차피 같은 값이라 언제 봐도 같다", () => {
    expect(revealLevel(6, 6, 0)).toBe(6);
    expect(revealLevel(6, 6, REVEAL)).toBe(6);
  });

  it("판정 시각이 바늘이 멈추는 시각과 같다", () => {
    // 돌린다 0.8 + 감속 0.55 = 1.35. 이 값이 어긋나면 바늘과 숫자가 따로 논다
    expect(REVEAL).toBeCloseTo(1.35, 6);
  });
});

describe("우위가 화면에 있는가 — M3", () => {
  /**
   * **이 게임의 유일한 우위 원천은 "관중이 보는 실력 ≠ 실제 실력" 이다.**
   * M2 까지 그 숫자가 화면 어디에도 없었다 — 판단 재료가 없는 채로
   * 판단하라고 요구한 셈이다(DESIGN.md 원칙 5 위반).
   */
  it("평판 카드가 배당표 위, 헤더 아래에 자리를 갖는다", () => {
    expect(L.bodyTop + 8).toBeGreaterThan(L.headerBottom);
    expect(L.repCardY + L.repCardH).toBeLessThan(L.oddsTop);
    expect(L.repCardY + L.repCardH).toBeLessThan(L.poolGridTop);
  });
});

/**
 * **그림도 좌표다.** 지금까지 배치 검사가 글자와 카드만 봤고 말 그림은 눈으로 어림했다 —
 * 그래서 이름 화면에서 귀가 부제를 뚫었고 마방에서 꼬리가 카드 테두리에 닿았다.
 * `HORSE_BOX` 는 `horse.ts` 가 실제로 그리는 범위라, 그림을 바꾸면 여기서 깨진다.
 */
describe("말 그림이 제자리에 든다", () => {
  const box = (x: number, y: number, s: number) => ({
    top: y + HORSE_BOX.top * s, bottom: y + HORSE_BOX.bottom * s,
    left: x + HORSE_BOX.left * s, right: x + HORSE_BOX.right * s,
  });

  it("이름 화면 — 부제와 이름 카드 사이에 든다", () => {
    const h = box(W / 2 - 16, L.nameHorseY, L.nameHorseS);
    const sub = textBand(222, F.md);          // "이 이름이 결산에 박힌다"
    expect(h.top, "귀가 부제를 뚫는다").toBeGreaterThan(sub.bottom + 6);
    expect(h.bottom, "발이 이름 카드에 닿는다").toBeLessThan(440 - 6);
    expect(h.left).toBeGreaterThan(0);
    expect(h.right).toBeLessThan(W);
  });

  it("마방 — 내 말 카드 안에 여백을 두고 든다", () => {
    const h = box(L.stableHorseX, L.stableHorseY, L.stableHorseS);
    const card = { x: 40, y: 96, w: 300, h: 396 };
    expect(h.left, "꼬리가 카드 왼쪽으로 넘친다").toBeGreaterThan(card.x + 12);
    expect(h.right, "머리가 카드 오른쪽으로 넘친다").toBeLessThan(card.x + card.w - 12);
    expect(h.bottom, "발이 카드 밖으로 나간다").toBeLessThan(card.y + card.h - 12);
    expect(h.top, "귀가 위 설명을 덮는다").toBeGreaterThan(300);
  });

  /**
   * 레인 하나에 이름줄과 말이 같이 들어가야 한다. 그림자가 발밑 `+6단위` 까지 간다.
   * (2026-08-07 에 트랙만 CC0 픽셀 스프라이트로 바꿨다가 **사용자 판정으로 되돌렸다.**)
   */
  it("트랙 — 여섯 레인에서 말과 이름이 안 겹치고 잔디를 안 벗어난다", () => {
    const top = L.headerBottom + 40, turfBottom = L.hint - 22;
    const laneH = (turfBottom - top) / FIELD_SIZE;
    const paths = [{ what: "트랙", b: HORSE_BOX, s: L.trackHorseS }];
    for (const { what, b, s } of paths) {
      for (let i = 0; i < FIELD_SIZE; i++) {
        const laneTop = top + i * laneH;
        const y = laneTop + laneH - L.trackFootLift;
        const label = textBand(laneTop + 15, F.xs);
        expect(y + b.top * s, `${what} ${i + 1}레인 — 말이 이름을 덮는다`)
          .toBeGreaterThan(label.bottom);
        expect(y + (b.bottom + 6) * s, `${what} ${i + 1}레인 — 그림자가 잔디 밖으로 나간다`)
          .toBeLessThan(turfBottom);
      }
    }
    expect(textBand(L.hint, F.sm).top, "잔디가 안내줄에 붙는다").toBeGreaterThan(turfBottom + 6);
  });
});
