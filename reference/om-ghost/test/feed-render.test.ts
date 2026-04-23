import { test } from "node:test";
import assert from "node:assert/strict";
import { renderFeed, decideAccess } from "../shared/feed-render.js";
import {
  fixtureConfig,
  fixturePosts,
  fixturePaidMember,
  fixtureFreeMember,
} from "./fixtures.js";

test("renderFeed returns well-formed XML with the om namespace", () => {
  const xml = renderFeed({
    config: fixtureConfig(),
    publicUrl: "https://publisher.example",
    feedTokenInUrl: "tok-abc",
    member: fixturePaidMember(),
    posts: fixturePosts(),
  });

  assert.match(xml, /^\s*<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(
    xml,
    /xmlns:om="http:\/\/purl\.org\/rss\/modules\/membership\/"/,
  );
  assert.match(
    xml,
    /<om:provider>https:\/\/publisher\.example<\/om:provider>/,
  );
  assert.match(
    xml,
    /<atom:link href="https:\/\/publisher\.example\/feed\/om\/tok-abc\//,
  );
});

test("renderFeed escapes special characters in titles", () => {
  const xml = renderFeed({
    config: fixtureConfig(),
    publicUrl: "https://publisher.example",
    feedTokenInUrl: "tok",
    member: fixturePaidMember(),
    posts: fixturePosts(),
  });

  // The title "A public post <with> markup & stuff" must be entity-escaped.
  assert.match(xml, /A public post &lt;with&gt; markup &amp; stuff/);
});

test("renderFeed emits content:encoded for entitled paid posts", () => {
  const xml = renderFeed({
    config: fixtureConfig(),
    publicUrl: "https://publisher.example",
    feedTokenInUrl: "tok",
    member: fixturePaidMember(),
    posts: fixturePosts(),
  });

  // Paid post HTML should be present in CDATA.
  assert.match(xml, /<!\[CDATA\[<p>Secret paid content\.<\/p>\]\]>/);
});

test("renderFeed suppresses paid content for free/no-member", () => {
  const xmlNoMember = renderFeed({
    config: fixtureConfig(),
    publicUrl: "https://publisher.example",
    feedTokenInUrl: "tok",
    member: null,
    posts: fixturePosts(),
  });

  // When there's no member, we emit only the not-entitled item.
  assert.match(xmlNoMember, /Your subscription is not active/);
  assert.doesNotMatch(xmlNoMember, /Secret paid content/);
});

test("decideAccess maps Ghost visibility values correctly", () => {
  const member = fixturePaidMember();
  const [pub, paid, members] = fixturePosts();
  assert.deepEqual(decideAccess(pub!, member), {
    access: "open",
    requiredFeatures: [],
    grantContent: true,
  });
  assert.deepEqual(decideAccess(paid!, member), {
    access: "locked",
    requiredFeatures: [],
    grantContent: true,
  });
  assert.deepEqual(decideAccess(members!, member), {
    access: "members-only",
    requiredFeatures: [],
    grantContent: true,
  });
});

test("decideAccess denies paid content to free members", () => {
  const free = fixtureFreeMember();
  const [, paid] = fixturePosts();
  const decision = decideAccess(paid!, free);
  assert.equal(decision.access, "locked");
  assert.equal(decision.grantContent, false);
});
