// 참조 플레이어 — **밸런스의 잣대**.
//
// 이 모형이 얼마나 버는지가 곧 "이 게임이 도는가"의 답이다.
// 사람이 이보다 잘하면 골드가 더 늘고, 못하면 덜 는다.
//
// **검사 파일 안에 있었다.** 그래서 vitest 밖에서는 못 불렀고,
// M1~M4 의 실측 수치가 전부 `/tmp` 의 일회용 스크립트에서 나왔다 —
// 문서에 숫자만 남고 만드는 법이 없었다(HT-008).
// 여기로 옮겨서 **검사와 증거 스크립트가 같은 모형**을 쓴다.

import {
  raceCount, newTally, isBroke, prizeFor, featureRace, isFeature,
  START_GOLD, MIN_BET, type Tally,
} from "./session";
import { buildRace, runRace, crowdBets, settle, truePower, weights, POOLS, type Pool } from "./race";
import { newHorse, forge, forgeCost, canForge, STATS, type StatKey, type Horse } from "./stable";
import { rng } from "../kits/rng";

/**
 * 그럴듯하게 플레이하는 사람. 완벽하지 않다 —
 *  · 다음 경주 거리에 **가장 쓸모 있는 스탯**을 올린다
 *  · 골드가 넉넉하면 강화하고, 빠듯하면 아낀다
 *  · 내 말이 셀 것 같으면 내 말에, 아니면 인기마 연승에 건다
 *
 * **이 모형이 곧 밸런스의 잣대다.** 사람이 이보다 잘하면 골드가 더 늘고, 못하면 덜 는다.
 */
export function playSession(seed: number): Tally {
  const rnd = rng(seed * 99991);
  const races = raceCount(seed);
  const feature = featureRace(seed);
  const horse: Horse = newHorse("실측마");
  let gold = START_GOLD;
  let myForm = 3;
  const t = newTally(races, gold);

  for (let no = 1; no <= races; no++) {
    const race = buildRace(no, horse, seed, isFeature(no, feature) ? feature.distance : undefined);

    // ── 마방 ──────────────────────────────────────────────────────
    // **대상경주 거리를 보고 올린다.** 그것이 G1 을 미리 공개하는 이유다 —
    // 매 경주 랜덤 거리에 반응만 하는 대신 목표에 맞춰 쌓는다.
    //
    // 5종을 다 고려한다. 거리 스탯은 대상경주 가중치, 근성은 고정 가치,
    // **안정은 후반에 값이 오른다**(지킬 것이 생긴다).
    const w = weights(feature.distance);
    const late = no / races;
    const value: Record<StatKey, number> = {
      speed: w.speed, accel: w.accel, stamina: w.stamina,
      grit: 0.30,
      poise: 0.18 + late * 0.35,
    };
    const target = [...STATS]
      .filter((k) => canForge(horse.stats[k]))
      .sort((a, b) => value[b] - value[a])[0] as StatKey | undefined;
    if (target) {
      const cost = forgeCost(horse.stats[target]);
      // 베팅할 돈은 남긴다 — 강화에 다 쓰면 이길 말에 못 건다
      if (gold - cost >= MIN_BET * 2) {
        gold -= cost;
        const res = forge(horse, target, rnd);
        t.forges[res]++;
      }
    }

    // ── 창구 ─────────────────────────────────────────────────────
    const book = crowdBets(race, myForm, seed);
    const res = runRace(race, seed);
    if (!isBroke(gold)) {
      t.acted++;
      const me = race.runners.find((r) => r.mine)!;
      const mine = truePower(me, race.distance);
      const best = Math.max(...race.runners.filter((r) => !r.mine)
        .map((r) => truePower(r, race.distance)));
      // 내 말이 셀 것 같으면 내 말에, 아니면 인기마 연승으로 버틴다
      const pool: Pool = mine > best ? "win" : "place";
      const gate = mine > best
        ? 1
        : race.runners.map((r) => ({ g: r.gate, p: truePower(r, race.distance) }))
            .sort((a, b) => b.p - a.p)[0].g;
      const amount = Math.min(gold, Math.max(MIN_BET, Math.floor(gold * 0.25 / 100) * 100));
      gold -= amount;
      const p = settle(book, { pool, gates: [gate], amount }, res.order);
      gold += p.gold;
      t.bets.placed++;
      if (p.hit) {
        t.bets.hit++;
        if (!t.best || p.gold > t.best.gold) {
          t.best = { race: no, pool: POOLS[pool].name, odds: p.odds, gold: p.gold };
        }
      }
    }

    // **상금** — 내 말이 3착 안에 들면 받는다. 베팅과 성격이 다른 수입이다.
    const place = res.order.indexOf(1);
    const prize = prizeFor(no, place, feature);
    gold += prize; t.prize += prize;
    if (isFeature(no, feature)) t.featurePrize = prize;

    if (t.brokeAt === null && isBroke(gold)) t.brokeAt = no;
    myForm = myForm * 0.4 + truePower(race.runners.find((r) => r.mine)!, race.distance) * 0.6;
  }
  t.gold = gold;
  return t;
}
