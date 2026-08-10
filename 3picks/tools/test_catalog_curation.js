"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

global.window = {};
require("../assets/products-data.js");

const html = fs.readFileSync("index.html", "utf8");
const products = global.window.PRODUCTS;
const selected = products.filter((product) => product.visibility === "화면노출");

assert.equal(products.length, 110, "Reviewed count changed");
assert.equal(selected.length, 73, "Selected count changed");
assert.ok(html.includes("<span class=\"curation-stars\" aria-hidden=\"true\">★★★★★</span>"), "Curation stars missing");
assert.ok(html.includes("7,300여 개 리서치 데이터에서 66대 1의 경쟁률을 뚫은 110개 굿즈를 제안드립니다"), "Accessible curation summary missing");
assert.ok(html.includes("<strong>7,300+</strong>개 리서치 데이터에서 고른"), "Research data copy missing");
assert.ok(html.includes("<h2><mark>66대 1</mark>의 경쟁률을 뚫은<br>110개의 굿즈를 제안드려요</h2>"), "Copy-led curation headline missing");
assert.ok(html.includes(".catalog-intro h2{max-width:18ch;margin-top:22px;font-size:clamp(56px,6.4vw,88px);line-height:1.02}"), "Desktop curation headline scale missing");
assert.ok(html.includes(".catalog-intro h2{max-width:13ch;margin-top:14px;font-size:40px}"), "Mobile curation headline scale missing");
assert.ok(!html.includes("curation-proof"), "Graph-style curation proof remains");
assert.ok(!html.includes("행사 굿즈, 천천히 둘러보세요"), "Old catalog headline remains");

console.log(`PASS catalog curation reviewed=${products.length} selected=${selected.length}`);
