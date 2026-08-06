// horse-talent 진입점 — 캔버스와 입력만 잇는다. 게임은 `scenes/game.ts` 에 있다.
import { Game, W, H } from "./scenes/game";
import { C } from "./ui/tokens";
import { loadHorseSprite } from "./ui/sprite";

const app = document.getElementById("app")!;
app.innerHTML = `<canvas id="game" width="${W}" height="${H}"></canvas>`;
const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
document.body.style.background = C.bg0;

// 트랙 스프라이트를 미리 받아둔다. 못 받으면 트랙이 벡터 말로 돌아간다
loadHorseSprite();

const game = new Game();

// **개발 전용 — 화면 확인용 진입.** `?go=window` 처럼 주면 그 화면까지 클릭을 대신 눌러준다.
// 캔버스 게임은 헤드리스로 사람이 볼 수가 없어서, 배치 겹침을 매번 사람이 발견했다.
// 이것으로 `chrome --headless --screenshot` 이 페이즈별로 찍힌다. 빌드에는 안 들어간다.
if (import.meta.env.DEV) {
  const go = new URLSearchParams(location.search).get("go");
  const steps: Record<string, (string | [number, number])[]> = {
    stable: ["Enter"],
    window: ["Enter", " "],
    track: ["Enter", " ", [856, 575]],          // 안 걸고
    settle: ["Enter", " ", [856, 575], " "],    // 경주 건너뛰기
  };
  for (const step of steps[go ?? ""] ?? []) {
    if (typeof step === "string") game.key(step);
    // 클릭은 **그려진 뒤에만** 먹는다 — 히트 영역이 draw 에서 쌓인다
    else { game.draw(ctx); game.click(...step); }
  }
  // `&t=` 로 시각을 고정한다. `--virtual-time-budget` 은 시계를 빨리 감아서
  // 경주가 순식간에 끝나버린다 — 달리는 중을 찍으려면 시계를 멈춰야 한다.
  const t = new URLSearchParams(location.search).get("t");
  if (t !== null) {
    (game as unknown as { raceT: number }).raceT = Number(t);
    game.update = () => {};
  }
}

const at = (e: PointerEvent): [number, number] => {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
};
canvas.addEventListener("pointerdown", (e) => game.click(...at(e)));
// 호버는 승식 설명을 고르지 않고 미리 보는 수단이다
canvas.addEventListener("pointermove", (e) => game.move(...at(e)));
// 스페이스가 페이지를 스크롤시키지 않게 막는다 — nan 에서 반복 지적된 것이다
addEventListener("keydown", (e) => {
  if (e.key === " " || e.key === "Enter" || e.key === "Backspace") e.preventDefault();
  game.key(e.key);
});

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
