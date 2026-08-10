"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync("index.html", "utf8");
const backup = path.resolve("../../../Temp/3picks-hero-copy-backup-260810-1718.md");

assert.ok(fs.existsSync(backup), "Previous hero copy backup is missing");
assert.ok(html.includes("Three picks, until it clicks"), "New hero eyebrow is missing");
assert.ok(html.includes("<h1><span>마음에 들</span><span>때까지,</span><span>세 가지씩.</span></h1>"), "New hero headline is missing");
assert.ok(html.includes("비교와 견적, 내부 보고용 자료까지"), "End-to-end service promise is missing");
assert.ok(html.includes("담당자는 링크만 공유하세요"), "Low-friction handoff promise is missing");
assert.ok(html.includes(".hero__lead{max-width:36ch;margin:0 0 24px;font-size:clamp(20px,1.6vw,24px);font-weight:700;line-height:1.5;color:var(--tp-ink)}"), "Desktop hero lead emphasis is missing");
assert.ok(html.includes(".hero__lead{margin-bottom:18px;font-size:18px;font-weight:700;line-height:1.5}"), "Mobile hero lead emphasis is missing");
assert.ok(!html.includes("3분 만에 3 PICKS 받기"), "Hero recommendation CTA remains active");
assert.ok(!html.includes("상품 먼저 보기"), "Hero catalog CTA remains active");
assert.ok(!html.includes("<h1><span>우리 행사에</span><span>맞는 굿즈,</span><span>세 가지만.</span></h1>"), "Old hero headline remains active");

console.log("PASS hero copy backup and service promise");
