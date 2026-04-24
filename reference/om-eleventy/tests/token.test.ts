import { describe, it, expect } from "vitest";
import { issueFeedToken, verifyFeedToken } from "../worker/src/lib/token.js";

describe("feed token", () => {
  const key = "test-signing-key-at-least-32-characters-long";
  const uuid = "0194d9c3-aaaa-bbbb-cccc-1234567890ab";
  const plan = "price_monthly_123";

  it("is deterministic for a given (uuid, plan, key)", async () => {
    const a = await issueFeedToken(key, uuid, plan);
    const b = await issueFeedToken(key, uuid, plan);
    expect(a).toBe(b);
  });

  it("differs when the plan changes", async () => {
    const a = await issueFeedToken(key, uuid, "price_a");
    const b = await issueFeedToken(key, uuid, "price_b");
    expect(a).not.toBe(b);
  });

  it("differs when the uuid changes", async () => {
    const a = await issueFeedToken(key, uuid, plan);
    const b = await issueFeedToken(key, uuid + "x", plan);
    expect(a).not.toBe(b);
  });

  it("differs when the signing key changes", async () => {
    const a = await issueFeedToken(key, uuid, plan);
    const b = await issueFeedToken(key + "x", uuid, plan);
    expect(a).not.toBe(b);
  });

  it("verifies the correct token", async () => {
    const t = await issueFeedToken(key, uuid, plan);
    await expect(verifyFeedToken(key, t, uuid, plan)).resolves.toBe(true);
  });

  it("rejects a tampered token", async () => {
    const t = await issueFeedToken(key, uuid, plan);
    const tampered = t.slice(0, -1) + (t.endsWith("A") ? "B" : "A");
    await expect(verifyFeedToken(key, tampered, uuid, plan)).resolves.toBe(
      false,
    );
  });

  it("produces base64url output (no +, /, =)", async () => {
    const t = await issueFeedToken(key, uuid, plan);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
