"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("app.js", "utf8");
const config = fs.readFileSync("config.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const imagePath = "assets/recommendation-team-v1.webp";

assert.ok(config.includes('kakaoChannelUrl: "https://open.kakao.com/me/3PICK"'), "카카오 오픈채팅 주소가 설정되지 않았습니다.");
assert.ok(app.includes(`src="${imagePath}"`), "추천 결과에 팀 일러스트가 연결되지 않았습니다.");
assert.ok(app.includes('width="654" height="680"'), "추천 이미지 크기 메타데이터가 없습니다.");
assert.ok(app.indexOf('class="result-intro"') < app.indexOf('class="result-groups'), "추천 일러스트가 결과 구성보다 먼저 나와야 합니다.");
assert.ok(html.includes(".result-intro{display:grid"), "추천 결과 인트로 레이아웃이 없습니다.");
assert.ok(html.includes("grid-template-columns:minmax(0,1fr) minmax(220px,270px)"), "데스크톱 추천 인트로가 270px 비례 축소 일러스트 열이 아닙니다.");
assert.ok(html.includes(".result-summary{display:flex;flex-direction:column;align-items:flex-start;padding:24px"), "데스크톱 추천 요약이 세로 flex 구조가 아닙니다.");
assert.ok(html.includes(".result-summary .tp-btn--secondary{margin-top:auto"), "조건 변경 버튼이 주황 셀 하단에 고정되지 않았습니다.");
assert.ok(html.includes(".result-summary{display:grid;grid-template-columns:1fr;gap:24px}"), "모바일 추천 요약이 카피 아래 흐름으로 복원되지 않았습니다.");
assert.ok(html.includes(".result-summary .tp-btn--secondary{margin-top:0}"), "모바일 조건 변경 버튼의 자동 상단 여백이 해제되지 않았습니다.");
assert.ok(html.includes(".result-group{min-width:0;display:grid;grid-template-columns:minmax(240px,1fr) repeat(3,minmax(0,1fr))"), "데스크톱 추천 구성이 설명+3픽 가로 행이 아닙니다.");
assert.ok(html.includes(".result-group{grid-template-columns:repeat(2,minmax(0,1fr))}"), "모바일 추천 구성이 2×2 테이블이 아닙니다.");
assert.ok(app.includes('const pickLabels = ["1st pick", "2nd pick", "3rd pick"]'), "1st·2nd·3rd pick 라벨이 없습니다.");
assert.ok(app.includes('const groupTitles = ["첫번째 구성.", "두번째 구성.", "세번째 구성."]'), "추천 구성 제목이 자연어 서수형이 아닙니다.");
assert.ok(app.includes('<h4>${escapeHtml(groupTitles[index] || group.category)}</h4>'), "추천 구성 화면 제목이 자연어 서수형을 사용하지 않습니다.");
assert.ok(!app.includes('<h4>${escapeHtml(group.category)}</h4>'), "기계적인 구성 식별값이 화면 제목에 남아 있습니다.");
assert.ok(app.includes('class="result-pick"') && app.includes('${pickCells}'), "구성별 제품 3칸 렌더 구조가 없습니다.");
assert.ok(!app.includes("result-bundle-products"), "폐기한 세로 제품 묶음이 남아 있습니다.");
assert.ok(fs.existsSync(imagePath), "추천 결과 이미지 파일이 없습니다.");

console.log("PASS homepage follow-up kakao=linked intro-button=desktop-bottom-left/mobile-flow result-layout=desktop-4col/mobile-2x2 picks=1st/2nd/3rd");
