"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync("index.html", "utf8");
const backup = path.resolve("../../../Temp/3picks-hero-copy-backup-260810-1718.md");

assert.ok(fs.existsSync(backup), "Previous hero copy backup is missing");
assert.ok(html.includes("Three picks, until it clicks"), "New hero eyebrow is missing");
assert.ok(html.includes("<h1><span>마음에 들</span><span>때까지,</span><span>세 가지씩.</span></h1>"), "New hero headline is missing");
assert.ok(html.includes("보이는 상품이 전부가 아니에요"), "Expanded product range promise is missing");
assert.ok(html.includes("더 넓게 찾아 세 가지 안으로 제안하고, 제작까지 맡아드릴게요"), "End-to-end sourcing promise is missing");
assert.ok(html.includes("정해진 제품이 없어도 괜찮아요"), "Idea-first consultation promise is missing");
const copyStack = html.match(/<div class="hero__copy-stack"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "";
const copyStackLabels = [...copyStack.matchAll(/<span>([^<]+)<\/span>/g)].map((match) => match[1]);
assert.deepEqual(copyStackLabels, ["찾고,", "비교하고,", "보고하는 귀찮은 일.", "이제 3PICKS에 시키세요."], "Hero copy labels must remain four exact lines");
assert.ok(html.includes(".hero__copy-stack{display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin-top:auto"), "Desktop hero copy stack is not anchored in the lower-left whitespace");
assert.ok(html.includes(".hero__copy-stack span{display:block;width:max-content;max-width:100%"), "Hero copy labels do not fit their individual sentence widths");
assert.ok(html.includes("padding-top:24px;background:transparent"), "Hero copy stack parent must not become a large filled box");
assert.equal((html.match(/이제 3PICKS에 시키세요\./g) || []).length, 2, "Hero and story ending must both contain the copy");
assert.ok(html.includes("assets/3-picks-key-visual-tshirt-v2.webp"), "T-shirt hero asset is missing");
assert.ok(html.includes(".hero__lead{max-width:36ch;margin:0 0 24px;font-size:clamp(20px,1.6vw,24px);font-weight:700;line-height:1.5;color:var(--tp-ink)}"), "Desktop hero lead emphasis is missing");
assert.ok(html.includes(".hero__lead{margin-bottom:18px;font-size:18px;font-weight:700;line-height:1.5}"), "Mobile hero lead emphasis is missing");
assert.ok(!html.includes("3분 만에 3 PICKS 받기"), "Hero recommendation CTA remains active");
assert.ok(!html.includes("상품 먼저 보기"), "Hero catalog CTA remains active");
assert.ok(!html.includes("<h1><span>우리 행사에</span><span>맞는 굿즈,</span><span>세 가지만.</span></h1>"), "Old hero headline remains active");

console.log("PASS hero copy backup, four-label stack, and duplicated story ending copy");
