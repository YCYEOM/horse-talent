// **한글 이름 입력.** 캔버스가 `keydown` 을 직접 받으면 IME 조합이 안 되어
// "가나" 가 "ㄱㅏㄴㅏ" 로 들어간다 — 사용자가 화면에서 발견했다.
//
// 조합은 브라우저만 할 수 있으므로 여기서는 **경계**를 검사한다:
// `setName` 이 완성된 문자열을 통째로 받고, `key` 는 이름 화면에서 손대지 않는다.
import { describe, it, expect } from "vitest";
import { Game } from "./scenes/game";

describe("이름 입력 — IME 가 조합한 결과만 받는다", () => {
  it("완성된 한글을 그대로 받는다", () => {
    const g = new Game(1);
    g.setName("번개크라운");
    expect(g.horse.name).toBe("번개크라운");
  });

  /**
   * **한 글자씩 이어붙이지 않는다.** 옛 코드는 `key(k)` 로 한 자씩 붙였고,
   * 한글 `keydown` 은 조합 중인 낱자를 주므로 "ㄱㅏㄴㅏ" 가 됐다.
   */
  it("이름 화면에서 `key` 는 이름을 안 건드린다 — 낱자가 새어들 자리가 없다", () => {
    const g = new Game(1);
    g.setName("가나");
    for (const k of ["ㄱ", "ㅏ", "ㄴ", "ㅏ", "a", " "]) g.key(k);
    expect(g.horse.name).toBe("가나");
  });

  it("글자 수를 **코드포인트**로 센다 — 자르다가 글자를 깨지 않는다", () => {
    const g = new Game(1);
    g.setName("가".repeat(20));
    expect([...g.horse.name].length).toBe(Game.MAX_NAME);
    // 이모지는 UTF-16 두 칸이다. `slice` 로 자르면 반쪽이 남는다
    g.setName("🐎".repeat(20));
    expect([...g.horse.name].length).toBe(Game.MAX_NAME);
    expect(g.horse.name.endsWith("🐎")).toBe(true);
  });

  it("빈 이름으로는 시작하지 못한다", () => {
    const g = new Game(1);
    g.setName("   ");
    expect(g.submitName()).toBe(false);
    expect(g.phase).toBe("name");
    g.setName("샛별");
    expect(g.submitName()).toBe(true);
    expect(g.phase).not.toBe("name");
  });

  it("이름 화면을 벗어나면 이름이 안 바뀐다", () => {
    const g = new Game(1);
    g.setName("샛별"); g.submitName();
    g.setName("바뀌면안됨");
    expect(g.horse.name).toBe("샛별");
  });
});
