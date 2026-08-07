// horse-talent 진입점 — 캔버스와 입력만 잇는다. 게임은 `scenes/game.ts` 에 있다.
import { Game, W, H } from "./scenes/game";
import { C } from "./ui/tokens";

const app = document.getElementById("app")!;
// **이름 입력은 진짜 `<input>` 이 받는다.** 캔버스가 `keydown` 을 직접 받으면
// 한글이 조합 안 된 낱자로 들어와 "가나" 가 "ㄱㅏㄴㅏ" 가 된다 —
// IME 조합은 브라우저만 할 수 있고, 우리는 결과 문자열만 가져다 그린다.
// 보이지는 않는다. 커서와 글자는 캔버스가 그린다.
app.innerHTML = `<canvas id="game" width="${W}" height="${H}"></canvas>` +
  `<input id="name" autocomplete="off" autocapitalize="off" spellcheck="false"
     aria-label="내 말의 이름" maxlength="20">`;
const canvas = document.getElementById("game") as HTMLCanvasElement;
const nameInput = document.getElementById("name") as HTMLInputElement;
const ctx = canvas.getContext("2d")!;
document.body.style.background = C.bg0;

// 개발 전용 `?seed=` — 같은 화면을 두 번 찍으려면 시드가 고정돼야 한다
const q = new URLSearchParams(location.search);
const seedParam = import.meta.env.DEV ? q.get("seed") : null;
const game = seedParam === null ? new Game() : new Game(Number(seedParam));

// **개발 전용 — 화면 확인용 진입.** `?go=window` 처럼 주면 그 화면까지 클릭을 대신 눌러준다.
// 캔버스 게임은 헤드리스로 사람이 볼 수가 없어서, 배치 겹침을 매번 사람이 발견했다.
// 이것으로 `chrome --headless --screenshot` 이 페이즈별로 찍힌다. 빌드에는 안 들어간다.
if (import.meta.env.DEV) {
  const go = q.get("go");
  const steps: Record<string, (string | [number, number])[]> = {
    stable: ["Enter"],
    window: ["Enter", " "],
    track: ["Enter", " ", [856, 575]],          // 안 걸고
    settle: ["Enter", " ", [860, 579], " "],    // 경주 건너뛰기
    // 판 끝까지 — 경주마다 [창구로 · 안 걸고 · 경주 스킵 · **한 틱** · 정산 넘김].
    // `tick` 이 필요한 이유: 트랙 종료 판정이 `update` 안에 있어서
    // 입력만 밀어넣으면 `raceT` 만 올라가고 페이즈가 안 넘어간다.
    recap: ["Enter", ...Array.from({ length: 24 }, () =>
      [" ", [860, 579] as [number, number], " ", "tick", " "]).flat()],
  };
  for (const step of steps[go ?? ""] ?? []) {
    // 이름 화면의 Enter 는 `key` 가 아니라 `submitName` 이다 — IME 때문에 갈렸다
    if (step === "tick") game.update(0.1);
    else if (step === "Enter" && game.phase === "name") game.submitName();
    else if (typeof step === "string") game.key(step);
    // 클릭은 **그려진 뒤에만** 먹는다 — 히트 영역이 draw 에서 쌓인다
    else { game.draw(ctx); game.click(...step); }
  }
  // `&t=` 로 시각을 고정한다. `--virtual-time-budget` 은 시계를 빨리 감아서
  // 경주가 순식간에 끝나버린다 — 달리는 중을 찍으려면 시계를 멈춰야 한다.
  const t = q.get("t");
  if (t !== null) {
    (game as unknown as { raceT: number }).raceT = Number(t);
    game.update = () => {};
  }
}

// ── 이름 입력 ──────────────────────────────────────────────────────────────
// `<input>` 을 화면 밖으로 치우지 않고 **캔버스 위에 투명하게** 겹친다 —
// 밖으로 치우면 모바일에서 키보드가 화면을 스크롤시키고 포커스가 튄다.
Object.assign(nameInput.style, {
  position: "fixed", left: "0", top: "0", width: "1px", height: "1px",
  opacity: "0", border: "0", padding: "0", background: "transparent",
  color: "transparent", caretColor: "transparent", outline: "none",
  // iOS 는 16px 미만이면 입력 시 화면을 확대한다
  fontSize: "16px",
} as CSSStyleDeclaration);

nameInput.value = game.horse.name;
// `input` 은 IME 조합이 끝난 뒤에도, 조합 중에도 현재 문자열을 준다.
// 조합 중인 글자까지 그대로 보여주는 것이 맞다 — 타이핑이 화면에 즉시 보여야 한다.
nameInput.addEventListener("input", () => {
  game.setName(nameInput.value);
  // 상한을 넘겨 잘렸으면 입력창도 맞춘다. 안 그러면 안 보이는 글자가 남는다
  if (nameInput.value !== game.horse.name) nameInput.value = game.horse.name;
});
nameInput.addEventListener("keydown", (e) => {
  // **조합 중 Enter 는 확정이지 제출이 아니다.** 안 막으면 "가"를 확정하려다 판이 시작된다
  if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); game.submitName(); }
});

/** 이름 화면이면 입력을 받고, 아니면 놓는다. 매 프레임 확인한다 — 상태는 게임이 정한다. */
function syncNameInput() {
  const on = game.phase === "name";
  nameInput.disabled = !on;
  if (on && document.activeElement !== nameInput) nameInput.focus({ preventScroll: true });
  if (!on && document.activeElement === nameInput) nameInput.blur();
}
// 캔버스를 눌러도 입력이 살아 있어야 한다
canvas.addEventListener("pointerdown", () => { if (game.phase === "name") nameInput.focus({ preventScroll: true }); });

const at = (e: PointerEvent): [number, number] => {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
};
canvas.addEventListener("pointerdown", (e) => game.click(...at(e)));
// 호버는 승식 설명을 고르지 않고 미리 보는 수단이다
canvas.addEventListener("pointermove", (e) => game.move(...at(e)));
// 스페이스가 페이지를 스크롤시키지 않게 막는다 — nan 에서 반복 지적된 것이다.
// 이름 화면은 `<input>` 이 처리하므로 여기서 손대지 않는다.
addEventListener("keydown", (e) => {
  if (game.phase === "name") return;
  if (e.key === " " || e.key === "Enter" || e.key === "Backspace") e.preventDefault();
  game.key(e.key);
});

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  syncNameInput();
  game.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
