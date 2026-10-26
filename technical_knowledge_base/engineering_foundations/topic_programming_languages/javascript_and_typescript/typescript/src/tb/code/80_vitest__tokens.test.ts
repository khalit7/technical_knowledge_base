import { describe, expect, expectTypeOf, it } from "vitest";
import { countTokens, perUser } from "./tokens.ts";

describe("countTokens", () => {
  it("counts whitespace-separated words", () => {
    expect(countTokens("the cat  sat")).toBe(3);
  });
  it("returns 0 for blank text", () => {
    expect(countTokens("   ")).toBe(0);
  });
});
describe("perUser", () => {
  it("sums per user", () => {
    const m = perUser([{ user: "ana", text: "a b" }, { user: "bo", text: "c" }, { user: "ana", text: "d" }]);
    expect(Object.fromEntries(m)).toEqual({ ana: 3, bo: 1 });
  });
  it("has the declared types", () => {
    expectTypeOf(perUser).returns.toEqualTypeOf<Map<string, number>>();
  });
  it("splits punctuation off (deliberately failing: it does not)", () => {
    expect(countTokens("Hello, world!")).toBe(4);
  });
});
