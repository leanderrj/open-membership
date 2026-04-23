import { create } from "xmlbuilder2";
import type { MemberState, OmAccess, OmConfig } from "./types.js";
import type { ContentPost } from "./content-client.js";

/**
 * Build the RSS/om XML for a specific member.
 *
 * The access filter, expressed in om terms:
 *
 *   visibility=public                   → om:access open, full content
 *   visibility=members                  → om:access members-only,
 *                                         full content if member is paid-or-free
 *   visibility=paid                     → om:access locked,
 *                                         full content only if member has ANY paid entitlement
 *   visibility=tiers (with tiers[])     → om:access locked,
 *                                         full content only if member.tier_id matches
 *                                         one of the tier slugs
 *
 * Non-entitled items carry only preview + <om:unlock>; entitled items
 * carry content:encoded with the HTML body wrapped in CDATA.
 *
 * The builder returns a UTF-8 string. Callers should set
 * Content-Type: application/rss+xml; charset=utf-8.
 */

export interface RenderFeedInput {
  config: OmConfig;
  publicUrl: string;
  feedTokenInUrl: string;
  member: MemberState | null;
  posts: ContentPost[];
}

export function renderFeed(input: RenderFeedInput): string {
  const { config, publicUrl, feedTokenInUrl, member, posts } = input;
  const base = publicUrl.replace(/\/$/, "");
  const feedSelf = `${base}/feed/om/${encodeURIComponent(feedTokenInUrl)}/`;

  const doc = create({ version: "1.0", encoding: "UTF-8" }).ele("rss", {
    version: "2.0",
    "xmlns:content": "http://purl.org/rss/1.0/modules/content/",
    "xmlns:atom": "http://www.w3.org/2005/Atom",
    "xmlns:om": "http://purl.org/rss/modules/membership/",
  });
  const channel = doc.ele("channel");

  channel.ele("title").txt(config.provider.name).up();
  channel.ele("link").txt(config.provider.url).up();
  channel
    .ele("description")
    .txt(`Open Membership feed for ${config.provider.name}`)
    .up();
  channel.ele("language").txt("en").up();
  channel
    .ele("atom:link", {
      href: feedSelf,
      rel: "self",
      type: "application/rss+xml",
    })
    .up();

  channel.ele("om:provider").txt(config.provider.url).up();
  channel
    .ele("om:discovery")
    .txt(`${base}/.well-known/open-membership/`)
    .up();

  for (const method of config.authentication.methods) {
    channel.ele("om:authMethod").txt(method).up();
  }

  for (const [id, tier] of Object.entries(config.tiers)) {
    const offer = firstOfferForTier(config, id);
    const attrs: Record<string, string> = { id };
    if (offer) {
      attrs.price = `${offer.price.currency} ${offer.price.amount}`;
      attrs.period = offer.price.period;
    }
    channel.ele("om:tier", attrs).txt(tier.label).up();
  }

  for (const [id, feat] of Object.entries(config.features)) {
    channel.ele("om:feature", { id }).txt(feat.label).up();
  }

  if (config.revocation) {
    channel
      .ele("om:revocation", {
        policy: config.revocation.policy,
        grace_hours: String(config.revocation.grace_hours),
      })
      .up();
  }

  // The om:access channel-level element declares the default for items
  // when we have no authenticated member. Per SPEC §appendix examples,
  // this is "members-only" for a protected feed.
  if (!member) {
    channel.ele("om:access").txt("members-only").up();
    channel
      .ele("item")
      .ele("title").txt("Your subscription is not active").up()
      .ele("link").txt(`${base}/signup/`).up()
      .ele("guid", { isPermaLink: "false" })
      .txt(`om-ghost:not-entitled:${feedTokenInUrl}`)
      .up()
      .ele("description")
      .txt(
        "Renew or start a subscription to receive the full paid feed from " +
          config.provider.name,
      )
      .up();
    return doc.end({ prettyPrint: true });
  }

  for (const post of posts) {
    const decision = decideAccess(post, member);
    const item = channel.ele("item");
    item.ele("title").txt(post.title).up();
    item.ele("link").txt(post.url).up();
    item.ele("guid", { isPermaLink: "true" }).txt(post.url).up();
    item.ele("pubDate").txt(toRfc822(post.published_at)).up();
    if (post.primary_author?.name) {
      item.ele("dc:creator").txt(post.primary_author.name).up();
    }

    item.ele("om:access").txt(decision.access).up();
    for (const feat of decision.requiredFeatures) {
      item.ele("om:feature").txt(feat).up();
    }

    const preview = pickPreview(post);
    if (preview) item.ele("om:preview").dat(preview).up();

    if (decision.grantContent && post.html) {
      item.ele("content:encoded").dat(post.html).up();
      item
        .ele("description")
        .txt(post.excerpt ?? post.custom_excerpt ?? "")
        .up();
    } else {
      // Gated: surface the unlock endpoint so a Level 2+ reader can
      // exchange its feed-scoped token for item-level content.
      item.ele("om:unlock").txt(`${base}/api/om/token`).up();
      item
        .ele("description")
        .txt(preview ?? "Members-only. Preview unavailable.")
        .up();
    }
  }

  return doc.end({ prettyPrint: true });
}

/**
 * The core per-item decision. Returns:
 *   access:          the om:access value to emit
 *   requiredFeatures: om:feature ids a reader would need to unlock
 *   grantContent:    whether to include content:encoded
 */
export interface AccessDecision {
  access: OmAccess;
  requiredFeatures: string[];
  grantContent: boolean;
}

export function decideAccess(
  post: ContentPost,
  member: MemberState,
): AccessDecision {
  const visibility = post.visibility;

  // Public posts are always open and always include content.
  if (visibility === "public") {
    return { access: "open", requiredFeatures: [], grantContent: true };
  }

  // Members-only (free or paid member can see full content).
  if (visibility === "members") {
    const entitled =
      member.subscription_status === "active" ||
      member.subscription_status === "trialing" ||
      member.tier_id !== "free";
    return {
      access: "members-only",
      requiredFeatures: [],
      grantContent: entitled,
    };
  }

  // Paid (any paid tier).
  if (visibility === "paid") {
    const entitled =
      (member.subscription_status === "active" ||
        member.subscription_status === "trialing") &&
      member.tier_id !== "free";
    return {
      access: "locked",
      requiredFeatures: [],
      grantContent: entitled,
    };
  }

  // Tiers (specific tier slugs).
  if (visibility === "tiers") {
    const allowedSlugs = (post.tiers ?? []).map((t) => t.slug);
    const entitled =
      (member.subscription_status === "active" ||
        member.subscription_status === "trialing") &&
      allowedSlugs.includes(member.tier_id);
    return {
      access: "locked",
      requiredFeatures: [],
      grantContent: entitled,
    };
  }

  // Unknown visibility: treat conservatively.
  return { access: "locked", requiredFeatures: [], grantContent: false };
}

function pickPreview(post: ContentPost): string | null {
  const text = post.custom_excerpt ?? post.excerpt ?? post.plaintext;
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.length > 2_000 ? trimmed.slice(0, 2_000) + "…" : trimmed;
}

function toRfc822(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toUTCString();
}

function firstOfferForTier(c: OmConfig, tierId: string) {
  for (const offer of Object.values(c.offers)) {
    if (offer.tier === tierId) return offer;
  }
  return null;
}
