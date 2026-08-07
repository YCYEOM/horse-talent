# 증거 — `npm run evidence`

## 전부 통과

| | 단계 | 명령 | 시간 |
|---|---|---|---|
| ✓ | 검사 | `npm test` | 34.5s |
| ✓ | 빌드 | `npm run build` | 1.2s |
| ✓ | 빌드 격리 | `node scripts/isolated.mjs` | 1.2s |
| ✓ | 실측 | `npx vite-node src/evidence/measure.ts` | 34.0s |
| ✓ | 라이선스 | `node scripts/licenses.mjs` | 0.0s |
| ✓ | AI 사용 기록 | `node scripts/ai-use-log.mjs` | 0.0s |
| ✓ | 화면 | `node scripts/shots.mjs` | 16.9s |


## 어느 소스에서 나왔나

| | |
|---|---|
| 커밋 | `2a81ad6` |
| 브랜치 | main |
| 소스 트리 | **깨끗하지 않다 — 커밋 안 된 변경 5건**

```
M .bass/nan2026/protection-lock.json
 M docs/submission/ai-use-log.yaml
 M nan/gates.yaml
 M records/HT-008.json
 M tasks/HT-008.md
``` |
| node | v24.18.0 |

## 빌드 산출물

| 파일 | SHA-256 (앞 16) | 크기 |
|---|---|---|
| `index-BMgG1WvW.js` | `382ebf7c70dde8ec` | 37.1 kB |

## 같이 있는 것

- `measurements.md` — 문서 수치를 지금 코드로 다시 낸 것
- `licenses.md` — 런타임 의존성 0 · 외부 에셋 0
- `screens/` — 페이즈별 화면 (크롬 없으면 `NOT-CAPTURED.md`)

## 마지막 출력

### 검사

```
 ✓ src/balance.test.ts  (18 tests) 29488ms

 Test Files  7 passed (7)
      Tests  148 passed (148)
   Start at  09:32:19
   Duration  33.96s (transform 393ms, setup 0ms, collect 10.69s, tests 56.76s, environment 1ms, prepare 672ms)
```

### 빌드

```
✓ 11 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.66 kB │ gzip:  0.42 kB
dist/assets/index-BMgG1WvW.js  36.43 kB │ gzip: 14.04 kB
✓ built in 134ms
```

### 빌드 격리

```
[isolated] tsc 가 읽은 251개 파일 전부 프로젝트 안에 있다
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
[ai-use-log] docs/submission/ai-use-log.yaml · 8건
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
