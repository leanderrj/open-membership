import { UpstreamError, ConfigError } from "./errors.js";

/**
 * Ghost Content API client.
 *
 * The Admin API is for member state; the Content API is for posts.
 * Both live on the same Ghost instance but use different auth:
 *   - Admin:   JWT signed with a shared secret
 *   - Content: a plain API key passed as a query string
 *
 * Reference: https://ghost.org/docs/content-api/
 *
 * om-ghost reads posts with `limit=50&filter=visibility:[public,members,paid]`
 * and then applies its own access filter in shared/feed-render.ts, because
 * the "which articles does this particular member see with full content"
 * decision depends on om-level entitlements (features), not just Ghost's
 * coarse `visibility` flag.
 */

export interface ContentApiOpts {
  ghostUrl: string;
  contentApiKey: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const API_VERSION = "v5.0";

export interface ContentPost {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  url: string;
  published_at: string;
  updated_at: string;
  excerpt: string | null;
  custom_excerpt: string | null;
  feature_image: string | null;
  /** "public" | "members" | "paid" | "tiers" | string */
  visibility: string;
  html: string | null;
  plaintext: string | null;
  /** When visibility === "tiers", the tiers array lists allowed tier names. */
  tiers?: Array<{ id: string; name: string; slug: string }>;
  primary_author?: { name: string; slug: string };
  primary_tag?: { name: string; slug: string };
  authors?: Array<{ name: string; slug: string }>;
  tags?: Array<{ name: string; slug: string }>;
}

export class ContentApiClient {
  private readonly base: string;
  private readonly key: string;
  private readonly timeoutMs: number;

  constructor(opts: ContentApiOpts) {
    if (!opts.contentApiKey) {
      throw new ConfigError("GHOST_CONTENT_KEY is required for feed rendering");
    }
    this.base = opts.ghostUrl.replace(/\/$/, "") + "/ghost/api/content";
    this.key = opts.contentApiKey;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async listPosts(opts: { limit?: number; page?: number } = {}): Promise<ContentPost[]> {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
    const page = Math.max(opts.page ?? 1, 1);
    const params = new URLSearchParams({
      key: this.key,
      limit: String(limit),
      page: String(page),
      include: "tags,authors,tiers",
      formats: "html,plaintext",
      order: "published_at DESC",
    });
    const body = await this.get<{ posts: ContentPost[] }>(
      `${this.base}/posts/?${params.toString()}`,
    );
    return body.posts;
  }

  async ping(): Promise<boolean> {
    try {
      const params = new URLSearchParams({ key: this.key });
      const res = await fetchWithTimeout(
        `${this.base}/settings/?${params.toString()}`,
        this.timeoutMs,
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  private async get<T>(url: string): Promise<T> {
    let res: Response;
    try {
      res = await fetchWithTimeout(url, this.timeoutMs, {
        headers: { "Accept-Version": API_VERSION },
      });
    } catch (err) {
      throw new UpstreamError(
        "ghost-content",
        err instanceof Error ? err.message : "network error",
      );
    }
    if (!res.ok) {
      const text = await safeReadText(res);
      throw new UpstreamError(
        "ghost-content",
        `${res.status} ${res.statusText}${text ? `: ${truncate(text, 200)}` : ""}`,
      );
    }
    return (await res.json()) as T;
  }
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
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
