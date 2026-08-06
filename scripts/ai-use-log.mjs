// `records/HT-*.json` → `docs/submission/ai-use-log.yaml`.
// **손으로 안 쓴다.** 손으로 쓰면 다음 작업에서 안 따라오고, 그러면 제출 문서가 곧 거짓이 된다.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const q = (s) => JSON.stringify(String(s ?? ""));
const list = (arr, ind) => (arr?.length
  ? "\n" + arr.map((v) => `${ind}- ${q(v)}`).join("\n") : " []");

const ids = readdirSync("records").filter((f) => f.endsWith(".json")).sort();
const entries = ids.map((f) => {
  const d = JSON.parse(readFileSync(`records/${f}`, "utf8"));
  const ev = d.verification?.evaluations_run ?? [];
  const models = (d.models_used ?? []).map((m) => m.actual_model).filter(Boolean);
  return `  - task: ${q(d.task_id)}
    timestamp: ${q(d.human_approval?.at ?? "")}
    agent: ${q([...new Set(models)].join(", ") || "unknown")}
    prompt_or_goal: ${q(d.why)}
    suggestion: ${q(d.summary_of_changes)}
    human_change: ${q(d.human_approval?.notes ?? "")}
    human_approval: ${d.human_approval?.approved === true}
    files:${list(d.files_changed, "      ")}
    tests:${list(ev.filter((e) => e.status === "pass").map((e) => e.name), "      ")}
    not_verified:${list(d.verification?.not_verified, "      ")}
    known_limitations:${list(d.known_limitations, "      ")}`;
});

writeFileSync("docs/submission/ai-use-log.yaml", `# AI 사용 기록 — **생성물이다. 직접 고치지 마라.**
#
# \`node scripts/ai-use-log.mjs\` 가 \`records/HT-*.json\` 에서 만든다.
# 손으로 쓰면 다음 작업에서 안 따라오고, 제출 문서가 조용히 거짓이 된다.
# 내용을 바꾸려면 run record 를 고치고 다시 돌려라.
#
# 모든 코드는 AI 에이전트가 작성했고 사람이 작업 단위로 승인했다.
# 승인 문구는 각 항목의 human_change 에 원문 그대로 있다.

generated_from: records/
entries:
${entries.join("\n")}
`);
console.log(`[ai-use-log] docs/submission/ai-use-log.yaml · ${entries.length}건`);
