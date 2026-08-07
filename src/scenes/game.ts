// M1 — 첫 3분. 경주 2회가 끝까지 돈다 (HT-001).
//
// 페이즈 넷을 돈다: **마방 → 창구 → 트랙 → 정산.** 각 화면은 한 가지만 묻는다.
// 엔진(`systems/`)은 캔버스를 모른다 — 여기가 유일하게 둘을 잇는 자리다.
//
// 강화 판정은 **결과를 먼저 확정하고 화면만 늦춘다**(nan PSH-004 에서 통한 구조).
// 연출 도중에 판정하면 되돌리기·시드 결정성과 충돌한다.

import {
  newHorse, forge, forgeOdds, forgeCost, canForge, randomName,
  STATS, STAT_NAME, STAT_HINT, MAX_LV, type Horse, type StatKey, type ForgeResult,
} from "../systems/stable";
import {
  buildRace, runRace, crowdBets, odds, settle, truePower, winProb,
  POOLS, POOL_ORDER, TAKEOUT, PLACE_SLOTS,
  SEGMENTS, type Pool, type Race, type Result, type PoolBook, type Bet,
} from "../systems/race";
import {
  raceCount, progressLabel, prizeFor, purse, isBroke, newTally, forgeSummary,
  recoveryPrize,
  featureRace, isFeature, FEATURE_MULT,
  START_GOLD, RACES_MIN, RACES_MAX, type Tally, type Feature,
} from "../systems/session";
import { C, F, MINE_COAT, RIVAL_COATS, font, mono, withAlpha, card, accentGrad } from "../ui/tokens";
import { drawHorse, HORSE_BOX, type Mood } from "../ui/horse";
import { rng } from "../kits/rng";
import {
  loadRuns, saveRun, submitRun, fetchBoard, ranked, rankOf, isBest, SHOWN,
  type Run, type Board,
} from "../systems/records";

export const W = 960;
export const H = 640;

/**
 * 세로 배치. **검사가 이 값들을 본다** — 배당표·확률·스탯이 겹치면 판단 재료가 가려진다.
 * nan 이 정적 화면에서만 겹침을 여섯 번 냈다. 좌표를 손으로 고르고 눈으로 확인하지 않는다.
 */
export const L = {
  headerBottom: 58,
  title: 38,              // 헤더 텍스트 baseline
  bodyTop: 78,
  /** 마방 — 능력치 5행 (HT-006). 3행 시절보다 촘촘하다 */
  statRow: [152, 222, 292, 362, 432] as const,
  statH: 62,
  /** 강화 연출은 **가운데 오버레이**다 — 5행 밑에 자리가 없다 */
  forgeBar: 340,
  forgeBarH: 30,
  /**
   * 창구 — 평판 카드. **아래에 열 머리글이 붙는다.**
   * 카드가 `bodyTop+8`(86)~`+42`(120) 이고 머리글 글자 윗선이 114.4 라 6px 겹쳤다.
   * 검사가 카드는 재면서 **머리글은 목록에 없었다** — 그래서 통과했다.
   */
  repCardY: 82,
  repCardH: 32,
  /** 창구 — 배당표 6행. 머리글은 `oddsTop - 8` 에 앉는다 */
  oddsTop: 140,
  oddsRowH: 52,
  /**
   * 배당표 카드와 그 안의 숫자 열. **전부 카드 안**이다 —
   * 예상 승률만 카드 밖(590)에 있었는데, 그 x 가 승식 열 시작점과 같아서
   * `2%` 가 복승 버튼에 붙고 머리글 `예상`·`승식` 이 이어붙어 "예상승식"으로 읽혔다.
   */
  oddsCardX: 40,
  oddsCardW: 520,
  colWin: 420,
  colPlace: 490,
  colProb: 550,       // 오른쪽 정렬. 카드 오른끝(560) 안쪽
  /** 창구 오른쪽 — 승식 그리드 · 설명 카드 · 마권 */
  poolCol: 590,
  poolGridTop: 140,
  poolBtnH: 38,
  poolRowPitch: 44,
  /**
   * 설명 **카드**의 baseline. 카드는 `poolDescY - 26` 에서 시작해 `poolDescH` 만큼이다.
   * 검사가 이걸 "한 줄 라벨(42px)"로 모델링해서 74px 카드가 마권을 16px 덮는 것을 놓쳤다.
   * **높이를 코드와 검사가 같은 상수에서 읽는다.**
   */
  poolDescY: 344,
  poolDescH: 74,
  slipTop: 400,
  slipH: 148,
  buyTop: 554,        // 걸고 출발 / 안 걸고 출발 — 나란히
  /**
   * 이름 화면 — **두 단.** 왼쪽에 이름, 오른쪽에 순위.
   * 부제("이 이름이 결산에 박힌다")를 빼고 그 자리를 순위가 쓴다.
   */
  nameColX: 300,
  nameCardW: 380,
  nameCardY: 432,
  nameBtnY: 522,
  nameRankX: 570,
  nameRankTop: 168,
  /** 말 그림. 제목(202)과 이름 카드 사이에 들어가야 한다 */
  nameHorseY: 406,
  nameHorseS: 1.8,
  /**
   * 트랙 — 결승선과 달려나갈 수 있는 오른쪽 끝.
   * `trackMaxX` 는 **착순 배지(폭 52)까지 화면 안에 들어오는** 지점이다.
   */
  trackStartX: 46,
  goalX: W - 108,
  trackMaxX: W - 46,
  /** 트랙 — 말 배율과 발이 레인 바닥에서 띄우는 높이. 검사가 못 박는다 */
  trackHorseS: 0.6,
  trackFootLift: 8,
  /** 마방 — 내 말 카드(40, 96, 300×396) 안. 꼬리가 왼쪽 테두리에 닿았다 */
  stableHorseX: 168,
  stableHorseY: 452,
  stableHorseS: 1.7,
  /**
   * 결산 — **두 단이다.** 왼쪽에 말과 요약, 오른쪽에 순위.
   * 한 단에 다 넣었더니 요약 줄이 순위 카드를 뚫었다(HT-012).
   */
  recapColTop: 292,
  recapHorseX: 120,
  recapHorseY: 470,
  recapHorseS: 1.4,
  recapRowX: 240,          // 항목 이름
  recapRowValX: 300,       // 값
  recapRow0: 320,
  recapRowPitch: 34,
  /** 결산 — 지난 판 순위. 오른쪽 단 */
  rankX: 560,
  rankTop: 292,
  rankW: 360,
  rankH: 250,
  rankRow0: 56,
  rankPitch: 34,
  /** 아래 안내 */
  hint: 620,
} as const;

/** M1 은 2경주. M2 에서 8~12 랜덤(HT-004), HT-007 에서 **12 고정**(사용자 실측 10분). */
export { RACES_MIN, RACES_MAX, START_GOLD };
const BET_STEPS = [100, 200, 400, 800];
/** 설명 카드 예시의 공통 앞머리. 가로 폭 검사가 이 문자열을 그대로 쓴다. */
export const EXAMPLE_ORDER = "착순 4→2→6";

type Phase = "name" | "stable" | "window" | "track" | "settle" | "recap";

interface Hit { x: number; y: number; w: number; h: number; id: string }

/** 1착이 결승선을 끊기까지의 시간(초). 뒤 말들은 그 뒤로 더 달린다. */
const RACE_SECS = 5;

/** 강화 연출 — 돌린다 0.8s → 감속 0.55s → 판정 0.3s. 총 1.65s 로 묶는다. */
const SPIN = 0.8, EASE = 0.55, SNAP = 0.3;
/** 판정이 드러나는 시각. 이 전에는 화면이 결과를 말하면 안 된다. */
export const REVEAL = SPIN + EASE;

/**
 * 연출 중 화면에 **보여줄** 단계.
 *
 * 엔진은 누르는 순간 이미 판정을 끝냈다(결정성 때문에 그래야 한다).
 * 그런데 화면이 그 값을 그대로 읽으면 **바늘이 돌기도 전에 답이 보인다** —
 * 연출이 통째로 무의미해진다. 판정 시각 전까지는 옛 단계를 보여준다.
 *
 * "결과를 먼저 확정하고 **화면만** 늦춘다"에서 늦춰야 하는 화면은 바늘만이 아니다.
 */
export function revealLevel(actual: number, from: number, t: number): number {
  return t < REVEAL ? from : actual;
}

export class Game {
  phase: Phase = "name";
  /** 결산에서 보여줄 기록. 판이 끝날 때 채워진다. */
  private runs: Run[] = [];
  private runBefore: Run[] = [];
  private run: Run | null = null;
  /**
   * 전역 순위 상태. **`sending` 을 따로 두는 이유** — 못 받은 것과 아직 안 온 것은
   * 다른 말이다. 둘을 뭉치면 로딩 중에 "기록 없음"이라고 거짓말한다.
   */
  private board: Board | null = null;
  private sending = false;
  horse: Horse;
  gold = START_GOLD;
  raceNo = 1;
  seed: number;
  /** 이 판의 경주 수. **판마다 다르다** — 화면에는 범위로만 알린다. */
  races: number;
  /** 대상경주 — 마지막 경주, 상금 3배. **거리를 판 시작부터 안다.** */
  feature: Feature;
  tally: Tally;

  race!: Race;
  book!: PoolBook;
  result: Result | null = null;
  bet: Bet | null = null;
  /** 관중이 아는 내 말의 실력. **강화 결과는 안 들어간다** — 컨셉의 핵심이다. */
  myForm = 3;

  private hits: Hit[] = [];
  private t = 0;
  /** 강화 연출 상태. 결과는 시작할 때 이미 정해져 있다. */
  private anim: { key: StatKey; res: ForgeResult; from: number; t: number } | null = null;
  private raceT = 0;
  private log: string[] = [];
  private betPool: Pool = "place";
  /** 고른 말들. **순서 승식이면 누른 순서가 곧 착순이다.** */
  private betGates: number[] = [];
  private betAmount = 100;
  /** 마우스가 올라간 승식 — 고르지 않고도 설명을 미리 본다. */
  private hoverPool: Pool | null = null;

  constructor(seed = Math.floor(Math.random() * 1e9)) {
    this.seed = seed;
    this.races = raceCount(seed);
    this.feature = featureRace(seed);
    this.tally = newTally(this.races, START_GOLD);
    // **이름도 시드에서 나온다.** `Math.random()` 이었는데, 그러면 같은 시드로
    // 두 번 띄워도 다른 말이 나온다 — 증거 화면이 매번 달라져 재현이 안 됐다(HT-008).
    this.horse = newHorse(randomName(rng(seed ^ 0x5EED)));
    // 이름 화면에도 순위를 띄운다 — **시작 전에 무엇을 넘어야 하는지** 보여준다.
    // 못 받으면 로컬로 떨어진다. 판이 끝나면 `finishSession` 이 다시 채운다.
    this.runs = loadRuns();
    this.sending = true;
    fetchBoard().then((b) => { this.board = b; }).finally(() => { this.sending = false; });
  }

  // ── 진행 ────────────────────────────────────────────────────────────────
  private openRace() {
    this.race = buildRace(this.raceNo, this.horse, this.seed,
      isFeature(this.raceNo, this.feature) ? this.feature.distance : undefined);
    this.book = crowdBets(this.race, this.myForm, this.seed);
    this.result = null;
    this.bet = null;
    this.betGates = [];
    this.betAmount = Math.min(100, this.gold);
  }

  start() { this.openRace(); this.phase = "stable"; }

  private toWindow() {
    // 강화가 끝났으니 배당을 다시 뽑는다 — 다만 관중은 강화를 못 봤다(myForm 그대로)
    this.book = crowdBets(this.race, this.myForm, this.seed);
    this.phase = "window";
  }

  private startRace() {
    this.result = runRace(this.race, this.seed);
    this.raceT = 0;
    this.phase = "track";
  }

  /** 이번 경주에서 내 말이 받은 상금. 화면이 정산에 따로 적는다. */
  private prize = 0;
  /** 강화에 쓴 총액. 결산의 수입 구성을 가르는 데 쓴다. */
  private spent = 0;

  private finishRace() {
    const res = this.result!;
    if (this.bet) {
      const p = settle(this.book, this.bet, res.order);
      this.gold += p.gold;
      this.tally.bets.placed++;
      if (p.hit) {
        this.tally.bets.hit++;
        if (!this.tally.best || p.gold > this.tally.best.gold) {
          this.tally.best = { race: this.raceNo, pool: POOLS[this.bet.pool].name,
            odds: p.odds, gold: p.gold };
        }
      }
      this.log.push(
        p.refunded ? `${this.raceNo}R 환급 ${p.gold} G`
          : p.hit ? `${this.raceNo}R 적중 ${p.odds.toFixed(1)}배 → +${p.gold} G`
          : `${this.raceNo}R 꽝 −${this.bet.amount} G`);
    } else {
      this.log.push(`${this.raceNo}R 베팅 없음`);
    }
    // **상금** — 마주는 베팅이 아니라 상금으로 번다. 3착 안에 들면 받는다.
    this.prize = prizeFor(this.raceNo, res.order.indexOf(1), this.feature);
    this.gold += this.prize;
    this.tally.prize += this.prize;
    if (isFeature(this.raceNo, this.feature)) this.tally.featurePrize = this.prize;
    if (this.tally.brokeAt === null && isBroke(this.gold)) this.tally.brokeAt = this.raceNo;
    // 경주가 끝나면 관중이 내 말을 본 만큼 평가가 갱신된다
    const me = this.race.runners.find((r) => r.mine)!;
    this.myForm = this.myForm * 0.4 + truePower(me, this.race.distance) * 0.6;
    this.phase = "settle";
  }

  private next() {
    if (this.raceNo >= this.races) {
      this.tally.gold = this.gold;
      this.finishSession();
      this.phase = "recap";
      return;
    }
    this.raceNo++;
    this.openRace();
    this.phase = "stable";
  }

  /**
   * 판이 끝났다 — 기록을 남긴다. **저장 실패는 삼킨다**(사생활 모드 등),
   * 그래도 이번 판은 목록에 들어가서 화면에 순위가 보인다.
   * `now` 는 검사에서 시각을 고정하려고 받는다.
   */
  private finishSession(now = Date.now()) {
    this.runBefore = loadRuns();
    this.run = {
      name: this.horse.name, gold: this.gold, races: this.races,
      bestOdds: this.tally.best?.odds ?? 0, at: now,
    };
    // 로컬에 **먼저** 남긴다 — 서버가 안 되어도 내 기록은 있어야 한다
    this.runs = saveRun(this.run);
    // 전역은 뒤따라온다. 오면 화면이 바뀌고, 안 오면 로컬이 그대로 보인다.
    this.board = null;
    this.sending = true;
    submitRun(this.run)
      .then((b) => { this.board = b; })
      .finally(() => { this.sending = false; });
  }

  // ── 입력 ────────────────────────────────────────────────────────────────
  /** 몇 마리 골랐는지가 승식 스펙과 맞는가. 다 고르기 전에는 마권을 못 산다. */
  ready() { return this.betGates.length === POOLS[this.betPool].picks; }

  /**
   * 말을 고른다. 이미 고른 말을 다시 누르면 뺀다.
   * **순서 승식이면 누른 순서가 그대로 착순이다** — 규칙을 따로 만들지 않는다.
   */
  private pick(gate: number) {
    const i = this.betGates.indexOf(gate);
    if (i >= 0) { this.betGates.splice(i, 1); return; }
    if (this.betGates.length >= POOLS[this.betPool].picks) this.betGates.shift();
    this.betGates.push(gate);
  }

  /** 호버는 승식 설명을 **고르지 않고** 미리 보는 수단이다. */
  move(mx: number, my: number) {
    this.hoverPool = null;
    if (this.phase !== "window") return;
    const h = this.hits.find((t) => t.id.startsWith("pool:") &&
      mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h);
    if (h) this.hoverPool = h.id.split(":")[1] as Pool;
  }

  click(mx: number, my: number) {
    if (this.phase === "track") { this.raceT = 99; return; }   // 스킵
    const hit = this.hits.find((h) =>
      mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h);
    if (!hit) return;
    this.act(hit.id);
  }

  /**
   * 이름 글자 수 상한. **글자(코드포인트) 단위로 센다** — `String.length` 는
   * 이모지를 둘로 세고, 조합 중인 한글도 낱자로 셀 수 있다.
   */
  static readonly MAX_NAME = 10;

  /**
   * 이름을 통째로 설정한다. **한 글자씩 받지 않는다** —
   * 한글은 `keydown` 이 조합 중인 낱자(ㄱ, ㅏ)를 주므로 이어붙이면 "가나" 가 "ㄱㅏㄴㅏ" 가 된다.
   * 조합은 브라우저 IME 가 해야 하고, `main.ts` 의 숨은 `<input>` 이 그 결과만 여기로 넘긴다.
   */
  setName(v: string) {
    if (this.phase !== "name") return;
    this.horse.name = [...v].slice(0, Game.MAX_NAME).join("");
  }

  /** 이름 화면에서 Enter — 이름이 있으면 시작한다. */
  submitName(): boolean {
    if (this.phase !== "name" || !this.horse.name.trim()) return false;
    this.start();
    return true;
  }

  key(k: string) {
    // 이름 입력은 IME 를 타야 해서 `setName`·`submitName` 으로 들어온다
    if (this.phase === "name") return;
    if (k === " " || k === "Enter") {
      if (this.phase === "track") this.raceT = 99;
      else if (this.phase === "settle") this.next();
      else if (this.phase === "stable") this.toWindow();
    }
  }

  private act(id: string) {
    const [kind, arg] = id.split(":");
    if (kind === "forge" && !this.anim) {
      const key = arg as StatKey;
      const lv = this.horse.stats[key];
      const cost = forgeCost(lv);
      if (!canForge(lv) || this.gold < cost) return;
      this.gold -= cost; this.spent += cost;
      // **결과를 먼저 확정한다.** 화면은 이 결과를 1.65초에 걸쳐 풀어놓을 뿐이다.
      const res = forge(this.horse, key, Math.random);
      this.tally.forges[res]++;
      this.anim = { key, res, from: lv, t: 0 };
    }
    if (kind === "toWindow" && !this.anim) this.toWindow();
    if (kind === "pool") { this.betPool = arg as Pool; this.betGates = []; }
    if (kind === "gate") this.pick(Number(arg));
    if (kind === "amount") this.betAmount = Math.min(this.gold, Number(arg));
    if (kind === "buy") {
      if (this.ready() && this.betAmount > 0 && this.betAmount <= this.gold) {
        this.gold -= this.betAmount;
        this.bet = { pool: this.betPool, gates: this.betGates.slice(), amount: this.betAmount };
        this.startRace();
      }
    }
    if (kind === "skipBet") { this.bet = null; this.startRace(); }
    if (kind === "next") this.next();
    if (kind === "startGame" && this.horse.name.trim()) this.start();
  }

  update(dt: number) {
    this.t += dt;
    if (this.anim) {
      this.anim.t += dt;
      if (this.anim.t > SPIN + EASE + SNAP + 0.9) this.anim = null;
    }
    if (this.phase === "track" && this.result) {
      this.raceT += dt;
      // **3착이 결승선을 끊고 잠깐 뒤**에 끝난다. 1착에서 끊으면 승식 판정을 못 본다.
      const third = this.result.finish[this.result.order[2]];
      // **3착이 실제로 들어온 뒤에 끝낸다.** `10` 을 손으로 적어뒀는데 그게 `SEGMENTS` 다 —
      // 엔진이 3착을 기다려 더 돌게 바뀌었으므로(HT-011) 여기서도 같은 상수를 봐야 한다.
      if (this.raceT >= (third / SEGMENTS) * RACE_SECS + 0.8) this.finishRace();
    }
  }

  // ── 그리기 ──────────────────────────────────────────────────────────────
  /**
   * 버튼. 셋뿐이다 — 기본(유리) · 선택됨(옅은 강조) · **주 동작**(그라데이션).
   * 주 동작은 화면에 하나만 둔다. 여럿이면 무엇이 주인지가 사라진다.
   */
  private btn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
              label: string, id: string,
              opt: { on?: boolean; off?: boolean; sub?: string; primary?: boolean } = {}) {
    const { on = false, off = false, sub, primary = false } = opt;
    const r = Math.min(14, h / 2);
    if (primary && !off) {
      ctx.fillStyle = accentGrad(ctx, x, y, w);
      ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
    } else if (on) {
      card(ctx, x, y, w, h, { r, fill: 0.16, border: 0.34 });
    } else {
      card(ctx, x, y, w, h, { r, fill: off ? 0.02 : 0.06, border: off ? 0.05 : 0.12 });
    }
    ctx.fillStyle = off ? C.textFaint : primary ? C.white : on ? C.text : C.textMuted;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = font(sub ? F.sm : F.md, primary || on ? 800 : 600);
    ctx.fillText(label, x + w / 2, y + h / 2 - (sub ? 8 : 0));
    if (sub) {
      ctx.font = mono(F.xs, 500);
      ctx.fillStyle = off ? C.textFaint : withAlpha(primary ? C.white : C.textMuted, 0.85);
      ctx.fillText(sub, x + w / 2, y + h / 2 + 11);
    }
    if (!off) this.hits.push({ x, y, w, h, id });
  }

  /** 화면 바탕 — 아주 옅은 세로 그라데이션. 납작한 단색보다 깊이가 산다. */
  private backdrop(ctx: CanvasRenderingContext2D) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, C.bg1); g.addColorStop(1, C.bg0);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  private header(ctx: CanvasRenderingContext2D, right: string) {
    ctx.fillStyle = withAlpha(C.line, 0.08);
    ctx.fillRect(0, L.headerBottom - 1, W, 1);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    // 라운드 — 그라데이션 알약 하나로 지금 어디인지 못 박는다
    ctx.fillStyle = accentGrad(ctx, 22, 0, 104);
    ctx.beginPath(); ctx.roundRect(22, 16, 104, 28, 14); ctx.fill();
    ctx.textAlign = "center"; ctx.font = mono(F.sm, 800); ctx.fillStyle = C.white;
    ctx.textBaseline = "middle";
    ctx.fillText(progressLabel(this.raceNo), 74, 31);
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.font = font(F.lg, 800); ctx.fillStyle = C.text;
    ctx.fillText(this.horse.name, 142, L.title);
    // **폭을 재고 나서 폰트를 바꾼다.** 반대로 했더니 작은 mono 로 이름을 재서
    // 폭이 모자랐고, 긴 이름에서 `번개블레이즈1800m` 처럼 붙었다.
    const nameW = ctx.measureText(this.horse.name).width;
    ctx.font = mono(F.sm, 500); ctx.fillStyle = C.textFaint;
    ctx.fillText(`${this.race?.distance ?? "-"}m · ${right}`, 142 + nameW + 16, L.title);
    // **대상경주 목표를 판 내내 띄운다.** 목표가 안 보이면 계획이 안 선다.
    const feat = isFeature(this.raceNo, this.feature);
    ctx.textAlign = "center";
    ctx.font = mono(F.xs, 700); ctx.fillStyle = feat ? C.gold : C.textFaint;
    ctx.fillText(feat
      ? `★ 대상경주 · 상금 ${FEATURE_MULT}배`
      : `대상경주 ${this.feature.no}R · ${this.feature.distance}m`, W / 2 + 40, L.title - 2);
    ctx.textAlign = "right";
    ctx.font = mono(F.xl, 800); ctx.fillStyle = C.gold;
    ctx.fillText(`${this.gold.toLocaleString()}`, W - 46, L.title);
    ctx.font = mono(F.sm, 700); ctx.fillStyle = withAlpha(C.gold, 0.6);
    ctx.fillText("G", W - 22, L.title);
  }

  private hint(ctx: CanvasRenderingContext2D, s: string) {
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = mono(F.sm, 400); ctx.fillStyle = C.textFaint;
    ctx.fillText(s, W / 2, L.hint);
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.hits = [];
    ctx.clearRect(0, 0, W, H);
    this.backdrop(ctx);
    if (this.phase === "name") return this.drawName(ctx);
    this.header(ctx, this.phase === "stable" ? "마방" :
      this.phase === "window" ? "창구" : this.phase === "track" ? "트랙" : "정산");
    if (this.phase === "stable") this.drawStable(ctx);
    else if (this.phase === "window") this.drawWindow(ctx);
    else if (this.phase === "track") this.drawTrack(ctx);
    else if (this.phase === "settle") this.drawSettle(ctx);
    else if (this.phase === "recap") this.drawRecap(ctx);
  }

  /**
   * 이름 화면. **두 단이다** — 왼쪽에 이름을 짓고 오른쪽에 순위를 본다.
   *
   * "이 이름이 결산에 박힌다" 부제는 뺐다(사용자 요청). 아래 안내줄이 이미
   * 무엇을 하는 화면인지 말하고, 그 자리를 순위가 쓴다 —
   * **시작 전에 무엇을 넘어야 하는지 보이는 편이 낫다.**
   */
  private drawName(ctx: CanvasRenderingContext2D) {
    const cx = L.nameColX;
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;
    ctx.fillText("HORSE TALENT", cx, 148);
    ctx.font = font(F.hero, 800); ctx.fillStyle = C.text;
    ctx.fillText("내 말의 이름", cx, 202);
    // **배율과 발 위치를 검사가 계산한다** — 눈으로 어림했더니 귀가 부제를 뚫었다.
    drawHorse(ctx, cx - 16, L.nameHorseY, L.nameHorseS, MINE_COAT, { mood: "idle", num: 1 });
    card(ctx, cx - L.nameCardW / 2, L.nameCardY, L.nameCardW, 64, { r: 20, fill: 0.07, border: 0.16 });
    ctx.textAlign = "center"; ctx.font = font(F.xxl, 800); ctx.fillStyle = C.text;
    const caret = Math.floor(this.t * 2) % 2 ? "|" : " ";
    ctx.fillText(this.horse.name + caret, cx, L.nameCardY + 44);
    this.btn(ctx, cx - 90, L.nameBtnY, 180, 50, "시작", "startGame:", { primary: true });

    this.drawRanking(ctx, L.nameRankX, L.nameRankTop);
    this.hint(ctx, "타이핑해서 고치고 · Enter");
  }

  /** 지금 화면에 보여줄 단계. 연출 중이면 판정 전까지 옛 값이다. */
  private shownLv(k: StatKey): number {
    const a = this.anim;
    const actual = this.horse.stats[k];
    return a && a.key === k ? revealLevel(actual, a.from, a.t) : actual;
  }

  private drawStable(ctx: CanvasRenderingContext2D) {
    const a = this.anim;
    const mood: Mood = a && a.t >= REVEAL
      ? (a.res === "success" ? "happy" : a.res === "drop" ? "sad" : "idle") : "idle";

    // 왼쪽 — 내 말 카드
    card(ctx, 40, 96, 300, 396, { r: 20, fill: 0.05, border: 0.1 });
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;
    ctx.fillText("다음 경주", 62, 128);
    ctx.font = font(F.xxl, 800); ctx.fillStyle = C.text;
    ctx.fillText(`${this.race.distance}m`, 62, 162);
    ctx.font = font(F.sm, 600); ctx.fillStyle = C.gold;
    ctx.fillText(hintForDistance(this.race.distance), 62, 186);
    // **대상경주 목표** — 여기에 맞춰 스탯을 쌓는 것이 G1 을 미리 공개하는 이유다
    ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;
    ctx.fillText("대상경주 (상금 3배)", 62, 222);
    ctx.font = font(F.lg, 800); ctx.fillStyle = C.text;
    ctx.fillText(`${this.feature.no}R · ${this.feature.distance}m`, 62, 248);
    ctx.font = font(F.xs, 500); ctx.fillStyle = C.gold;
    ctx.fillText(hintForDistance(this.feature.distance), 62, 268);
    drawHorse(ctx, L.stableHorseX, L.stableHorseY, L.stableHorseS, MINE_COAT, { mood, num: 1 });

    // 오른쪽 — 능력치 3행
    const bx = 372, bw = W - bx - 40;
    STATS.forEach((k, i) => {
      const y = L.statRow[i], lv = this.shownLv(k);
      card(ctx, bx, y - 26, bw, L.statH, { r: 14, fill: 0.045, border: 0.09 });
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.font = font(F.md, 800); ctx.fillStyle = C.text;
      ctx.fillText(STAT_NAME[k], bx + 18, y - 4);
      ctx.font = mono(F.xl, 800); ctx.fillStyle = C.gold;
      ctx.fillText(String(lv), bx + 68, y - 2);
      ctx.font = font(F.xs, 500); ctx.fillStyle = C.textFaint;
      ctx.fillText(STAT_HINT[k], bx + 18, y + 16);
      // 단계 막대
      for (let j = 0; j < MAX_LV; j++) {
        ctx.fillStyle = j < lv ? withAlpha(C.gold, 0.9) : withAlpha(C.line, 0.12);
        ctx.beginPath(); ctx.roundRect(bx + 196 + j * 13, y - 12, 10, 7, 3); ctx.fill();
      }
      const cost = forgeCost(lv), poor = this.gold < cost, top = !canForge(lv);
      if (!top) {
        const o = forgeOdds(lv);
        // 확률 셋 — 색 + 글자 + 막대 폭 셋으로 갈린다(DESIGN.md 원칙 3)
        const gx = bx + 196, gw = 132;
        let ax = gx;
        for (const [v, col] of [[o.success, C.success], [o.keep, C.keep], [o.drop, C.drop]] as const) {
          const sw = (gw * v) / 100;
          if (sw > 0) { ctx.fillStyle = col; ctx.fillRect(ax, y + 2, Math.max(sw - 2, 1), 9); }
          ax += sw;
        }
        ctx.font = mono(F.xs, 700); ctx.textAlign = "left";
        ctx.fillStyle = C.success; ctx.fillText(`${o.success}`, gx, y + 26);
        ctx.fillStyle = C.keep; ctx.fillText(`${o.keep}`, gx + 34, y + 26);
        ctx.fillStyle = C.drop; ctx.fillText(`${o.drop}`, gx + 68, y + 26);
        ctx.fillStyle = C.textFaint; ctx.font = mono(F.xs, 400);
        ctx.fillText("성공/보존/감소", gx + 100, y + 26);
      }
      this.btn(ctx, bx + bw - 116, y - 18, 100, 46,
        top ? "MAX" : "강화", `forge:${k}`,
        { off: top || poor || !!a, sub: top ? undefined : `${cost} G` });
    });

    if (a) this.drawForgeAnim(ctx, a);
    else {
      this.btn(ctx, W - 240, 522, 200, 50, "창구로", "toWindow:", { primary: true });
      this.hint(ctx, "능력치 하나를 골라 강화하거나, 골드를 아껴 창구로 간다 · Space");
    }
  }

  /** 강화 연출 3단. 결과는 이미 정해져 있고 화면만 늦춘다. */
  private drawForgeAnim(ctx: CanvasRenderingContext2D, a: NonNullable<Game["anim"]>) {
    const o = forgeOdds(a.from);
    // 5행 밑에 자리가 없어 **가운데 오버레이**로 띄운다. 판정 순간은 화면을 독점해도 된다.
    ctx.fillStyle = withAlpha(C.scrim, 0.72); ctx.fillRect(0, L.headerBottom, W, H - L.headerBottom);
    const cw = 620, cx = (W - cw) / 2;
    card(ctx, cx, 250, cw, 200, { r: 20, fill: 0.09, border: 0.2 });
    ctx.textAlign = "left"; ctx.font = font(F.lg, 800); ctx.fillStyle = C.text;
    ctx.fillText(`${STAT_NAME[a.key]} 강화  ${a.from} → ${a.from + 1}`, cx + 28, 292);
    const x = cx + 28, y = L.forgeBar - 20, w = cw - 56, h = L.forgeBarH;
    const segs = [
      { k: "success", p: o.success, c: C.success },
      { k: "keep", p: o.keep, c: C.keep },
      { k: "drop", p: o.drop, c: C.drop },
    ];
    let ax = x;
    const spans: Record<string, [number, number]> = {};
    for (const s of segs) {
      const sw = (w * s.p) / 100;
      ctx.fillStyle = s.c;
      ctx.beginPath(); ctx.roundRect(ax, y, Math.max(sw, 1), h, 7); ctx.fill();
      spans[s.k] = [ax, ax + sw];
      ax += sw;
    }
    const [t0, t1] = spans[a.res];
    const target = (t0 + t1) / 2;
    let nx: number, phase: number;
    if (a.t < SPIN) { phase = 1; nx = x + ((a.t * 2.6) % 1) * w; }
    else if (a.t < SPIN + EASE) {
      phase = 2;
      const k = (a.t - SPIN) / EASE, e = 1 - Math.pow(1 - k, 3);
      const from = x + ((SPIN * 2.6) % 1) * w;
      nx = from + (target + w - from) * e;
      if (nx > x + w) nx -= w;
    } else { phase = 3; nx = target; }

    const pop = phase === 3 ? Math.max(0, 1 - (a.t - REVEAL) / SNAP) : 0;
    ctx.strokeStyle = C.white; ctx.lineWidth = 3 + pop * 4;
    ctx.beginPath(); ctx.moveTo(nx, y - 12 - pop * 8); ctx.lineTo(nx, y + h + 12 + pop * 8); ctx.stroke();

    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = mono(F.xs, 500); ctx.fillStyle = C.textFaint;
    ctx.fillText(`${phase}단 · ${["돌린다", "감속", "판정"][phase - 1]}`, x, y + h + 26);

    if (a.t >= REVEAL) {
      const txt = a.res === "success" ? `성공! ${STAT_NAME[a.key]} ${a.from + 1}`
        : a.res === "keep" ? "보존 — 능력치 그대로"
        : `감소… ${STAT_NAME[a.key]} ${this.horse.stats[a.key]}`;
      const col = a.res === "success" ? C.success : a.res === "keep" ? C.keep : C.drop;
      ctx.font = font(F.xxl, 800); ctx.fillStyle = col;
      ctx.fillText(txt, x, y + h + 64);
      ctx.font = font(F.sm, 400); ctx.fillStyle = C.textFaint;
      ctx.fillText("관중은 이 결과를 모른다 — 배당은 그대로다", x, y + h + 88);
    }
  }

  private drawWindow(ctx: CanvasRenderingContext2D) {
    const spec = POOLS[this.betPool];
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = mono(F.xs, 500); ctx.fillStyle = C.textFaint;
    ctx.fillText(
      `${this.race.distance}m · 상금 ${purse(this.raceNo, this.feature).toLocaleString()} G` +
      ` · 공제율 ${Math.round(TAKEOUT * 100)}% · 연승 ${PLACE_SLOTS}착 이내`, 40, L.bodyTop);

    // **평판 대비 실력 — 이 게임의 유일한 우위 원천이다.**
    // 지금까지 화면 어디에도 없었다. 숨기면 판단 재료가 사라진다(DESIGN.md 원칙 5).
    const me = this.race.runners.find((r) => r.mine)!;
    const real = truePower(me, this.race.distance);
    const gap = real - this.myForm;
    const edge = gap > 0.6 ? "저평가" : gap < -0.6 ? "과대평가" : "제값";
    const eCol = gap > 0.6 ? C.success : gap < -0.6 ? C.drop : C.textFaint;
    card(ctx, L.oddsCardX, L.repCardY, L.oddsCardW, L.repCardH, { r: 10, fill: 0.05, border: 0.1 });
    ctx.textAlign = "left"; ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;
    ctx.fillText("관중이 보는 내 말", 56, L.repCardY + 21);
    ctx.font = mono(F.md, 800); ctx.fillStyle = C.textMuted;
    ctx.fillText(this.myForm.toFixed(1), 178, L.repCardY + 21);
    ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;
    ctx.fillText("실제", 224, L.repCardY + 21);
    ctx.font = mono(F.md, 800); ctx.fillStyle = C.gold;
    ctx.fillText(real.toFixed(1), 262, L.repCardY + 21);
    ctx.font = font(F.sm, 800); ctx.fillStyle = eCol;
    ctx.fillText(edge, 312, L.repCardY + 21);
    ctx.font = font(F.xs, 500); ctx.fillStyle = C.textFaint;
    ctx.fillText(
      gap > 0.6 ? "— 내 말 배당이 실제보다 높다"
        : gap < -0.6 ? "— 남의 말이 상대적으로 싸다"
        : "— 우위 없음. 공제율만큼 손해다",
      362, L.repCardY + 21);

    // ── 배당표 6행. 단승·연승 배당은 기준선이라 항상 띄운다 ──────────────
    this.race.runners.forEach((r, i) => {
      const y = L.oddsTop + i * L.oddsRowH;
      const pickIdx = this.betGates.indexOf(r.gate);
      const sel = pickIdx >= 0;
      ctx.fillStyle = sel ? withAlpha(C.gold, 0.22) : withAlpha(C.text, 0.05);
      ctx.strokeStyle = sel ? C.gold : withAlpha(C.text, 0.12); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(L.oddsCardX, y, L.oddsCardW, L.oddsRowH - 8, 8); ctx.fill(); ctx.stroke();
      const cy = y + (L.oddsRowH - 8) / 2;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = mono(F.lg, 800); ctx.fillStyle = C.text;
      ctx.fillText(String(r.gate), 66, cy);
      // 순서 승식이면 **몇 착으로 골랐는지**를 말 옆에 찍는다
      if (sel && spec.ordered) {
        ctx.fillStyle = C.gold;
        ctx.beginPath(); ctx.arc(94, cy, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.ink; ctx.font = mono(F.xs, 800);
        ctx.fillText(`${pickIdx + 1}착`, 94, cy + 1);
      } else if (sel) {
        ctx.fillStyle = C.gold;
        ctx.beginPath(); ctx.arc(94, cy, 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.textAlign = "left";
      ctx.font = font(F.md, r.mine ? 800 : 400);
      ctx.fillStyle = r.mine ? C.gold : C.textMuted;
      ctx.fillText(r.name + (r.mine ? "  (내 말)" : ""), 116, cy);
      ctx.textAlign = "right"; ctx.font = mono(F.md, 800); ctx.fillStyle = C.text;
      ctx.fillText(odds(this.book, "win", [r.gate]).toFixed(1), L.colWin, cy);
      ctx.fillText(odds(this.book, "place", [r.gate]).toFixed(1), L.colPlace, cy);
      // **관중 예상 승률.** 배당에서 그대로 나오는 값인데 사람이 암산을 못 한다 —
      // 80배 마권이 "1%" 라고 적혀 있으면 함정인 것이 보인다.
      // 새 정보가 아니라 **이미 화면에 있는 것을 읽히게** 만드는 것이다.
      const wp = winProb(this.book, r.gate);
      ctx.font = mono(F.xs, 600);
      ctx.fillStyle = wp < 0.03 ? C.drop : C.textFaint;
      ctx.fillText(wp < 0.01 ? "<1%" : `${Math.round(wp * 100)}%`, L.colProb, cy);
      this.hits.push({ x: L.oddsCardX, y, w: L.oddsCardW, h: L.oddsRowH - 8, id: `gate:${r.gate}` });
    });
    ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.font = mono(F.xs, 400); ctx.fillStyle = C.textFaint;
    ctx.fillText("단승", L.colWin, L.oddsTop - 8);
    ctx.fillText("연승", L.colPlace, L.oddsTop - 8);
    ctx.fillText("예상", L.colProb, L.oddsTop - 8);

    // ── 승식 7종 ────────────────────────────────────────────────────────
    const px = L.poolCol, pw = 172;
    ctx.textAlign = "left"; ctx.font = mono(F.xs, 400); ctx.fillStyle = C.textFaint;
    ctx.fillText("승식", px, L.poolGridTop - 8);
    POOL_ORDER.forEach((p, i) => {
      const bx = px + (i % 2) * (pw + 8);
      const by = L.poolGridTop + Math.floor(i / 2) * L.poolRowPitch;
      this.btn(ctx, bx, by, pw, L.poolBtnH, POOLS[p].name, `pool:${p}`,
        { on: this.betPool === p });
    });
    // **설명은 항상 여기 있다.** 도움말 버튼을 따로 두지 않는다 —
    // 눌러야 보이는 설명은 안 눌러본 사람에게 없는 것과 같다.
    // 호버 중이면 고르지 않고도 그 승식을 미리 보여준다.
    const shown = this.hoverPool ?? this.betPool;
    const ss = POOLS[shown];
    const dy = L.poolDescY;
    card(ctx, px, dy - 26, pw * 2 + 8, L.poolDescH, { r: 14, fill: 0.04, border: 0.08 });
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = font(F.md, 800);
    ctx.fillStyle = this.hoverPool ? C.textMuted : C.gold;
    ctx.fillText(ss.name, px + 16, dy - 2);
    ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;
    ctx.textAlign = "right";
    ctx.fillText(`${ss.picks}마리 · ${ss.ordered ? "순서 있음" : "순서 무관"}`, px + pw * 2 - 8, dy - 2);
    ctx.textAlign = "left";
    ctx.font = font(F.sm, 600); ctx.fillStyle = C.textMuted;
    ctx.fillText(ss.desc.replace(/\*\*/g, ""), px + 16, dy + 20);
    ctx.font = font(F.xs, 400); ctx.fillStyle = C.textFaint;
    ctx.fillText(`${EXAMPLE_ORDER} 이면 ${ss.example}`, px + 16, dy + 40);

    // ── 마권 ────────────────────────────────────────────────────────────
    const sy = L.slipTop;
    card(ctx, px, sy, pw * 2 + 8, L.slipH, { r: 18, fill: 0.07, border: 0.14 });
    const broke = isBroke(this.gold);

    if (broke) {
      // **파산은 끝이 아니다.** 비활성 버튼만 남기면 "고장난 화면"으로 읽힌다 —
      // 실측상 회복은 3착 한 번(중앙 1경주)이므로 그것을 화면이 말해야 한다.
      ctx.textAlign = "left"; ctx.fillStyle = C.drop; ctx.font = mono(F.xs, 700);
      ctx.fillText("판돈 없음", px + 18, sy + 24);
      ctx.font = font(F.xl, 800); ctx.fillStyle = C.text;
      ctx.fillText("이제 말만 믿는다", px + 18, sy + 58);
      ctx.font = font(F.sm, 600); ctx.fillStyle = C.textMuted;
      ctx.fillText(`${this.horse.name} 이 3착만 해도`, px + 18, sy + 90);
      ctx.font = mono(F.lg, 800); ctx.fillStyle = C.gold;
      ctx.fillText(`+${recoveryPrize(this.raceNo, this.feature).toLocaleString()} G`, px + 18, sy + 118);
      ctx.font = font(F.xs, 500); ctx.fillStyle = C.textFaint;
      ctx.fillText("한 번만 들어오면 다시 걸 수 있다", px + 18, sy + 138);
    } else {
      ctx.textAlign = "left"; ctx.fillStyle = C.textFaint; ctx.font = mono(F.xs, 600);
      ctx.fillText("마권", px + 18, sy + 24);
      ctx.font = mono(F.lg, 800); ctx.fillStyle = C.text;
      const picked = this.betGates.length
        ? (spec.ordered
          ? this.betGates.map((g, i) => `${i + 1}착 ${g}`).join("  ")
          : this.betGates.join(" · "))
        : `말을 ${spec.picks}마리 고르세요`;
      ctx.fillText(picked, px + 18, sy + 50);

      BET_STEPS.forEach((amt, i) => {
        this.btn(ctx, px + 18 + i * 82, sy + 60, 74, 34, `${amt}`, `amount:${amt}`,
          { on: this.betAmount === amt, off: amt > this.gold });
      });

      const o = this.ready() ? odds(this.book, this.betPool, this.betGates, this.betAmount) : 0;
      ctx.textAlign = "left"; ctx.fillStyle = C.textFaint; ctx.font = mono(F.xs, 600);
      ctx.fillText(`${POOLS[this.betPool].name} · ${this.betAmount} G`, px + 18, sy + 116);
      ctx.font = mono(F.lg, 800); ctx.fillStyle = this.ready() ? C.gold : C.textFaint;
      ctx.fillText(this.ready()
        ? `${Math.floor(this.betAmount * o).toLocaleString()} G   ×${o.toFixed(1)}`
        : "말을 고르는 중", px + 18, sy + 140);
    }

    if (broke) {
      this.btn(ctx, px, L.buyTop, pw * 2 + 8, 50,
        isFeature(this.raceNo, this.feature) ? "말만 믿고 대상경주로" : "말만 믿고 출발",
        "skipBet:", { primary: true });
    } else {
      this.btn(ctx, px, L.buyTop, pw, 50, "걸고 출발", "buy:",
        { primary: true, off: !this.ready() || this.betAmount > this.gold });
      this.btn(ctx, px + pw + 8, L.buyTop, pw, 50, "안 걸고", "skipBet:");
    }
    this.hint(ctx, broke
      ? "판돈은 없지만 경주는 계속된다 · 3착 한 번이면 다시 걸 수 있다"
      : "말을 눌러 고른다 · 다시 누르면 뺀다 · 크게 걸수록 내 배당이 내려간다");
  }

  private drawTrack(ctx: CanvasRenderingContext2D) {
    const res = this.result!;
    // **3착이 들어올 때까지 돈다.** 승식이 3착까지 보는데 1착에서 끊으면 판정을 못 본다.
    const t = (this.raceT / RACE_SECS) * SEGMENTS;   // 구간 단위 시각
    const posOf = (gate: number) => {
      const sp = res.splits.find((s) => s.gate === gate)!;
      const i = Math.min(sp.progress.length - 1, Math.floor(t));
      const a = i > 0 ? sp.progress[i - 1] : 0;
      const b = sp.progress[i];
      return a + (b - a) * Math.min(1, t - i);
    };

    ctx.fillStyle = C.stand; ctx.fillRect(0, L.headerBottom, W, 40);
    for (let i = 0; i < 120; i++) {
      const cx = (i * 137) % W, cy = L.headerBottom + 8 + ((i * 29) % 26);
      ctx.fillStyle = withAlpha(RIVAL_COATS[i % RIVAL_COATS.length].body, 0.5);
      ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // 잔디 아래끝을 **안내줄 위**에 맞춘다. `H - 34` 로 잡았더니 마지막 레인이
    // 안내줄에 2px 까지 붙어서 글자가 잔디에 얹힌 것처럼 보였다.
    const top = L.headerBottom + 40, turfBottom = L.hint - 22;
    const laneH = (turfBottom - top) / this.race.runners.length;
    this.race.runners.forEach((_, i) => {
      ctx.fillStyle = i % 2 ? C.turfAlt : C.turf;
      ctx.fillRect(0, top + i * laneH, W, laneH);
    });
    // 결승선
    const GOAL_X = L.goalX;
    for (let y = top; y < turfBottom; y += 13) {
      ctx.fillStyle = ((y / 13) | 0) % 2 ? C.white : C.turfAlt;
      ctx.fillRect(GOAL_X, y, 10, 13);
    }
    ctx.fillStyle = withAlpha(C.white, 0.45);
    ctx.fillRect(GOAL_X + 10, top, 2, turfBottom - top);

    this.race.runners.forEach((r, i) => {
      const p = posOf(r.gate);
      // 결승선을 넘으면 그 뒤로도 조금 더 달려 나간다
      const laneTop = top + i * laneH;
      // **결승선 뒤로 조금 더 나가되 화면 안에 선다.**
      // 1.22 를 곱하면 x 가 1,029 라 캔버스(960) 밖이었다 — 말과 착순 배지가 잘렸다.
      // 3착을 기다리느라 먼저 들어온 말이 오래 머물게 되면서 눈에 띄었다(HT-011).
      const x = Math.min(L.trackMaxX, L.trackStartX + p * (GOAL_X - L.trackStartX));
      // 말은 레인 **아래쪽**에 선다 — 위쪽은 이름 자리다
      const y = laneTop + laneH - L.trackFootLift;
      const coat = r.mine ? MINE_COAT : RIVAL_COATS[(r.gate - 1) % RIVAL_COATS.length];
      const done = p >= 1;
      const run = done ? this.raceT * 3 : this.raceT * 5 + i;
      drawHorse(ctx, x, y, L.trackHorseS, coat, { run, num: r.gate, dim: !r.mine });
      const headTop = y + HORSE_BOX.top * L.trackHorseS;
      // 들어온 말에는 **착순 배지**를 붙인다 — 3착까지가 승식 판정이다
      if (done) {
        const place = res.order.indexOf(r.gate) + 1;
        const podium = place <= 3;
        ctx.fillStyle = podium ? C.gold : withAlpha(C.scrim, 0.45);
        ctx.beginPath(); ctx.roundRect(x - 26, headTop - 30, 52, 26, 13); ctx.fill();
        ctx.fillStyle = podium ? C.ink : C.textMuted;
        ctx.font = mono(F.sm, 800); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(`${place}착`, x, headTop - 17);
      }
      // **이름은 레인 왼쪽 위 고정.** 말 옆(`x - 40`)에 붙였더니 출발선에서
      // 화면 밖으로 잘리고, 달리는 내내 말 그림에 깔렸다.
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.font = font(F.xs, r.mine ? 800 : 500);
      ctx.fillStyle = r.mine ? C.ink : withAlpha(C.ink, 0.55);
      ctx.fillText(`${r.gate}. ${r.name}`, 14, laneTop + 15);
    });

    // 3착이 들어왔는지 — 그게 이 화면이 끝나도 되는 조건이다
    const third = res.finish[res.order[2]];
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = mono(F.sm, 600); ctx.fillStyle = C.textFaint;
    this.hint(ctx, t >= third
      ? "3착까지 들어왔다 · 클릭 / Space"
      : "3착까지 본다 · 클릭 / Space 로 건너뛴다");
  }

  private drawSettle(ctx: CanvasRenderingContext2D) {
    const res = this.result!;
    ctx.fillStyle = withAlpha(C.scrim, 0.72); ctx.fillRect(0, L.headerBottom, W, H - L.headerBottom);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;
    ctx.fillText(`${this.race.distance}m · 상위 ${PLACE_SLOTS}착`, W / 2, 108);
    ctx.font = font(F.xxl, 800); ctx.fillStyle = C.text;
    ctx.fillText("착순", W / 2, 140);

    res.order.slice(0, PLACE_SLOTS).forEach((g, i) => {
      const r = this.race.runners.find((x) => x.gate === g)!;
      const y = 190 + i * 62;
      card(ctx, W / 2 - 250, y - 32, 500, 52,
        { r: 14, fill: r.mine ? 0.14 : 0.05, border: r.mine ? 0.3 : 0.09 });
      ctx.textAlign = "left"; ctx.font = mono(F.lg, 800);
      ctx.fillStyle = i === 0 ? C.gold : C.textMuted;
      ctx.fillText(`${i + 1}착`, W / 2 - 226, y);
      ctx.font = mono(F.sm, 700); ctx.fillStyle = C.textFaint;
      ctx.fillText(String(r.gate), W / 2 - 158, y);
      ctx.font = font(F.lg, r.mine ? 800 : 500); ctx.fillStyle = r.mine ? C.gold : C.text;
      ctx.fillText(r.name, W / 2 - 128, y);
      if (r.mine) {
        ctx.textAlign = "right"; ctx.font = mono(F.xs, 700); ctx.fillStyle = C.gold;
        ctx.fillText("내 말", W / 2 + 226, y);
      }
    });

    // 상금은 베팅과 성격이 다른 수입이라 따로 적는다
    if (this.prize > 0) {
      const place = this.result!.order.indexOf(1) + 1;
      ctx.textAlign = "center"; ctx.font = font(F.md, 700); ctx.fillStyle = C.gold;
      ctx.fillText(`내 말 ${place}착 — 상금 +${this.prize.toLocaleString()} G`, W / 2, 388);
    }
    const last = this.log[this.log.length - 1] ?? "";
    ctx.textAlign = "center"; ctx.font = font(F.xl, 800);
    ctx.fillStyle = last.includes("적중") ? C.success : last.includes("꽝") ? C.drop : C.textMuted;
    ctx.fillText(last, W / 2, 428);
    if (this.bet) {
      ctx.font = mono(F.sm, 500); ctx.fillStyle = C.textFaint;
      ctx.fillText(
        `${POOLS[this.bet.pool].name} ${this.bet.gates.join("-")} · ${this.bet.amount} G`,
        W / 2, 456);
    }
    this.btn(ctx, W / 2 - 120, 508, 240, 54,
      this.raceNo >= this.races ? "결산" : "다음 경주", "next:", { primary: true });
    this.hint(ctx, "Space");
  }

  private drawRecap(ctx: CanvasRenderingContext2D) {
    const t = this.tally;
    ctx.fillStyle = withAlpha(C.scrim, 0.86); ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;
    ctx.fillText(`${t.races}경주 완주`, W / 2, 92);
    ctx.font = font(F.huge, 800); ctx.fillStyle = C.gold;
    ctx.fillText(`${this.gold.toLocaleString()} G`, W / 2, 142);
    ctx.font = font(F.md, 700);
    ctx.fillStyle = this.gold >= START_GOLD ? C.success : C.drop;
    ctx.fillText(`${this.gold >= START_GOLD ? "+" : ""}${(this.gold - START_GOLD).toLocaleString()} G`,
      W / 2, 170);

    // **최고 배당 한 건** — 페이오프가 숫자가 아니라 사건이 되는 자리다
    if (t.best) {
      card(ctx, W / 2 - 260, 194, 520, 74, { r: 16, fill: 0.09, border: 0.2 });
      ctx.textAlign = "left"; ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;
      ctx.fillText("이 판 최고 적중", W / 2 - 238, 218);
      ctx.font = font(F.xl, 800); ctx.fillStyle = C.gold;
      ctx.fillText(`${t.best.race}R ${t.best.pool} ×${t.best.odds.toFixed(1)}`, W / 2 - 238, 250);
      ctx.textAlign = "right"; ctx.font = mono(F.xl, 800); ctx.fillStyle = C.success;
      ctx.fillText(`+${t.best.gold.toLocaleString()} G`, W / 2 + 238, 248);
    }

    drawHorse(ctx, L.recapHorseX, L.recapHorseY, L.recapHorseS, MINE_COAT,
      { mood: this.gold >= START_GOLD ? "happy" : "sad", num: 1 });

    // 요약 — 20경주면 로그를 다 못 보여준다.
    // **능력치는 줄여 적는다** — 이름을 다 쓰면 오른쪽 순위 카드를 뚫는다.
    const rows: [string, string][] = [
      ["내 말", this.horse.name],
      ["능력치", STATS.map((k) => `${STAT_NAME[k][0]}${this.horse.stats[k]}`).join(" ")],
      ["강화", forgeSummary(t)],
      ["베팅", `${t.bets.placed}회 중 ${t.bets.hit}회 적중`],
      ["수입", `상금 ${t.prize.toLocaleString()} · 베팅 ${(this.gold - START_GOLD - t.prize + this.spent).toLocaleString()}`],
      ["파산", t.brokeAt ? `${t.brokeAt}R 에 말랐다` : "끝까지 버텼다"],
    ];
    rows.forEach(([k, v], i) => {
      const y = L.recapRow0 + i * L.recapRowPitch;
      ctx.textAlign = "left"; ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;
      ctx.fillText(k, L.recapRowX, y);
      ctx.font = font(F.sm, 600);
      ctx.fillStyle = k === "파산" && t.brokeAt ? C.drop : C.textMuted;
      ctx.fillText(v, L.recapRowValX, y);
    });

    this.drawRanking(ctx, L.rankX, L.rankTop);
    this.hint(ctx, this.board
      ? "클릭 / Space 로 새 판 · 순위는 모두가 함께 본다"
      : "클릭 / Space 로 새 판 · 서버에 못 닿아 이 브라우저 기록만 보인다");
  }

  /**
   * 순위. **전역이 오면 전역, 안 오면 로컬.**
   * 셋을 구별해서 말한다 — 보내는 중 / 전역 / 이 브라우저.
   * 뭉치면 로딩 중에 "기록 없음"이라고 거짓말하게 된다.
   */
  private drawRanking(ctx: CanvasRenderingContext2D, x: number, top: number) {
    card(ctx, x, top, L.rankW, L.rankH, { r: 16, fill: 0.07, border: 0.16 });
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;

    const global = !!this.board;
    const mine = this.run;
    // 시작 전에는 올릴 것이 없다 — "불러오는 중" 과 "올리는 중" 은 다른 말이다
    const busy = this.sending ? (mine ? "기록 올리는 중" : "불러오는 중") : null;
    ctx.fillText(busy ?? (global ? "전체 순위" : "내 기록"), x + 16, top + 24);

    const list = global ? this.board!.runs.slice(0, SHOWN) : ranked(this.runs).slice(0, SHOWN);
    // 오른쪽 꼬리표 — 최고 기록 갱신이 첫 판보다 먼저다
    ctx.textAlign = "right";
    if (mine && global && this.board!.rank === 1) {
      ctx.font = font(F.xs, 800); ctx.fillStyle = C.gold;
      ctx.fillText("전체 1위", x + L.rankW - 16, top + 24);
    } else if (mine && !global && isBest(this.runBefore, mine)) {
      ctx.font = font(F.xs, 800); ctx.fillStyle = C.gold;
      ctx.fillText("최고 기록", x + L.rankW - 16, top + 24);
    } else if (mine && !global && !this.sending && !this.runBefore.length) {
      ctx.font = font(F.xs, 700); ctx.fillStyle = C.textFaint;
      ctx.fillText("첫 기록", x + L.rankW - 16, top + 24);
    }

    list.forEach((r, i) => {
      const y = top + L.rankRow0 + i * L.rankPitch;
      // **이번 판을 표시한다.** 안 그러면 자기가 몇 등인지 표에서 찾아야 한다.
      // 전역은 서버가 정한 시각(`at`)을 돌려주므로 등수로 맞춘다.
      const isMine = !!mine && (global ? i + 1 === this.board!.rank : r.at === mine.at);
      if (isMine) {
        ctx.fillStyle = withAlpha(C.gold, 0.16);
        ctx.beginPath(); ctx.roundRect(x + 8, y - 15, L.rankW - 16, L.rankPitch - 4, 8); ctx.fill();
      }
      ctx.textAlign = "left"; ctx.font = mono(F.sm, 800);
      ctx.fillStyle = i === 0 ? C.gold : C.textFaint;
      ctx.fillText(`${i + 1}`, x + 18, y);
      ctx.font = font(F.sm, isMine ? 800 : 600);
      ctx.fillStyle = isMine ? C.text : C.textMuted;
      ctx.fillText(r.name, x + 40, y);
      ctx.textAlign = "right"; ctx.font = mono(F.sm, 800);
      ctx.fillStyle = isMine ? C.gold : C.textMuted;
      ctx.fillText(`${r.gold.toLocaleString()} G`, x + L.rankW - 18, y);
    });

    // 아래 한 줄 — 이번 판이 상위 밖이면 등수를, 아니면 모수를 알린다.
    // 표에 자기가 없으면 "기록이 안 됐나" 싶어진다.
    const rank = global ? this.board!.rank : (mine ? rankOf(this.runs, mine) : 0);
    const total = global ? this.board!.total : this.runs.length;
    ctx.textAlign = "center"; ctx.font = mono(F.xs, 600); ctx.fillStyle = C.textFaint;
    // **빈 것과 못 받은 것을 다르게 말한다.** 서버에 못 닿았는데 "아직 아무도 없다"고
    // 하면 거짓말이다 — 전역에는 기록이 있을 수 있다.
    const foot = this.sending ? "…"
      : !list.length ? (global ? "아직 아무도 없다 — 첫 기록을 남겨라" : "서버에 못 닿았다")
      : !mine ? `${total}판${global ? "" : " · 이 브라우저"}`
      : rank > SHOWN ? `이번 판 ${rank}등 / ${total}판`
      : `${total}판 중${global ? "" : " · 이 브라우저"}`;
    if (foot) ctx.fillText(foot, x + L.rankW / 2, top + L.rankH - 14);
  }
}

function hintForDistance(d: number): string {
  if (d <= 1200) return "단거리 — 가속이 거의 전부다";
  if (d <= 1600) return "중거리 — 속력이 값을 한다";
  return "장거리 — 체력이 없으면 마지막에 잡힌다";
}
