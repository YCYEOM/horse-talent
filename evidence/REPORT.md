# 증거 — `npm run evidence`

## 전부 통과

| | 단계 | 명령 | 시간 |
|---|---|---|---|
| ✓ | 검사 | `npm test` | 53.5s |
| ✓ | 빌드 | `npm run build` | 2.0s |
| ✓ | 빌드 격리 | `node scripts/isolated.mjs` | 1.8s |
| ✓ | 실측 | `npx vite-node src/evidence/measure.ts` | 65.8s |
| ✓ | 라이선스 | `node scripts/licenses.mjs` | 0.1s |
| ✓ | AI 사용 기록 | `node scripts/ai-use-log.mjs` | 0.1s |
| ✓ | 화면 | `node scripts/shots.mjs` | 18.1s |


## 어느 소스에서 나왔나

| | |
|---|---|
| 커밋 | `a51a379` |
| 브랜치 | main |
| 소스 트리 | **깨끗하지 않다 — 커밋 안 된 변경 6건**

```
M docs/DECISIONS.md
 M docs/GAME_SPEC.md
 M src/evidence/measure.ts
 M src/freeze.test.ts
 M src/session.test.ts
 M src/systems/session.ts
``` |
| node | v24.18.0 |

## 빌드 산출물

| 파일 | SHA-256 (앞 16) | 크기 |
|---|---|---|
| `index-X92XyM7D.js` | `ee8f6b3b575b44b7` | 38.1 kB |

## 같이 있는 것

- `measurements.md` — 문서 수치를 지금 코드로 다시 낸 것
- `licenses.md` — 런타임 의존성 0 · 외부 에셋 0
- `screens/` — 페이즈별 화면 (크롬 없으면 `NOT-CAPTURED.md`)

## 마지막 출력

### 검사

```
 ✓ src/balance.test.ts  (18 tests) 44966ms

 Test Files  8 passed (8)
      Tests  160 passed (160)
   Start at  14:06:52
   Duration  52.75s (transform 718ms, setup 1ms, collect 25.15s, tests 88.18s, environment 2ms, prepare 1.20s)
```

### 빌드

```
✓ 12 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.66 kB │ gzip:  0.42 kB
dist/assets/index-X92XyM7D.js  37.42 kB │ gzip: 14.49 kB
✓ built in 233ms
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
