// `npm run evidence` — 빌드·검사·실측·화면을 한 번에 돌리고 `evidence/` 에 남긴다.
//
// **중간에 실패하면 멈추고 그 사실을 적는다.** 반쯤 채워진 evidence/ 가 제일 나쁘다 —
// 재현됐다고 읽히기 때문이다. 그래서 REPORT.md 는 언제나 쓰이고, 실패한 단계가 그대로 보인다.
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const STEPS = [
  { id: "test", what: "검사", cmd: "npm test" },
  { id: "build", what: "빌드", cmd: "npm run build" },
  { id: "isolated", what: "빌드 격리", cmd: "node scripts/isolated.mjs" },
  { id: "measure", what: "실측", cmd: "npx vite-node src/evidence/measure.ts" },
  { id: "licenses", what: "라이선스", cmd: "node scripts/licenses.mjs" },
  { id: "ai-log", what: "AI 사용 기록", cmd: "node scripts/ai-use-log.mjs" },
  { id: "shots", what: "화면", cmd: "node scripts/shots.mjs" },
];

mkdirSync("evidence", { recursive: true });
const results = [];
let stopped = null;

for (const s of STEPS) {
  process.stdout.write(`[evidence] ${s.what} … `);
  const t0 = Date.now();
  try {
    const out = execSync(s.cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    results.push({ ...s, ok: true, secs: (Date.now() - t0) / 1000, tail: tail(out) });
    console.log("OK");
  } catch (e) {
    results.push({ ...s, ok: false, secs: (Date.now() - t0) / 1000, tail: tail(`${e.stdout ?? ""}\n${e.stderr ?? ""}`) });
    console.log("실패");
    stopped = s;
    break;                                  // **여기서 멈춘다**
  }
}
function tail(s) { return String(s).trim().split("\n").slice(-6).join("\n"); }

const git = (c) => { try { return execSync(c, { encoding: "utf8" }).trim(); } catch { return "?"; } };
// **`evidence/` 는 빼고 본다.** 증거를 만드는 행위 자체가 그 폴더를 더럽히므로
// 포함하면 보고서가 영원히 "깨끗하지 않다"고 말한다 — 그러면 이 줄이 무의미해진다.
// 묻는 것은 "이 증거가 나온 소스가 커밋된 상태인가" 뿐이다.
const dirtyFiles = git("git status --porcelain")
  .split("\n").filter((l) => l.trim() && !/\sevidence\//.test(` ${l.slice(3)}`));
const dirty = dirtyFiles.length > 0;

// 빌드 산출물 해시 — "이 증거가 어느 빌드에서 나왔나"에 답한다
let bundles = [];
if (existsSync("dist/assets")) {
  bundles = readdirSync("dist/assets").map((f) => ({
    f, sha: createHash("sha256").update(readFileSync(`dist/assets/${f}`)).digest("hex").slice(0, 16),
    kb: (readFileSync(`dist/assets/${f}`).length / 1024).toFixed(1),
  }));
}

const line = (r) => `| ${r.ok ? "✓" : "**실패**"} | ${r.what} | \`${r.cmd}\` | ${r.secs.toFixed(1)}s |`;
writeFileSync("evidence/REPORT.md", `# 증거 — \`npm run evidence\`

${stopped
  ? `## **실패했다 — ${stopped.what} 단계에서 멈췄다**\n\n아래 단계는 안 돌았다. 이 폴더의 나머지 파일은 **이전 실행의 것**일 수 있다.`
  : "## 전부 통과"}

| | 단계 | 명령 | 시간 |
|---|---|---|---|
${results.map(line).join("\n")}
${stopped ? STEPS.slice(results.length).map((s) => `| — | ${s.what} | \`${s.cmd}\` | 안 돌았다 |`).join("\n") : ""}

## 어느 소스에서 나왔나

| | |
|---|---|
| 커밋 | \`${git("git rev-parse --short HEAD")}\` |
| 브랜치 | ${git("git rev-parse --abbrev-ref HEAD")} |
| 소스 트리 | ${dirty ? `**깨끗하지 않다 — 커밋 안 된 변경 ${dirtyFiles.length}건**\n\n\`\`\`\n${dirtyFiles.join("\n")}\n\`\`\`` : "깨끗하다 (`evidence/` 제외)"} |
| node | ${process.version} |

## 빌드 산출물

${bundles.length
  ? "| 파일 | SHA-256 (앞 16) | 크기 |\n|---|---|---|\n" +
    bundles.map((b) => `| \`${b.f}\` | \`${b.sha}\` | ${b.kb} kB |`).join("\n")
  : "없다 — 빌드가 안 돌았다."}

## 같이 있는 것

- \`measurements.md\` — 문서 수치를 지금 코드로 다시 낸 것
- \`licenses.md\` — 런타임 의존성 0 · 외부 에셋 0
- \`screens/\` — 페이즈별 화면 (크롬 없으면 \`NOT-CAPTURED.md\`)

## 마지막 출력

${results.map((r) => `### ${r.what}\n\n\`\`\`\n${r.tail}\n\`\`\``).join("\n\n")}
`);

console.log(`\n[evidence] evidence/REPORT.md — ${stopped ? `${stopped.what} 에서 멈췄다` : "전부 통과"}`);
if (stopped) process.exitCode = 1;
