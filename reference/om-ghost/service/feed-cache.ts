import { issueFeedToken } from "../shared/token.js";
import type { GhostClient } from "../shared/ghost-client.js";
import { memberStateFromGhost } from "../shared/ghost-client.js";
import type { MemberState, OmConfig } from "../shared/types.js";

/**
 * In-memory cache mapping feed_token → MemberState.
 *
 * Populated lazily on cold feed requests and eagerly on startup for the
 * "active subscribers" set. Webhook handlers call invalidate() /
 * upsert() as Stripe events arrive.
 *
 * Rationale (architecture doc §URL-token model): verifying a feed token
 * against the Ghost Admin API on every request would be too slow and
 * too noisy for Ghost's logs. The cache turns feed fetches into an
 * O(1) lookup plus a single Ghost call on cache miss.
 */
export class FeedCache {
  private byToken = new Map<string, MemberState>();
  private byMemberId = new Map<string, string>(); // member.id → token

  constructor(
    private readonly config: OmConfig,
    private readonly ghost: GhostClient,
    private readonly feedTokenKey: string,
  ) {}

  /** Seed from Ghost's active-subscriber list. Call once at startup. */
  async warm(): Promise<void> {
    for await (const m of this.ghost.iterateActiveMembers()) {
      this.upsertFromGhost(m);
    }
  }

  /** Returns null if token is unknown. Caller should then treat as 403. */
  get(token: string): MemberState | null {
    return this.byToken.get(token) ?? null;
  }

  /**
   * Refresh cache entry from Ghost. Call from webhook handlers when we
   * see a member.created/member.activated/subscription.updated event.
   */
  async refreshMemberById(memberId: string): Promise<MemberState | null> {
    const m = await this.ghost.getMemberById(memberId);
    if (!m) {
      this.deleteByMemberId(memberId);
      return null;
    }
    return this.upsertFromGhost(m);
  }

  private upsertFromGhost(m: {
    id: string;
    uuid: string;
    email: string | null;
    subscriptions?: Array<{ id: string; status: string; price?: { id: string } }>;
  }): MemberState | null {
    const state = memberStateFromGhost(m as never, this.config);
    if (state.subscription_status === "none") {
      this.deleteByMemberId(state.id);
      return null;
    }

    const planId = m.subscriptions?.[0]?.price?.id ?? state.tier_id;
    const token = issueFeedToken(this.feedTokenKey, state.uuid, planId);

    const prior = this.byMemberId.get(state.id);
    if (prior && prior !== token) this.byToken.delete(prior);

    this.byToken.set(token, state);
    this.byMemberId.set(state.id, token);
    return state;
  }

  private deleteByMemberId(memberId: string): void {
    const token = this.byMemberId.get(memberId);
    if (token) this.byToken.delete(token);
    this.byMemberId.delete(memberId);
  }

  /** Test hook: size of the cache. */
  size(): number {
    return this.byToken.size;
  }
}
