# 증거 — `npm run evidence`

## 전부 통과

| | 단계 | 명령 | 시간 |
|---|---|---|---|
| ✓ | 검사 | `npm test` | 41.7s |
| ✓ | 빌드 | `npm run build` | 1.5s |
| ✓ | 빌드 격리 | `node scripts/isolated.mjs` | 1.4s |
| ✓ | 실측 | `npx vite-node src/evidence/measure.ts` | 58.7s |
| ✓ | 라이선스 | `node scripts/licenses.mjs` | 0.1s |
| ✓ | AI 사용 기록 | `node scripts/ai-use-log.mjs` | 0.1s |
| ✓ | 화면 | `node scripts/shots.mjs` | 18.9s |


## 어느 소스에서 나왔나

| | |
|---|---|
| 커밋 | `ddca11e` |
| 브랜치 | main |
| 소스 트리 | **깨끗하지 않다 — 커밋 안 된 변경 5건**

```
M evidence/measurements.md
 M src/layout.test.ts
 M src/race.test.ts
 M src/scenes/game.ts
 M src/systems/race.ts
``` |
| node | v24.18.0 |

## 빌드 산출물

| 파일 | SHA-256 (앞 16) | 크기 |
|---|---|---|
| `index-C6rg6FYy.js` | `ae116f2099ca5082` | 38.3 kB |

## 같이 있는 것

- `measurements.md` — 문서 수치를 지금 코드로 다시 낸 것
- `licenses.md` — 런타임 의존성 0 · 외부 에셋 0
- `screens/` — 페이즈별 화면 (크롬 없으면 `NOT-CAPTURED.md`)

## 마지막 출력

### 검사

```
 ✓ src/balance.test.ts  (18 tests) 35400ms

 Test Files  8 passed (8)
      Tests  166 passed (166)
   Start at  14:29:13
   Duration  41.15s (transform 451ms, setup 0ms, collect 19.67s, tests 69.46s, environment 1ms, prepare 853ms)
```

### 빌드

```
✓ 12 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.66 kB │ gzip:  0.42 kB
dist/assets/index-C6rg6FYy.js  37.59 kB │ gzip: 14.56 kB
✓ built in 165ms
```

### 빌드 격리

```
[isolated] tsc 가 읽은 253개 파일 전부 프로젝트 안에 있다
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
