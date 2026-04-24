import { create } from "xmlbuilder2";
import type { MemberState, OmConfig, EntitlementView } from "../types.js";

/**
 * Compose a per-subscriber feed.
 *
 * Inputs:
 *  - publicFeedXml: the string body of public.xml as Eleventy built it.
 *    It already contains open items in full, and members-only items as
 *    preview stubs with <om:access>locked|members-only</om:access>.
 *  - unlockedItems: the full HTML bodies for items the subscriber is
 *    entitled to see. The Worker fetches these from the static-site
 *    bucket at /posts/<slug>/index.html at request time.
 *
 * Output: a new RSS string that re-labels each unlocked item's
 * <om:access> to `open` and replaces the preview body with content:encoded.
 *
 * Implementation note: we do NOT parse the public.xml XML. We generate a
 * fresh feed from the same inputs (config + posts metadata) and overlay
 * the entitlement decision. This avoids XML mutation round-trips and
 * matches the pattern in om-ghost's feed-render.
 */

export interface FeedItem {
  title: string;
  url: string;
  guid: string;
  pubDate: Date;
  access: "open" | "preview" | "locked" | "members-only";
  requiredTiers?: string[];
  preview?: string;
  body?: string;
}

export interface RenderFeedInput {
  config: OmConfig;
  publicUrl: string;
  feedTokenInUrl: string;
  member: MemberState | null;
  entitlement: EntitlementView | null;
  items: FeedItem[];
}

export function renderPerSubscriberFeed(input: RenderFeedInput): string {
  const { config, publicUrl, feedTokenInUrl, member, entitlement, items } =
    input;
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
  channel.ele("om:discovery").txt(`${base}/.well-known/open-membership`).up();
  for (const m of config.authentication.methods) {
    channel.ele("om:authMethod").txt(m).up();
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

  if (config.revocation) {
    const revAttrs: Record<string, string> = {
      policy: config.revocation.policy,
    };
    if (config.revocation.grace_hours !== undefined) {
      revAttrs.grace_hours = String(config.revocation.grace_hours);
    }
    channel.ele("om:revocation", revAttrs).up();
  }

  for (const item of items) {
    const decision = decideAccess(item, member, entitlement);
    const el = channel.ele("item");
    el.ele("title").txt(item.title).up();
    el.ele("link").txt(item.url).up();
    el.ele("guid", { isPermaLink: "false" }).txt(item.guid).up();
    el.ele("pubDate").txt(item.pubDate.toUTCString()).up();
    el.ele("om:access").txt(decision.access).up();

    if (decision.grantContent && item.body) {
      el.ele("description").dat(item.body).up();
      el.ele("content:encoded").dat(item.body).up();
    } else {
      const preview = item.preview ?? "Members-only item.";
      el.ele("description").dat(preview).up();
      if (item.preview) el.ele("om:preview").dat(item.preview).up();
      el.ele("om:unlock")
        .txt(`${base}/.well-known/open-membership`)
        .up();
    }
    el.up();
  }

  return doc.end({ prettyPrint: false });
}

function firstOfferForTier(config: OmConfig, tierId: string) {
  for (const offer of Object.values(config.offers)) {
    if (offer.tier === tierId) return offer;
  }
  return null;
}

interface Decision {
  access: "open" | "preview" | "locked" | "members-only";
  grantContent: boolean;
}

function decideAccess(
  item: FeedItem,
  member: MemberState | null,
  entitlement: EntitlementView | null,
): Decision {
  if (item.access === "open") return { access: "open", grantContent: true };

  const isActive = !!(member && entitlement && entitlement.is_active);
  if (!isActive) {
    return { access: item.access, grantContent: false };
  }

  if (item.access === "members-only") {
    return { access: "open", grantContent: true };
  }

  if (item.access === "locked" || item.access === "preview") {
    if (item.requiredTiers && item.requiredTiers.length > 0) {
      if (entitlement && item.requiredTiers.includes(entitlement.tier_id)) {
        return { access: "open", grantContent: true };
      }
      return { access: item.access, grantContent: false };
    }
    return { access: "open", grantContent: true };
  }

  return { access: item.access, grantContent: false };
}
