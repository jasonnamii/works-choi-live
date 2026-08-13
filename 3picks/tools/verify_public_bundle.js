"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadAssignment(file, target) {
  const context = { window: target };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), context, { filename: file });
}

function main() {
  const root = path.resolve(process.argv[2] || "");
  if (!root || !fs.existsSync(path.join(root, "index.html"))) throw new Error("검사할 공개 번들 폴더가 올바르지 않습니다.");
  const forbidden = ["operations", "docs", "data", "tools", path.join("assets", "archive")];
  forbidden.forEach((relative) => {
    if (fs.existsSync(path.join(root, relative))) throw new Error(`공개 번들에 내부 폴더가 있습니다: ${relative}`);
  });
  ["admin.html", "SETUP-GUIDE.html", "PRODUCTION-READINESS.html"].forEach((name) => {
    if (fs.existsSync(path.join(root, name))) throw new Error(`공개 번들에 내부 파일이 있습니다: ${name}`);
  });

  const sourceProducts = fs.readFileSync(path.join(root, "assets", "products-data.js"), "utf8");
  const sourceOverrides = fs.readFileSync(path.join(root, "site-overrides.js"), "utf8");
  if (/\bsupplier\b/.test(`${sourceProducts}\n${sourceOverrides}`)) throw new Error("공개 상품 데이터에 supplier 필드가 남았습니다.");

  const target = {};
  loadAssignment(path.join(root, "assets", "products-data.js"), target);
  loadAssignment(path.join(root, "site-overrides.js"), target);
  if (!Array.isArray(target.PRODUCTS) || target.PRODUCTS.length !== 110) throw new Error("기본 상품 110개 계약이 깨졌습니다.");
  const rows = [...target.PRODUCTS, ...(target.SITE_OVERRIDES.productAdditions || [])];
  const imagePaths = [...new Set(rows.flatMap((product) => product.images || []))];
  const missing = imagePaths.filter((relative) => !fs.existsSync(path.join(root, relative)));
  if (missing.length) throw new Error(`공개 번들 상품 이미지가 누락됐습니다: ${missing.join(", ")}`);

  console.log(`PASS public-bundle products=${target.PRODUCTS.length} images=${imagePaths.length} supplier=0 internal=0`);
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(`FAIL ${error.message}`); process.exit(1); }
}

module.exports = { loadAssignment, main };
