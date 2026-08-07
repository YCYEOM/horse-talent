# horse-talent

**▶ 플레이 — https://ycyeom.github.io/horse-talent/**

경마 게임. **내 말을 강화하고, 그 결과는 나만 알고, 그 차이로 마권을 산다.**
관중은 내 말의 지난 성적만 보므로 배당이 실제 실력을 못 따라온다 — 그 틈이 이 게임의
유일한 이득 원천이다. 한 판 12경주, 약 10분.

nan(한 판 30초~2분)의 자매 프로젝트이고 BASS 하네스와 작업 규율은 같지만
**게이트는 다르다** — 긴 판에서만 생기는 실패를 막는 게이트가 따로 있다.

## 지금 상태

**M5(출하) 진행 중.** M1~M4 완료 — 첫 3분 · 한 판 전체 · 곡선 · 동결.
검사 148개 / 7파일. 런타임 의존성 0, 외부 에셋 0 (아트는 전부 코드로 그린다).

## 숫자를 믿지 말고 재봐라

```
npm install
npm run evidence     # 검사·빌드·격리·실측·라이선스·AI기록·화면
```

`evidence/` 에 결과가 쌓인다. **`measurements.md` 는 문서가 주장하는 값과
지금 코드가 내는 값을 나란히 찍고, 어긋나면 ⚠ 를 붙인다** — 그때 낡은 것은 문서다.
중간에 실패하면 거기서 멈추고 안 돈 단계가 `REPORT.md` 에 남는다.

| | |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm test` | 검사 148개 |
| `npm run evidence` | 위 전부 + 증거 산출 |

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
