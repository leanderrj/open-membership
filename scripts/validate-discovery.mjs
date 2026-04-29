#!/usr/bin/env node
// Validate every JSON example labelled as a .well-known/open-membership
// discovery document inside SPEC.md against the JSON Schema.
//
// We extract `json` fenced blocks from SPEC.md whose contents look like
// discovery documents (heuristic: contains `"spec_version"` or
// `"verifiable_credentials"`), then validate each against the schema.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const specPath = resolve(repoRoot, 'SPEC.md');
const schemaPath = resolve(repoRoot, 'spec/schemas/om-discovery.schema.json');

const spec = readFileSync(specPath, 'utf8');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const fenceRe = /```json\s*\n([\s\S]*?)\n```/g;
const partial = [];
const candidates = [];
let m;
while ((m = fenceRe.exec(spec)) !== null) {
  const body = m[1];
  if (!body.includes('"spec_version"') && !body.includes('"verifiable_credentials"')) {
    continue;
  }
  // SPEC.md uses elision tokens like `"...": "all 0.3 fields preserved"` to
  // signal "the rest of the previous example carries through". Such snippets
  // are illustrative deltas, not standalone documents, and we must not
  // schema-validate them as complete examples.
  if (/"\.\.\."\s*:/.test(body) || /"\.\.\."\s*,/.test(body)) {
    partial.push(body);
    continue;
  }
  candidates.push(body);
}

if (candidates.length === 0) {
  console.log(`OK: no complete discovery-document examples to validate (${partial.length} partial example(s) skipped).`);
  process.exit(0);
}

let failed = 0;
candidates.forEach((raw, i) => {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`FAIL: example #${i + 1} did not parse as JSON: ${err.message}`);
    failed += 1;
    return;
  }
  const ok = validate(parsed);
  if (!ok) {
    console.error(`FAIL: example #${i + 1} did not match the discovery schema:`);
    for (const e of validate.errors) {
      console.error(`  ${e.instancePath || '(root)'}: ${e.message}`);
    }
    failed += 1;
  }
});

if (failed > 0) {
  console.error(`\n${failed} discovery example(s) failed validation.`);
  process.exit(1);
}
console.log(`OK: ${candidates.length} discovery example(s) validated.`);
