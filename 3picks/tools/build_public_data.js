"use strict";

const fs = require("node:fs");
const path = require("node:path");

function parseAssignment(source, name) {
  const match = source.match(new RegExp(`^\\s*window\\.${name}\\s*=\\s*([\\s\\S]+);\\s*$`));
  if (!match) throw new Error(`${name} 형식이 예상과 다릅니다.`);
  return JSON.parse(match[1]);
}

function stripInternalProductFields(product) {
  const { supplier, ...publicProduct } = product || {};
  return publicProduct;
}

function publicProductsSource(source) {
  const products = parseAssignment(source, "PRODUCTS");
  if (!Array.isArray(products)) throw new Error("PRODUCTS가 배열이 아닙니다.");
  return `window.PRODUCTS=${JSON.stringify(products.map(stripInternalProductFields))};\n`;
}

function publicOverridesSource(source) {
  const overrides = parseAssignment(source.replace(/^\s*(?:\/\/[^\n]*\n)*/, ""), "SITE_OVERRIDES");
  const productOverrides = Object.fromEntries(Object.entries(overrides.productOverrides || {}).map(([id, patch]) => {
    const { supplier, ...publicPatch } = patch || {};
    return [id, publicPatch];
  }));
  const clean = {
    ...overrides,
    productOverrides,
    productAdditions: (overrides.productAdditions || []).map(stripInternalProductFields),
  };
  return [
    "// 3PICKS 공개 운영 설정 — 내부 공급처 필드는 배포 전에 제거됩니다.",
    `window.SITE_OVERRIDES = ${JSON.stringify(clean, null, 2)};`,
    "",
  ].join("\n");
}

function main() {
  const [inputRoot, outputRoot] = process.argv.slice(2);
  if (!inputRoot || !outputRoot) throw new Error("사용: node tools/build_public_data.js <입력루트> <출력루트>");
  const input = path.resolve(inputRoot);
  const output = path.resolve(outputRoot);
  const products = publicProductsSource(fs.readFileSync(path.join(input, "assets", "products-data.js"), "utf8"));
  const overrides = publicOverridesSource(fs.readFileSync(path.join(input, "site-overrides.js"), "utf8"));
  fs.writeFileSync(path.join(output, "assets", "products-data.js"), products);
  fs.writeFileSync(path.join(output, "site-overrides.js"), overrides);
  console.log(`PUBLIC_DATA_OK products=${(products.match(/\"id\":/g) || []).length} supplier=0`);
}

if (require.main === module) main();
module.exports = { parseAssignment, stripInternalProductFields, publicProductsSource, publicOverridesSource };
