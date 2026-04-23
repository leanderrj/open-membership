import { test } from "node:test";
import assert from "node:assert/strict";
import { issueFeedToken, verifyFeedToken } from "../shared/token.js";

test("feed token is deterministic for the same (member, plan)", async () => {
  const key = "a".repeat(64);
  const t1 = await issueFeedToken(key, "uuid-abc", "price_monthly");
  const t2 = await issueFeedToken(key, "uuid-abc", "price_monthly");
  assert.equal(t1, t2);
});

test("feed token changes when plan changes", async () => {
  const key = "a".repeat(64);
  const monthly = await issueFeedToken(key, "uuid-abc", "price_monthly");
  const yearly = await issueFeedToken(key, "uuid-abc", "price_yearly");
  assert.notEqual(monthly, yearly);
});

test("feed token changes when signing key changes", async () => {
  const a = await issueFeedToken("key-a", "uuid-abc", "p");
  const b = await issueFeedToken("key-b", "uuid-abc", "p");
  assert.notEqual(a, b);
});

test("verifyFeedToken accepts correct token", async () => {
  const key = "secret";
  const token = await issueFeedToken(key, "uuid-abc", "p");
  assert.equal(await verifyFeedToken(key, token, "uuid-abc", "p"), true);
});

test("verifyFeedToken rejects mutated token", async () => {
  const key = "secret";
  const token = await issueFeedToken(key, "uuid-abc", "p");
  const last = token.at(-1) ?? "A";
  const mutated = token.slice(0, -1) + (last === "A" ? "B" : "A");
  assert.equal(await verifyFeedToken(key, mutated, "uuid-abc", "p"), false);
});

test("verifyFeedToken rejects wrong member", async () => {
  const key = "secret";
  const token = await issueFeedToken(key, "uuid-abc", "p");
  assert.equal(await verifyFeedToken(key, token, "uuid-xyz", "p"), false);
});
