// 페이즈별 화면을 찍는다. **크롬이 없으면 건너뛰되 그렇게 적는다** — 조용히 빠지면
// "화면 증거가 있다"고 읽힌다.
//
// 캔버스 게임은 헤드리스로 화면을 볼 수가 없어서 배치 겹침을 매번 사람이 먼저
// 발견했다(HT-007 에서 9건). `?go=` / `?t=` 개발 진입이 그걸 막으려고 있는 것이다.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "evidence/screens";
// `t` 는 경주 시각 고정. `--virtual-time-budget` 이 시계를 빨리 감아서
// 안 주면 트랙이 매번 정산 화면으로 넘어가 버린다.
// **시드를 고정한다.** 안 하면 말 이름과 출주표가 매번 달라져 증거 화면이
// 실행마다 바뀐다 — 재현되는 증거가 아니게 된다.
// `t` 는 시각 고정. 이름 화면에서는 커서 깜빡임까지 멈춘다.
const SEED = 20260807;
const SHOTS = [
  { name: "1-name", q: `?seed=${SEED}&t=0` },
  { name: "2-stable", q: `?seed=${SEED}&go=stable&t=0` },
  { name: "3-window", q: `?seed=${SEED}&go=window&t=0` },
  { name: "4-track", q: `?seed=${SEED}&go=track&t=3.0` },
  { name: "5-track-finish", q: `?seed=${SEED}&go=track&t=6.5` },
  { name: "6-settle", q: `?seed=${SEED}&go=settle&t=0` },
  // 결산은 지금까지 안 찍었다 — 그래서 순위 카드가 요약을 덮는 것을 사람이 먼저 봤다
  { name: "7-recap", q: `?seed=${SEED}&go=recap` },
];

mkdirSync(OUT, { recursive: true });
if (!existsSync(CHROME)) {
  writeFileSync(`${OUT}/NOT-CAPTURED.md`,
    `# 화면 증거 없음\n\n헤드리스 크롬을 못 찾았다: \`${CHROME}\`\n\n` +
    "`npm run dev` 로 띄우고 직접 보거나, 크롬을 설치하고 `npm run evidence` 를 다시 돌린다.\n");
  console.log("[shots] 크롬 없음 — 건너뛰고 evidence/screens/NOT-CAPTURED.md 에 적었다");
  process.exit(0);
}

// 개발 서버는 `?go=` 를 위해 필요하다 — 프로덕션 빌드에서는 그 진입이 빠진다.
//
// **포트를 고정하지 않는다.** 4271 에 `--strictPort` 로 물려 있었는데,
// 이전 실행의 vite 가 아직 안 죽었으면 즉시 실패했다 —
// 증거 실행이 **가끔 실패**했고 다음 번엔 통과했다. 그런 증거는 증거가 아니다.
// vite 가 빈 포트를 고르게 두고 **실제로 뜬 주소를 읽는다.**
const dev = spawn("npx", ["vite", "--port", "0"], { stdio: ["ignore", "pipe", "pipe"] });
const stop = () => { try { dev.kill(); } catch {} };
process.on("exit", stop);

const base = await new Promise((resolve) => {
  let buf = "";
  const done = setTimeout(() => resolve(null), 30000);
  const scan = (chunk) => {
    buf += chunk;
    const m = buf.match(/https?:\/\/localhost:(\d+)\//);
    if (m) { clearTimeout(done); resolve(`http://localhost:${m[1]}`); }
  };
  dev.stdout.on("data", scan);
  dev.stderr.on("data", scan);
});

if (!base) { stop(); throw new Error("개발 서버 주소를 못 읽었다"); }
for (let i = 0; ; i++) {
  try { await fetch(`${base}/`); break; } catch {}
  if (i > 40) { stop(); throw new Error(`개발 서버가 안 뜬다: ${base}`); }
  await new Promise((r) => setTimeout(r, 250));
}
console.log(`[shots] 개발 서버 ${base}`);

for (const s of SHOTS) {
  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    "--window-size=1000,700", `--screenshot=${OUT}/${s.name}.png`,
    "--virtual-time-budget=3000", `${base}/${s.q}`,
  ], { stdio: "ignore" });
  console.log(`[shots] ${s.name}.png`);
}
stop();
