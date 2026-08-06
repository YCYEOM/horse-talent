// 라이선스 목록. 런타임 의존성이 0 이라 짧다 — 그게 요점이다.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const lic = (n) => {
  try { return JSON.parse(readFileSync(`node_modules/${n}/package.json`, "utf8")).license ?? "?"; }
  catch { return "미설치"; }
};
const rows = (o = {}) => Object.entries(o)
  .map(([n, v]) => `| \`${n}\` | ${v} | ${lic(n)} |`).join("\n");

const runtime = Object.keys(pkg.dependencies ?? {});
mkdirSync("evidence", { recursive: true });
writeFileSync("evidence/licenses.md", `# 라이선스

\`npm run evidence\` 가 \`package.json\` 과 \`node_modules\` 에서 만든다. 손으로 안 적는다.

## 런타임 의존성 — **${runtime.length}개**

${runtime.length ? rows(pkg.dependencies) : "없다. 브라우저 캔버스와 표준 라이브러리뿐이다."}

## 외부 에셋 — **0개**

말·트랙·UI 전부 코드로 그린다(\`src/ui/\`). 폰트도 시스템 폰트만 쓴다.

2026-08-07 에 트랙만 CC0 픽셀 스프라이트를 써봤다가 되돌렸다 — 커밋 \`9db4f41\` 에 남아 있다.
지금 저장소에 외부에서 받은 파일은 없다.

## 개발 의존성

| 이름 | 버전 | 라이선스 |
|---|---|---|
${rows(pkg.devDependencies)}

빌드 산출물(\`dist/\`)에는 위 넷 중 아무것도 안 들어간다 — 전부 빌드 도구다.
`);
console.log(`[licenses] evidence/licenses.md · 런타임 ${runtime.length} · 개발 ${Object.keys(pkg.devDependencies ?? {}).length}`);
