"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const app = fs.readFileSync("app.js", "utf8");

const checks = [
  [html.includes("viewport-fit=cover"), "safe-area viewport"],
  [html.includes("@media (max-width:600px)"), "mobile breakpoint"],
  [html.includes(".site-header{position:relative;top:auto}"), "mobile header scrolls away instead of covering content"],
  [html.includes("html{scroll-padding-top:16px}"), "mobile anchor offset matches non-sticky header"],
  [html.includes("section[id]{scroll-margin-top:16px}"), "mobile section anchors keep a compact top margin"],
  [html.includes("@media (max-width:360px)"), "compact-phone breakpoint"],
  [html.includes("body{overflow-x:clip"), "horizontal overflow guard"],
  [html.includes("grid-auto-columns:calc(45.4545% - .9091px)"), "two-point-two-card mobile rail"],
  [!html.includes("grid-auto-columns:88vw"), "compact phones retain two-point-two-card rail"],
  [html.includes(".product-card__name{min-height:76px;font-size:13px;line-height:1.45}"), "compact mobile product names"],
  [html.includes(".product-card__price strong{margin-top:2px;font-size:16px;text-align:right}"), "compact mobile product prices"],
  [html.includes(".swatch{width:100%;height:44px}"), "mobile color swatches keep a full touch target"],
  [html.includes("height:min(680px,calc(100svh"), "viewport-aware quote sheet"],
  [html.includes("grid-template-columns:1fr;grid-template-rows:auto auto auto"), "stacked quote layout"],
  [html.includes("grid-template-rows:minmax(0,1fr)"), "quote bar height ignores quantity-dependent minimum content"],
  [html.includes("grid-template-rows:repeat(3,minmax(0,1fr))"), "quote actions keep fixed vertical tracks"],
  [html.includes(".quote-item__price{height:53px"), "quote item price reserves minimum-order copy height"],
  [html.includes("data-quote-clear disabled>비우기</button>"), "quote header clear action"],
  [html.includes(".quote-bar{height:208px;min-width:0;border:1px solid var(--tp-ink);background:var(--tp-cream)"), "quote bar keeps the original beige palette"],
  [html.includes("--tp-shadow-overlay:4px 4px 0 var(--tp-ink)") && html.includes(".quote-float.is-open{box-shadow:var(--tp-shadow-overlay)}"), "quote palette uses a four-pixel hard offset black-paper layer without blur"],
  [html.includes(".quote-items{min-width:0;min-height:0;display:flex;overflow-x:auto;scrollbar-width:thin;scroll-snap-type:x proximity;background:var(--tp-cream)}"), "quote list remainder replaces the incorrect dark gray with beige"],
  [html.includes("padding:12px;border-right:1px solid var(--tp-line);background:var(--tp-cream)"), "every populated quote item closes with a right separator"],
  [html.includes("justify-content:center;padding:16px;background:var(--tp-cream)") && html.includes("font-size:14px;text-align:center"), "empty quote guidance is centered on the beige palette"],
  [html.includes("padding:12px;border-right:1px solid var(--tp-line);background:var(--tp-cream);scroll-snap-align:start") && html.includes("object-fit:contain;background:var(--tp-cream)"), "individual quote product cards retain the original beige surface"],
  [html.includes("border-right:1px solid var(--tp-line);background:var(--tp-cream)"), "quote summary retains the original beige palette surface"],
  [html.includes("bottom:env(safe-area-inset-bottom)"), "survey action safe area"],
  [!html.includes("3분 만에 3 PICKS 받기") && !html.includes("상품 먼저 보기"), "hero actions removed"],
  [!html.includes("class=\"mobile-cta\""), "duplicate fixed CTA removed"],
  [html.includes("transform:scale(.9);transform-origin:center"), "desktop key visual scaled to 90%"],
  [html.includes("object-fit:contain;object-position:center;transform:scale(.9)"), "desktop key visual fully contained"],
  [html.includes("padding:36px clamp(24px,4vw,64px) 64px 0;display:flex;flex-direction:column;justify-content:flex-start"), "desktop hero copy aligned to visual top"],
  [html.includes(".hero__grid{display:flex;flex-direction:column}"), "mobile hero vertical flow"],
  [html.includes("order:0;width:100%;height:auto;aspect-ratio:1671/941"), "mobile hero image comes first"],
  [html.includes(".hero__copy{order:1;width:100%;min-height:0"), "mobile hero copy follows image"],
  [html.includes(".main-links{grid-column:1/-1;grid-row:2;display:grid;grid-template-columns:repeat(4,minmax(0,1fr))"), "mobile primary navigation visible in four columns"],
  [html.includes(".main-links a{min-width:0;min-height:44px"), "mobile primary navigation touch targets"],
  [html.includes("gap:0;width:100%;border:0"), "mobile primary navigation has no table frame"],
  [html.includes("white-space:normal;border:0;background:transparent"), "mobile primary navigation has no cell dividers"],
  [html.includes(".result-intro{grid-template-columns:1fr}"), "mobile recommendation intro stacks"],
  [html.includes(".result-group{grid-template-columns:repeat(2,minmax(0,1fr))}"), "mobile recommendation group uses two-by-two table"],
  [html.includes("object-fit:contain;object-position:center;transform:translateX(-18.7313%)"), "mobile visible key visual centered"],
  [html.includes(".proof-strip__grid{display:grid;grid-template-columns:1fr"), "stacked mobile proof items"],
  [html.includes("max-height:calc(100svh - 24px)"), "dialog viewport cap"],
  [html.includes("animation:quote-heartbeat 1.3s ease-in-out infinite"), "heart-only double-speed heartbeat"],
  [html.includes("12%{transform:scale(3)}") && html.includes("42%{transform:scale(1.5)}"), "threefold and one-point-fivefold heartbeat peaks"],
  [html.includes("gap:5px;overflow:visible;font-family"), "heartbeat may exceed trigger bounds"],
  [html.includes(".quote-trigger__heart{animation:none}"), "reduced-motion heartbeat override"],
  [app.includes('document.addEventListener("pointerdown", (event) => {') && app.includes('els.quoteFloat.contains(event.target) || event.target.closest("[data-wishlist-toggle]")'), "outside quote pointer closes while consecutive product hearts keep the quote open"],
  [app.includes('quoteState.items = [];') && app.includes('emit("wishlist_clear"') && app.includes('showToast("미니 견적을 비웠어요.")'), "quote clear empties items and synchronizes feedback"],
];

for (const [passed, label] of checks) assert.ok(passed, `Missing mobile invariant: ${label}`);

const heroFigure = html.indexOf('<figure class="hero__backdrop"');
const heroCopy = html.indexOf('<div class="hero__copy">');
assert.ok(heroFigure >= 0 && heroCopy > heroFigure, "Hero image must precede copy in DOM order");
assert.equal((html.match(/<a href="#about">스토리<\/a>/g) || []).length, 2, "GNB와 푸터의 스토리 라벨이 일치하지 않습니다.");
assert.equal((html.match(/<a href="#about">Our brand story<\/a>/g) || []).length, 0, "내비게이션에 영문 Our brand story 라벨이 남아 있습니다.");
assert.equal((html.match(/<a href="#about">멤버 소개<\/a>/g) || []).length, 0, "폐기한 멤버 소개 메뉴 라벨이 남아 있습니다.");
assert.ok(!html.includes('href="#about">회사소개'), "이전 회사소개 메뉴 라벨이 남아 있습니다.");
assert.ok(!html.includes(".main-links{display:none}"), "모바일에서 대분류 메뉴를 숨기는 규칙이 남아 있습니다.");

const openBraces = [...html].filter((character) => character === "{").length;
const closeBraces = [...html].filter((character) => character === "}").length;
assert.equal(openBraces, closeBraces, "Unbalanced CSS/JS braces in index.html");

console.log(`PASS mobile invariants=${checks.length} braces=${openBraces}`);
