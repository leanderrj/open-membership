export function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view =
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < view.byteLength; i++) {
    bin += String.fromCharCode(view[i]!);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hmacSha256(
  key: Uint8Array,
  data: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, utf8(data));
}

export function timingSafeEqual(a: string, b: string): boolean {
  // Constant-time only over the common-length prefix; length mismatch
  // returns false but is observable in time. This matches what the Ghost
  // and WordPress references do for feed-token comparison.
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
