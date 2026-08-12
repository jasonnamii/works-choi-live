"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const core = require("../recommendation-core.js");

global.window = {};
require("../assets/products-data.js");

const sourceProducts = global.window.PRODUCTS;
const products = core.selectOperatingProducts(sourceProducts);
const expectedCategoryOrder = [
  "텀블러",
  "에코백",
  "볼펜",
  "우산",
  "티셔츠·단체복",
  "수건·타올",
  "머그컵",
  "보조배터리",
  "노트·다이어리",
  "보온보냉·런치백",
];
const app = fs.readFileSync("app.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const catalogRenderer = app.slice(app.indexOf("function renderCatalog()"), app.indexOf("function questions()"));

assert.equal(sourceProducts.length, 110, "원본 상품 마스터 수가 달라졌습니다.");
assert.deepEqual(core.CATEGORY_ORDER, expectedCategoryOrder, "카테고리 순서가 달라졌습니다.");
assert.equal(core.CATEGORY_ORDER[5], "수건·타올", "수건·타올이 06번이 아닙니다.");
assert.equal(products.length, 100, "사이트 운영 상품이 100개가 아닙니다.");
assert.equal(new Set(products.map((product) => product.id)).size, 100, "운영 상품 ID가 중복됐습니다.");
for (const category of expectedCategoryOrder) {
  const categoryProducts = products.filter((product) => product.category === category);
  assert.equal(categoryProducts.length, 10, `${category} 운영 상품이 10개가 아닙니다.`);
  assert.deepEqual(categoryProducts.map((product) => Number(product.rank)), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], `${category} rank가 1~10이 아닙니다.`);
}
assert.ok(products.some((product) => product.visibility !== "화면노출"), "카탈로그 비노출 상품 검수 표본이 없습니다.");
assert.ok(app.includes("const categories = [...window.RecommendationCore.CATEGORY_ORDER]"), "앱이 공통 카테고리 순서를 사용하지 않습니다.");
assert.ok(app.includes("selectOperatingProducts(sourceProducts, categories)"), "앱이 100개 운영 집합을 사용하지 않습니다.");
assert.ok(!catalogRenderer.includes("visibility"), "카탈로그가 visibility로 상품을 숨깁니다.");
assert.ok(html.includes("grid-auto-columns:calc((100% - 4px)/5)"), "1101px 이상 상품 레일이 5열이 아닙니다.");
assert.ok(html.includes("@media (min-width:901px) and (max-width:1100px)"), "중간 데스크톱 4열 보호 구간이 없습니다.");
assert.ok(html.includes(".product-card__info{display:flex;flex:1;flex-direction:column;min-height:224px;padding:16px"), "5열 카드가 16px 내부 여백과 정보 높이를 유지하지 않습니다.");
assert.ok(html.includes(".product-card__name{min-height:50px;margin:6px 0 10px;font-size:14px"), "5열 상품명 크기·여백 계약이 다릅니다.");
assert.ok(html.includes(".product-card__price strong{font-size:17px}"), "5열 가격 강조 크기가 다릅니다.");
assert.ok(html.includes("10개 카테고리에서 고른 <strong>100개</strong> 대표 상품"), "100개 카탈로그 문구가 없습니다.");
assert.ok(html.includes("100개는 시작일 뿐,"), "확장 소싱 문구가 없습니다.");
assert.ok(!html.includes("66대 1") && !html.includes("110개의 굿즈"), "폐기된 카탈로그 수치가 남아 있습니다.");

console.log(`PASS catalog source=${sourceProducts.length} operating=${products.length} categories=10 each=10 towel=06 hidden-included`);
