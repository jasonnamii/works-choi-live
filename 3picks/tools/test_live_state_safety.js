"use strict";

const assert = require("node:assert/strict");
const { checkedBaseUrl, parseOverrides, serializeOverrides } = require("./pull_live_state.js");

const valid = {
  version: 2,
  updatedAt: null,
  eventMap: null,
  weights: null,
  productOverrides: { p001: { name: "안전한 이름", images: ["assets/products/p001-01.webp"] } },
  productAdditions: [],
};
const source = serializeOverrides(valid);
assert.deepEqual(parseOverrides(source), valid);
assert.throws(() => parseOverrides(`${source}\nfetch('https://evil.example')`), /단일 SITE_OVERRIDES/);
assert.throws(() => parseOverrides(serializeOverrides({ ...valid, unexpected: true })), /예상 밖 필드/);
assert.throws(() => parseOverrides(serializeOverrides({ ...valid, productOverrides: { p001: { images: ["../secret"] } } })), /이미지 경로/);
assert.equal(checkedBaseUrl("https://works.choi.build/3picks").href, "https://works.choi.build/3picks/");
assert.throws(() => checkedBaseUrl("http://works.choi.build/3picks"), /HTTPS/);
assert.throws(() => checkedBaseUrl("https://example.com/3picks"), /허용된/);

console.log("PASS live-state-safety host+https+single-assignment+schema+image-path");
