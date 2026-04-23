import type { FeedCache } from "../shared/feed-cache.js";
import { tokenForMember } from "../shared/feed-cache.js";
import type { GhostClient } from "../shared/ghost-client.js";
import type { MemberState, OmConfig } from "../shared/types.js";

/**
 * KV-backed FeedCache for Cloudflare Workers.
 *
 * Two KV keyspaces within a single namespace:
 *   tok:<feed_token>  → JSON-encoded MemberState
 *   mem:<member_id>   → feed_token (so we can evict on member delete)
 *
 * Unlike the Node in-memory cache, we do NOT eagerly warm from Ghost at
 * startup — Workers have a strict CPU budget and can't iterate tens of
 * thousands of members. Instead:
 *   - Cold lookups miss and trigger an on-demand Ghost probe in the
 *     feed handler (see OnDemandFeedCache below).
 *   - Webhook events populate the cache going forward, so over time the
 *     cache fills with every active subscriber who's been touched.
 *
 * KV reads are ~5ms globally; writes are eventually consistent (~60s).
 */
export class KvFeedCache implements FeedCache {
  constructor(
    private readonly kv: KVNamespace,
    private readonly config: OmConfig,
    private readonly ghost: GhostClient,
    private readonly feedTokenKey: string,
  ) {}

  async get(token: string): Promise<MemberState | null> {
    const raw = await this.kv.get(this.tokKey(token), "json");
    return (raw as MemberState | null) ?? null;
  }

  async refreshMemberById(memberId: string): Promise<MemberState | null> {
    const m = await this.ghost.getMemberById(memberId);
    if (!m) {
      await this.evictMemberId(memberId);
      return null;
    }
    const derived = await tokenForMember(this.config, this.feedTokenKey, m);
    if (!derived) {
      await this.evictMemberId(memberId);
      return null;
    }

    const prior = await this.kv.get(this.memKey(memberId));
    if (prior && prior !== derived.token) {
      await this.kv.delete(this.tokKey(prior));
    }
    await this.kv.put(
      this.tokKey(derived.token),
      JSON.stringify(derived.state),
      { expirationTtl: CACHE_TTL_SECONDS },
    );
    await this.kv.put(this.memKey(memberId), derived.token, {
      expirationTtl: CACHE_TTL_SECONDS,
    });
    return derived.state;
  }

  async evictMemberId(memberId: string): Promise<void> {
    const prior = await this.kv.get(this.memKey(memberId));
    if (prior) await this.kv.delete(this.tokKey(prior));
    await this.kv.delete(this.memKey(memberId));
  }

  async size(): Promise<number> {
    // KV doesn't expose a cheap count; we return 0 so /ready doesn't block.
    // An operator can use `wrangler kv key list` for exact counts.
    return 0;
  }

  private tokKey(t: string): string {
    return `tok:${t}`;
  }
  private memKey(id: string): string {
    return `mem:${id}`;
  }
}

/** 14 days. Tokens beyond this get recomputed on next membership event. */
const CACHE_TTL_SECONDS = 14 * 24 * 60 * 60;
