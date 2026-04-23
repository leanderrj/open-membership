import { test } from "node:test";
import assert from "node:assert/strict";
import { tierForPriceId, featuresForTier } from "../shared/config.js";
import { fixtureConfig } from "./fixtures.js";

test("tierForPriceId resolves known prices", () => {
  assert.equal(tierForPriceId(fixtureConfig(), "price_monthly_123"), "paid");
});

test("tierForPriceId returns null for unknown prices", () => {
  assert.equal(tierForPriceId(fixtureConfig(), "price_unknown"), null);
});

test("featuresForTier returns the feature list or empty", () => {
  assert.deepEqual(featuresForTier(fixtureConfig(), "paid"), [
    "full-text",
    "ad-free",
  ]);
  assert.deepEqual(featuresForTier(fixtureConfig(), "free"), []);
  assert.deepEqual(featuresForTier(fixtureConfig(), "missing"), []);
});
