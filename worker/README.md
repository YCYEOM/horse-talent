# 전역 순위 Worker

게임은 GitHub Pages 의 정적 페이지라 서버가 없다. 여러 사람이 나눠 보는 순위는
어딘가에 쌓여야 하고, 그 어딘가가 여기다.

| | |
|---|---|
| 주소 | https://horse-talent-rank.ycyeom.workers.dev |
| 디비 | Cloudflare D1 `horse-talent` (`87e29420-adcf-4702-be8a-db1797526966`) |
| 계정 | yyc4990@gmail.com |

```
GET  /runs?limit=20   → { runs, total }
POST /runs            → { rank, total, runs, at }
                        { name, gold, races, bestOdds }
```

## 다시 세우려면

```bash
npx wrangler d1 create horse-talent          # database_id 를 wrangler.toml 에
npx wrangler d1 execute horse-talent --remote --file=schema.sql
npx wrangler deploy
npx wrangler secret put IP_SALT              # 선택. 없으면 기본값으로 돈다
```

## 점수는 위조된다

클라이언트만 있는 게임이라 누구든 이 주소로 아무 값이나 보낼 수 있다.
여기서 하는 것은 **장난을 걸러내는 정도**다 —

- 값의 모양과 범위 (음수 · 정수 아님 · 상한 1,000만)
- 이름 길이 10자와 제어문자 제거
- IP 해시 기준 1분 5회

**작정하면 뚫린다.** 진짜로 막으려면 서버가 시드를 받아 경주를 다시 돌리고 결과를
대조해야 하고, 그러려면 게임 로직이 서버에 올라가야 한다. 혼자 하는 게임의
순위표에 그만한 공사를 하지 않기로 했다 — 그 값을 알고 택했다.

## 남는 것

말 이름 · 최종 골드 · 경주 수 · 최고 배당 · 서버 시각.
**IP 는 소금 친 해시 앞 8바이트만** 남긴다 — 속도 제한에 필요한 건 "같은 곳인가"뿐이다.
