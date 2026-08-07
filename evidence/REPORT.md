# 증거 — `npm run evidence`

## 전부 통과

| | 단계 | 명령 | 시간 |
|---|---|---|---|
| ✓ | 검사 | `npm test` | 38.9s |
| ✓ | 빌드 | `npm run build` | 1.3s |
| ✓ | 빌드 격리 | `node scripts/isolated.mjs` | 1.4s |
| ✓ | 실측 | `npx vite-node src/evidence/measure.ts` | 58.3s |
| ✓ | 라이선스 | `node scripts/licenses.mjs` | 0.1s |
| ✓ | AI 사용 기록 | `node scripts/ai-use-log.mjs` | 0.0s |
| ✓ | 화면 | `node scripts/shots.mjs` | 17.6s |


## 어느 소스에서 나왔나

| | |
|---|---|
| 커밋 | `a2420e7` |
| 브랜치 | main |
| 소스 트리 | **깨끗하지 않다 — 커밋 안 된 변경 16건**

```
M .bass/nan2026/protection-lock.json
 M docs/DECISIONS.md
 M docs/GAME_SPEC.md
 M docs/submission/ai-use-log.yaml
 M nan/gates.yaml
 M src/balance.test.ts
 M src/curve.test.ts
 M src/evidence/measure.ts
 M src/freeze.test.ts
 M src/layout.test.ts
 M src/session.test.ts
 M src/systems/race.ts
 M src/systems/session.ts
?? records/HT-009.json
?? src/systems/scale.ts
?? tasks/HT-009.md
``` |
| node | v24.18.0 |

## 빌드 산출물

| 파일 | SHA-256 (앞 16) | 크기 |
|---|---|---|
| `index-d2xb8OUn.js` | `2ef69dd6b1a48ff3` | 37.2 kB |

## 같이 있는 것

- `measurements.md` — 문서 수치를 지금 코드로 다시 낸 것
- `licenses.md` — 런타임 의존성 0 · 외부 에셋 0
- `screens/` — 페이즈별 화면 (크롬 없으면 `NOT-CAPTURED.md`)

## 마지막 출력

### 검사

```
 ✓ src/balance.test.ts  (18 tests) 33076ms

 Test Files  7 passed (7)
      Tests  155 passed (155)
   Start at  10:07:19
   Duration  38.45s (transform 463ms, setup 1ms, collect 17.29s, tests 64.50s, environment 1ms, prepare 871ms)
```

### 빌드

```
✓ 12 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.66 kB │ gzip:  0.42 kB
dist/assets/index-d2xb8OUn.js  36.54 kB │ gzip: 14.10 kB
✓ built in 143ms
```

### 빌드 격리

```
[isolated] tsc 가 읽은 252개 파일 전부 프로젝트 안에 있다
```

### 실측

```

---

모든 항목이 문서와 맞는다.

[measure] evidence/measurements.md · 어긋남 0건
```

### 라이선스

```
[licenses] evidence/licenses.md · 런타임 0 · 개발 5
```

### AI 사용 기록

```
[ai-use-log] docs/submission/ai-use-log.yaml · 9건
```

### 화면

```
[shots] 1-name.png
[shots] 2-stable.png
[shots] 3-window.png
[shots] 4-track.png
[shots] 5-track-finish.png
[shots] 6-settle.png
```
