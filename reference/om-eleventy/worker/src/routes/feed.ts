import type { Env, MemberState, OmConfig } from "../types.js";
import { Kv } from "../lib/kv.js";
import { entitlementFor } from "../lib/config.js";
import { renderPerSubscriberFeed, type FeedItem } from "../lib/feed.js";
import type { Logger } from "../lib/logger.js";

/**
 * Handles GET /feed/om/:token/.
 *
 * The token is looked up in KV. If it resolves to a member record with
 * `status in {active, trialing}`, the handler builds the entitlement
 * view and renders a full per-subscriber feed. Otherwise it returns 404
 * (not 401/403 — unguessability of the token is the whole auth story
 * for Level 2 URL-token).
 *
 * Item metadata + bodies for this v0.1 scaffold come from a built-in
 * sample set; a production build reads them from the static-site bucket
 * via env.ASSETS.fetch().
 */
export async function handleFeed(
  path: string,
  env: Env,
  config: OmConfig,
  logger: Logger,
): Promise<Response> {
  const match = path.match(/^\/feed\/om\/([^/]+)\/?$/);
  if (!match) {
    return new Response("not found", { status: 404 });
  }
  const token = decodeURIComponent(match[1]!);

  const kv = new Kv(env.OM_KV);
  const member = await kv.getMemberByToken(token);

  if (!member) {
    logger.info("feed.token.unknown", { token_prefix: token.slice(0, 8) });
    return new Response("not found", { status: 404 });
  }

  const entitlement = entitlementFor(config, member);

  const items = await loadItems(env);
  const xml = renderPerSubscriberFeed({
    config,
    publicUrl: env.PUBLIC_URL,
    feedTokenInUrl: token,
    member,
    entitlement,
    items,
  });

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "private, max-age=60",
    },
  });
}

/**
 * Load the item set the Worker renders against.
 *
 * The production path reads per-post metadata + bodies from the
 * static-site bucket (`env.ASSETS.fetch`). For the scaffold we return
 * a static fixture that matches the sample posts in src/posts/. Upgrading
 * to a bucket-backed loader means replacing this function; nothing
 * upstream changes.
 */
async function loadItems(_env: Env): Promise<FeedItem[]> {
  return FIXTURE_ITEMS;
}

const FIXTURE_ITEMS: FeedItem[] = [
  {
    title: "Deep dive: what the filing actually says",
    url: "https://publisher.example/posts/2026-04-10-deep-dive/",
    guid: "https://publisher.example/posts/2026-04-10-deep-dive/",
    pubDate: new Date("2026-04-10T00:00:00Z"),
    access: "locked",
    requiredTiers: ["paid"],
    preview:
      "A line-by-line walkthrough of the March filing, including the three footnotes that contradict the press release.",
    body: "<p>The filing runs 47 pages. The press release runs 2. They disagree on three material points, and the disagreement is not a summarization artifact &mdash; it is a rewriting.</p><p>This is the full walkthrough.</p>",
  },
  {
    title: "Field notes, week 11",
    url: "https://publisher.example/posts/2026-03-15-field-notes/",
    guid: "https://publisher.example/posts/2026-03-15-field-notes/",
    pubDate: new Date("2026-03-15T00:00:00Z"),
    access: "preview",
    preview:
      "This week's field notes cover three stories. Subscribers get the full write-up; the teaser below shows the opening paragraphs.",
    body: "<p>Three threads came together this week.</p><p>The first was a regulatory filing. The second was a pair of follow-up calls. The third was an unsolicited document that survived weekend verification.</p>",
  },
  {
    title: "Welcome to Publisher Example",
    url: "https://publisher.example/posts/2026-03-01-welcome/",
    guid: "https://publisher.example/posts/2026-03-01-welcome/",
    pubDate: new Date("2026-03-01T00:00:00Z"),
    access: "open",
    body: "<p>This is a fully open post. It appears in every feed.</p>",
  },
];

export const __testing = {
  FIXTURE_ITEMS,
};

export type { MemberState };
