# horse-talent

한 판 **10~20분**짜리 게임을 만든다. nan(한 판 30초~2분)의 자매 프로젝트이고,
BASS 하네스와 작업 규율은 같지만 **게이트는 다르다.**

## 지금 상태

**컨셉 없음.** 셋업만 끝났다. `nan2026.yaml` 이 concept 에 사람 승인을 요구하므로
승인 전에는 구현을 시작하지 않는다. `src/main.ts` 는 진입점 자리만 잡아둔 것이다.

## 규칙이 어디 있는가

| 무엇 | 어디 |
|---|---|
| 에이전트 행동 규칙 | `AGENTS.md` → `bass compose --role <role>` (원문은 `../bass-platform`) |
| 작업 흐름 · 승인 · 증거 | `nan/AGENT_WORKFLOW.md` |
| **이 프로젝트의 게이트** | `nan/gates.yaml` ← **먼저 읽어라** |
| 화면 규칙 | `DESIGN.md` |
| 게임 명세 · 결정 기록 | `docs/GAME_SPEC.md` · `docs/DECISIONS.md` |
| 사슬(주제→증거) | `nan/trace.yaml` |

**규칙 원문을 이 저장소에 복사하지 않는다.** `../bass-platform` 이 단일 진실 원천이다.

## nan 과 무엇이 다른가

같은 것 — BASS 하네스 전부(컨셉 승인 · trace · evidence · run record · 세션 보호),
작업 게이트, 리뷰어 필수, 동시 활성 작업 1개, 쇼츠각 4항목 평가.

다른 것 — **게이트의 의미**다. `nan/gates.yaml` 에 재정의를 적어뒀다.

| | nan | horse-talent |
|---|---|---|
| 한 판 | 30초~2분 | **10~20분** |
| 세로 조각 | 게임 전체가 6시간 | **첫 3분**이 6시간 |
| 한 문장 루프 | 게임 전체 | **핵심 루프**만 |
| 마감 | 48시간 잼 (T+6~T+42) | 마일스톤 M1~M5 (시계가 아니라 산출물) |
| 채점 축 | 5개 | 6개 — **`arcQuality` 추가**(후반이 초반의 반복이 아닌가) |
| 추가 게이트 | — | `projectGates` 5개 — 긴 판에서만 생기는 실패를 막는다 |

## 이 프로젝트의 1번 위험

**후반이 초반의 반복이 되는 것.** 30초 게임은 반복이어도 되지만 15분은 낭비가 된다.
`projectGates.curve-not-repetition` 과 채점 축 `arcQuality` 가 같은 것을 두 번 묻는다.

두 번째 위험은 **길이를 콘텐츠로 채우는 것**이다. 스테이지·적 종류를 늘려 15분을
만들면 이 팀 규모에서 죽는다. 길이는 **상태 공간**에서 나와야 한다
(`projectGates.length-from-state-not-content`).

## 개발

```
npm install
npm run dev      # vite
npm test         # vitest
npm run build    # tsc + vite build
```

## 다음 할 일

1. 주제를 정한다.
2. 6축으로 컨셉 후보를 여러 개 만들고 **하드게이트 7 + projectGates 5** 로 거른다.
   - `nan/concepts/CON-001.yaml` 은 `bass create` 가 만든 **빈 템플릿**이다.
     첫 실제 컨셉이 그 자리를 덮는다.
3. 사람 승인을 받는다(`approvedBy`). 승인 전에 구현 금지.
4. M1 — 첫 3분을 플레이 가능하게 만든다.
