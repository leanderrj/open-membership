import { describe, it, expect } from "vitest";
import { hmacSha256 } from "../worker/src/lib/crypto.js";

/**
 * Webhook signature verification is done by stripe-node's
 * constructEventAsync, which we do not unit-test here (it requires the
 * real Stripe SDK wired to Web Crypto). Instead this file asserts the
 * HMAC primitive used to build Stripe-style signatures is available and
 * consistent, which is the layer we own.
 *
 * A full end-to-end webhook test runs against Miniflare with the
 * stripe-mock sidecar; see docs/deploy.md.
 */
describe("webhook signature primitives", () => {
  it("HMAC-SHA256 matches a known-vector", async () => {
    const key = new TextEncoder().encode("key");
    const mac = await hmacSha256(key, "The quick brown fox jumps over the lazy dog");
    const hex = bytesToHex(new Uint8Array(mac));
    expect(hex).toBe(
      "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
    );
  });

  it("produces a different mac for a different payload", async () => {
    const key = new TextEncoder().encode("key");
    const a = bytesToHex(new Uint8Array(await hmacSha256(key, "a")));
    const b = bytesToHex(new Uint8Array(await hmacSha256(key, "b")));
    expect(a).not.toBe(b);
  });
});

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
