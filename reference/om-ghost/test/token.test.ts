import { test } from "node:test";
import assert from "node:assert/strict";
import { issueFeedToken, verifyFeedToken } from "../shared/token.js";

test("feed token is deterministic for the same (member, plan)", () => {
  const key = "a".repeat(64);
  const t1 = issueFeedToken(key, "uuid-abc", "price_monthly");
  const t2 = issueFeedToken(key, "uuid-abc", "price_monthly");
  assert.equal(t1, t2);
});

test("feed token changes when plan changes", () => {
  const key = "a".repeat(64);
  const monthly = issueFeedToken(key, "uuid-abc", "price_monthly");
  const yearly = issueFeedToken(key, "uuid-abc", "price_yearly");
  assert.notEqual(monthly, yearly);
});

test("feed token changes when signing key changes", () => {
  const a = issueFeedToken("key-a", "uuid-abc", "p");
  const b = issueFeedToken("key-b", "uuid-abc", "p");
  assert.notEqual(a, b);
});

test("verifyFeedToken accepts correct token", () => {
  const key = "secret";
  const token = issueFeedToken(key, "uuid-abc", "p");
  assert.equal(verifyFeedToken(key, token, "uuid-abc", "p"), true);
});

test("verifyFeedToken rejects mutated token", () => {
  const key = "secret";
  const token = issueFeedToken(key, "uuid-abc", "p");
  const mutated = token.slice(0, -1) + (token.at(-1) === "A" ? "B" : "A");
  assert.equal(verifyFeedToken(key, mutated, "uuid-abc", "p"), false);
});

test("verifyFeedToken rejects wrong member", () => {
  const key = "secret";
  const token = issueFeedToken(key, "uuid-abc", "p");
  assert.equal(verifyFeedToken(key, token, "uuid-xyz", "p"), false);
});
