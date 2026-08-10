((root, factory) => {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RecommendationCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  const popularityScore = (value) => value === "상" ? 4 : value === "중" ? 2 : 0;

  function seasonalScore(product, month) {
    if (product.category === "우산" && [5, 6, 7].includes(month)) return 6;
    if (product.category === "노트·다이어리" && [10, 11, 12].includes(month)) return 6;
    if (product.category === "티셔츠·단체복" && [4, 5, 9, 10].includes(month)) return 6;
    if (product.category === "보온보냉·런치백" && month >= 4 && month <= 7) return 6;
    return 0;
  }

  function productScore(product, answers, categoryOrder, month) {
    const tagScore = (product.tags || []).filter((tag) => (answers.tags || []).includes(tag)).length * 12;
    const qualityScore = Math.max(0, 12 - Number(product.rank || 12));
    const categoryIndex = categoryOrder.indexOf(product.category);
    const relevanceScore = categoryIndex < 0 ? 0 : Math.max(0, 18 - categoryIndex * 3);
    return tagScore + popularityScore(product.popularity) + qualityScore + relevanceScore + seasonalScore(product, month);
  }

  function eligibleProducts({ products, answers, categoryOrder, leadLimit, month }) {
    const count = Number(answers.count);
    const excluded = new Set(answers.excludes || []);
    return products.filter((product) => {
      if (excluded.has(product.category) || product.visibility !== "화면노출" || !product.available) return false;
      if (!product.price || !product.moq || !product.leadDays) return false;
      if (product.moq > count || product.leadDays > leadLimit) return false;
      if (answers.publicRecipient === "포함" && product.price > 50000) return false;
      if (answers.logo === "예" && (!product.printMethod || product.printMethod.includes("문의"))) return false;
      return true;
    }).map((product) => ({
      product,
      score: productScore(product, answers, categoryOrder, month),
    }));
  }

  function enumerateBundles(scored, targetPrice, publicRecipient) {
    const bundles = [];
    const push = (items) => {
      if (new Set(items.map((item) => item.product.category)).size !== items.length) return;
      const totalPrice = items.reduce((sum, item) => sum + Number(item.product.price), 0);
      if (publicRecipient === "포함" && totalPrice > 50000) return;
      bundles.push({
        products: items.map((item) => item.product),
        totalPrice,
        targetPrice,
        difference: targetPrice - totalPrice,
        score: items.reduce((sum, item) => sum + item.score, 0),
      });
    };

    for (let first = 0; first < scored.length; first += 1) {
      push([scored[first]]);
      for (let second = first + 1; second < scored.length; second += 1) {
        push([scored[first], scored[second]]);
        for (let third = second + 1; third < scored.length; third += 1) {
          push([scored[first], scored[second], scored[third]]);
        }
      }
    }

    return bundles.sort((a, b) => {
      const distance = Math.abs(a.difference) - Math.abs(b.difference);
      if (distance) return distance;
      const overage = Number(a.difference < 0) - Number(b.difference < 0);
      if (overage) return overage;
      if (b.score !== a.score) return b.score - a.score;
      return b.products.length - a.products.length;
    });
  }

  function diverseTopThree(bundles) {
    const signatures = new Set();
    return bundles.filter((bundle) => {
      const signature = bundle.products.map((product) => product.id).sort().join(".");
      if (signatures.has(signature)) return false;
      signatures.add(signature);
      return true;
    }).slice(0, 3);
  }

  function unknownBudgetPicks(scored, categoryOrder) {
    const ordered = [...scored].sort((a, b) => {
      const leftCategory = categoryOrder.indexOf(a.product.category);
      const rightCategory = categoryOrder.indexOf(b.product.category);
      const categoryDifference = (leftCategory < 0 ? 99 : leftCategory) - (rightCategory < 0 ? 99 : rightCategory);
      return categoryDifference || b.score - a.score || Number(a.product.rank || 99) - Number(b.product.rank || 99);
    });
    const used = new Set();
    return ordered.filter((item) => {
      if (used.has(item.product.category)) return false;
      used.add(item.product.category);
      return true;
    }).slice(0, 3).map((item, index) => ({
      category: `추천 ${String(index + 1).padStart(2, "0")}`,
      products: [item.product],
      isBundle: true,
      budgetUnknown: true,
      totalPrice: Number(item.product.price),
      targetPrice: null,
      difference: null,
    }));
  }

  function recommend({ products, answers, categoryOrder, leadLimit, month }) {
    const scored = eligibleProducts({ products, answers, categoryOrder, leadLimit, month });
    if (answers.budgetUnknown) return unknownBudgetPicks(scored, categoryOrder);

    const totalBudget = Number(answers.budget);
    const count = Number(answers.count);
    if (!totalBudget || !count) return [];
    const perPerson = Math.floor(totalBudget / count);
    const targetPrice = answers.publicRecipient === "포함" ? Math.min(perPerson, 50000) : perPerson;
    return diverseTopThree(enumerateBundles(scored, targetPrice, answers.publicRecipient)).map((bundle, index) => ({
      ...bundle,
      category: `구성 ${String(index + 1).padStart(2, "0")}`,
      isBundle: true,
      budgetUnknown: false,
    }));
  }

  return { eligibleProducts, enumerateBundles, recommend };
});
