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
assert.ok(fs.existsSync(imagePath), "추천 결과 이미지 파일이 없습니다.");

console.log("PASS homepage follow-up kakao=linked mobile-nav=visible result-visual=linked");
