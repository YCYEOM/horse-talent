# 증거 — `npm run evidence`

## 전부 통과

| | 단계 | 명령 | 시간 |
|---|---|---|---|
| ✓ | 검사 | `npm test` | 44.6s |
| ✓ | 빌드 | `npm run build` | 1.6s |
| ✓ | 빌드 격리 | `node scripts/isolated.mjs` | 1.5s |
| ✓ | 실측 | `npx vite-node src/evidence/measure.ts` | 68.0s |
| ✓ | 라이선스 | `node scripts/licenses.mjs` | 0.0s |
| ✓ | AI 사용 기록 | `node scripts/ai-use-log.mjs` | 0.0s |
| ✓ | 화면 | `node scripts/shots.mjs` | 21.3s |


## 어느 소스에서 나왔나

| | |
|---|---|
| 커밋 | `e49b4c7` |
| 브랜치 | main |
| 소스 트리 | **깨끗하지 않다 — 커밋 안 된 변경 6건**

```
M docs/DECISIONS.md
 M docs/GAME_SPEC.md
 M src/records.test.ts
 M src/scenes/game.ts
 M src/systems/records.ts
?? worker/
``` |
| node | v24.18.0 |

## 빌드 산출물

| 파일 | SHA-256 (앞 16) | 크기 |
|---|---|---|
| `index-yxvXVscy.js` | `0b9b9842d0e2ce29` | 42.1 kB |

## 같이 있는 것

- `measurements.md` — 문서 수치를 지금 코드로 다시 낸 것
- `licenses.md` — 런타임 의존성 0 · 외부 에셋 0
- `screens/` — 페이즈별 화면 (크롬 없으면 `NOT-CAPTURED.md`)

## 마지막 출력

### 검사

```
 ✓ src/balance.test.ts  (18 tests) 37818ms

 Test Files  9 passed (9)
      Tests  183 passed (183)
   Start at  15:05:16
   Duration  43.97s (transform 648ms, setup 0ms, collect 21.20s, tests 74.15s, environment 1ms, prepare 904ms)
```

### 빌드

```
✓ 13 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.66 kB │ gzip:  0.41 kB
dist/assets/index-yxvXVscy.js  41.39 kB │ gzip: 16.02 kB
✓ built in 185ms
```

### 빌드 격리

```
[isolated] tsc 가 읽은 255개 파일 전부 프로젝트 안에 있다
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
[shots] 2-stable.png
[shots] 3-window.png
[shots] 4-track.png
[shots] 5-track-finish.png
[shots] 6-settle.png
[shots] 7-recap.png
```
