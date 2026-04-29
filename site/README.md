# site/

The static site for `openmembership.org`. Single page, no framework, no build step. Deployed via **GitHub Pages**, with **Cloudflare** providing DNS and edge redirects for the secondary domains.

## Files

```
index.html          single-page site, all the content
style.css           full stylesheet, no preprocessor
CNAME               tells GitHub Pages the canonical custom domain
.nojekyll           disables Jekyll processing on GitHub's side
robots.txt          allows everything except /example/
sitemap.xml         single URL; update when more pages are added
example/feed.xml    non-functional example feed shaped for om 0.4
```

## How deployment works

A GitHub Actions workflow at [`../.github/workflows/pages.yml`](../.github/workflows/pages.yml) deploys this directory to GitHub Pages on every push to `master` that touches `site/`. No build step, the directory is uploaded as-is.

The first time, you need to flip Pages on in the repository settings:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Push the workflow (it's already in this repo). The first run picks up the workflow and runs it.
3. Once it finishes, the site is live at `https://leanderrj.github.io/open-membership/`. The CNAME file then routes the canonical domain (`openmembership.org`) to it.

## DNS, Cloudflare

All three domains live in Cloudflare. Their roles:

- **`openmembership.org`**, canonical. Apex points at GitHub Pages.
- **`open-membership.org`**, redirect-only. 301 to canonical via a Cloudflare Single Redirect rule.
- **`open-membership.com`**, redirect-only. Same.

### `openmembership.org` (canonical)

DNS records on this zone:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |
| AAAA | `@` | `2606:50c0:8000::153` | DNS only |
| AAAA | `@` | `2606:50c0:8001::153` | DNS only |
| AAAA | `@` | `2606:50c0:8002::153` | DNS only |
| AAAA | `@` | `2606:50c0:8003::153` | DNS only |
| CNAME | `www` | `leanderrj.github.io` | DNS only |

Set proxy to **DNS only** (grey cloud) for the apex records. GitHub Pages issues its own Let's Encrypt certificate for the apex; an orange-cloud proxy interferes with the certificate provisioning process unless you configure Cloudflare's SSL mode carefully (Full strict + an origin cert). The grey-cloud setup is simpler and just works.

After the records propagate (a few minutes), in the GitHub repo: **Settings → Pages → Custom domain** → enter `openmembership.org`. Wait for the DNS check to pass and the cert to issue. Then tick **Enforce HTTPS**.

### `open-membership.org` and `open-membership.com` (redirect-only)

These zones get a single placeholder DNS record so Cloudflare knows the zone is active:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `192.0.2.1` | Proxied |
| CNAME | `www` | `@` | Proxied |

(`192.0.2.1` is from the documentation-reserved range; it never resolves to a real server, but Cloudflare needs *some* record to enable proxying. The proxy then catches the request and the Single Redirect rule below sends it to canonical without ever touching an origin.)

In **Rules → Redirect Rules** on each redirect-only zone, add:

- **Rule name:** `Canonicalise to openmembership.org`
- **When incoming requests match:** `(http.host eq "open-membership.org" or http.host eq "www.open-membership.org")` *(adjust for the .com zone)*
- **Then:**
  - **Type:** Dynamic
  - **Expression:** `concat("https://openmembership.org", http.request.uri.path)`
  - **Status code:** `301`
  - **Preserve query string:** on

That's it; no GitHub Pages config needed for the secondary domains. They never reach the origin.

## Friendly slugs

The previous Cloudflare-Pages `_redirects` file mapped a few short paths into the GitHub repo:

```
/spec       → github.com/leanderrj/open-membership/blob/main/SPEC.md
/roadmap    → github.com/leanderrj/open-membership/blob/main/ROADMAP.md
/funding    → github.com/leanderrj/open-membership/tree/main/funding
/repo       → github.com/leanderrj/open-membership
/issues     → github.com/leanderrj/open-membership/issues
```

GitHub Pages does not have a redirect mechanism. Two options to keep these slugs working:

1. **Cloudflare Single Redirects on the canonical zone.** Add a redirect rule per slug. Highest-fidelity (real 302), no detour through HTML. Recommended.
2. **Static HTML stub files.** Drop `site/spec.html`, `site/roadmap.html`, etc., each with a `<meta http-equiv="refresh" content="0; url=...">`. Lower-fidelity but works without touching Cloudflare.

Option 1, in **Rules → Redirect Rules** on the `openmembership.org` zone, paste-ready table, six rules, each `URI Path` `equals` `/<slug>` → static redirect:

| Rule name | When `URI Path equals` | Then redirect to (status `302`) |
|---|---|---|
| `slug-spec` | `/spec` | `https://github.com/leanderrj/open-membership/blob/master/SPEC.md` |
| `slug-roadmap` | `/roadmap` | `https://github.com/leanderrj/open-membership/blob/master/ROADMAP.md` |
| `slug-funding` | `/funding` | `https://github.com/leanderrj/open-membership/tree/master/funding` |
| `slug-repo` | `/repo` | `https://github.com/leanderrj/open-membership` |
| `slug-issues` | `/issues` | `https://github.com/leanderrj/open-membership/issues` |
| `slug-site` | `/site` | `https://github.com/leanderrj/open-membership/tree/master/site` |

If you'd rather paste a Cloudflare expression directly, the equivalent for the first row is:

```
When:  (http.request.uri.path eq "/spec")
Then:  Static redirect → https://github.com/leanderrj/open-membership/blob/master/SPEC.md
       Status: 302 · Preserve query string: off
```

If you don't want to maintain redirect rules in two places, skip the slugs entirely and link to `github.com/...` directly from the site copy, `index.html` already does this.

## Local preview

```
cd site
python3 -m http.server 4321
```

Then open `http://localhost:4321/`. No watch mode, no hot reload, just the file system. Edit and refresh. The `CNAME` and `.nojekyll` files don't affect local serving.

## Icon assets

The site ships with a complete icon set:

```
favicon.svg              SVG source, modern browsers use this directly
favicon.ico              multi-resolution fallback (16/32/48/64) for older browsers
icon.svg                 256×256 SVG (used by the manifest, regen source for PNG sizes)
icon-192.png             PWA manifest icon
icon-512.png             PWA manifest icon, large
apple-touch-icon.png     180×180 for iOS home-screen pin
og.svg                   1200×630 SVG source for the social preview card
og.png                   1200×630 PNG, the actual og:image referenced from <head>
manifest.webmanifest     PWA app manifest
```

To regenerate the PNG/ICO outputs after editing the SVG sources:

```
./build-icons.sh
```

Requires `librsvg` and `imagemagick` (`brew install librsvg imagemagick` on macOS).

## Things to update before going live

The setup is complete; before sharing widely, double-check:

- **GitHub repository URL.** All links point to `github.com/leanderrj/open-membership`. If the canonical home moves (e.g. an `open-membership` org is created later), find-and-replace in `index.html`, `404.html`, and the friendly-slug Redirect Rules.
- **Pages source.** GitHub: **Settings → Pages → Source: GitHub Actions** must be set, or the workflow fails.
- **DNS propagation.** Wait until `dig openmembership.org` returns the GitHub IPs before adding the custom domain in GitHub Pages settings, or the DNS-check step fails and you have to re-trigger.

## Switching back to Cloudflare Pages later

If at some point you want to switch from GitHub Pages to Cloudflare Pages (for analytics, edge functions, or unified config), the `_headers` and `_redirects` files in git history are ready to be restored. The site itself is host-agnostic, it's static HTML, CSS, and an XML feed. Nothing in the content depends on GitHub Pages or Cloudflare Pages specifically.
