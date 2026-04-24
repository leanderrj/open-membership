import type { MemberState } from "../types.js";

const KEY_MEMBER = "member:";
const KEY_SUB_INDEX = "sub:";
const KEY_CUST_INDEX = "cust:";
const KEY_IDEMPOTENCY = "idem:";

const IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 60 * 60;

export class Kv {
  constructor(private readonly ns: KVNamespace) {}

  async getMemberByToken(feedToken: string): Promise<MemberState | null> {
    const raw = await this.ns.get(KEY_MEMBER + feedToken, "json");
    return (raw as MemberState | null) ?? null;
  }

  async putMember(state: MemberState): Promise<void> {
    const ops: Promise<unknown>[] = [
      this.ns.put(KEY_MEMBER + state.feed_token, JSON.stringify(state)),
    ];
    if (state.stripe_subscription_id) {
      ops.push(
        this.ns.put(
          KEY_SUB_INDEX + state.stripe_subscription_id,
          state.feed_token,
        ),
      );
    }
    if (state.stripe_customer_id) {
      ops.push(
        this.ns.put(
          KEY_CUST_INDEX + state.stripe_customer_id,
          state.feed_token,
        ),
      );
    }
    await Promise.all(ops);
  }

  async getMemberBySubscription(
    subscriptionId: string,
  ): Promise<MemberState | null> {
    const token = await this.ns.get(KEY_SUB_INDEX + subscriptionId);
    if (!token) return null;
    return this.getMemberByToken(token);
  }

  async getMemberByCustomer(
    customerId: string,
  ): Promise<MemberState | null> {
    const token = await this.ns.get(KEY_CUST_INDEX + customerId);
    if (!token) return null;
    return this.getMemberByToken(token);
  }

  /**
   * Atomic "have I seen this event id" using KV's put-if-absent semantics
   * approximation: KV does not have true compare-and-swap, but a read
   * followed by a TTL-bounded put is idempotent enough for Stripe's 3-day
   * retry window. Duplicate handling is still safe because every webhook
   * handler is a pure state-overwrite, not an accumulating mutation.
   */
  async claimEvent(eventId: string): Promise<boolean> {
    const key = KEY_IDEMPOTENCY + eventId;
    const existing = await this.ns.get(key);
    if (existing !== null) return false;
    await this.ns.put(key, "1", {
      expirationTtl: IDEMPOTENCY_TTL_SECONDS,
    });
    return true;
  }
}
