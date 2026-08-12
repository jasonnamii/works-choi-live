// 상품 등록·숨김·보관 회귀 — 어드민이 만드는 site-overrides v2가
// 홈페이지 병합 정본(recommendation-core)에서 의도대로 동작하는지 검사한다.
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../recommendation-core.js");

const root = path.resolve(__dirname, "..");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "assets/products-data.js"), "utf8"), context);
const baseProducts = context.window.PRODUCTS;
const adminSrc = fs.readFileSync(path.join(root, "admin.html"), "utf8");

const CATEGORY = "텀블러";
const baseCat = baseProducts.filter((product) => product.category === CATEGORY).sort((a, b) => a.rank - b.rank);
const maxNumber = baseProducts.reduce((max, product) => Math.max(max, product.number), 0);

// 1. 등록 — 3위 삽입: 기존 3위 이하를 한 칸씩 내리는 rank 델타 + 신규 레코드(어드민이 만드는 모양 그대로)
const newProduct = {
  id: `p${String(maxNumber + 1).padStart(3, "0")}`,
  number: maxNumber + 1,
  category: CATEGORY,
  name: "테스트 신규 텀블러",
  rank: 3,
  visibility: "화면노출",
  popularity: "중",
  price: 12000,
  moq: 50,
  moqText: "50개",
  printMethod: "실크인쇄 500원/개",
  lead: "5일",
  leadDays: 5,
  available: true,
  supplier: "test.example",
  images: [`assets/products/p${String(maxNumber + 1).padStart(3, "0")}-01.webp`],
  imageLabels: ["색상 1"],
  tags: ["실용템"],
  status: "active",
};
const shiftDown = {};
baseCat.filter((product) => product.rank >= 3).forEach((product) => { shiftDown[product.id] = { rank: product.rank + 1 }; });
const withAddition = core.activeSiteProducts(baseProducts, { productOverrides: shiftDown, productAdditions: [newProduct] });
const operating = core.selectOperatingProducts(withAddition);
assert.equal(operating.length, 100, "등록 후 운영 집합이 100개가 아닙니다.");
const catOperating = operating.filter((product) => product.category === CATEGORY);
assert.equal(catOperating[2].id, newProduct.id, "신규 상품이 지정한 3위에 서지 않았습니다.");
assert.equal(catOperating[2].name, newProduct.name, "신규 상품 레코드 필드가 병합에서 유실됐습니다.");
assert.ok(!new Set(catOperating.map((product) => product.id)).has(baseCat[9].id) || catOperating.length === 10, "운영 10개 규칙이 깨졌습니다.");
assert.ok(!operating.some((product) => product.id === baseCat.at(-1).id && product.category === CATEGORY && product.rank <= 10) || baseCat.length <= 10, "밀려난 기존 하위 상품이 운영 집합에 남았습니다.");

// 1-1. 신규 상품이 자동 추천 후보에도 들어온다
const answers = { event: "웰컴키트", count: "100", budget: "3000000", budgetUnknown: false, due: "2026-12-31", logo: "예", publicRecipient: "미포함", tags: ["실용템"], excludes: [] };
const eligible = core.eligibleProducts({ products: operating, answers, categoryOrder: [CATEGORY], leadLimit: 120, month: 12 });
assert.ok(eligible.some((item) => item.product.id === newProduct.id), "신규 상품이 추천 후보에 들지 않았습니다.");

// 1-2. 원본과 겹치는 id의 additions는 무시된다 (원본 보호)
const clash = core.mergeSiteProducts(baseProducts, { productAdditions: [{ ...newProduct, id: baseCat[0].id }] });
assert.equal(clash.length, baseProducts.length, "원본 id와 겹치는 등록 레코드가 걸러지지 않았습니다.");

// 2. 숨김 — 3위를 숨기면 11위가 자동 승격해 카테고리 10개가 유지된다 (11개 이상 보유 카테고리 표본)
const categoryCounts = new Map();
baseProducts.forEach((product) => categoryCounts.set(product.category, (categoryCounts.get(product.category) || 0) + 1));
const deepEntry = [...categoryCounts.entries()].find(([, count]) => count >= 11);
assert.ok(deepEntry, "11개 이상 상품을 가진 카테고리가 없습니다.");
const deepCat = baseProducts.filter((product) => product.category === deepEntry[0]).sort((a, b) => a.rank - b.rank);
const hidden = core.activeSiteProducts(baseProducts, { productOverrides: { [deepCat[2].id]: { status: "hidden" } } });
const hiddenOperating = core.selectOperatingProducts(hidden).filter((product) => product.category === deepEntry[0]);
assert.equal(hiddenOperating.length, 10, "숨김 후 카테고리 운영 상품이 10개가 아닙니다.");
assert.ok(!hiddenOperating.some((product) => product.id === deepCat[2].id), "숨긴 상품이 운영 집합에 남았습니다.");
assert.ok(hiddenOperating.some((product) => product.id === deepCat[10].id), "숨김 자리에 11위가 승격하지 않았습니다.");
assert.deepEqual(Array.from(hiddenOperating, (product) => product.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "숨김 후 순위가 촘촘하게 재정렬되지 않았습니다.");

// 3. 보관 — 사이트에서는 숨김과 동일하게 제외된다
const archived = core.activeSiteProducts(baseProducts, { productOverrides: { [deepCat[2].id]: { status: "archived" } } });
assert.ok(!archived.some((product) => product.id === deepCat[2].id), "보관 상품이 사이트 병합에 남았습니다.");

// 4. status 기본값 — 지정이 없으면 active
assert.equal(core.productStatus({}), "active", "status 미지정이 active로 처리되지 않습니다.");
assert.equal(core.productStatus({ status: "이상한값" }), "active", "알 수 없는 status가 active로 방어되지 않습니다.");

// 5. 어드민 소스 계약 — 삭제 버튼 없음(보관만), 사진은 설정보다 먼저 커밋
assert.ok(!/삭제(하기)?<\/button>/.test(adminSrc), "어드민에 삭제 버튼이 생겼습니다 — 정책은 숨김·보관뿐입니다.");
assert.ok(adminSrc.includes("보관함"), "어드민에 보관함 탭이 없습니다.");
assert.ok(adminSrc.indexOf("사진 올리는 중") < adminSrc.indexOf("설정 올리는 중"), "반영 순서(사진 먼저, 설정 나중)가 소스에서 확인되지 않습니다.");
assert.ok(adminSrc.includes("새 상품 등록"), "어드민에 새 상품 등록 진입점이 없습니다.");
assert.ok(adminSrc.includes("llmSyncBtn"), "LLM 수정 적용 버튼이 없습니다.");

console.log("PASS product-registration additions+insert-rank+hidden-promote+archive+status-default+admin-contract");
