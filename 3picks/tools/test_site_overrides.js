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
vm.runInContext(fs.readFileSync(path.join(root, "site-overrides.js"), "utf8"), context);
const sourceProducts = context.window.PRODUCTS;
const overrides = context.window.SITE_OVERRIDES;
const appSource = fs.readFileSync(path.join(root, "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

// 1. 시드 파일 스키마 — 어드민 저장 계약 (v2: 신규 상품 등록 배열 포함)
assert.ok(overrides && typeof overrides === "object", "site-overrides.js가 SITE_OVERRIDES를 만들지 않습니다.");
for (const key of ["version", "updatedAt", "eventMap", "weights", "productOverrides", "productAdditions"]) {
  assert.ok(key in overrides, `site-overrides.js에 ${key} 키가 없습니다.`);
}
assert.equal(overrides.version, 2, "site-overrides.js 스키마 버전이 2가 아닙니다.");
assert.equal(typeof overrides.productOverrides, "object", "productOverrides가 객체가 아닙니다.");
assert.ok(Array.isArray(overrides.productAdditions), "productAdditions가 배열이 아닙니다.");

// 2. 로드 체인 — index.html이 app.js 이전에 오버라이드를 싣는지
const overridesTagIndex = htmlSource.indexOf('src="site-overrides.js');
const appTagIndex = htmlSource.indexOf('src="app.js');
assert.ok(overridesTagIndex > 0, "index.html이 site-overrides.js를 로드하지 않습니다.");
assert.ok(overridesTagIndex < appTagIndex, "site-overrides.js가 app.js보다 뒤에 로드됩니다.");

// 3. app.js 소비 계약
assert.ok(appSource.includes("const siteOverrides = window.SITE_OVERRIDES || {}"), "앱이 SITE_OVERRIDES를 읽지 않습니다.");
assert.ok(appSource.includes("RecommendationCore.activeSiteProducts"), "앱이 core.activeSiteProducts(오버라이드+신규+숨김 병합 정본)로 상품을 만들지 않습니다.");
assert.ok(appSource.includes("...defaultEventMap, ...(siteOverrides.eventMap || {})"), "앱이 행사 매핑 오버라이드를 머지하지 않습니다.");
assert.ok(appSource.includes("weights: siteOverrides.weights || null"), "앱이 가중치 오버라이드를 추천 호출에 넘기지 않습니다.");

// 4. 빈 오버라이드 = 현행과 완전 동일 (회귀 0)
const baseAnswers = {
  event: "웰컴키트",
  due: "2026-12-31",
  logo: "예",
  excludes: [],
  tags: ["실용템", "프리미엄", "미니멀"],
  publicRecipient: "미포함",
  count: "100",
  budget: "10000000",
  budgetUnknown: false,
};
const categoryOrder = ["텀블러", "볼펜", "노트·다이어리", "보조배터리", "에코백"];
const products = core.selectOperatingProducts(sourceProducts);
const withoutWeights = core.recommend({ products, answers: baseAnswers, categoryOrder, leadLimit: 120, month: 12 });
const withDefaultWeights = core.recommend({ products, answers: baseAnswers, categoryOrder, leadLimit: 120, month: 12, weights: { ...core.DEFAULT_WEIGHTS } });
assert.deepEqual(withDefaultWeights, withoutWeights, "기본 가중치를 명시하면 결과가 달라집니다.");
const withNullWeights = core.recommend({ products, answers: baseAnswers, categoryOrder, leadLimit: 120, month: 12, weights: null });
assert.deepEqual(withNullWeights, withoutWeights, "weights=null이 기본 동작과 다릅니다.");

// 5. 가중치 오버라이드가 스코어에 반영되는지
const scoredDefault = core.eligibleProducts({ products, answers: baseAnswers, categoryOrder, leadLimit: 120, month: 12 });
const scoredBoosted = core.eligibleProducts({ products, answers: baseAnswers, categoryOrder, leadLimit: 120, month: 12, weights: { tagMatch: 100 } });
const tagged = scoredDefault.find(({ product }) => (product.tags || []).some((tag) => baseAnswers.tags.includes(tag)));
assert.ok(tagged, "태그 일치 표본 상품이 없습니다.");
const boostedTagged = scoredBoosted.find(({ product }) => product.id === tagged.product.id);
assert.ok(boostedTagged.score > tagged.score, "tagMatch 가중치 상향이 스코어에 반영되지 않았습니다.");
const zeroPopularity = core.eligibleProducts({ products, answers: baseAnswers, categoryOrder, leadLimit: 120, month: 12, weights: { popularityHigh: 0, popularityMid: 0 } });
const popularSample = scoredDefault.find(({ product }) => product.popularity === "상");
assert.ok(popularSample, "인기도 상 표본이 없습니다.");
const zeroedSample = zeroPopularity.find(({ product }) => product.id === popularSample.product.id);
assert.equal(popularSample.score - zeroedSample.score, 4, "인기도 가중치 0이 스코어에서 4점을 빼지 않았습니다.");
const invalidWeights = core.recommend({ products, answers: baseAnswers, categoryOrder, leadLimit: 120, month: 12, weights: { tagMatch: "abc", seasonal: -5 } });
assert.deepEqual(invalidWeights, withoutWeights, "잘못된 가중치 값이 기본값으로 방어되지 않았습니다.");

// 6. 상품 오버라이드(rank·visibility) — core 정본 병합 함수로 운영 집합 변화 검증
const tumblers = sourceProducts.filter((product) => product.category === "텀블러").sort((a, b) => Number(a.rank) - Number(b.rank));
const currentTop = tumblers[0];
const benched = sourceProducts.find((product) => product.category === "볼펜" && Number(product.rank) > 10);
assert.ok(benched, "rank 10 밖 교체 표본(볼펜)이 없습니다.");
const benchedPeer = sourceProducts.filter((product) => product.category === "볼펜").find((product) => Number(product.rank) === 1);
const patch = {
  [currentTop.id]: { rank: 10 },
  [tumblers.at(-1).id]: { rank: 1 },
  [benched.id]: { rank: 1, visibility: "화면노출" },
  [benchedPeer.id]: { rank: Number(benched.rank) },
};
const patchedSource = core.mergeSiteProducts(sourceProducts, { productOverrides: patch });
const patchedOperating = core.selectOperatingProducts(patchedSource);
assert.equal(patchedOperating.length, 100, "오버라이드 후 운영 집합이 100개가 아닙니다.");
const operatingIds = new Set(patchedOperating.map((product) => product.id));
assert.ok(!operatingIds.has(benchedPeer.id), `rank ${benched.rank}로 강등한 상품이 운영 집합에 남아 있습니다.`);
assert.ok(operatingIds.has(benched.id), "rank 1로 승격한 상품이 운영 집합에 들어오지 않았습니다.");
assert.equal(patchedOperating.find((product) => product.category === "텀블러").id, tumblers.at(-1).id, "텀블러 rank 1 교체가 정렬에 반영되지 않았습니다.");
assert.equal(patchedOperating.filter((product) => product.category === "텀블러").at(-1).id, currentTop.id, "텀블러 rank 10 강등이 정렬에 반영되지 않았습니다.");
const priceBefore = Number(currentTop.price);
const [pricePatched] = core.applyProductOverrides([currentTop], { [currentTop.id]: { price: priceBefore + 1000, tags: ["테크"], name: "새 이름", status: "hidden" } });
assert.equal(pricePatched.price, priceBefore + 1000, "가격 오버라이드가 반영되지 않았습니다.");
assert.deepEqual(pricePatched.tags, ["테크"], "태그 오버라이드가 반영되지 않았습니다.");
assert.equal(pricePatched.name, "새 이름", "확장 필드(이름) 오버라이드가 반영되지 않았습니다.");
assert.equal(core.productStatus(pricePatched), "hidden", "status 오버라이드가 반영되지 않았습니다.");
assert.equal(pricePatched.id, currentTop.id, "오버라이드가 id를 건드렸습니다.");

// 7. 빈 v2 오버라이드로도 활성 병합 결과가 원본 운영 집합과 동일해야 한다 (회귀 0)
const mergedEmpty = core.activeSiteProducts(sourceProducts, overrides);
assert.equal(core.selectOperatingProducts(mergedEmpty).length, 100, "빈 오버라이드 병합 후 운영 집합이 100개가 아닙니다.");
// Array.from으로 감싸는 이유: vm 컨텍스트에서 온 배열은 프로토타입 렐름이 달라 deepEqual이 실패한다
assert.deepEqual(
  Array.from(core.selectOperatingProducts(mergedEmpty), (product) => product.id),
  Array.from(core.selectOperatingProducts(sourceProducts), (product) => product.id),
  "빈 오버라이드가 운영 집합 순서를 바꿨습니다.",
);

console.log("PASS overrides schema+chain+empty-noop+weights+rank/visibility/fields merge+v2");
