"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync("index.html", "utf8");
const backup = path.resolve("../../../Temp/3picks-hero-copy-backup-260810-1718.md");

assert.ok(fs.existsSync(backup), "Previous hero copy backup is missing");
assert.ok(html.includes("Three picks, until it clicks"), "New hero eyebrow is missing");
assert.ok(html.includes("<h1><span>마음에 들</span><span>때까지,</span><span>세 가지씩.</span></h1>"), "New hero headline is missing");
const heroCopy = html.match(/<div class="hero__copy">([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/)?.[1] || "";
const catalogIntro = html.match(/<div class="section-head catalog-intro"[\s\S]*?<div id="catalogHost">/)?.[0] || "";
assert.ok(!heroCopy.includes("보이는 상품이 전부가 아니에요"), "Expanded product range promise remains in the hero");
assert.ok(catalogIntro.includes("보이는 상품이 전부가 아니에요"), "Expanded product range promise is missing from the catalog intro");
assert.ok(catalogIntro.includes("더 넓게 찾아 세 가지 안으로 제안하고, 제작까지 맡아드릴게요"), "End-to-end sourcing promise is missing from the catalog intro");
assert.ok(catalogIntro.includes("정해진 제품이 없어도 괜찮아요"), "Idea-first consultation promise is missing from the catalog intro");
const copyStack = html.match(/<div class="hero__copy-stack"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "";
const copyStackLabels = [...copyStack.matchAll(/<span>([^<]+)<\/span>/g)].map((match) => match[1]);
assert.deepEqual(copyStackLabels, ["찾고,", "비교하고,", "보고하는 귀찮은 일.", "이제 3PICKS에 시키세요."], "Hero copy labels must remain four exact lines");
assert.ok(html.includes(".hero__copy-stack{display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-top:auto"), "Desktop hero copy stack is not anchored in the lower-left whitespace");
assert.ok(html.includes(".hero__copy-stack span{display:block;width:max-content;max-width:100%"), "Hero copy labels do not fit their individual sentence widths");
assert.ok(html.includes("padding-top:24px;background:transparent"), "Hero copy stack parent must not become a large filled box");
assert.equal((html.match(/이제 3PICKS에 시키세요\./g) || []).length, 2, "Hero and story ending must both contain the copy");
assert.ok(html.includes("assets/3-picks-key-visual-tshirt-v2.webp"), "T-shirt hero asset is missing");
assert.ok(html.includes(".catalog-promise{display:grid;grid-template-columns:minmax(0,14fr) minmax(360px,11fr)"), "Desktop catalog promise layout is missing");
assert.ok(html.includes(".catalog-promise__note span{white-space:nowrap}"), "Desktop catalog promise note is not held to one line");
assert.ok(html.includes(".catalog-promise{grid-template-columns:1fr;width:100%;margin-top:28px}"), "Responsive catalog promise stack is missing");
assert.ok(!html.includes("3분 만에 3 PICKS 받기"), "Hero recommendation CTA remains active");
assert.ok(!html.includes("상품 먼저 보기"), "Hero catalog CTA remains active");
assert.ok(!html.includes("<h1><span>우리 행사에</span><span>맞는 굿즈,</span><span>세 가지만.</span></h1>"), "Old hero headline remains active");

console.log("PASS hero copy backup, catalog promise relocation, four-label stack, and duplicated story ending copy");
