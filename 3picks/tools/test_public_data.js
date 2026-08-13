"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { publicProductsSource, publicOverridesSource } = require("./build_public_data.js");

const root = path.resolve(__dirname, "..");
const products = publicProductsSource(fs.readFileSync(path.join(root, "assets", "products-data.js"), "utf8"));
const overrides = publicOverridesSource(fs.readFileSync(path.join(root, "site-overrides.js"), "utf8"));
assert.ok(!/supplier/.test(products), "공개 상품 데이터에 공급처 필드가 남았습니다.");
assert.ok(!/supplier/.test(overrides), "공개 운영 설정에 공급처 필드가 남았습니다.");
assert.equal((products.match(/\"id\":\"p\d+/g) || []).length, 110, "공개 데이터가 숨김 승격용 원본 110개를 보존하지 않습니다.");

console.log("PASS public-data supplier=0 base-products=110 promotion-pool=preserved");
