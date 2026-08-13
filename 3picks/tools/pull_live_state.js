// 라이브의 검증된 운영 데이터와 콘솔 업로드 사진만 로컬로 회수한다.
// 사용: node tools/pull_live_state.js [--url https://www.3picks.co.kr/] [--dry-run]
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const urlFlag = args.indexOf("--url");
const requestedUrl = urlFlag >= 0 ? args[urlFlag + 1] : "https://www.3picks.co.kr/";
const allowedHosts = new Set(["3picks.co.kr", "www.3picks.co.kr", "works.choi.build"]);
const allowedTopFields = new Set(["version", "updatedAt", "eventMap", "weights", "productOverrides", "productAdditions"]);
const allowedProductFields = new Set([
  "id", "number", "category", "name", "rank", "visibility", "popularity", "price", "moq", "moqText",
  "printMethod", "lead", "leadDays", "available", "supplier", "images", "imageLabels", "tags", "status", "titleUsesImageLabel",
]);
const maxSettingsBytes = 2 * 1024 * 1024;
const maxImageBytes = 6 * 1024 * 1024;

function checkedBaseUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
    throw new Error("허용된 3PICKS HTTPS 주소만 사용할 수 있습니다.");
  }
  parsed.pathname = parsed.pathname.replace(/\/?$/, "/");
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

function ensureSize(response, limit, label) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > limit) throw new Error(`${label} 응답이 허용 크기를 넘었습니다.`);
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "error", cache: "no-store" });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  ensureSize(response, maxSettingsBytes, "설정");
  const type = response.headers.get("content-type") || "";
  if (!/(javascript|text\/plain|octet-stream)/i.test(type)) throw new Error(`설정 MIME이 예상과 다릅니다: ${type || "없음"}`);
  const text = await response.text();
  if (Buffer.byteLength(text) > maxSettingsBytes) throw new Error("설정 응답이 허용 크기를 넘었습니다.");
  return text;
}

async function fetchBinary(url) {
  const response = await fetch(url, { redirect: "error", cache: "no-store" });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  ensureSize(response, maxImageBytes, "이미지");
  const type = response.headers.get("content-type") || "";
  if (!/^image\/(webp|png)$/i.test(type)) throw new Error(`이미지 MIME이 예상과 다릅니다: ${type || "없음"}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxImageBytes) throw new Error("이미지 응답이 허용 크기를 넘었습니다.");
  return buffer;
}

function validateProduct(record, label, requireFullRecord) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error(`${label}이 객체가 아닙니다.`);
  const unexpected = Object.keys(record).filter((key) => !allowedProductFields.has(key));
  if (unexpected.length) throw new Error(`${label}에 예상 밖 필드가 있습니다: ${unexpected.join(", ")}`);
  if (requireFullRecord && !/^p\d{3,}$/.test(String(record.id || ""))) throw new Error(`${label}의 상품 ID가 올바르지 않습니다.`);
  if (record.images !== undefined) {
    if (!Array.isArray(record.images) || !record.images.every((image) => /^assets\/products\/[\w.-]+\.(webp|png)$/.test(image))) {
      throw new Error(`${label}의 이미지 경로가 올바르지 않습니다.`);
    }
  }
}

function validateOverrides(overrides) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) throw new Error("운영 설정이 객체가 아닙니다.");
  const unexpected = Object.keys(overrides).filter((key) => !allowedTopFields.has(key));
  if (unexpected.length) throw new Error(`운영 설정에 예상 밖 필드가 있습니다: ${unexpected.join(", ")}`);
  if (Number(overrides.version) !== 2) throw new Error("지원하지 않는 운영 설정 버전입니다.");
  if (!overrides.productOverrides || typeof overrides.productOverrides !== "object" || Array.isArray(overrides.productOverrides)) throw new Error("productOverrides 형식이 올바르지 않습니다.");
  if (!Array.isArray(overrides.productAdditions)) throw new Error("productAdditions 형식이 올바르지 않습니다.");
  Object.entries(overrides.productOverrides).forEach(([id, patch]) => {
    if (!/^p\d{3,}$/.test(id)) throw new Error(`수정 상품 ID가 올바르지 않습니다: ${id}`);
    validateProduct(patch, `수정 상품 ${id}`, false);
  });
  overrides.productAdditions.forEach((product, index) => validateProduct(product, `신규 상품 ${index + 1}`, true));
  return overrides;
}

function parseOverrides(text) {
  const match = text.match(/^\s*(?:\/\/[^\n]*\n)*window\.SITE_OVERRIDES\s*=\s*(\{[\s\S]*\});\s*$/);
  if (!match) throw new Error("응답이 단일 SITE_OVERRIDES 설정 파일 형식이 아닙니다.");
  return validateOverrides(JSON.parse(match[1]));
}

function serializeOverrides(overrides) {
  return [
    "// 3PICKS 운영 설정 — operations/admin.html에서 저장하면 이 파일이 갱신됩니다.",
    "// 값이 null이거나 비어 있으면 사이트 기본값이 그대로 적용됩니다.",
    "// productOverrides는 기존 상품의 수정 델타, productAdditions는 콘솔에서 등록한 신규 상품 전체 레코드입니다.",
    `window.SITE_OVERRIDES = ${JSON.stringify(overrides, null, 2)};`,
    "",
  ].join("\n");
}

async function main() {
  let baseUrl;
  try { baseUrl = checkedBaseUrl(requestedUrl); }
  catch (error) { console.error(`FAIL ${error.message}`); process.exit(1); }
  const overridesUrl = new URL(`site-overrides.js?pull=${Date.now()}`, baseUrl);
  let overrides;
  try { overrides = parseOverrides(await fetchText(overridesUrl)); }
  catch (error) {
    console.error(`FAIL 라이브 설정을 안전하게 읽지 못했습니다: ${error.message}`);
    console.error("공식 사이트 개통 전에는 --url https://works.choi.build/3picks/ 를 사용하세요.");
    process.exit(1);
  }

  const imagePaths = new Set();
  (overrides.productAdditions || []).forEach((product) => (product.images || []).forEach((value) => imagePaths.add(value)));
  Object.values(overrides.productOverrides || {}).forEach((patch) => (patch.images || []).forEach((value) => imagePaths.add(value)));
  const missing = [...imagePaths].filter((relative) => !fs.existsSync(path.join(root, relative)));
  console.log(`라이브 설정 v${overrides.version} · updatedAt ${overrides.updatedAt || "없음"}`);
  console.log(`신규 상품 ${overrides.productAdditions.length}개 · 수정 델타 ${Object.keys(overrides.productOverrides).length}건 · 참조 사진 ${imagePaths.size}장 (로컬에 없는 사진 ${missing.length}장)`);
  if (dryRun) {
    missing.forEach((value) => console.log(`  받을 파일: ${value}`));
    console.log("DRY-RUN — 아무것도 쓰지 않았습니다.");
    return;
  }

  for (const relative of missing) {
    const buffer = await fetchBinary(new URL(relative, baseUrl));
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
    console.log(`받음 ${relative} (${buffer.length}B)`);
  }
  const serialized = serializeOverrides(overrides);
  fs.writeFileSync(path.join(root, "site-overrides.js"), serialized);
  console.log(`갱신 site-overrides.js (${Buffer.byteLength(serialized)}B)`);
  console.log("DONE 검증된 라이브 운영 상태를 로컬로 회수했습니다.");
}

if (require.main === module) {
  main().catch((error) => { console.error(`FAIL ${error.message}`); process.exit(1); });
}

module.exports = { checkedBaseUrl, validateOverrides, parseOverrides, serializeOverrides, main };
