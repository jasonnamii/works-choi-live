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
assert.ok(html.includes(".result-summary{display:grid;grid-template-columns:1fr;align-content:center;justify-items:start"), "조건 변경 버튼이 카피 아래 좌측에 정렬되지 않았습니다.");
assert.ok(html.includes(".result-group{min-width:0;display:grid;grid-template-columns:minmax(240px,1fr) repeat(3,minmax(0,1fr))"), "데스크톱 추천 구성이 설명+3픽 가로 행이 아닙니다.");
assert.ok(html.includes(".result-group{grid-template-columns:repeat(2,minmax(0,1fr))}"), "모바일 추천 구성이 2×2 테이블이 아닙니다.");
assert.ok(app.includes('const pickLabels = ["1st pick", "2nd pick", "3rd pick"]'), "1st·2nd·3rd pick 라벨이 없습니다.");
assert.ok(app.includes('class="result-pick"') && app.includes('${pickCells}'), "구성별 제품 3칸 렌더 구조가 없습니다.");
assert.ok(!app.includes("result-bundle-products"), "폐기한 세로 제품 묶음이 남아 있습니다.");
assert.ok(fs.existsSync(imagePath), "추천 결과 이미지 파일이 없습니다.");

console.log("PASS homepage follow-up kakao=linked result-layout=desktop-4col/mobile-2x2 picks=1st/2nd/3rd");
