"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");

const expectedGroup = ["맞춤추천", "카카오톡 상담하기", "이메일문의"];
const groupPattern = /<(?:div) class="[^"]*(?:nav-actions|cta-actions)[^"]*">([\s\S]*?)<\/div>/g;
const groups = [...html.matchAll(groupPattern)].map((match) =>
  [...match[1].matchAll(/<(?:a|button)[^>]*>([^<]+)<\/(?:a|button)>/g)].map((item) => item[1].trim()),
);

assert.equal(groups.length, 2, "상·하단 CTA 그룹은 정확히 2개여야 합니다.");
groups.forEach((labels) => assert.deepEqual(labels, expectedGroup, "상·하단 CTA 문구와 순서가 다릅니다."));
assert.equal((html.match(/href="#recommend">맞춤추천<\/a>/g) || []).length, 2, "맞춤추천 링크 수가 다릅니다.");
assert.equal((html.match(/data-consult>카카오톡 상담하기<\/button>/g) || []).length, 2, "카카오톡 CTA 수가 다릅니다.");
assert.equal((html.match(/data-email-link>이메일문의<\/a>/g) || []).length, 2, "이메일 CTA 수가 다릅니다.");
assert.ok(app.includes('document.querySelectorAll("[data-email-link]")'), "이메일 링크가 config와 연결되지 않았습니다.");
assert.ok(html.includes(".cta-actions{display:grid;grid-template-columns:repeat(3,max-content);gap:8px}"), "공통 CTA 레이아웃이 없습니다.");
assert.ok(html.includes(".nav-actions{gap:6px}"), "상단 CTA 간격 축소가 없습니다.");
assert.ok(html.includes(".nav-actions .tp-btn{min-height:40px;padding:8px 12px;font-size:13px;letter-spacing:0}"), "상단 CTA 크기 축소가 없습니다.");
assert.ok(html.includes(".nav-actions{width:100%;grid-template-columns:auto minmax(0,1fr) auto;gap:4px}"), "모바일 상단 CTA 행이 없습니다.");
assert.ok(!html.includes('.nav-actions .tp-btn--secondary{display:none}'), "모바일에서 CTA를 숨기는 기존 규칙이 남아 있습니다.");
assert.ok(html.includes(".category-strip__inner{position:relative;display:flex;width:100%;min-width:0;"), "카테고리 레일 데스크톱 폭 잠금이 없습니다.");
assert.ok(html.includes(".category-chip{display:flex;flex:1 1 auto;min-width:0;align-items:center;justify-content:center;"), "카테고리 칩 레일 내 가변 분배 규칙이 없습니다.");
assert.ok(html.includes(".category-strip__inner{width:max-content;min-width:100%}"), "모바일 카테고리 가로 스크롤 규칙이 없습니다.");
assert.ok(!html.includes("견적 문의"), "기존 상단 CTA가 남아 있습니다.");
assert.ok(!html.includes("담당자 연락처 복사</button>\n        </div>\n      </div>\n    </section>"), "기존 하단 CTA가 남아 있습니다.");

console.log("PASS CTA groups=2 actions=3 labels/order/config-linked");
