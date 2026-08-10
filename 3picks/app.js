(() => {
  "use strict";

  const products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
  const siteConfig = window.SITE_CONFIG || {};
  const navigationEntry = performance.getEntriesByType?.("navigation")?.[0];
  const isReloadNavigation = navigationEntry
    ? navigationEntry.type === "reload"
    : performance.navigation?.type === 1;
  const scrollStorageKey = `3picks-scroll:${location.pathname}${location.search}`;
  const recommendationStorageKey = `3picks-recommendation:${location.pathname}${location.search}`;
  const quoteStorageKey = "3picks-mini-quote:v1";
  let scrollStorageAvailable = false;
  try {
    const probeKey = `${scrollStorageKey}:probe`;
    sessionStorage.setItem(probeKey, "1");
    sessionStorage.removeItem(probeKey);
    scrollStorageAvailable = true;
  } catch {
    scrollStorageAvailable = false;
  }
  let reloadScrollPosition = null;
  let quoteStorageAvailable = false;
  try {
    const quoteProbeKey = `${quoteStorageKey}:probe`;
    localStorage.setItem(quoteProbeKey, "1");
    localStorage.removeItem(quoteProbeKey);
    quoteStorageAvailable = true;
  } catch {
    quoteStorageAvailable = false;
  }
  if (scrollStorageAvailable && isReloadNavigation) {
    try {
      const raw = sessionStorage.getItem(scrollStorageKey);
      if (raw !== null && Number.isFinite(Number(raw))) reloadScrollPosition = Number(raw);
    } catch {
      reloadScrollPosition = null;
    }
  }
  if (reloadScrollPosition !== null && location.hash) {
    try {
      history.replaceState(history.state, "", location.href.slice(0, -location.hash.length));
    } catch {
      // 해시를 지울 수 없으면 아래의 반복 복원으로 저장 위치를 우선합니다.
    }
  }
  if (scrollStorageAvailable && "scrollRestoration" in history) history.scrollRestoration = "manual";
  const categories = [
    "텀블러",
    "에코백",
    "볼펜",
    "우산",
    "티셔츠·단체복",
    "머그컵",
    "보조배터리",
    "수건·타올",
    "노트·다이어리",
    "보온보냉·런치백",
  ];
  const eventOptions = [
    "워크샵·단합",
    "체육대회·사내 이벤트",
    "창립기념",
    "웰컴키트",
    "채용 부스",
    "전시·컨퍼런스 배포",
    "명절·시즌 선물",
    "고객사·VIP 선물",
  ];
  const trendTags = [
    "미니멀",
    "친환경",
    "실용템",
    "데스크테리어",
    "힙한",
    "레트로",
    "아웃도어",
    "프리미엄",
    "귀여움",
    "컬러팝",
    "테크",
    "시즌한정",
  ];
  const categoryDescriptions = {
    "텀블러": "자주 쓰이고 로고도 잘 보여 꾸준히 사랑받는 선물이에요.",
    "에코백": "행사장에서 유용하고 일상에서도 다시 쓰기 좋은 가방이에요.",
    "볼펜": "많은 분께 부담 없이 나눠드리기 좋은 기본 굿즈예요.",
    "우산": "실용성과 선물다운 느낌을 모두 챙길 수 있어요.",
    "티셔츠·단체복": "한눈에 팀을 보여주고 행사 분위기도 살려줘요.",
    "머그컵": "행사가 끝난 뒤에도 사무실과 집에서 오래 사용할 수 있어요.",
    "보조배터리": "테크 행사나 프리미엄 키트에 잘 어울리는 실용적인 선물이에요.",
    "수건·타올": "체육대회부터 답례품까지 구성과 포장을 다양하게 선택할 수 있어요.",
    "노트·다이어리": "교육과 세미나, 연말 선물에 자연스럽게 어울려요.",
    "보온보냉·런치백": "야외 행사와 여름철에 특히 유용한 기능성 가방이에요.",
  };
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

  const state = {
    step: 0,
    answers: {
      event: "",
      count: "",
      budget: "",
      budgetUnknown: false,
      due: "",
      logo: "",
      excludes: [],
      tags: [],
      workshopType: "",
      anniversary: "",
      awards: "",
      conferenceType: "",
      publicRecipient: "",
    },
    results: [],
  };

  const quoteState = {
    items: [],
    quantity: 100,
    open: false,
  };
  restoreQuoteState();

  const els = {
    categoryNav: document.querySelector("#categoryNav"),
    catalogHost: document.querySelector("#catalogHost"),
    form: document.querySelector("#surveyForm"),
    questionHost: document.querySelector("#questionHost"),
    error: document.querySelector("#surveyError"),
    previous: document.querySelector("#prevButton"),
    next: document.querySelector("#nextButton"),
    progressLabel: document.querySelector("#progressLabel"),
    progressCount: document.querySelector("#progressCount"),
    progressList: document.querySelector("#progressList"),
    results: document.querySelector("#results"),
    toast: document.querySelector("#toast"),
    consultDialog: document.querySelector("#consultDialog"),
    quoteFloat: document.querySelector("#quoteFloat"),
    quoteTrigger: document.querySelector("#quoteTrigger"),
    quoteTriggerCount: document.querySelector("#quoteTriggerCount"),
    quoteBar: document.querySelector("#quoteBar"),
    quoteItems: document.querySelector("#quoteItems"),
    quoteCountLabel: document.querySelector("#quoteCountLabel"),
    quoteQuantity: document.querySelector("#quoteQuantity"),
    quoteUnitCount: document.querySelector("#quoteUnitCount"),
    quoteMissingPrice: document.querySelector("#quoteMissingPrice"),
    quoteTotal: document.querySelector("#quoteTotal"),
  };

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const money = (value) => Number(value || 0).toLocaleString("ko-KR");
  const budgetToInput = (value) => value ? money(Math.round(Number(value) / 10000)) : "";
  const budgetToWon = (value) => {
    const digits = String(value || "").replace(/[^0-9]/g, "");
    return digits ? String(Number(digits) * 10000) : "";
  };
  const normalizeBudgetWon = (value) => {
    const numeric = Number(String(value || "").replace(/[^0-9]/g, ""));
    if (!Number.isFinite(numeric) || numeric <= 0) return "";
    return String(numeric < 10000 ? numeric * 10000 : numeric);
  };

  function normalizeQuoteQuantity(value) {
    const numeric = Number(String(value ?? "").replace(/[^0-9]/g, ""));
    if (!Number.isFinite(numeric) || numeric <= 0) return 100;
    return Math.max(20, Math.ceil(numeric / 20) * 20);
  }

  function restoreQuoteState() {
    if (!quoteStorageAvailable) return;
    try {
      const saved = JSON.parse(localStorage.getItem(quoteStorageKey) || "null");
      if (!saved || saved.version !== 1) return;
      const seen = new Set();
      quoteState.items = (Array.isArray(saved.items) ? saved.items : [])
        .filter((item) => item && products.some((product) => product.id === item.id) && !seen.has(item.id) && seen.add(item.id))
        .slice(0, 12)
        .map((item) => ({ id: item.id, selected: item.selected !== false }));
      quoteState.quantity = normalizeQuoteQuantity(saved.quantity);
      quoteState.open = Boolean(saved.open && quoteState.items.length);
    } catch {
      quoteState.items = [];
      quoteState.quantity = 100;
      quoteState.open = false;
    }
  }

  function saveQuoteState() {
    if (!quoteStorageAvailable) return;
    try {
      localStorage.setItem(quoteStorageKey, JSON.stringify({
        version: 1,
        items: quoteState.items,
        quantity: quoteState.quantity,
        open: quoteState.open,
      }));
    } catch {
      // 저장소가 막힌 환경에서는 현재 탭 안의 상태만 유지합니다.
    }
  }

  function isWishlisted(productId) {
    return quoteState.items.some((item) => item.id === productId);
  }

  function selectedQuoteEntries() {
    return quoteState.items
      .filter((item) => item.selected)
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.id);
        if (!product) return null;
        const requested = quoteState.quantity;
        const minimum = Number(product.moq) > 0 ? Number(product.moq) : 0;
        const applied = Math.max(requested, minimum);
        const subtotal = Number(product.price) > 0 ? Number(product.price) * applied : null;
        return { product, requested, applied, subtotal };
      })
      .filter(Boolean);
  }

  function quoteTotals() {
    const entries = selectedQuoteEntries();
    return {
      entries,
      selectedCount: entries.length,
      unitCount: entries.reduce((sum, entry) => sum + entry.applied, 0),
      total: entries.reduce((sum, entry) => sum + (entry.subtotal || 0), 0),
      missingPrice: entries.filter((entry) => entry.subtotal === null).length,
    };
  }

  function syncWishlistButtons() {
    document.querySelectorAll("[data-wishlist-toggle]").forEach((button) => {
      const active = isWishlisted(button.dataset.wishlistToggle);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", `${button.dataset.productName || "상품"} ${active ? "견적함에서 빼기" : "견적함에 담기"}`);
    });
  }

  function renderQuoteBar() {
    if (!els.quoteFloat) return;
    const totals = quoteTotals();
    const selectedIds = new Set(totals.entries.map((entry) => entry.product.id));
    els.quoteFloat.classList.toggle("is-open", quoteState.open);
    els.quoteTrigger.setAttribute("aria-expanded", String(quoteState.open));
    els.quoteTrigger.setAttribute("aria-label", `미니 견적함 ${quoteState.open ? "접기" : "펼치기"}, 상품 ${quoteState.items.length}개`);
    els.quoteBar.setAttribute("aria-hidden", String(!quoteState.open));
    if ("inert" in els.quoteBar) els.quoteBar.inert = !quoteState.open;
    els.quoteTriggerCount.textContent = String(quoteState.items.length);
    els.quoteCountLabel.textContent = `담은 상품 ${quoteState.items.length}/12 · 계산 ${totals.selectedCount}`;
    els.quoteQuantity.value = String(quoteState.quantity);
    els.quoteUnitCount.textContent = `제작 ${money(totals.unitCount)}개`;
    els.quoteMissingPrice.textContent = `상담 필요 ${totals.missingPrice}개`;
    els.quoteTotal.textContent = `${money(totals.total)}원`;

    if (!quoteState.items.length) {
      els.quoteItems.innerHTML = '<div class="quote-empty">상품 사진의 하트를 누르면 여기에 담겨요. 최대 12개까지 비교할 수 있어요.</div>';
    } else {
      els.quoteItems.innerHTML = quoteState.items.map((item) => {
        const product = products.find((candidate) => candidate.id === item.id);
        if (!product) return "";
        const applied = Math.max(quoteState.quantity, Number(product.moq) > 0 ? Number(product.moq) : 0);
        const subtotal = Number(product.price) > 0 ? Number(product.price) * applied : null;
        return `
          <article class="quote-item${item.selected ? "" : " is-excluded"}" data-quote-item="${escapeHtml(product.id)}">
            <img class="quote-item__image" src="${escapeHtml(product.images?.[0] || "")}" alt="" loading="lazy" width="68" height="68">
            <div class="quote-item__copy">
              <div class="quote-item__category">${escapeHtml(product.category)}</div>
              <div class="quote-item__name">${escapeHtml(product.name)}</div>
              <div class="quote-item__price">${subtotal === null ? "상담 필요" : `${money(subtotal)}원`}${applied > quoteState.quantity ? ` · MOQ ${money(applied)}개` : ""}</div>
            </div>
            <label class="quote-item__select">
              <input type="checkbox" data-quote-select="${escapeHtml(product.id)}" ${selectedIds.has(product.id) ? "checked" : ""}>
              합계에 포함
            </label>
            <button class="quote-item__remove" type="button" data-quote-remove="${escapeHtml(product.id)}" aria-label="${escapeHtml(product.name)} 견적함에서 제거">×</button>
          </article>`;
      }).join("");
    }
    els.quoteBar.querySelectorAll("[data-quote-requires-selection]").forEach((button) => {
      button.disabled = totals.selectedCount === 0;
    });
    syncWishlistButtons();
  }

  function setQuoteOpen(open, returnFocus = false) {
    quoteState.open = Boolean(open);
    saveQuoteState();
    renderQuoteBar();
    emit(open ? "wishlist_open" : "wishlist_close", { item_count: quoteState.items.length });
    if (!open && returnFocus) els.quoteTrigger.focus();
  }

  function toggleWishlist(productId) {
    const index = quoteState.items.findIndex((item) => item.id === productId);
    if (index >= 0) {
      quoteState.items.splice(index, 1);
      emit("wishlist_remove", { product_id: productId, item_count: quoteState.items.length });
      showToast("미니 견적에서 뺐어요.");
    } else {
      if (quoteState.items.length >= 12) {
        emit("wishlist_limit", { product_id: productId, item_count: 12 });
        showToast("미니 견적에는 12개까지 담을 수 있어요.");
        return;
      }
      quoteState.items.push({ id: productId, selected: true });
      quoteState.open = true;
      emit("wishlist_add", { product_id: productId, item_count: quoteState.items.length });
      showToast("미니 견적에 담았어요.");
    }
    saveQuoteState();
    renderQuoteBar();
  }

  function quoteSummaryText() {
    const totals = quoteTotals();
    const lines = [
      "[3PICKS 미니 견적]",
      state.answers.event ? `행사: ${state.answers.event}` : "",
      state.answers.count ? `예상 인원: ${money(state.answers.count)}명` : "",
      state.answers.due ? `희망일: ${state.answers.due}` : "",
      `공통 요청 수량: ${money(quoteState.quantity)}개`,
      "",
      ...totals.entries.map((entry, index) => `${index + 1}. ${entry.product.name} · 적용 ${money(entry.applied)}개 · ${entry.subtotal === null ? "금액 상담 필요" : `${money(entry.subtotal)}원`}`),
      "",
      `예상 상품 금액: ${money(totals.total)}원`,
      totals.missingPrice ? `가격 상담 필요 상품: ${totals.missingPrice}개` : "",
      "상품 가격 기준의 예상 금액이며 인쇄비·배송비·부가세는 상담 후 확정됩니다.",
    ];
    return lines.filter((line, index) => line || (index > 0 && lines[index - 1])).join("\n").trim();
  }

  async function shareQuote() {
    const text = quoteSummaryText();
    emit("wishlist_share", { item_count: quoteTotals().selectedCount });
    if (navigator.share) {
      try {
        await navigator.share({ title: "3PICKS 미니 견적", text, url: location.href });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    await copyText(text, "미니 견적 내용을 복사했어요.");
  }

  function absoluteAssetUrl(path) {
    try {
      return new URL(path, document.baseURI).href;
    } catch {
      return path;
    }
  }

  function openQuoteDocument() {
    const totals = quoteTotals();
    if (!totals.selectedCount) return;
    const popup = window.open("", "3picksMiniQuote", "width=1120,height=820,scrollbars=yes,resizable=yes");
    if (!popup) {
      showToast("견적서 창이 차단됐어요. 브라우저에서 팝업을 허용해 주세요.");
      return;
    }
    const createdAt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short" }).format(new Date());
    const rows = totals.entries.map((entry, index) => `
      <tr>
        <td class="number">${String(index + 1).padStart(2, "0")}</td>
        <td class="product"><img src="${escapeHtml(absoluteAssetUrl(entry.product.images?.[0] || ""))}" alt=""><div><b>${escapeHtml(entry.product.name)}</b><span>${escapeHtml(entry.product.category)} · ${escapeHtml(entry.product.supplier || "3PICKS SELECT")}</span></div></td>
        <td>${entry.product.price ? `${money(entry.product.price)}원` : "상담 필요"}</td>
        <td>${escapeHtml(entry.product.moqText || "문의")}</td>
        <td>${money(entry.requested)}개</td>
        <td>${money(entry.applied)}개${entry.applied > entry.requested ? '<small>MOQ 반영</small>' : ""}</td>
        <td class="amount">${entry.subtotal === null ? "상담 필요" : `${money(entry.subtotal)}원`}</td>
      </tr>`).join("");
    const brief = [
      state.answers.event ? `<div><span>행사</span><b>${escapeHtml(state.answers.event)}</b></div>` : "",
      state.answers.count ? `<div><span>예상 인원</span><b>${money(state.answers.count)}명</b></div>` : "",
      state.answers.due ? `<div><span>희망일</span><b>${escapeHtml(state.answers.due)}</b></div>` : "",
      `<div><span>공통 요청 수량</span><b>${money(quoteState.quantity)}개</b></div>`,
    ].join("");
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>3PICKS 미니 견적서</title><style>
      :root{--cream:#F5F0E4;--ink:#000;--line:#A89F91;--orange:#FC6B38;--yellow:#FFFD78}*{box-sizing:border-box}body{margin:0;background:#ded8cc;color:var(--ink);font-family:-apple-system,"Apple SD Gothic Neo",sans-serif;word-break:keep-all}.toolbar{position:sticky;z-index:3;top:0;display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;background:var(--ink)}button{min-height:44px;padding:10px 18px;border:1px solid #fff;background:var(--yellow);font-family:inherit;font-size:14px;font-weight:800;cursor:pointer}button:first-child{background:var(--orange);color:#fff}.sheet{width:210mm;min-height:297mm;margin:24px auto;padding:14mm;background:var(--cream);box-shadow:0 8px 28px rgba(0,0,0,.22)}header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding-bottom:12mm;border-bottom:2px solid var(--ink)}header img{width:42mm}h1{margin:0;font-size:30px;line-height:1.1}header p{margin:7px 0 0;color:#555;font-size:13px}.brief{display:grid;grid-template-columns:repeat(4,1fr);margin:8mm 0;background:var(--line);gap:1px;border:1px solid var(--line)}.brief div{min-height:24mm;padding:5mm;background:var(--cream)}.brief span{display:block;color:#666;font-size:11px}.brief b{display:block;margin-top:3px;font-size:15px}table{width:100%;border-collapse:collapse;font-size:11px}thead{display:table-header-group}th{padding:3.5mm 2mm;background:var(--ink);color:#fff;text-align:left}td{padding:3mm 2mm;border-bottom:1px solid var(--line);vertical-align:middle}tr{break-inside:avoid}.number{font-family:monospace}.product{display:flex;align-items:center;gap:3mm;min-width:55mm}.product img{width:17mm;height:17mm;object-fit:contain}.product b{display:block;font-size:12px}.product span,td small{display:block;margin-top:2px;color:#666;font-size:9px}.amount{font-weight:800;white-space:nowrap}.total{display:grid;grid-template-columns:1fr auto;align-items:end;gap:16px;margin-top:9mm;padding:7mm;background:var(--orange)}.total h2{margin:0;font-size:14px}.total strong{font-size:28px}.notes{margin-top:8mm;padding-top:5mm;border-top:1px solid var(--line);font-size:10px;line-height:1.65;color:#444}.notes b{color:#000}.footer{display:flex;justify-content:space-between;margin-top:10mm;font-size:9px;color:#666}@page{size:A4;margin:0}@media print{body{background:#fff}.toolbar{display:none}.sheet{margin:0;box-shadow:none;break-after:page}}
    </style></head><body><div class="toolbar"><button type="button" onclick="window.print()">인쇄·PDF 저장</button><button type="button" onclick="window.close()">닫기</button></div><main class="sheet"><header><img src="${escapeHtml(absoluteAssetUrl("assets/3PICKS-logo.svg"))}" alt="3PICKS"><div><h1>미니 견적서</h1><p>${escapeHtml(createdAt)} 작성</p></div></header><section class="brief">${brief}</section><table><thead><tr><th>번호</th><th>상품</th><th>참고 단가</th><th>MOQ</th><th>요청</th><th>적용</th><th>예상 금액</th></tr></thead><tbody>${rows}</tbody></table><section class="total"><div><h2>예상 상품 금액</h2><span>선택 ${totals.selectedCount}개 · 총 제작 ${money(totals.unitCount)}개</span></div><strong>${money(totals.total)}원</strong></section><section class="notes"><b>확인해 주세요.</b><br>이 문서는 상품 기준 단가로 계산한 미니 견적입니다. 실제 재고와 제작 색상, 인쇄 방식, 납기, 인쇄비, 배송비, 부가세는 상담 후 확정됩니다.${totals.missingPrice ? `<br>가격 확인이 필요한 상품 ${totals.missingPrice}개는 숫자 합계에서 제외했습니다.` : ""}</section><footer class="footer"><span>3PICKS · Curated goods for every occasion</span><span>${escapeHtml(siteConfig.contactPhone || "010-6331-9276")} · ${escapeHtml(siteConfig.contactEmail || "julia@3picks.co.kr")}</span></footer></main></body></html>`);
    popup.document.close();
    popup.focus();
    emit("wishlist_quote_open", { item_count: totals.selectedCount, total: totals.total });
  }

  function saveScrollPosition() {
    if (!scrollStorageAvailable) return;
    try {
      sessionStorage.setItem(scrollStorageKey, String(Math.max(0, Math.round(window.scrollY))));
    } catch {
      // file:// 환경에서 저장소 접근이 제한되면 브라우저 기본 동작에 맡깁니다.
    }
  }

  function saveRecommendationState(shared = false) {
    if (!scrollStorageAvailable || !state.results.length) return;
    const payload = {
      version: 2,
      shared,
      answers: state.answers,
      groups: state.results.map((group) => ({
        category: group.category,
        productIds: group.products.map((product) => product.id),
        isBundle: Boolean(group.isBundle),
        budgetUnknown: Boolean(group.budgetUnknown),
        targetPrice: group.targetPrice,
        totalPrice: group.totalPrice,
        difference: group.difference,
      })),
    };
    try {
      sessionStorage.setItem(recommendationStorageKey, JSON.stringify(payload));
    } catch {
      // 저장소를 사용할 수 없으면 현재 페이지 안에서만 결과를 유지합니다.
    }
  }

  function clearRecommendationState() {
    if (!scrollStorageAvailable) return;
    try {
      sessionStorage.removeItem(recommendationStorageKey);
    } catch {
      // 저장소를 사용할 수 없는 환경에서는 별도 정리가 필요하지 않습니다.
    }
  }

  function restoreRecommendationState() {
    if (!scrollStorageAvailable || !isReloadNavigation) return false;
    try {
      const saved = JSON.parse(sessionStorage.getItem(recommendationStorageKey) || "null");
      if (!saved || ![1, 2].includes(saved.version) || !Array.isArray(saved.groups)) return false;
      Object.assign(state.answers, saved.answers || {});
      state.answers.budgetUnknown = Boolean(state.answers.budgetUnknown);
      state.answers.budget = state.answers.budgetUnknown ? "" : normalizeBudgetWon(state.answers.budget);
      const groups = saved.groups.map((group) => ({
        category: group.category,
        isBundle: saved.version === 2 ? Boolean(group.isBundle) : false,
        budgetUnknown: saved.version === 2 ? Boolean(group.budgetUnknown) : false,
        targetPrice: saved.version === 2 ? group.targetPrice : null,
        totalPrice: saved.version === 2 ? group.totalPrice : null,
        difference: saved.version === 2 ? group.difference : null,
        products: Array.isArray(group.productIds)
          ? group.productIds.map((id) => products.find((product) => product.id === id)).filter(Boolean)
          : [],
      })).filter((group) => group.products.length);
      if (!groups.length) return false;
      state.results = groups;
      state.step = Math.max(0, questions().length - 1);
      renderQuestion();
      renderResults(groups, Boolean(saved.shared));
      return true;
    } catch {
      clearRecommendationState();
      return false;
    }
  }

  function bindRefreshScrollRestoration() {
    if (!scrollStorageAvailable) return;
    let saveFrame = 0;
    window.addEventListener("scroll", () => {
      if (saveFrame) return;
      saveFrame = window.requestAnimationFrame(() => {
        saveFrame = 0;
        saveScrollPosition();
      });
    }, { passive: true });
    window.addEventListener("pagehide", saveScrollPosition);

    if (reloadScrollPosition === null) return;

    const restore = () => {
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: Math.min(reloadScrollPosition, maximum), left: 0, behavior: "auto" });
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(restore));
    if (document.readyState !== "complete") window.addEventListener("load", restore, { once: true });
    window.addEventListener("pageshow", restore, { once: true });
    window.setTimeout(restore, 120);
  }

  function emit(name, detail = {}) {
    const payload = { event: name, ...detail };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    window.dispatchEvent(new CustomEvent("3picks:analytics", { detail: payload }));
  }

  let toastTimer;
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showToast(successMessage);
    }
  }

  function categoryId(category) {
    return `category-${categories.indexOf(category) + 1}`;
  }

  function renderCategoryNavigation() {
    els.categoryNav.innerHTML = categories.map((category, index) => `
      <a class="category-chip" href="#${categoryId(category)}">
        <span class="tp-mono">${String(index + 1).padStart(2, "0")}</span>
        ${escapeHtml(category)}
      </a>
    `).join("") + '<span class="category-track-indicator" aria-hidden="true"></span>';
  }

  function bindScrollSpy() {
    const header = document.querySelector(".site-header");
    const categoryStrip = document.querySelector(".category-strip");
    const mainLinks = [...document.querySelectorAll('.main-links a[href^="#"]')];
    const mainTargets = mainLinks.map((link) => ({
      id: link.hash.slice(1),
      link,
      section: document.querySelector(link.hash),
    })).filter((item) => item.section);
    const categoryLinks = [...els.categoryNav.querySelectorAll('.category-chip[href^="#"]')];
    const categoryTargets = categoryLinks.map((link) => ({
      id: link.hash.slice(1),
      link,
      section: document.querySelector(link.hash),
    })).filter((item) => item.section);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let currentMain = "";
    let currentCategory = "";
    let frame = 0;

    function activateMain(id) {
      if (id === currentMain) return;
      currentMain = id;
      mainTargets.forEach((item) => {
        const active = item.id === id;
        item.link.classList.toggle("is-active", active);
        if (active) item.link.setAttribute("aria-current", "location");
        else item.link.removeAttribute("aria-current");
      });
    }

    function activateCategory(id) {
      if (id === currentCategory) return;
      currentCategory = id;
      let activeLink = null;
      categoryTargets.forEach((item) => {
        const active = item.id === id;
        item.link.classList.toggle("is-active", active);
        if (active) {
          item.link.setAttribute("aria-current", "location");
          activeLink = item.link;
        } else {
          item.link.removeAttribute("aria-current");
        }
      });
      els.categoryNav.classList.toggle("has-active", Boolean(activeLink));
      if (!activeLink) return;
      els.categoryNav.style.setProperty("--track-x", `${activeLink.offsetLeft}px`);
      els.categoryNav.style.setProperty("--track-w", `${activeLink.offsetWidth}px`);
      const centered = activeLink.offsetLeft - (categoryStrip.clientWidth - activeLink.offsetWidth) / 2;
      const maxScroll = Math.max(0, categoryStrip.scrollWidth - categoryStrip.clientWidth);
      categoryStrip.scrollTo({
        left: Math.max(0, Math.min(centered, maxScroll)),
        behavior: reduceMotion.matches ? "auto" : "smooth",
      });
    }

    function update() {
      frame = 0;
      const activationLine = (header?.getBoundingClientRect().height || 0) + Math.min(window.innerHeight * .2, 160);
      let mainId = "";
      mainTargets.forEach((item) => {
        if (item.section.getBoundingClientRect().top <= activationLine) mainId = item.id;
      });
      activateMain(mainId);

      let categoryIdAtScroll = "";
      if (mainId === "catalog" && categoryTargets.length) {
        categoryIdAtScroll = categoryTargets[0].id;
        categoryTargets.forEach((item) => {
          if (item.section.getBoundingClientRect().top <= activationLine) categoryIdAtScroll = item.id;
        });
      }
      activateCategory(categoryIdAtScroll);
    }

    function requestUpdate() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    categoryLinks.forEach((link) => link.addEventListener("click", () => {
      activateCategory(link.hash.slice(1));
    }));
    requestUpdate();
  }

  function compactPrintMethod(value) {
    const text = String(value || "상담 시 안내").replaceAll("_", " ");
    return text.length > 20 ? `${text.slice(0, 19)}…` : text;
  }

  function productCard(product, options = {}) {
    const images = product.images || [];
    const labels = product.imageLabels || [];
    const badge = options.badge || (product.rank === 1 ? "BEST" : "");
    const variantClass = options.compact ? " product-card--compact" : "";
    const image = images[0] || "";
    return `
      <article class="product-card${variantClass}" data-product-id="${escapeHtml(product.id)}">
        ${badge ? `<span class="product-card__badge">${escapeHtml(badge)}</span>` : ""}
        <div class="product-card__media">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)} · ${escapeHtml(labels[0] || "색상 예시 1")}" loading="lazy" width="560" height="560">
          <button class="product-card__wishlist${isWishlisted(product.id) ? " is-active" : ""}" type="button" data-wishlist-toggle="${escapeHtml(product.id)}" data-product-name="${escapeHtml(product.name)}" aria-pressed="${isWishlisted(product.id)}" aria-label="${escapeHtml(product.name)} ${isWishlisted(product.id) ? "견적함에서 빼기" : "견적함에 담기"}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>
          </button>
        </div>
        <div class="product-card__info">
          <div class="product-card__brand">${escapeHtml(product.supplier || "3PICKS SELECT")}</div>
          <div class="product-card__name">${escapeHtml(product.name)}</div>
          <div class="product-card__price"><span>100개 기준</span><strong>${product.price ? `${money(product.price)}원` : "상담 시 안내"}</strong></div>
          <dl class="product-card__meta">
            <dt>MOQ</dt><dd>${escapeHtml(product.moqText || "상담 시 안내")}</dd>
            <dt>납기</dt><dd>${escapeHtml(product.lead || "상담 시 안내")}</dd>
            <dt>인쇄</dt><dd title="${escapeHtml(product.printMethod)}">${escapeHtml(compactPrintMethod(product.printMethod))}</dd>
          </dl>
          <div class="swatches" aria-label="${escapeHtml(product.name)} 색상 예시">
            ${images.map((source, index) => `
              <button class="swatch ${index === 0 ? "is-active" : ""}" type="button" data-image="${escapeHtml(source)}" data-alt="${escapeHtml(product.name)} · ${escapeHtml(labels[index] || `색상 예시 ${index + 1}`)}" aria-label="${escapeHtml(labels[index] || `색상 예시 ${index + 1}`)}" aria-pressed="${index === 0 ? "true" : "false"}">
                <img src="${escapeHtml(source)}" alt="" loading="lazy" width="32" height="32">
              </button>
            `).join("")}
          </div>
          <p class="color-note">사진은 색상 예시예요. 실제 제작 색상은 상담에서 확인해 드립니다.</p>
        </div>
      </article>
    `;
  }

  function renderCatalog() {
    els.catalogHost.innerHTML = categories.map((category, categoryIndex) => {
      const visible = products
        .filter((product) => product.category === category && product.visibility === "화면노출")
        .sort((a, b) => (a.rank || 99) - (b.rank || 99));
      return `
        <section class="tp-section category-section" id="${categoryId(category)}">
          <div class="category-head">
            <div>
              <div class="tp-eyebrow">Category ${String(categoryIndex + 1).padStart(2, "0")}</div>
              <h3>${escapeHtml(category)}</h3>
              <p>${escapeHtml(categoryDescriptions[category])}</p>
            </div>
            <div class="rail-controls">
              <button class="rail-arrow" type="button" data-rail-direction="-1" aria-label="${escapeHtml(category)} 이전 상품">←</button>
              <button class="rail-arrow" type="button" data-rail-direction="1" aria-label="${escapeHtml(category)} 다음 상품">→</button>
            </div>
          </div>
          <div class="product-rail" tabindex="0" aria-label="${escapeHtml(category)} 상품 목록">
            ${visible.map((product, index) => productCard(product, { badge: index === 0 ? "BEST" : "" })).join("")}
          </div>
        </section>
      `;
    }).join("");
  }

  function questions() {
    const base = [
      {
        key: "event",
        label: "행사 유형",
        title: "어떤 행사를 준비하고 계신가요?",
        description: "행사 성격에 잘 어울리는 굿즈부터 보여드릴게요.",
        type: "single",
        options: eventOptions,
      },
      {
        key: "count",
        label: "수량",
        title: "몇 분께 드릴 예정인가요?",
        description: "수량을 알려주시면 최소 주문 수량과 예상 단가를 함께 살펴볼게요.",
        type: "number",
        unit: "명",
        min: 1,
        placeholder: "100",
      },
      {
        key: "budget",
        label: "총예산",
        title: "생각해 두신 총예산이 있나요?",
        description: "만원 단위로 입력해 주세요. 인원수에 맞춰 1인당 예산을 계산해 드려요.",
        type: "number",
        unit: "만원",
        min: 10000,
        placeholder: "100",
      },
      {
        key: "due",
        label: "희망일",
        title: "언제 받아보셔야 하나요?",
        description: "희망하시는 날짜에 맞출 수 있는 상품부터 찾아볼게요.",
        type: "date",
      },
      {
        key: "logo",
        label: "로고 인쇄",
        title: "로고나 문구를 넣을까요?",
        description: "원하시면 인쇄 방식이 확인된 상품을 먼저 보여드려요.",
        type: "single",
        options: ["예", "아니오"],
      },
      {
        key: "excludes",
        label: "제외 품목",
        title: "빼고 싶은 품목이 있나요?",
        description: "최근에 이미 나눠드린 상품이 있다면 함께 골라주세요. 없다면 바로 넘어가셔도 돼요.",
        type: "multi",
        options: categories,
        optional: true,
      },
      {
        key: "tags",
        label: "원하는 느낌",
        title: "어떤 느낌을 원하시나요?",
        description: "마음에 가까운 키워드 세 개를 골라주세요. 상품의 우선순위를 정할 때 참고할게요.",
        type: "tags",
        options: trendTags,
        max: 3,
      },
    ];

    const conditional = [];
    if (state.answers.event === "워크샵·단합") {
      conditional.push({ key: "workshopType", label: "워크샵 유형", title: "워크샵은 어떻게 진행되나요?", description: "실내 강의 중심인지, 야외 활동 중심인지 알려주세요.", type: "single", options: ["강의·연수형", "야외·단합형"] });
    }
    if (state.answers.event === "창립기념") {
      conditional.push({ key: "anniversary", label: "창립 주년", title: "창립 몇 주년을 기념하시나요?", description: "기념 주년에 맞춰 각인과 예산 구성을 조금 더 세심하게 살펴볼게요.", type: "number", unit: "주년", min: 1, placeholder: "10" });
    }
    if (state.answers.event === "체육대회·사내 이벤트") {
      conditional.push({ key: "awards", label: "시상 여부", title: "시상이나 순위가 있나요?", description: "시상품이 필요하다면 수건과 타올의 세트·포장 구성도 함께 살펴볼게요.", type: "single", options: ["있음", "없음"] });
    }
    if (state.answers.event === "전시·컨퍼런스 배포") {
      conditional.push({ key: "conferenceType", label: "배포 대상", title: "누구에게 나눠드릴 예정인가요?", description: "부스 방문객용인지 참가자 키트용인지에 따라 구성을 다르게 추천해 드려요.", type: "single", options: ["부스 방문객", "등록 참가자 키트"] });
    }
    if (["명절·시즌 선물", "고객사·VIP 선물", "워크샵·단합"].includes(state.answers.event)) {
      conditional.push({ key: "publicRecipient", label: "수령 대상", title: "공직자·교직원·언론인도 받으시나요?", description: "포함된다면 1인당 5만 원 이하의 상품만 보여드릴게요.", type: "single", options: ["포함", "미포함"] });
    }
    return [...base, ...conditional];
  }

  function renderQuestion() {
    const list = questions();
    if (state.step >= list.length) state.step = list.length - 1;
    const question = list[state.step];
    const answer = state.answers[question.key];
    els.progressLabel.textContent = `STEP ${String(state.step + 1).padStart(2, "0")}`;
    els.progressCount.textContent = `${state.step + 1} / ${list.length}`;
    els.previous.disabled = state.step === 0;
    els.next.textContent = state.step === list.length - 1 ? "추천 결과 보기" : "다음";
    els.error.textContent = "";
    els.progressList.innerHTML = list.map((item, index) => `
      <li class="${index === state.step ? "is-current" : index < state.step ? "is-done" : ""}">
        <span>${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(item.label)}</span>
      </li>
    `).join("");

    let field = "";
    if (question.type === "single") {
      field = `<div class="option-grid">${question.options.map((option, index) => `
        <button class="option-card ${answer === option ? "is-selected" : ""}" type="button" data-single-value="${escapeHtml(option)}" aria-pressed="${answer === option}">
          <span>${escapeHtml(option)}</span><small>${String(index + 1).padStart(2, "0")}</small>
        </button>
      `).join("")}</div>`;
    } else if (question.type === "number") {
      const rawValue = question.key === "budget" ? budgetToInput(answer) : answer ? money(answer) : "";
      const fieldLabel = question.key === "budget" ? "총예산 (만원)" : question.title;
      const fieldHelp = question.key === "budget" ? "예: 100 입력 시 총예산 100만 원" : "숫자로 입력해 주세요.";
      const budgetUnknown = question.key === "budget" && state.answers.budgetUnknown;
      field = `
        <label class="field-label" for="questionInput">${escapeHtml(fieldLabel)}</label>
        <div class="input-wrap"><input id="questionInput" name="${question.key}" inputmode="numeric" autocomplete="off" value="${escapeHtml(rawValue)}" placeholder="${escapeHtml(question.placeholder)}" aria-describedby="fieldHelp" ${budgetUnknown ? "disabled" : ""}><span>${escapeHtml(question.unit)}</span></div>
        <div class="field-help" id="fieldHelp">${escapeHtml(fieldHelp)}</div>
        ${question.key === "budget" ? `<div class="budget-choice"><button class="tp-btn tp-btn--ghost ${budgetUnknown ? "is-selected" : ""}" type="button" data-budget-unknown aria-pressed="${budgetUnknown}">예산 아직 모름</button><div class="per-person" id="perPerson">${budgetUnknown ? "예산 없이 행사 적합도로 추천해요" : `1인당 예산 ${state.answers.count && answer ? `${money(Math.floor(Number(answer) / Number(state.answers.count)))}원` : "아직 계산하지 않았어요"}`}</div></div>` : ""}
      `;
    } else if (question.type === "date") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      field = `
        <label class="field-label" for="questionInput">희망 수령일</label>
        <div class="input-wrap"><input id="questionInput" name="${question.key}" type="date" min="${tomorrow.toISOString().slice(0, 10)}" value="${escapeHtml(answer)}"></div>
        <div class="field-help">받고 싶은 날짜를 선택해 주세요.</div>
      `;
    } else {
      const selected = Array.isArray(answer) ? answer : [];
      field = `<div class="${question.type === "tags" ? "tag-grid" : "check-grid"}">${question.options.map((option, index) => {
        const id = `${question.key}-${index}`;
        return `<span class="${question.type === "tags" ? "tag-chip" : "check-chip"}"><input id="${id}" type="checkbox" value="${escapeHtml(option)}" ${selected.includes(option) ? "checked" : ""}><label for="${id}">${escapeHtml(option)}</label></span>`;
      }).join("")}</div>`;
    }

    els.questionHost.innerHTML = `<h3>${escapeHtml(question.title)}</h3><p>${escapeHtml(question.description)}</p>${field}`;
  }

  function saveCurrentAnswer() {
    const question = questions()[state.step];
    if (!question) return;
    if (["number", "date"].includes(question.type)) {
      const input = els.questionHost.querySelector("#questionInput");
      if (question.type === "number") {
        if (question.key === "budget" && state.answers.budgetUnknown) {
          state.answers.budget = "";
          return;
        }
        const digits = input.value.replace(/[^0-9]/g, "");
        state.answers[question.key] = question.key === "budget" ? budgetToWon(digits) : digits;
      } else {
        state.answers[question.key] = input.value;
      }
    } else if (["multi", "tags"].includes(question.type)) {
      state.answers[question.key] = [...els.questionHost.querySelectorAll("input:checked")].map((input) => input.value);
    }
  }

  function validateCurrent() {
    const question = questions()[state.step];
    const answer = state.answers[question.key];
    if (question.key === "budget" && state.answers.budgetUnknown) return "";
    if (question.optional) return "";
    if (question.type === "tags") {
      if (!Array.isArray(answer) || answer.length !== 3) return "마음에 가까운 느낌 세 개를 골라주세요.";
      return "";
    }
    if (question.type === "number" && Number(answer) < question.min) {
      return question.key === "budget" ? "총예산을 1만 원 이상 입력해 주세요." : "1 이상의 숫자를 입력해 주세요.";
    }
    if (question.type === "date") {
      const chosen = new Date(`${answer}T23:59:59`);
      if (!answer || Number.isNaN(chosen.getTime()) || chosen <= new Date()) return "오늘보다 뒤의 날짜를 선택해 주세요.";
      return "";
    }
    if (!answer || (Array.isArray(answer) && !answer.length)) return "한 가지를 골라주세요.";
    return "";
  }

  function daysUntil(dateValue) {
    const now = new Date();
    const due = new Date(`${dateValue}T23:59:59`);
    return Math.max(0, Math.floor((due - now) / 86400000));
  }

  function moveCategory(list, category, targetIndex) {
    const next = list.filter((item) => item !== category);
    next.splice(Math.min(targetIndex, next.length), 0, category);
    return next;
  }

  function rankedCategories() {
    let ranking = [...(eventMap[state.answers.event] || categories.slice(0, 5))];
    const due = new Date(`${state.answers.due}T12:00:00`);
    const month = due.getMonth() + 1;
    if (state.answers.event === "워크샵·단합" && state.answers.workshopType === "강의·연수형") ranking = moveCategory(ranking, "볼펜", 2);
    if (state.answers.event === "워크샵·단합" && state.answers.workshopType === "야외·단합형" && month >= 6 && month <= 8) ranking = moveCategory(ranking, "보온보냉·런치백", 3);
    if (state.answers.event === "전시·컨퍼런스 배포" && state.answers.conferenceType === "등록 참가자 키트") ranking = moveCategory(ranking, "티셔츠·단체복", 2);
    if (state.answers.event === "명절·시즌 선물" && (month === 12 || month === 1)) ranking = moveCategory(ranking, "노트·다이어리", 0);
    return ranking.filter((category) => !state.answers.excludes.includes(category));
  }

  function recommend() {
    state.answers.budget = state.answers.budgetUnknown ? "" : normalizeBudgetWon(state.answers.budget);
    const leadLimit = daysUntil(state.answers.due);
    const month = new Date(`${state.answers.due}T12:00:00`).getMonth() + 1;
    const groups = window.RecommendationCore.recommend({
      products,
      answers: state.answers,
      categoryOrder: rankedCategories(),
      leadLimit,
      month,
    });
    state.results = groups;
    return groups;
  }

  function categoryReason(category) {
    const event = state.answers.event || "선택한 행사";
    const reasons = {
      "텀블러": `${event}에서 활용도가 높고 로고 각인도 다양하게 살펴볼 수 있어요.`,
      "에코백": `${event} 현장에서 물품을 담기 좋고 행사 뒤에도 다시 사용할 수 있어요.`,
      "볼펜": `${event}에서 많은 분께 나눠드리기 좋고 예산도 맞추기 쉬워요.`,
      "우산": `${event} 선물에 필요한 실용성과 선물다운 느낌을 모두 갖췄어요.`,
      "티셔츠·단체복": `${event}의 소속감과 현장 분위기를 살려줘요. 제작 전에는 사이즈를 취합해야 해요.`,
      "머그컵": `${event}가 끝난 뒤에도 사무실이나 집에서 오래 사용할 수 있어요.`,
      "보조배터리": `${event}에 실용적인 테크 굿즈를 더하고 싶을 때 잘 어울려요.`,
      "수건·타올": `${event}에 맞춰 단품과 세트, 포장 구성을 유연하게 고를 수 있어요.`,
      "노트·다이어리": `${event}의 기록과 업무 흐름에 자연스럽게 이어지는 굿즈예요.`,
      "보온보냉·런치백": `${event}의 야외 활동이나 이동 중에 특히 유용해요.`,
    };
    return reasons[category] || `${event}의 수량과 예산에 잘 맞는 품목이에요.`;
  }

  function resultNotice() {
    const notices = [];
    notices.push("구성가는 상품 마스터의 100개 주문 기준 단가 합계예요. 실제 수량별 단가와 인쇄비는 상담에서 확정해 드려요.");
    if (state.answers.budgetUnknown) notices.push("예산을 정하지 않아 행사와 원하는 느낌에 잘 맞는 대표 상품부터 보여드려요.");
    if (state.answers.publicRecipient === "포함") notices.push("공직자·교직원·언론인 수령 조건을 반영해 1인당 5만 원 이하의 상품만 골랐어요.");
    if (state.answers.event === "명절·시즌 선물") notices.push("명절 선물은 본선물에 자연스럽게 곁들일 수 있는 답례 구성을 중심으로 살펴봤어요.");
    if (state.answers.event === "고객사·VIP 선물" && state.answers.logo === "예") notices.push("VIP 선물은 전면 인쇄보다 완제품의 인상을 살리는 작은 각인이 더 잘 어울릴 수 있어요.");
    if (state.answers.event === "체육대회·사내 이벤트" && state.answers.awards === "있음") notices.push("시상품으로 수건이나 타올을 고르신다면 세트와 포장 방식도 함께 안내해 드릴게요.");
    return notices;
  }

  function consultationSummary() {
    const lines = [
      "[3PICKS 맞춤 추천 요약]",
      `행사: ${state.answers.event || "공유 결과"}`,
      state.answers.count ? `인원: ${money(state.answers.count)}명` : "",
      state.answers.due ? `희망일: ${state.answers.due}` : "",
      state.answers.logo ? `로고 인쇄: ${state.answers.logo}` : "",
      ...state.results.flatMap((group, index) => [
        `${index + 1}. ${group.category}${group.totalPrice ? ` · 1인당 ${money(group.totalPrice)}원` : ""}`,
        ...group.products.map((product) => `   - ${product.name} (${product.id})`),
      ]),
      "제작 색상과 재고, 정확한 단가와 납기는 상담에서 확인해 드립니다.",
    ];
    return lines.filter(Boolean).join("\n");
  }

  function budgetDifferenceLabel(group) {
    if (group.budgetUnknown || group.difference === null || group.difference === undefined) return "예산 미정";
    if (group.difference > 0) return `예산 ${money(group.difference)}원 남음`;
    if (group.difference < 0) return `예산 ${money(Math.abs(group.difference))}원 부족`;
    return "예산에 맞음";
  }

  function renderResults(groups = state.results, shared = false) {
    els.results.hidden = false;
    if (!groups.length) {
      clearRecommendationState();
      els.results.innerHTML = `
        <div class="result-empty">
          <div class="tp-eyebrow">No exact match</div>
          <h3>지금 조건에 꼭 맞는 세 가지를 찾지 못했어요.</h3>
          <p>예산과 수량, 희망일 중 하나를 조금 조정하거나 상담에서 더 넓은 상품을 함께 찾아볼 수 있어요.</p>
          <div class="tp-btns" style="justify-content:center;margin-top:20px"><button class="tp-btn tp-btn--primary" type="button" data-consult>상담으로 함께 찾기</button><button class="tp-btn tp-btn--secondary" type="button" data-restart>조건 다시 입력하기</button></div>
        </div>`;
      emit("result_view", { result_count: 0 });
      bindDynamicActions();
      return;
    }

    const notices = shared ? [] : resultNotice();
    const resultTitle = shared
      ? "공유받은 3PICKS 추천이에요"
      : state.answers.budgetUnknown
        ? "행사에 잘 맞는 세 가지를 먼저 골라봤어요"
        : "예산에 가장 가까운 세 가지 구성이에요";
    const resultDescription = shared
      ? "공유 링크에는 제품 정보만 담겨 있어요. 제작 조건과 견적은 상담에서 다시 확인해 주세요."
      : state.answers.budgetUnknown
        ? `${escapeHtml(state.answers.event)} · ${money(state.answers.count)}명 · 예산 미정 조건으로 골랐어요.`
        : `${escapeHtml(state.answers.event)} · ${money(state.answers.count)}명 · 1인당 ${money(Math.floor(Number(state.answers.budget) / Number(state.answers.count)))}원에 최대한 가깝게 맞췄어요.`;
    els.results.innerHTML = `
      <div class="result-summary">
        <div>
          <div class="tp-eyebrow">Your 3 picks</div>
          <h3>${resultTitle}</h3>
          <p>${resultDescription}</p>
          ${notices.map((notice) => `<p style="margin-top:8px"><strong>참고:</strong> ${escapeHtml(notice)}</p>`).join("")}
        </div>
        <button class="tp-btn tp-btn--secondary" type="button" data-restart>조건 바꿔 다시 보기</button>
      </div>
      <div class="result-groups result-groups--${Math.min(groups.length, 3)}">
        ${groups.map((group, index) => {
          return `
            <section class="result-group" style="--result-column:${index + 1}">
              <div class="result-group__head">
                <div class="result-number">0${index + 1}</div>
                <h4>${escapeHtml(group.category)}</h4>
                <div class="result-budget"><strong>${group.totalPrice ? `1인당 ${money(group.totalPrice)}원` : "가격 확인"}</strong><span class="${Number(group.difference) < 0 ? "is-over" : ""}">${escapeHtml(budgetDifferenceLabel(group))}</span></div>
                <p class="result-why">${group.budgetUnknown ? "행사 적합도와 원하는 느낌을 우선해 고른 대표 상품이에요." : `${group.products.length}종을 묶어 목표 예산과의 차이를 최소화했어요.`}</p>
              </div>
              <div class="result-bundle-products">${group.products.map((product, productIndex) => productCard(product, { badge: `구성${productIndex + 1}`, compact: true })).join("")}</div>
            </section>`;
        }).join("")}
      </div>
      <div class="result-tools">
        <button class="tp-btn tp-btn--ghost" type="button" data-copy-summary>상담 내용 복사</button>
        <button class="tp-btn tp-btn--secondary" type="button" data-share-result>추천 결과 공유</button>
        <button class="tp-btn tp-btn--primary" type="button" data-consult>카카오톡으로 상담하기</button>
      </div>
    `;
    saveRecommendationState(shared);
    emit("result_view", { result_count: groups.length });
    bindDynamicActions();
  }

  function bindDynamicActions() {
    els.results.querySelectorAll("[data-restart]").forEach((button) => button.addEventListener("click", restartSurvey));
    els.results.querySelector("[data-copy-summary]")?.addEventListener("click", () => copyText(consultationSummary(), "상담 내용을 복사했어요."));
    els.results.querySelector("[data-share-result]")?.addEventListener("click", shareResult);
  }

  function restartSurvey() {
    state.step = 0;
    state.results = [];
    clearRecommendationState();
    els.results.hidden = true;
    history.replaceState(null, "", `${location.pathname}${location.search}#recommend`);
    renderQuestion();
    document.querySelector("#surveyShell").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function shareResult() {
    const ids = state.results.map((group) => group.products.map((product) => product.id).join(".")).filter(Boolean);
    const url = new URL(location.href);
    url.hash = `r=${ids.join("~")}&v=2`;
    history.replaceState(null, "", url);
    emit("share_click", { product_ids: ids.join(",") });
    if (navigator.share) {
      try {
        await navigator.share({ title: "3PICKS 맞춤 추천", text: "행사에 맞춰 고른 굿즈 세 가지를 확인해 보세요.", url: url.href });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    copyText(url.href, "공유 링크를 복사했어요.");
  }

  function loadSharedResult() {
    const match = location.hash.match(/(?:^#|&)r=([^&]+)/);
    if (!match) return false;
    const encoded = decodeURIComponent(match[1]);
    const versionTwo = location.hash.includes("v=2");
    const groupIds = versionTwo ? encoded.split("~").slice(0, 3) : encoded.split(",").slice(0, 3);
    const groups = groupIds.map((value, index) => {
      const groupProducts = value.split(".").map((id) => products.find((product) => product.id === id)).filter(Boolean);
      const totalPrice = groupProducts.reduce((sum, product) => sum + Number(product.price || 0), 0);
      return { category: versionTwo ? `구성 ${String(index + 1).padStart(2, "0")}` : (groupProducts[0]?.category || `추천 ${index + 1}`), products: groupProducts, isBundle: versionTwo, budgetUnknown: true, totalPrice, targetPrice: null, difference: null };
    }).filter((group) => group.products.length);
    if (!groups.length) return false;
    state.results = groups;
    renderResults(groups, true);
    setTimeout(() => els.results.scrollIntoView({ block: "start" }), 120);
    return true;
  }

  function bindProductInteractions() {
    document.addEventListener("click", (event) => {
      const wishlistButton = event.target.closest("[data-wishlist-toggle]");
      if (wishlistButton) {
        toggleWishlist(wishlistButton.dataset.wishlistToggle);
        return;
      }
      const swatch = event.target.closest(".swatch");
      if (swatch) {
        const card = swatch.closest(".product-card");
        card.querySelector(".product-card__media img").src = swatch.dataset.image;
        card.querySelector(".product-card__media img").alt = swatch.dataset.alt;
        card.querySelectorAll(".swatch").forEach((button) => {
          const active = button === swatch;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        });
      }
      const arrow = event.target.closest("[data-rail-direction]");
      if (arrow) {
        const rail = arrow.closest(".category-section").querySelector(".product-rail");
        rail.scrollBy({ left: Number(arrow.dataset.railDirection) * rail.clientWidth * 0.78, behavior: "smooth" });
      }
    });
  }

  function setQuoteQuantity(value) {
    quoteState.quantity = normalizeQuoteQuantity(value);
    saveQuoteState();
    renderQuoteBar();
    emit("wishlist_qty_change", { quantity: quoteState.quantity });
  }

  function bindQuoteInteractions() {
    els.quoteTrigger.addEventListener("click", () => setQuoteOpen(!quoteState.open));
    els.quoteBar.addEventListener("click", (event) => {
      if (event.target.closest("[data-quote-collapse]")) {
        setQuoteOpen(false, true);
        return;
      }
      const step = event.target.closest("[data-quote-step]");
      if (step) {
        setQuoteQuantity(quoteState.quantity + Number(step.dataset.quoteStep));
        return;
      }
      const remove = event.target.closest("[data-quote-remove]");
      if (remove) {
        const productId = remove.dataset.quoteRemove;
        quoteState.items = quoteState.items.filter((item) => item.id !== productId);
        saveQuoteState();
        renderQuoteBar();
        emit("wishlist_remove", { product_id: productId, item_count: quoteState.items.length });
        showToast("미니 견적에서 뺐어요.");
        return;
      }
      if (event.target.closest("[data-quote-pdf]")) {
        openQuoteDocument();
        return;
      }
      if (event.target.closest("[data-quote-copy]")) {
        emit("wishlist_copy", { item_count: quoteTotals().selectedCount });
        copyText(quoteSummaryText(), "상담 내용을 복사했어요.");
        return;
      }
      if (event.target.closest("[data-quote-share]")) {
        shareQuote();
        return;
      }
      if (event.target.closest("[data-quote-consult]")) {
        openConsultation("mini_quote");
        copyText(quoteSummaryText(), "상담 내용을 복사했어요. 카카오톡에 붙여 넣어주세요.");
      }
    });
    els.quoteBar.addEventListener("change", (event) => {
      const selection = event.target.closest("[data-quote-select]");
      if (selection) {
        const item = quoteState.items.find((candidate) => candidate.id === selection.dataset.quoteSelect);
        if (!item) return;
        item.selected = selection.checked;
        saveQuoteState();
        renderQuoteBar();
        emit("wishlist_select", { product_id: item.id, selected: item.selected });
        return;
      }
      if (event.target === els.quoteQuantity) setQuoteQuantity(event.target.value);
    });
    els.quoteQuantity.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        setQuoteQuantity(event.target.value);
        event.target.select();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && quoteState.open) setQuoteOpen(false, true);
    });
  }

  function bindSurvey() {
    els.questionHost.addEventListener("click", (event) => {
      const budgetUnknownButton = event.target.closest("[data-budget-unknown]");
      if (budgetUnknownButton) {
        state.answers.budgetUnknown = !state.answers.budgetUnknown;
        state.answers.budget = "";
        renderQuestion();
        return;
      }
      const option = event.target.closest("[data-single-value]");
      if (!option) return;
      const question = questions()[state.step];
      state.answers[question.key] = option.dataset.singleValue;
      els.questionHost.querySelectorAll("[data-single-value]").forEach((button) => {
        const selected = button === option;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      els.error.textContent = "";
    });
    els.questionHost.addEventListener("input", (event) => {
      const question = questions()[state.step];
      if (question.type === "number") {
        const digits = event.target.value.replace(/[^0-9]/g, "");
        if (question.key === "budget") state.answers.budgetUnknown = false;
        state.answers[question.key] = question.key === "budget" ? budgetToWon(digits) : digits;
        event.target.value = digits ? money(digits) : "";
        if (question.key === "budget") {
          const perPerson = document.querySelector("#perPerson");
          perPerson.textContent = state.answers.count && state.answers.budget ? `1인당 예산 ${money(Math.floor(Number(state.answers.budget) / Number(state.answers.count)))}원` : "1인당 예산을 계산하고 있어요";
        }
      } else if (question.type === "date") {
        state.answers[question.key] = event.target.value;
      } else if (["multi", "tags"].includes(question.type)) {
        const selected = [...els.questionHost.querySelectorAll("input:checked")];
        if (question.type === "tags" && selected.length > question.max) {
          event.target.checked = false;
          showToast("원하는 느낌은 세 개까지 고를 수 있어요.");
        }
        state.answers[question.key] = [...els.questionHost.querySelectorAll("input:checked")].map((input) => input.value);
      }
      els.error.textContent = "";
    });
    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveCurrentAnswer();
      const error = validateCurrent();
      if (error) {
        els.error.textContent = error;
        return;
      }
      emit("step_complete", { step: state.step + 1, key: questions()[state.step].key });
      const list = questions();
      if (state.step < list.length - 1) {
        state.step += 1;
        renderQuestion();
      } else {
        renderResults(recommend());
        els.results.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    els.previous.addEventListener("click", () => {
      saveCurrentAnswer();
      if (state.step > 0) {
        state.step -= 1;
        renderQuestion();
      }
    });
    document.querySelectorAll('a[href="#recommend"]').forEach((link) => link.addEventListener("click", () => emit("survey_start")));
  }

  function openConsultation(source = "page") {
    const configured = Boolean(siteConfig.kakaoChannelUrl);
    emit("kakao_click", { configured, source });
    if (configured) {
      window.open(siteConfig.kakaoChannelUrl, "_blank", "noopener,noreferrer");
    } else if (typeof els.consultDialog.showModal === "function") {
      els.consultDialog.showModal();
    }
  }

  function bindConsultation() {
    document.addEventListener("click", (event) => {
      const consult = event.target.closest("[data-consult]");
      if (consult) openConsultation("page");
      if (event.target.closest("[data-copy-contact]")) {
        const contact = `3PICKS ${siteConfig.contactName || "백선미 이사"} ${siteConfig.contactPhone || "010-6331-9276"} / ${siteConfig.contactEmail || "julia@3picks.co.kr"}`;
        copyText(contact, "담당자 연락처를 복사했어요.");
      }
      if (event.target.closest("[data-close-dialog]")) els.consultDialog.close();
    });
    els.consultDialog.addEventListener("click", (event) => {
      if (event.target === els.consultDialog) els.consultDialog.close();
    });
  }

  function init() {
    if (!products.length) {
      document.body.innerHTML = '<main class="tp-wrap tp-section"><h1>상품을 불러오지 못했어요.</h1><p>잠시 후 다시 열어주세요.</p></main>';
      return;
    }
    renderCategoryNavigation();
    renderCatalog();
    renderQuoteBar();
    bindScrollSpy();
    renderQuestion();
    bindSurvey();
    bindProductInteractions();
    bindQuoteInteractions();
    bindConsultation();
    const loadedSharedResult = loadSharedResult();
    if (!loadedSharedResult) restoreRecommendationState();
    bindRefreshScrollRestoration();
  }

  init();
})();
