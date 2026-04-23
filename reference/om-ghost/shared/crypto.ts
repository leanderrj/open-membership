/**
 * Runtime-agnostic cryptography helpers.
 *
 * Node 20+ exposes `globalThis.crypto.subtle` (the Web Crypto API),
 * as do Cloudflare Workers and Bun. Using Web Crypto — rather than
 * `node:crypto` — keeps `shared/` free of Node-only imports.
 */

const encoder = new TextEncoder();

/** HMAC-SHA256 returning a raw bytes buffer. */
export async function hmacSha256(
  keyBytes: Uint8Array,
  message: Uint8Array | string,
): Promise<Uint8Array> {
  const data = typeof message === "string" ? encoder.encode(message) : message;
  const key = await crypto.subtle.importKey(
    "raw",
    bufferSource(keyBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, bufferSource(data));
  return new Uint8Array(sig);
}

/** Constant-time equality for Uint8Array or strings. */
export function timingSafeEqual(
  a: Uint8Array | string,
  b: Uint8Array | string,
): boolean {
  const ba = typeof a === "string" ? encoder.encode(a) : a;
  const bb = typeof b === "string" ? encoder.encode(b) : b;
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export function base64UrlEncode(bytes: Uint8Array | string): string {
  const buf = typeof bytes === "string" ? encoder.encode(bytes) : bytes;
  let binary = "";
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]!);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function utf8(s: string): Uint8Array {
  return encoder.encode(s);
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("hex length must be even");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * TypeScript narrowing workaround: crypto.subtle accepts BufferSource
 * but our Uint8Arrays sometimes widen. This is a no-op cast.
 */
function bufferSource(u: Uint8Array): ArrayBuffer {
  // Copy to a dedicated ArrayBuffer so the SubtleCrypto impl doesn't
  // see a view over a shared buffer (important for some runtimes).
  const buf = new ArrayBuffer(u.byteLength);
  new Uint8Array(buf).set(u);
  return buf;
}
