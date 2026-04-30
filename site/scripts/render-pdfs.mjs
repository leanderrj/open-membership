#!/usr/bin/env node
// Render every spec/docs route to PDF using Playwright Chromium.
// Output goes to site/dist/_pdf/<slug>.pdf so Pagefind doesn't index it.
//
// Run after `astro build && astro preview` (or use file:// against
// site/dist/<route>/index.html, which is what we do here for hermeticity).

import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(__dirname, '..');
const distRoot = resolve(siteRoot, 'dist');
const outDir = resolve(distRoot, '_pdf');

const routes = [
  { path: 'spec', file: 'open-membership-rss-0.4' },
  { path: 'spec/portability', file: 'open-membership-portability-1.0' },
  { path: 'spec/activitypub', file: 'open-membership-activitypub-coexistence' },
  { path: 'spec/adapter-profile', file: 'open-membership-adapter-profile' },
  { path: 'spec/syndication-mappings', file: 'open-membership-syndication-mappings' },
  { path: 'spec/sharing-policy', file: 'open-membership-sharing-policy' },
  { path: 'spec/errata-0.4.1', file: 'open-membership-errata-0.4.1' },
  { path: 'docs/featureset', file: 'open-membership-featureset' },
  { path: 'docs/governance', file: 'open-membership-governance' },
  { path: 'docs/reader-architecture', file: 'open-membership-reader-architecture' },
  { path: 'docs/related-work', file: 'open-membership-related-work' },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: pathToFileURL(distRoot + '/').toString() });
const page = await ctx.newPage();

let failures = 0;
for (const r of routes) {
  const localPath = resolve(distRoot, r.path, 'index.html');
  if (!existsSync(localPath)) {
    console.error(`SKIP: ${r.path} not built (${localPath})`);
    failures += 1;
    continue;
  }
  const url = pathToFileURL(localPath).toString();
  console.log(`Rendering ${r.path} → ${r.file}.pdf`);
  await page.goto(url, { waitUntil: 'networkidle' });
  // Hide nav/footer chrome for print.
  await page.addStyleTag({
    content: `
      header.site-header, header.border-b, footer { display: none !important; }
      .anchor, .anchor-mark { display: none !important; }
      nav.bg-paperAlt { background: transparent !important; border: 1px solid #ccc; }
      body { font-size: 11pt; }
      a { text-decoration: underline; color: #1d4ed8; }
    `,
  });
  await page.pdf({
    path: resolve(outDir, `${r.file}.pdf`),
    format: 'A4',
    margin: { top: '24mm', right: '20mm', bottom: '24mm', left: '20mm' },
    printBackground: false,
    preferCSSPageSize: false,
  });
}

await browser.close();

if (failures > 0) {
  console.error(`${failures} route(s) could not be rendered.`);
  process.exit(1);
}
console.log(`OK: rendered ${routes.length} route(s) to ${outDir}/`);
