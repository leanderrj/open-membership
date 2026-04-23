import type { MemberState, OmConfig } from "./types.js";
import type { GhostClient, GhostMember } from "./ghost-client.js";
import { memberStateFromGhost } from "./ghost-client.js";
import { issueFeedToken } from "./token.js";

/**
 * Token → MemberState cache interface.
 *
 * Two implementations are provided:
 *   - InMemoryFeedCache (below): for Node. Warms from Ghost on startup
 *     and refreshes via webhook events. Resets on process restart.
 *   - KvFeedCache (worker/kv-cache.ts): for Cloudflare Workers. Reads
 *     and writes to a KV namespace so state survives worker invocations.
 */
export interface FeedCache {
  /** O(1) token lookup. Returns null when unknown. */
  get(token: string): Promise<MemberState | null>;

  /** Refresh a single member's cache entry from Ghost. */
  refreshMemberById(memberId: string): Promise<MemberState | null>;

  /** Remove all entries for a member (on subscription.deleted). */
  evictMemberId(memberId: string): Promise<void>;

  /** Operational: size/count if cheap to compute, else 0. */
  size(): Promise<number>;
}

/**
 * Shared derivation: compute the feed token from a Ghost member.
 * Used by every cache implementation so they stay in agreement on the
 * token shape.
 */
export function tokenForMember(
  config: OmConfig,
  feedTokenKey: string,
  member: GhostMember,
): { token: string; state: MemberState } | null {
  const state = memberStateFromGhost(member, config);
  if (state.subscription_status === "none") return null;
  const planId = member.subscriptions?.[0]?.price?.id ?? state.tier_id;
  const token = issueFeedToken(feedTokenKey, state.uuid, planId);
  return { token, state };
}

/**
 * In-memory implementation backed by Map. Warms eagerly from Ghost's
 * active-subscriber list; invalidated by webhook events.
 */
export class InMemoryFeedCache implements FeedCache {
  private readonly byToken = new Map<string, MemberState>();
  private readonly byMemberId = new Map<string, string>();

  constructor(
    private readonly config: OmConfig,
    private readonly ghost: GhostClient,
    private readonly feedTokenKey: string,
  ) {}

  async warm(): Promise<void> {
    for await (const m of this.ghost.iterateActiveMembers()) {
      this.upsert(m);
    }
  }

  async get(token: string): Promise<MemberState | null> {
    return this.byToken.get(token) ?? null;
  }

  async refreshMemberById(memberId: string): Promise<MemberState | null> {
    const m = await this.ghost.getMemberById(memberId);
    if (!m) {
      await this.evictMemberId(memberId);
      return null;
    }
    return this.upsert(m);
  }

  async evictMemberId(memberId: string): Promise<void> {
    const prior = this.byMemberId.get(memberId);
    if (prior) this.byToken.delete(prior);
    this.byMemberId.delete(memberId);
  }

  async size(): Promise<number> {
    return this.byToken.size;
  }

  private upsert(m: GhostMember): MemberState | null {
    const derived = tokenForMember(this.config, this.feedTokenKey, m);
    if (!derived) {
      this.evictMemberId(m.id);
      return null;
    }
    const prior = this.byMemberId.get(m.id);
    if (prior && prior !== derived.token) this.byToken.delete(prior);
    this.byToken.set(derived.token, derived.state);
    this.byMemberId.set(m.id, derived.token);
    return derived.state;
  }
}
