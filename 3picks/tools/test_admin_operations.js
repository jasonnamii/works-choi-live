"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const adminCore = require("../operations/admin-core.js");

const root = path.resolve(__dirname, "..");
const admin = fs.readFileSync(path.join(root, "operations", "admin.html"), "utf8");

const first = { owner: "team", repo: "site", branch: "main", token: "token-a" };
assert.equal(adminCore.connectionIdentity(first), "team/site@main|token-a");
assert.notEqual(adminCore.connectionIdentity(first), adminCore.connectionIdentity({ ...first, repo: "other" }), "저장소 변경이 연결 identity를 바꾸지 않습니다.");
assert.notEqual(adminCore.connectionIdentity(first), adminCore.connectionIdentity({ ...first, token: "token-b" }), "토큰 변경이 연결 identity를 바꾸지 않습니다.");

const original = { version: 2, updatedAt: null, eventMap: null, weights: null, productOverrides: {}, productAdditions: [] };
const published = adminCore.publishedSnapshot(original, "2026-08-14T00:00:00.000Z");
assert.equal(published.updatedAt, "2026-08-14T00:00:00.000Z");
assert.equal(original.updatedAt, null, "반영 snapshot 생성이 원본 초안을 바꿨습니다.");

const pending = { "assets/products/a.webp": { bytes: 10 }, "assets/products/b.webp": { bytes: 20 } };
assert.deepEqual(adminCore.withoutUploadedImage(pending, "assets/products/a.webp"), { "assets/products/b.webp": { bytes: 20 } });
assert.equal(Object.keys(pending).length, 2, "업로드 체크포인트가 입력 객체를 직접 훼손했습니다.");

assert.equal(adminCore.validateUploadMeta({ type: "image/png", size: 1024 }, 1200, 1200), "");
assert.match(adminCore.validateUploadMeta({ type: "image/svg+xml", size: 1024 }, 1200, 1200), /JPG/);
assert.match(adminCore.validateUploadMeta({ type: "image/png", size: 11 * 1024 * 1024 }, 1200, 1200), /10MB/);
assert.match(adminCore.validateUploadMeta({ type: "image/png", size: 1024 }, 7000, 7000), /6,000px/);

assert.ok(admin.includes("connection.identity !== currentConnectionIdentity()"), "반영 직전 연결 대상 identity 재검사가 없습니다.");
assert.ok(admin.includes("writeJson(localStorage, storage.published, published)"), "반영 성공 snapshot 영속화가 없습니다.");
assert.ok(admin.includes("state.pendingImages = adminCore.withoutUploadedImage"), "사진별 업로드 체크포인트가 없습니다.");
assert.ok(admin.includes("storage.lastGood") && admin.includes("restorePrevious"), "직전 정상 설정 복구 흐름이 없습니다.");
assert.ok(admin.includes('path.startsWith("assets/") ? `../${path}` : path'), "operations 폴더에서 상품 이미지 경로를 보정하지 않습니다.");
assert.ok(!admin.includes("tokenLocal") && !admin.includes("ghRemember"), "토큰 장기 보관 경로가 남아 있습니다.");

console.log("PASS admin-operations identity+published-snapshot+image-checkpoint+session-token+restore+upload-limits");
