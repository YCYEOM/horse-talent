# 증거 — `npm run evidence`

## 전부 통과

| | 단계 | 명령 | 시간 |
|---|---|---|---|
| ✓ | 검사 | `npm test` | 35.4s |
| ✓ | 빌드 | `npm run build` | 1.3s |
| ✓ | 빌드 격리 | `node scripts/isolated.mjs` | 1.2s |
| ✓ | 실측 | `npx vite-node src/evidence/measure.ts` | 54.9s |
| ✓ | 라이선스 | `node scripts/licenses.mjs` | 0.0s |
| ✓ | AI 사용 기록 | `node scripts/ai-use-log.mjs` | 0.0s |
| ✓ | 화면 | `node scripts/shots.mjs` | 19.3s |


## 어느 소스에서 나왔나

| | |
|---|---|
| 커밋 | `5a93638` |
| 브랜치 | main |
| 소스 트리 | **깨끗하지 않다 — 커밋 안 된 변경 7건**

```
M nan/trace.yaml
 M scripts/shots.mjs
 M src/layout.test.ts
 M src/main.ts
 M src/scenes/game.ts
?? src/records.test.ts
?? src/systems/records.ts
``` |
| node | v24.18.0 |

## 빌드 산출물

| 파일 | SHA-256 (앞 16) | 크기 |
|---|---|---|
| `index-BzDdWWJd.js` | `9c9bd2350fdba653` | 40.8 kB |

## 같이 있는 것

- `measurements.md` — 문서 수치를 지금 코드로 다시 낸 것
- `licenses.md` — 런타임 의존성 0 · 외부 에셋 0
- `screens/` — 페이즈별 화면 (크롬 없으면 `NOT-CAPTURED.md`)

## 마지막 출력

### 검사

```
 ✓ src/balance.test.ts  (18 tests) 30295ms

 Test Files  9 passed (9)
      Tests  179 passed (179)
   Start at  14:41:34
   Duration  34.93s (transform 584ms, setup 0ms, collect 15.39s, tests 58.53s, environment 1ms, prepare 922ms)
```

### 빌드

```
✓ 13 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.66 kB │ gzip:  0.42 kB
dist/assets/index-BzDdWWJd.js  40.15 kB │ gzip: 15.48 kB
✓ built in 148ms
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
