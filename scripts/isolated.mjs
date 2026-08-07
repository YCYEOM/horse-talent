// **프로젝트 밖의 타입을 주워 쓰고 있지 않은가.**
//
// TypeScript 는 `node_modules/@types` 를 찾을 때 상위 디렉터리로 계속 올라간다.
// 그래서 홈 폴더(`~/node_modules`)에 남의 `@types/node` 가 있으면 로컬 빌드는 통과하고
// CI 는 깨진다 — 실제로 그렇게 됐다(HT-008). `npm run build` 가 초록불인데
// 재현이 안 되는 상태였고, **증거 보고서는 그걸 통과로 적고 있었다.**
//
// 여기서 막는다: tsc 가 실제로 읽은 파일 중 프로젝트 밖의 것이 하나라도 있으면 실패.
import { execSync } from "node:child_process";

const root = process.cwd();
const files = execSync("npx tsc --noEmit --listFiles", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  .split("\n").map((l) => l.trim()).filter(Boolean);

// TypeScript 자체가 딸려 보내는 lib.*.d.ts 는 어디에 설치되든 상관없다
const outside = files.filter((f) => f.startsWith("/") && !f.startsWith(root + "/"));

if (outside.length) {
  console.error(`[isolated] **프로젝트 밖 타입 ${outside.length}개를 읽고 있다** — 다른 환경에서는 빌드가 깨진다\n`);
  for (const f of outside.slice(0, 10)) console.error(`  ${f}`);
  if (outside.length > 10) console.error(`  … 외 ${outside.length - 10}개`);
  console.error("\n필요한 타입 패키지를 devDependencies 에 선언해라.");
  process.exit(1);
}
console.log(`[isolated] tsc 가 읽은 ${files.length}개 파일 전부 프로젝트 안에 있다`);
