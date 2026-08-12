// 홈페이지(app.js) ↔ 운영 콘솔(admin.html) 짝 계약 검사
// 홈페이지를 수정하면 어드민도 쌍으로 수정한다 — 이 검사가 두 파일의 사본 구조가
// 어긋나는 순간 FAIL을 낸다. 홈페이지·어드민 어느 쪽이든 고친 턴에는 반드시 실행한다.
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
const adminSrc = fs.readFileSync(path.join(root, "admin.html"), "utf8");

const failures = [];
const assertSame = (name, a, b) => {
  const left = JSON.stringify(a);
  const right = JSON.stringify(b);
  if (left !== right) failures.push(`${name} 불일치\n  app.js  : ${left}\n  admin   : ${right}`);
};

// 소스에서 `const 이름 = {…}` / `[…]` 리터럴을 괄호 균형으로 잘라 파싱한다.
function extractLiteral(src, marker, open, close, label) {
  const start = src.indexOf(marker);
  if (start < 0) { failures.push(`${label}: '${marker}' 선언을 찾지 못함`); return null; }
  const from = src.indexOf(open, start);
  let depth = 0;
  for (let i = from; i < src.length; i += 1) {
    if (src[i] === open) depth += 1;
    else if (src[i] === close) {
      depth -= 1;
      if (depth === 0) {
        const body = src.slice(from, i + 1);
        try { return Function(`"use strict"; return (${body});`)(); }
        catch (error) { failures.push(`${label}: 리터럴 파싱 실패 — ${error.message}`); return null; }
      }
    }
  }
  failures.push(`${label}: 괄호 균형 실패`);
  return null;
}

// 1) 행사별 기본 매핑 — 어드민은 app.js 기본값의 사본을 든다
assertSame(
  "defaultEventMap(행사별 기본 매핑)",
  extractLiteral(appSrc, "const defaultEventMap", "{", "}", "app.js defaultEventMap"),
  extractLiteral(adminSrc, "const defaultEventMap", "{", "}", "admin defaultEventMap"),
);

// 2) 선호 태그 목록
assertSame(
  "trendTags(선호 태그)",
  extractLiteral(appSrc, "const trendTags", "[", "]", "app.js trendTags"),
  extractLiteral(adminSrc, "const trendTags", "[", "]", "admin trendTags"),
);

// 3) site-overrides가 덮을 수 있는 상품 필드 — 정본은 recommendation-core 한 곳이다(사본 금지).
//    양쪽 화면이 사본 없이 core의 목록·병합 함수를 쓰는지 확인한다.
const coreSrc = fs.readFileSync(path.join(root, "recommendation-core.js"), "utf8");
const coreFields = extractLiteral(coreSrc, "const OVERRIDABLE_PRODUCT_FIELDS", "[", "]", "core OVERRIDABLE_PRODUCT_FIELDS");
if (!Array.isArray(coreFields) || coreFields.length === 0) {
  failures.push("core OVERRIDABLE_PRODUCT_FIELDS가 비어 있음");
}
if (!adminSrc.includes("core.OVERRIDABLE_PRODUCT_FIELDS")) {
  failures.push("admin이 core.OVERRIDABLE_PRODUCT_FIELDS를 쓰지 않음 — 독립 사본으로 회귀했는지 확인할 것");
}
if (/const overridableProductFields/.test(appSrc)) {
  failures.push("app.js에 overridable 필드 사본이 다시 생김 — 정본은 recommendation-core 한 곳");
}
if (!appSrc.includes("RecommendationCore.activeSiteProducts")) {
  failures.push("app.js가 core의 activeSiteProducts 병합을 쓰지 않음 — 병합 규칙 사본 여부를 확인할 것");
}
if (!adminSrc.includes("core.mergeSiteProducts") || !adminSrc.includes("core.filterActiveProducts")) {
  failures.push("admin이 core의 병합·상태 필터 함수를 쓰지 않음 — 시뮬레이터와 홈페이지 동작이 갈라질 수 있음");
}

// 3-1) 상품 상태 enum — core 정본과 어드민 표시 라벨의 키가 같아야 한다
const coreStatuses = extractLiteral(coreSrc, "const PRODUCT_STATUSES", "[", "]", "core PRODUCT_STATUSES");
const adminStatusNames = extractLiteral(adminSrc, "const statusNames", "{", "}", "admin statusNames");
assertSame("product statuses(상품 상태 enum)", coreStatuses, adminStatusNames ? Object.keys(adminStatusNames) : null);

// 4) 자동 순위 조정 규칙 — moveCategory 호출과 조건을 정규화해 비교
function moveRules(src) {
  return [...src.matchAll(/if \((.+?)\) ranking = moveCategory\(ranking, "(.+?)", (\d+)\)/g)]
    .map((m) => `${m[1].replace(/state\.answers\./g, "answers.")} => ${m[2]}@${m[3]}`)
    .sort();
}
assertSame("자동 순위 조정 규칙(moveCategory)", moveRules(appSrc), moveRules(adminSrc));

// 5) 공유 모듈 로드 — 어드민이 홈페이지와 같은 엔진·데이터 파일을 쓰는지
["site-overrides.js", "assets/products-data.js", "recommendation-core.js"].forEach((file) => {
  if (!adminSrc.includes(`src="${file}"`)) failures.push(`admin.html이 공유 파일 ${file}을 로드하지 않음`);
});

// 6) 노출 의미 계약 — visibility는 진열이 아니라 자동 추천 여부다.
//    홈페이지 카탈로그가 visibility로 거르기 시작하면 어드민 문구를 다시 맞춰야 하므로 FAIL.
const catalogBlock = appSrc.slice(appSrc.indexOf("function renderCatalog"), appSrc.indexOf("function renderCatalog") + 900);
if (/visibility/.test(catalogBlock)) {
  failures.push("홈페이지 카탈로그가 visibility로 거르기 시작함 — 어드민의 「자동 추천에 나감」 문구·안내를 재검토할 것");
}
if (!adminSrc.includes("자동 추천에 나감")) {
  failures.push("어드민 토글 라벨(자동 추천에 나감)이 사라짐 — 홈페이지 실동작과 어긋나지 않는지 확인할 것");
}

// 7) 연락처 운영 경계 — 이메일 레이어는 config.js, 상품·추천은 콘솔이 담당한다.
if (!adminSrc.includes("이메일 문의 레이어") || !adminSrc.includes("config.js")) {
  failures.push("어드민에 이메일 문의 담당자의 config.js 운영 경계 안내가 없음");
}

if (failures.length) {
  console.error(`FAIL 홈페이지↔어드민 짝 계약 ${failures.length}건\n` + failures.map((f) => `- ${f}`).join("\n"));
  process.exit(1);
}
console.log("PASS admin-pairing eventMap+tags+fields+moveRules+shared-src+visibility-contract");
