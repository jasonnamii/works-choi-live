"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");

const checks = [
  [html.includes("viewport-fit=cover"), "safe-area viewport"],
  [html.includes("@media (max-width:600px)"), "mobile breakpoint"],
  [html.includes("@media (max-width:360px)"), "compact-phone breakpoint"],
  [html.includes("body{overflow-x:clip"), "horizontal overflow guard"],
  [html.includes("grid-auto-columns:min(84vw,330px)"), "single-card mobile rail"],
  [html.includes("height:min(680px,calc(100svh"), "viewport-aware quote sheet"],
  [html.includes("grid-template-columns:1fr;grid-template-rows:auto auto auto"), "stacked quote layout"],
  [html.includes("bottom:env(safe-area-inset-bottom)"), "survey action safe area"],
  [!html.includes("3분 만에 3 PICKS 받기") && !html.includes("상품 먼저 보기"), "hero actions removed"],
  [!html.includes("class=\"mobile-cta\""), "duplicate fixed CTA removed"],
  [html.includes("transform:scale(.9);transform-origin:center"), "desktop key visual scaled to 90%"],
  [html.includes("object-fit:contain;object-position:center;transform:scale(.9)"), "desktop key visual fully contained"],
  [html.includes("padding:36px clamp(24px,4vw,64px) 64px 0;display:flex;flex-direction:column;justify-content:flex-start"), "desktop hero copy aligned to visual top"],
  [html.includes(".hero__grid{display:flex;flex-direction:column}"), "mobile hero vertical flow"],
  [html.includes("order:0;width:100%;height:auto;aspect-ratio:1671/941"), "mobile hero image comes first"],
  [html.includes(".hero__copy{order:1;width:100%;min-height:0"), "mobile hero copy follows image"],
  [html.includes("object-fit:contain;object-position:center;transform:translateX(-18.7313%)"), "mobile visible key visual centered"],
  [html.includes(".proof-strip__grid{display:grid;grid-template-columns:1fr"), "stacked mobile proof items"],
  [html.includes("max-height:calc(100svh - 24px)"), "dialog viewport cap"],
  [html.includes("animation:quote-heartbeat 1.3s ease-in-out infinite"), "heart-only double-speed heartbeat"],
  [html.includes("12%{transform:scale(5)}") && html.includes("42%{transform:scale(3.6)}"), "fivefold heartbeat peak"],
  [html.includes("gap:5px;overflow:visible;font-family"), "heartbeat may exceed trigger bounds"],
  [html.includes(".quote-trigger__heart{animation:none}"), "reduced-motion heartbeat override"],
];

for (const [passed, label] of checks) assert.ok(passed, `Missing mobile invariant: ${label}`);

const heroFigure = html.indexOf('<figure class="hero__backdrop"');
const heroCopy = html.indexOf('<div class="hero__copy">');
assert.ok(heroFigure >= 0 && heroCopy > heroFigure, "Hero image must precede copy in DOM order");

const openBraces = [...html].filter((character) => character === "{").length;
const closeBraces = [...html].filter((character) => character === "}").length;
assert.equal(openBraces, closeBraces, "Unbalanced CSS/JS braces in index.html");

console.log(`PASS mobile invariants=${checks.length} braces=${openBraces}`);
