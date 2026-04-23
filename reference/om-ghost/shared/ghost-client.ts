import { createHmac } from "node:crypto";
import type { MemberState, OmConfig } from "./types.js";
import { featuresForTier, tierForPriceId } from "./config.js";

/**
 * Minimal Ghost Admin API client.
 *
 * We intentionally don't pull in the full @ts-ghost/admin-api SDK in the
 * shared library — the worker variant (Cloudflare) can't ship it. This
 * client speaks the same JWT-auth'd REST API using `fetch`, which both
 * Node and Workers have natively.
 *
 * Reference: https://ghost.org/docs/admin-api/
 */

export interface GhostClientOpts {
  ghostUrl: string;
  /** Admin API key in "id:secret" form, as shown in Ghost Admin. */
  adminKey: string;
}

export class GhostClient {
  private readonly base: string;
  private readonly keyId: string;
  private readonly secret: string;

  constructor(opts: GhostClientOpts) {
    this.base = opts.ghostUrl.replace(/\/$/, "") + "/ghost/api/admin";
    const parts = opts.adminKey.split(":");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error("GHOST_ADMIN_KEY must be of the form id:secret");
    }
    this.keyId = parts[0];
    this.secret = parts[1];
  }

  async getMemberByUuid(uuid: string): Promise<GhostMember | null> {
    const url = `${this.base}/members/?filter=${encodeURIComponent(`uuid:${uuid}`)}&limit=1`;
    const res = await this.authedFetch(url);
    if (!res.ok) return null;
    const body = (await res.json()) as { members?: GhostMember[] };
    return body.members?.[0] ?? null;
  }

  async getMemberById(id: string): Promise<GhostMember | null> {
    const res = await this.authedFetch(`${this.base}/members/${id}/`);
    if (!res.ok) return null;
    const body = (await res.json()) as { members?: GhostMember[] };
    return body.members?.[0] ?? null;
  }

  /**
   * List all members with an active subscription. Used to seed the feed
   * token cache on startup. For large sites this paginates; for the
   * reference implementation we accept the "fetch all active subscribers"
   * cost as acceptable at startup.
   */
  async *iterateActiveMembers(): AsyncIterable<GhostMember> {
    let page = 1;
    while (true) {
      const url = `${this.base}/members/?filter=${encodeURIComponent("status:paid")}&limit=100&page=${page}`;
      const res = await this.authedFetch(url);
      if (!res.ok) return;
      const body = (await res.json()) as {
        members: GhostMember[];
        meta: { pagination: { pages: number } };
      };
      for (const m of body.members) yield m;
      if (page >= body.meta.pagination.pages) return;
      page++;
    }
  }

  /**
   * Ghost's Admin API requires a short-lived JWT signed with the admin
   * secret. The `kid` header is the key id and the aud is "/admin/".
   */
  private async authedFetch(url: string): Promise<Response> {
    const token = this.signToken();
    return fetch(url, {
      headers: {
        Authorization: `Ghost ${token}`,
        Accept: "application/json",
      },
    });
  }

  private signToken(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "HS256", typ: "JWT", kid: this.keyId };
    const payload = { iat: now, exp: now + 300, aud: "/admin/" };
    const enc = (obj: unknown) => base64Url(JSON.stringify(obj));
    const toSign = `${enc(header)}.${enc(payload)}`;
    const mac = createHmac("sha256", Buffer.from(this.secret, "hex"))
      .update(toSign)
      .digest();
    return `${toSign}.${base64UrlBuf(mac)}`;
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
  }>;
}

function base64Url(s: string): string {
  return base64UrlBuf(Buffer.from(s, "utf8"));
}

function base64UrlBuf(b: Buffer): string {
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
