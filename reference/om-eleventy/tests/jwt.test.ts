import { describe, it, expect } from "vitest";
import { signOmJwt, verifyOmJwt } from "../worker/src/lib/jwt.js";
import type { EntitlementView } from "../worker/src/types.js";

describe("JWT issuance and verification", () => {
  const signingKey = "test-jwt-key-at-least-32-characters-long";
  const issuer = "https://publisher.example";
  const audience = "https://publisher.example";
  const entitlement: EntitlementView = {
    tier_id: "paid",
    features: ["full-text", "archive"],
    is_active: true,
    status: "active",
  };

  const base = {
    signingKey,
    issuer,
    audience,
    subject: "member-uuid",
    lifetimeSeconds: 300,
    entitlement,
  };

  it("round-trips a signed token", async () => {
    const t = await signOmJwt(base);
    const decoded = await verifyOmJwt({
      signingKey,
      issuer,
      audience,
      token: t,
    });
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe("member-uuid");
    expect(decoded?.tier_id).toBe("paid");
    expect(decoded?.entitlements).toEqual(["full-text", "archive"]);
  });

  it("rejects a token signed with a different key", async () => {
    const t = await signOmJwt(base);
    const decoded = await verifyOmJwt({
      signingKey: signingKey + "x",
      issuer,
      audience,
      token: t,
    });
    expect(decoded).toBeNull();
  });

  it("rejects an expired token", async () => {
    const now = Date.now();
    const t = await signOmJwt({
      ...base,
      now: now - 10 * 60 * 1000,
    });
    const decoded = await verifyOmJwt({
      signingKey,
      issuer,
      audience,
      token: t,
      now,
    });
    expect(decoded).toBeNull();
  });

  it("rejects mismatched issuer", async () => {
    const t = await signOmJwt(base);
    const decoded = await verifyOmJwt({
      signingKey,
      issuer: "https://other.example",
      audience,
      token: t,
    });
    expect(decoded).toBeNull();
  });

  it("rejects mismatched audience", async () => {
    const t = await signOmJwt(base);
    const decoded = await verifyOmJwt({
      signingKey,
      issuer,
      audience: "https://other.example",
      token: t,
    });
    expect(decoded).toBeNull();
  });
});
