# site/

The Astro site for `openmembership.org`. Tailwind for theming, Astro content collections to render the canonical specification (`/SPEC.md`, `/spec/*.md`, `/docs/*.md`) into per-page routes. Deployed via **GitHub Pages**, with **Cloudflare** providing DNS and edge redirects for the secondary domains.

## Layout

```
package.json             Astro 4 + Tailwind + rehype plugins
astro.config.mjs         Markdown rendering (rehype-slug, autolink), content layer
tailwind.config.mjs      Brand palette, prose-spec typography variant
tsconfig.json            Strict mode

src/
  layouts/
    BaseLayout.astro     Header, footer, OpenGraph, fonts
    SpecLayout.astro     Spec/docs page shell: explainer, TOC, prose body
  pages/
    index.astro          Marketing landing
    404.astro
    spec/index.astro     Renders SPEC.md
    spec/[...slug].astro Renders each spec/SPEC-*.md (dynamic)
    spec/all.astro       Listing of every spec
    docs/index.astro     Listing of every project document
    docs/[...slug].astro Renders each docs/*.md (dynamic)
  data/
    spec-meta.ts         Single source of truth for routes, titles, summaries
  content/
    config.ts            Glob loaders pointing at /SPEC.md, /spec, /docs

public/
  favicon, og.png, apple-touch-icon, manifest, robots.txt, sitemap.xml,
  CNAME, .nojekyll, example/feed.xml
```

The Astro site does not duplicate the canonical markdown; the `glob({ base: '../...' })` loaders read the same files the IETF draft references. To add a new companion specification, drop the `.md` into `/spec/` and add one entry to `src/data/spec-meta.ts`.

## Local development

```
cd site
npm install
npm run dev      # http://localhost:4321/
npm run build    # static output at site/dist/
npm run preview  # serve site/dist/
```

Node 18.17+ or 20+ required.

## Deployment

`.github/workflows/pages.yml` runs `npm ci && npm run build` on every push to `main` that touches `site/`, `SPEC.md`, `spec/`, or `docs/`, then uploads `site/dist/` to GitHub Pages. The CNAME file (`site/public/CNAME`) routes the canonical custom domain to the deployment.

The first deploy requires **Settings → Pages → Build and deployment → Source: GitHub Actions** in the GitHub repository.

## DNS, Cloudflare

All three domains are in Cloudflare:

- **`openmembership.org`**, canonical. Apex points at GitHub Pages.
- **`open-membership.org`**, redirect-only. 301 to canonical via a Cloudflare Single Redirect rule.
- **`open-membership.com`**, redirect-only. Same.

### `openmembership.org` (canonical)

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

Set proxy to **DNS only** (grey cloud). GitHub Pages issues its own Let's Encrypt certificate for the apex; an orange-cloud proxy interferes with the certificate provisioning unless Cloudflare's SSL mode is configured carefully (Full strict + an origin cert). The grey-cloud setup is simpler.

After the records propagate: in the GitHub repo, **Settings → Pages → Custom domain** → enter `openmembership.org`. Wait for the DNS check to pass and the cert to issue. Then tick **Enforce HTTPS**.

### `open-membership.org` and `open-membership.com` (redirect-only)

These zones get a single placeholder DNS record so Cloudflare knows the zone is active:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `192.0.2.1` | Proxied |
| CNAME | `www` | `@` | Proxied |

In **Rules → Redirect Rules** on each redirect-only zone:

- **Rule name:** `Canonicalise to openmembership.org`
- **When incoming requests match:** `(http.host eq "open-membership.org" or http.host eq "www.open-membership.org")` *(adjust for the .com zone)*
- **Then:** Type Dynamic; Expression `concat("https://openmembership.org", http.request.uri.path)`; Status `301`; Preserve query string on.

Or run [`scripts/cloudflare-setup.sh`](../scripts/cloudflare-setup.sh) with a Cloudflare API token to apply the records and rules idempotently.

## Icon assets

```
public/favicon.svg          SVG source, modern browsers use this directly
public/favicon.ico          multi-resolution fallback (16/32/48/64)
public/icon.svg             256×256 SVG (manifest source)
public/icon-192.png         PWA manifest icon
public/icon-512.png         PWA manifest icon, large
public/apple-touch-icon.png 180×180 for iOS home-screen pin
public/og.svg               1200×630 SVG source for the social preview card
public/og.png               1200×630 PNG, the actual og:image
public/manifest.webmanifest PWA app manifest
```

To regenerate the PNG/ICO outputs after editing the SVG sources:

```
./build-icons.sh
```

Requires `librsvg` and `imagemagick` (`brew install librsvg imagemagick` on macOS).
