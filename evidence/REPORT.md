# 증거 — `npm run evidence`

## **실패했다 — 검사 단계에서 멈췄다**

아래 단계는 안 돌았다. 이 폴더의 나머지 파일은 **이전 실행의 것**일 수 있다.

| | 단계 | 명령 | 시간 |
|---|---|---|---|
| **실패** | 검사 | `npm test` | 43.5s |
| — | 빌드 | `npm run build` | 안 돌았다 |
| — | 실측 | `npx vite-node src/evidence/measure.ts` | 안 돌았다 |
| — | 라이선스 | `node scripts/licenses.mjs` | 안 돌았다 |
| — | AI 사용 기록 | `node scripts/ai-use-log.mjs` | 안 돌았다 |
| — | 화면 | `node scripts/shots.mjs` | 안 돌았다 |

## 어느 소스에서 나왔나

| | |
|---|---|
| 커밋 | `491eac3` |
| 브랜치 | main |
| 작업 트리 | **깨끗하지 않다 — 커밋 안 된 변경이 섞여 있다** |
| node | v24.18.0 |

## 빌드 산출물

| 파일 | SHA-256 (앞 16) | 크기 |
|---|---|---|
| `index-B4WUz145.js` | `c280d7c7c83d847b` | 37.1 kB |

## 같이 있는 것

- `measurements.md` — 문서 수치를 지금 코드로 다시 낸 것
- `licenses.md` — 런타임 의존성 0 · 외부 에셋 0
- `screens/` — 페이즈별 화면 (크롬 없으면 `NOT-CAPTURED.md`)

## 마지막 출력

### 검사

```
      1| import { it, expect } from "vitest";
      2| it("일부러 실패", () => { expect(1).toBe(2); });
       |                                ^
      3| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
```
