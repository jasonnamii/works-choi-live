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
const sourceProducts = context.window.PRODUCTS;
const products = core.selectOperatingProducts(sourceProducts);

const eventMap = {
  "워크샵·단합": ["텀블러", "노트·다이어리", "에코백", "수건·타올", "우산"],
  "체육대회·사내 이벤트": ["수건·타올", "텀블러", "티셔츠·단체복", "에코백", "보온보냉·런치백"],
  "창립기념": ["텀블러", "수건·타올", "우산", "머그컵", "보조배터리"],
  "웰컴키트": ["텀블러", "볼펜", "노트·다이어리", "보조배터리", "에코백"],
  "채용 부스": ["볼펜", "에코백", "노트·다이어리", "보조배터리", "텀블러"],
  "전시·컨퍼런스 배포": ["에코백", "볼펜", "노트·다이어리", "텀블러", "티셔츠·단체복"],
  "명절·시즌 선물": ["수건·타올", "텀블러", "우산", "노트·다이어리", "머그컵"],
  "고객사·VIP 선물": ["우산", "볼펜", "텀블러", "수건·타올", "보조배터리"],
};

assert.equal(sourceProducts.length, 110, "원본 상품 마스터 수가 달라졌습니다.");
assert.equal(products.length, 100, "추천 운영 집합이 100개가 아닙니다.");
assert.equal(new Set(products.map((product) => product.id)).size, 100, "중복 운영 상품 ID가 있습니다.");
assert.equal(products.filter((product) => Number(product.price) > 0).length, 100, "가격 누락 운영 상품이 있습니다.");
assert.equal(products.filter((product) => Array.isArray(product.images) && product.images.length === 3).length, 100, "3색 이미지가 누락된 운영 상품이 있습니다.");

const baseAnswers = {
  due: "2026-12-31",
  logo: "예",
  excludes: [],
  tags: ["실용템", "프리미엄", "미니멀"],
  publicRecipient: "미포함",
};

let scenarioCount = 0;
const operatingIds = new Set(products.map((product) => product.id));
const rawInputCandidates = core.eligibleProducts({
  products: sourceProducts,
  answers: { ...baseAnswers, count: "10000", logo: "아니오" },
  categoryOrder: core.CATEGORY_ORDER,
  leadLimit: 365,
  month: 12,
});
assert.ok(rawInputCandidates.every(({ product }) => operatingIds.has(product.id)), "원본 110개 입력에서 운영 집합 밖 상품이 추천 후보에 들어갔습니다.");
for (const [event, categoryOrder] of Object.entries(eventMap)) {
  for (const count of [30, 100, 500]) {
    for (const perPerson of [3000, 10000, 30000, 100000]) {
      const answers = { ...baseAnswers, event, count: String(count), budget: String(count * perPerson), budgetUnknown: false };
      const eligible = core.eligibleProducts({ products, answers, categoryOrder, leadLimit: 120, month: 12 });
      assert.ok(eligible.every(({ product }) => operatingIds.has(product.id)), "운영 집합 밖 상품이 추천 후보에 들어갔습니다.");
      assert.ok(eligible.every(({ product }) => product.visibility === "화면노출" && product.available), "추천 후보의 기존 노출·구매 가능 조건이 깨졌습니다.");
      const allBundles = core.enumerateBundles(eligible, perPerson, answers.publicRecipient);
      const groups = core.recommend({ products, answers, categoryOrder, leadLimit: 120, month: 12 });
      assert.ok(groups.length > 0, `${event}/${count}명/${perPerson}원에 추천이 없습니다.`);
      assert.equal(Math.abs(groups[0].difference), Math.abs(allBundles[0].difference), "첫 추천이 예산 최적 조합이 아닙니다.");
      for (const group of groups) {
        assert.ok(group.products.length >= 1 && group.products.length <= 3, "구성 상품 수가 1~3개가 아닙니다.");
        assert.equal(new Set(group.products.map((product) => product.category)).size, group.products.length, "한 구성에 같은 카테고리가 중복됐습니다.");
        assert.equal(group.totalPrice, group.products.reduce((sum, product) => sum + product.price, 0), "구성가 합계가 틀렸습니다.");
      }
      scenarioCount += 1;
    }
  }
}

const regressionAnswers = { ...baseAnswers, event: "웰컴키트", count: "100", budget: "10000000", budgetUnknown: false };
const regression = core.recommend({ products, answers: regressionAnswers, categoryOrder: eventMap["웰컴키트"], leadLimit: 120, month: 12 });
assert.equal(regression[0].totalPrice, 99600, "1인당 10만 원 회귀 시나리오의 최적 구성가가 달라졌습니다.");
assert.equal(regression[0].difference, 400, "1인당 10만 원 회귀 시나리오의 잔액이 달라졌습니다.");
assert.ok(regression[0].products.length > 1, "고예산이 저가 단품으로 퇴행했습니다.");

const unknownAnswers = { ...baseAnswers, event: "웰컴키트", count: "100", budget: "", budgetUnknown: true };
const unknown = core.recommend({ products, answers: unknownAnswers, categoryOrder: eventMap["웰컴키트"], leadLimit: 120, month: 12 });
assert.equal(unknown.length, 3, "예산 모름 추천이 3개가 아닙니다.");
assert.ok(unknown.every((group) => group.budgetUnknown && group.difference === null), "예산 모름 결과에 차액이 들어갔습니다.");

const publicAnswers = { ...baseAnswers, event: "고객사·VIP 선물", count: "100", budget: "10000000", budgetUnknown: false, publicRecipient: "포함" };
const publicGroups = core.recommend({ products, answers: publicAnswers, categoryOrder: eventMap["고객사·VIP 선물"], leadLimit: 120, month: 12 });
assert.ok(publicGroups.every((group) => group.totalPrice <= 50000), "공직자 수령 구성가가 5만 원을 넘었습니다.");

const shortageAnswers = { ...baseAnswers, event: "채용 부스", count: "1000", budget: "500000", budgetUnknown: false };
const shortage = core.recommend({ products, answers: shortageAnswers, categoryOrder: eventMap["채용 부스"], leadLimit: 120, month: 12 });
assert.equal(shortage[0].difference, -1270, "100개 운영 집합의 예산 부족 회귀값이 달라졌습니다.");

console.log(`PASS data=100 scenarios=${scenarioCount} regression=99,600/100,000 unknown=3 shortage=1,270 public<=50,000`);
