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
  [html.includes("left:50%;top:5%;width:auto;height:90%;max-width:none;object-fit:contain;object-position:center;transform:translateX(-69%)"), "centered mobile key visual geometry at 90%"],
  [html.includes(".proof-strip__grid{display:grid;grid-template-columns:1fr"), "stacked mobile proof items"],
  [html.includes("max-height:calc(100svh - 24px)"), "dialog viewport cap"],
];

for (const [passed, label] of checks) assert.ok(passed, `Missing mobile invariant: ${label}`);

const sourceWidth = 1672;
const sourceHeight = 941;
const visualLeft = 660;
const visualRight = 1640;
for (const viewport of [320, 360, 390, 430]) {
  const frameHeight = (viewport <= 360 ? 280 : 310) * 0.9;
  const scale = frameHeight / sourceHeight;
  const renderedWidth = sourceWidth * scale;
  const imageLeft = viewport / 2 - renderedWidth * 0.69;
  const left = imageLeft + visualLeft * scale;
  const right = imageLeft + visualRight * scale;
  const center = (left + right) / 2;
  assert.ok(left >= 0 && right <= viewport, `Key visual clips at ${viewport}px: ${left}..${right}`);
  assert.ok(Math.abs(center - viewport / 2) <= 8, `Key visual is off-center at ${viewport}px: ${center}`);
}

const openBraces = [...html].filter((character) => character === "{").length;
const closeBraces = [...html].filter((character) => character === "}").length;
assert.equal(openBraces, closeBraces, "Unbalanced CSS/JS braces in index.html");

console.log(`PASS mobile invariants=${checks.length} braces=${openBraces}`);
