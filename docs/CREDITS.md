# 외부 에셋 출처

이 프로젝트의 아트는 대부분 코드로 그린다(수작업 콘텐츠 0 —
`projectGates.length-from-state-not-content`). 예외는 아래뿐이다.

## public/horse-run.png — 트랙 말 갤럽 스프라이트

| | |
|---|---|
| 원제 | Pixel Horse |
| 만든이 | **alizard** |
| 출처 | https://opengameart.org/content/pixel-horse |
| 라이선스 | **CC0 1.0** (퍼블릭 도메인) — 표기 의무 **없음** |
| 원본 파일 | `horse_run_cycle_0.png` (2.2 KB) |
| 규격 | 410×66 · 82×66 프레임 5장 · 오른쪽을 본다 |
| 받은 날 | 2026-08-07 |

CC0 라 표기하지 않아도 되지만 **어디서 왔는지는 남긴다** —
나중에 "이건 우리가 그린 건가"를 아무도 못 답하게 되는 것이 더 비싸다.

### 원본을 그대로 쓰지 못한 두 가지

1. **페이지에 적힌 파일명이 틀리다.** `horse_run_cycle.png` 로 받으면 HTML 이 온다.
   실제 파일은 `horse_run_cycle_0.png` 다.
2. **투명 배경이 아니다.** RGBA 인데 알파가 전부 불투명이라 흰 배경이 딸려 온다.
   `src/ui/sprite.ts` 가 불러올 때 흰색(≥244)을 빼낸다. 파일은 원본 그대로 두었다 —
   가공본을 저장해두면 원본과 대조가 안 된다.

### 안 받은 것

같은 작가의 `horse_idle_cycle.png`(대기 7프레임)과 `horse_idle_smack_cycle.png` 는
받아봤지만 쓰지 않는다. 트랙에서 말은 항상 달리고, 서 있는 말은 벡터로 그린다.
