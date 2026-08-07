-- 전역 순위. **한 판이 끝나면 한 줄이 쌓인다.**
--
-- `created_at` 이 서버 시각이고 순위의 동점 처리에 이걸 쓴다 —
-- 클라이언트가 보낸 `at` 은 조작할 수 있어서 순서 기준으로 못 쓴다.
CREATE TABLE IF NOT EXISTS runs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,          -- 말 이름. 사람이 입력한 값이라 서버에서 자른다
  gold       INTEGER NOT NULL,          -- 최종 골드. **순위 기준**
  races      INTEGER NOT NULL,
  best_odds  REAL    NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,          -- 서버 시각(ms). 동점이면 **먼저 세운 쪽이 위**
  ip_hash    TEXT                       -- 속도 제한용. 원본 IP 는 안 남긴다
);

-- 순위 질의가 이 순서 그대로다 — 정렬 없이 읽는다
CREATE INDEX IF NOT EXISTS idx_runs_rank ON runs(gold DESC, created_at ASC);
-- 속도 제한이 최근 것만 센다
CREATE INDEX IF NOT EXISTS idx_runs_recent ON runs(ip_hash, created_at);
