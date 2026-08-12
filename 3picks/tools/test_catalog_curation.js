"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const core = require("../recommendation-core.js");

global.window = {};
require("../assets/products-data.js");
require("../site-overrides.js");

const sourceProducts = global.window.PRODUCTS;
const effectiveProducts = core.activeSiteProducts(sourceProducts, global.window.SITE_OVERRIDES);
const products = core.selectOperatingProducts(effectiveProducts);
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
const productCardRenderer = app.slice(app.indexOf("function productCard("), app.indexOf("function renderCatalog()"));
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
assert.ok(html.includes(".product-card__wishlist{position:absolute") && html.includes("border:1px solid var(--tp-ink-12)"), "하트 사각 테두리가 가격 아래 구분선과 같은 농도가 아닙니다.");
assert.ok(html.includes(".product-rail .product-card__info>.swatches{margin-top:auto;padding-top:12px}"), "카탈로그의 3색 예시 영역이 카드 하단 기준선에 고정되지 않았습니다.");
assert.ok(!productCardRenderer.includes("사진은 색상 예시예요"), "상품 카드마다 색상 안내가 반복됩니다.");
assert.ok(!productCardRenderer.includes("product.supplier") && !productCardRenderer.includes("product-card__brand"), "상품 카드에 내부 소스 출처가 노출됩니다.");
assert.ok(!app.includes('escapeHtml(entry.product.supplier'), "고객용 견적 출력물에 내부 소스 출처가 노출됩니다.");
assert.ok(catalogRenderer.includes('<p class="category-color-note">사진은 색상 예시예요. 실제 제작 색상은 상담에서 확인해 드립니다.</p>'), "카테고리별 색상 안내가 없습니다.");
assert.ok(html.includes(".category-color-note{margin:12px 0 0;padding-left:4px"), "카테고리 색상 안내 위치 스타일이 없습니다.");
assert.ok(app.includes("<dt>최소 주문 수량</dt>"), "상품 카드의 최소 주문 수량이 한글 표기가 아닙니다.");
assert.ok(!app.includes(">MOQ<") && !html.includes("MOQ"), "고객 화면에 영문 MOQ 표기가 남아 있습니다.");
assert.equal(core.PRODUCT_FIELD_LIMITS.printMethod, 30, "인쇄 방식 공통 제한이 30자가 아닙니다.");
assert.ok(!productCardRenderer.includes("slice(0") && !productCardRenderer.includes("…"), "인쇄 문구를 표시 단계에서 잘라내고 있습니다.");
products.forEach((product) => {
  assert.ok([...String(product.printMethod || "")].length <= core.PRODUCT_FIELD_LIMITS.printMethod, `${product.id} 인쇄 문구가 30자를 넘습니다.`);
  assert.ok(!/\*\*|★|\[\d+/.test(`${product.moqText || ""} ${product.printMethod || ""}`), `${product.id} 고객용 문구에 편집 기호가 남았습니다.`);
});
const effectiveById = new Map(effectiveProducts.map((product) => [product.id, product]));
assert.equal(effectiveById.get("p060").moqText, "5개", "p060 최소 주문 수량에 강조 기호가 남았습니다.");
assert.equal(effectiveById.get("p086").moqText, "20장", "p086 최소 주문 수량에 강조 기호가 남았습니다.");
assert.equal(effectiveById.get("p022").printMethod, "각인: 영문·숫자 13자·한글 10자(서체 지정)", "p022 인쇄 문구가 정리본과 다릅니다.");
assert.equal(effectiveById.get("p037").printMethod, "캡슐 파우치 컬러 전사(7×3cm) 150원", "p037 인쇄 문구가 정리본과 다릅니다.");
const variantTitleIds = ["p012", "p013", "p032", "p044", "p045", "p057", "p058", "p059", "p066", "p067", "p102"];
variantTitleIds.forEach((id) => {
  assert.equal(effectiveById.get(id).titleUsesImageLabel, true, `${id}가 선택 색상을 제목에 연결하지 않습니다.`);
});
effectiveProducts.forEach((product) => {
  assert.ok(!core.titleHasSerialCode(product.name), `${product.id} 고객용 제목에 품번이 남았습니다.`);
});
assert.ok(productCardRenderer.includes("productDisplayName(product, labels[0])"), "첫 색상명이 초기 상품 제목에 연결되지 않습니다.");
assert.ok(productCardRenderer.includes('data-title-uses-image-label="${String(Boolean(product.titleUsesImageLabel))}"'), "상품 카드에 색상 제목 연결 상태가 없습니다.");
assert.ok(app.includes("title.textContent = `${title.dataset.titleBase} · ${swatch.dataset.titleLabel}`"), "색상 선택 시 상품 제목을 함께 바꾸지 않습니다.");
assert.deepEqual(effectiveById.get("p059").imageLabels, ["옐로우", "레드", "그린", "브라운", "블랙"], "p059 공식 5색 구성이 다릅니다.");
assert.equal(effectiveById.get("p059").images.length, 5, "p059 색상 이미지가 5장이 아닙니다.");
effectiveById.get("p059").images.forEach((image) => assert.ok(fs.existsSync(image), `p059 이미지 ${image}가 없습니다.`));
assert.ok(html.includes("10개 카테고리에서 고른 <strong>100개</strong> 대표 상품"), "100개 카탈로그 문구가 없습니다.");
assert.ok(html.includes("100개는 시작일 뿐,"), "확장 소싱 문구가 없습니다.");
assert.ok(!html.includes("66대 1") && !html.includes("110개의 굿즈"), "폐기된 카탈로그 수치가 남아 있습니다.");

console.log(`PASS catalog source=${sourceProducts.length} operating=${products.length} categories=10 each=10 towel=06 hidden-included`);
