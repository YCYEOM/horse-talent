# 증거 — `npm run evidence`

## 전부 통과

| | 단계 | 명령 | 시간 |
|---|---|---|---|
| ✓ | 검사 | `npm test` | 45.8s |
| ✓ | 빌드 | `npm run build` | 1.6s |
| ✓ | 실측 | `npx vite-node src/evidence/measure.ts` | 43.4s |
| ✓ | 라이선스 | `node scripts/licenses.mjs` | 0.1s |
| ✓ | AI 사용 기록 | `node scripts/ai-use-log.mjs` | 0.1s |
| ✓ | 화면 | `node scripts/shots.mjs` | 18.2s |


## 어느 소스에서 나왔나

| | |
|---|---|
| 커밋 | `b37253b` |
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
 ✓ src/balance.test.ts  (18 tests) 39032ms

 Test Files  7 passed (7)
      Tests  148 passed (148)
   Start at  01:52:20
   Duration  45.25s (transform 463ms, setup 0ms, collect 14.85s, tests 76.40s, environment 1ms, prepare 767ms)
```

### 빌드

```
✓ 11 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.66 kB │ gzip:  0.42 kB
dist/assets/index-B4WUz145.js  36.40 kB │ gzip: 14.01 kB
✓ built in 193ms
```

### 실측

```

---

모든 항목이 문서와 맞는다.

[measure] evidence/measurements.md · 어긋남 0건
```

### 라이선스

```
[licenses] evidence/licenses.md · 런타임 0 · 개발 4
```

### AI 사용 기록

```
[ai-use-log] docs/submission/ai-use-log.yaml · 7건
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
