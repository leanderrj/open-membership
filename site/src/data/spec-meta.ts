export interface SpecMeta {
  slug: string;
  collection: 'specRoot' | 'spec' | 'docs';
  entryId: string;
  title: string;
  shortTitle: string;
  summary: string;
  meta?: string;
  group: 'Core' | 'Companion' | 'Project';
  order: number;
}

// One entry per page route. `entryId` is the loader-emitted id, which Astro's
// glob loader produces by lowercasing the path (no extension). e.g. SPEC.md → "spec",
// SPEC-PORTABILITY.md → "spec-portability", reader-ARCHITECTURE.md → "reader-architecture".
export const specs: SpecMeta[] = [
  {
    slug: '',
    collection: 'specRoot',
    entryId: 'spec',
    title: 'Open Membership RSS 0.4',
    shortTitle: 'Open Membership 0.4',
    summary:
      'The canonical specification. Defines the namespace, discovery document, credential profiles, and conformance levels. Read this first; the companion specs extend it.',
    meta: 'Draft, 2026-04-23 · Namespace purl.org/rss/modules/membership/',
    group: 'Core',
    order: 1,
  },
  {
    slug: 'portability',
    collection: 'spec',
    entryId: 'spec-portability',
    title: 'Subscriber Portability Format 1.0',
    shortTitle: 'Portability',
    summary:
      'How a subscriber moves between reader apps without re-subscribing. JSON-LD export of stored tokens, credentials, receipts, bundle memberships, and pending gifts, encrypted with age or JWE.',
    group: 'Companion',
    order: 2,
  },
  {
    slug: 'activitypub',
    collection: 'spec',
    entryId: 'spec-activitypub',
    title: 'ActivityPub Coexistence Profile',
    shortTitle: 'ActivityPub coexistence',
    summary:
      'Rules for a publisher running both Open Membership and ActivityPub on the same domain. Covers actor mapping, monetization signalling, and avoiding identity collisions across the two stacks.',
    group: 'Companion',
    order: 3,
  },
  {
    slug: 'adapter-profile',
    collection: 'spec',
    entryId: 'spec-adapter-profile',
    title: 'Platform Adapter Profile',
    shortTitle: 'Adapter Profile',
    summary:
      'A normalized shape any closed-platform adapter (Substack, Patreon, Memberful) can target. Defines the surface a publisher-owned bridge must expose to be interoperable with om readers.',
    group: 'Companion',
    order: 4,
  },
  {
    slug: 'syndication-mappings',
    collection: 'spec',
    entryId: 'spec-syndication-mappings',
    title: 'Syndication Mappings (Atom + JSON Feed)',
    shortTitle: 'Syndication mappings',
    summary:
      'Bidirectional mapping of om elements to Atom 1.0 (RFC 4287) and JSON Feed 1.1. Lets a publisher serve the same paid content over any of the three syndication formats with the same access semantics.',
    group: 'Companion',
    order: 5,
  },
  {
    slug: 'sharing-policy',
    collection: 'spec',
    entryId: 'spec-sharing-policy',
    title: 'Sharing Policy Profile',
    shortTitle: 'Sharing policy',
    summary:
      "Optional declarations a publisher can make about per-device limits and anti-sharing detection, with reader-side conventions for honoring them. Inspired by Patreon's tokenized-feed enforcement model.",
    group: 'Companion',
    order: 6,
  },
  {
    slug: 'errata-0.4.1',
    collection: 'spec',
    entryId: 'spec-errata-041',
    title: 'Errata 0.4.1',
    shortTitle: 'Errata 0.4.1',
    summary: 'Editorial corrections to 0.4. Non-substantive; canonical URI remains the 0.4 namespace.',
    group: 'Companion',
    order: 7,
  },
];

export const docs: SpecMeta[] = [
  {
    slug: 'featureset',
    collection: 'docs',
    entryId: 'featureset',
    title: 'Featureset and Conformance Levels',
    shortTitle: 'Featureset',
    summary:
      'The full per-version feature list and the eight cumulative conformance levels, with implementer-effort estimates. Most publishers and reader apps will implement Level 1, 2, or 5.',
    group: 'Project',
    order: 1,
  },
  {
    slug: 'governance',
    collection: 'docs',
    entryId: 'governance',
    title: 'Governance',
    shortTitle: 'Governance',
    summary:
      'How the spec is maintained, who can change it, and how disputes are resolved. Aimed at long-term custodianship rather than committee growth.',
    group: 'Project',
    order: 2,
  },
  {
    slug: 'reader-architecture',
    collection: 'docs',
    entryId: 'reader-architecture',
    title: 'Reader Architecture',
    shortTitle: 'Reader architecture',
    summary:
      'Recommended internal architecture for an om-aware RSS reader: parser, credential store, unlock pipeline, checkout flow, portability import/export.',
    group: 'Project',
    order: 3,
  },
  {
    slug: 'landscape',
    collection: 'docs',
    entryId: 'competitive-landscape',
    title: 'Competitive Landscape',
    shortTitle: 'Landscape',
    summary:
      'How om relates to Substack, Patreon, FeedPress, Passport, Podcasting 2.0, ActivityPub, and the rest. The single comparative document in this repo.',
    group: 'Project',
    order: 4,
  },
];

export const specBySlug = new Map(specs.map((s) => [s.slug, s]));
export const docBySlug = new Map(docs.map((d) => [d.slug, d]));

export function specHref(s: SpecMeta): string {
  return s.slug ? `/spec/${s.slug}/` : '/spec/';
}

export function docHref(d: SpecMeta): string {
  return `/docs/${d.slug}/`;
}
