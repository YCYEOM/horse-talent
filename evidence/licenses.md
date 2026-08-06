# 라이선스

`npm run evidence` 가 `package.json` 과 `node_modules` 에서 만든다. 손으로 안 적는다.

## 런타임 의존성 — **0개**

없다. 브라우저 캔버스와 표준 라이브러리뿐이다.

## 외부 에셋 — **0개**

말·트랙·UI 전부 코드로 그린다(`src/ui/`). 폰트도 시스템 폰트만 쓴다.

2026-08-07 에 트랙만 CC0 픽셀 스프라이트를 써봤다가 되돌렸다 — 커밋 `9db4f41` 에 남아 있다.
지금 저장소에 외부에서 받은 파일은 없다.

## 개발 의존성

| 이름 | 버전 | 라이선스 |
|---|---|---|
| `bass-platform` | file:tools/bass-platform-0.2.1.tgz | UNLICENSED |
| `typescript` | ^5.4.0 | Apache-2.0 |
| `vite` | ^5.2.0 | MIT |
| `vitest` | ^1.5.0 | MIT |

빌드 산출물(`dist/`)에는 위 넷 중 아무것도 안 들어간다 — 전부 빌드 도구다.
