// 라이브 사이트의 운영 상태(site-overrides.js + 콘솔이 올린 상품 사진)를 로컬 폴더로 회수한다.
// 어드민은 배포 저장소에 직접 커밋하므로, 회수 없이 로컬 기준으로 전달 zip을 다시 만들면
// 콘솔에서 등록·수정한 내용이 증발한다. build-official-bundle.sh 전에 반드시 실행한다.
//
// 사용: node tools/pull_live_state.js [--url https://www.3picks.co.kr/] [--dry-run]
// 공개 페이지를 fetch하므로 토큰이 필요 없다.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const urlFlag = args.indexOf("--url");
const baseUrl = (urlFlag >= 0 ? args[urlFlag + 1] : "https://www.3picks.co.kr/").replace(/\/?$/, "/");

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return response.text();
}
async function fetchBinary(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

(async () => {
  const overridesUrl = `${baseUrl}site-overrides.js?pull=${Date.now()}`;
  let text;
  try {
    text = await fetchText(overridesUrl);
  } catch (error) {
    console.error(`FAIL 라이브 설정을 읽지 못했습니다: ${error.message}`);
    console.error("공식 사이트가 아직 없으면 --url로 스테이징 주소를 지정하세요. 예: --url https://works.choi.build/3picks/");
    process.exit(1);
  }
  const match = text.match(/window\.SITE_OVERRIDES\s*=\s*(\{[\s\S]*\});/);
  if (!match) {
    console.error("FAIL 응답에서 SITE_OVERRIDES를 찾지 못했습니다 — 주소가 사이트 루트인지 확인하세요.");
    process.exit(1);
  }
  let overrides;
  try {
    overrides = JSON.parse(match[1]);
  } catch {
    console.error("FAIL SITE_OVERRIDES JSON 해석 실패 — 파일이 손상됐는지 확인하세요.");
    process.exit(1);
  }

  // 콘솔이 참조하는 이미지 경로 수집: 신규 상품 + 기존 상품의 사진 교체 오버라이드
  const imagePaths = new Set();
  (overrides.productAdditions || []).forEach((product) => (product.images || []).forEach((p) => imagePaths.add(p)));
  Object.values(overrides.productOverrides || {}).forEach((patch) => (patch.images || []).forEach((p) => imagePaths.add(p)));

  const missing = [...imagePaths].filter((relative) => !fs.existsSync(path.join(root, relative)));
  console.log(`라이브 설정 v${overrides.version || 1} · updatedAt ${overrides.updatedAt || "없음"}`);
  console.log(`신규 상품 ${(overrides.productAdditions || []).length}개 · 수정 델타 ${Object.keys(overrides.productOverrides || {}).length}건 · 참조 사진 ${imagePaths.size}장 (로컬에 없는 사진 ${missing.length}장)`);

  if (dryRun) {
    missing.forEach((p) => console.log(`  받을 파일: ${p}`));
    console.log("DRY-RUN — 아무것도 쓰지 않았습니다.");
    return;
  }

  for (const relative of missing) {
    if (!/^assets\/products\/[\w.-]+\.(webp|png)$/.test(relative)) {
      console.error(`FAIL 예상 밖 이미지 경로를 건너뜁니다: ${relative}`);
      process.exitCode = 1;
      continue;
    }
    const buffer = await fetchBinary(`${baseUrl}${relative}`);
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
    console.log(`받음 ${relative} (${buffer.length}B)`);
  }

  const localOverridesPath = path.join(root, "site-overrides.js");
  fs.writeFileSync(localOverridesPath, text.replace(/\s*$/, "\n"));
  console.log(`갱신 site-overrides.js (${fs.statSync(localOverridesPath).size}B)`);
  console.log("DONE 라이브 상태를 로컬로 회수했습니다. 이제 전달 zip을 만들어도 콘솔 등록분이 보존됩니다.");
})();
