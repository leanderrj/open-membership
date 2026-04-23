import type { MemberState, OmConfig } from "./types.js";
import { featuresForTier, tierForPriceId } from "./config.js";
import { UpstreamError, ConfigError } from "./errors.js";
import { base64UrlEncode, hexToBytes, hmacSha256, utf8 } from "./crypto.js";

/**
 * Ghost Admin API client.
 *
 * Implements the JWT-auth'd REST protocol directly so the same client
 * runs unchanged in Node and in Cloudflare Workers. All signing is
 * done through Web Crypto (shared/crypto.ts), not node:crypto.
 *
 * Reference: https://ghost.org/docs/admin-api/
 */

export interface GhostClientOpts {
  ghostUrl: string;
  /** Admin API key in "id:secret" form, as shown in Ghost Admin. */
  adminKey: string;
  /** Fetch timeout in milliseconds. Default 15s. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class GhostClient {
  private readonly base: string;
  private readonly keyId: string;
  private readonly secretBytes: Uint8Array;
  private readonly timeoutMs: number;

  constructor(opts: GhostClientOpts) {
    this.base = opts.ghostUrl.replace(/\/$/, "") + "/ghost/api/admin";
    const parts = opts.adminKey.split(":");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new ConfigError("GHOST_ADMIN_KEY must be of the form id:secret");
    }
    this.keyId = parts[0];
    try {
      this.secretBytes = hexToBytes(parts[1]);
    } catch {
      throw new ConfigError(
        "GHOST_ADMIN_KEY secret must be a hex-encoded string",
      );
    }
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async getMemberByUuid(uuid: string): Promise<GhostMember | null> {
    const url = `${this.base}/members/?filter=${encodeURIComponent(`uuid:${uuid}`)}&limit=1`;
    const body = await this.get<{ members?: GhostMember[] }>(url);
    return body.members?.[0] ?? null;
  }

  async getMemberByEmail(email: string): Promise<GhostMember | null> {
    const url = `${this.base}/members/?filter=${encodeURIComponent(`email:${email}`)}&limit=1`;
    const body = await this.get<{ members?: GhostMember[] }>(url);
    return body.members?.[0] ?? null;
  }

  async getMemberById(id: string): Promise<GhostMember | null> {
    const url = `${this.base}/members/${encodeURIComponent(id)}/`;
    try {
      const body = await this.get<{ members?: GhostMember[] }>(url);
      return body.members?.[0] ?? null;
    } catch (err) {
      if (err instanceof UpstreamError && /\b404\b/.test(err.message)) return null;
      throw err;
    }
  }

  async *iterateActiveMembers(pageSize = 100): AsyncIterable<GhostMember> {
    let page = 1;
    while (true) {
      const url = `${this.base}/members/?filter=${encodeURIComponent(
        "status:paid",
      )}&limit=${pageSize}&page=${page}`;
      const body = await this.get<{
        members: GhostMember[];
        meta?: { pagination?: { pages?: number } };
      }>(url);
      for (const m of body.members) yield m;
      const pages = body.meta?.pagination?.pages ?? page;
      if (page >= pages) return;
      page++;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.authedFetch(`${this.base}/site/`);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async get<T>(url: string): Promise<T> {
    const res = await this.authedFetch(url);
    if (!res.ok) {
      const bodyText = await safeReadText(res);
      throw new UpstreamError(
        "ghost",
        `${res.status} ${res.statusText}${bodyText ? `: ${truncate(bodyText, 200)}` : ""}`,
      );
    }
    return (await res.json()) as T;
  }

  private async authedFetch(url: string): Promise<Response> {
    const token = await this.signToken();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      return await fetch(url, {
        headers: {
          Authorization: `Ghost ${token}`,
          Accept: "application/json",
        },
        signal: ctrl.signal,
      });
    } catch (err) {
      throw new UpstreamError(
        "ghost",
        err instanceof Error ? err.message : "network error",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async signToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "HS256", typ: "JWT", kid: this.keyId };
    const payload = { iat: now, exp: now + 300, aud: "/admin/" };
    const toSign = `${base64UrlEncode(utf8(JSON.stringify(header)))}.${base64UrlEncode(
      utf8(JSON.stringify(payload)),
    )}`;
    const mac = await hmacSha256(this.secretBytes, toSign);
    return `${toSign}.${base64UrlEncode(mac)}`;
  }
}

/** Derive the om-level MemberState from a Ghost member record + config. */
export function memberStateFromGhost(
  m: GhostMember,
  c: OmConfig,
): MemberState {
  const sub = m.subscriptions?.[0] ?? null;
  const priceId = sub?.price?.id ?? null;
  const tierId = (priceId && tierForPriceId(c, priceId)) ?? "free";
  const features = featuresForTier(c, tierId);

  return {
    id: m.id,
    uuid: m.uuid,
    email: m.email,
    tier_id: tierId,
    subscription_id: sub?.id ?? null,
    subscription_status: (sub?.status as MemberState["subscription_status"]) ?? "none",
    features,
  };
}

export interface GhostMember {
  id: string;
  uuid: string;
  email: string | null;
  name?: string | null;
  status: "free" | "paid" | "comped";
  subscriptions?: Array<{
    id: string;
    status: string;
    price?: { id: string; nickname?: string };
    customer?: { id: string };
  }>;
}

async function safeReadText(res: Response): Promise<string | null> {
  try {
    return await res.text();
  } catch {
    return null;
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + "…";
}
