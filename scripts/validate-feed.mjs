#!/usr/bin/env node
// Validate the example RSS feed in site/public/example/feed.xml against the
// Open Membership XSD profile. The validation only enforces schema compliance
// for elements in the om: namespace; standard RSS elements pass through
// because RSS itself is not strictly schema-defined.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateXML } from 'xmllint-wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const feedPath = resolve(repoRoot, 'site/public/example/feed.xml');
const xsdPath = resolve(repoRoot, 'spec/schemas/om-feed.xsd');

const feed = readFileSync(feedPath, 'utf8');
const xsd = readFileSync(xsdPath, 'utf8');

// xmllint-wasm validates the document against the schema; because the feed
// is RSS 2.0 with the om: namespace overlaid, we extract just the om:
// elements into a synthetic root and validate that subset. This catches
// shape/enum violations without forcing a full RSS XSD.

const omElementRe = /<om:[a-zA-Z][\w:-]*[^>]*?(\/>|>[\s\S]*?<\/om:[a-zA-Z][\w:-]*>)/g;
const matches = feed.match(omElementRe) ?? [];

if (matches.length === 0) {
  console.error('FAIL: example feed contains no om: elements');
  process.exit(2);
}

const synthetic = `<?xml version="1.0" encoding="UTF-8"?>
<root xmlns:om="http://purl.org/rss/modules/membership/">
${matches.join('\n')}
</root>`;

// We validate each om: element individually. Each element is a top-level
// declaration in the XSD; we wrap each fragment in its own document with
// the om: namespace declared on the root element so xmllint can resolve
// the schema target.
let failed = 0;
for (const m of matches) {
  const withNs = m.replace(
    /^<om:([a-zA-Z][\w-]*)/,
    `<om:$1 xmlns:om="http://purl.org/rss/modules/membership/"`,
  );
  const wrapped = `<?xml version="1.0" encoding="UTF-8"?>\n${withNs}`;

  const result = await validateXML({
    xml: [{ fileName: 'frag.xml', contents: wrapped }],
    schema: [xsd],
    extension: 'schema',
  });
  if (!result.valid) {
    failed += 1;
    console.error(`FAIL on element:\n  ${m.split('\n')[0]}`);
    for (const e of result.errors) {
      console.error(`  ${e.message ?? e.rawMessage}`);
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} om: element(s) failed schema validation.`);
  process.exit(1);
}
console.log(`OK: ${matches.length} om: element(s) validated against om-feed.xsd.`);
