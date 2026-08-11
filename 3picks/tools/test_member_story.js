"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

function webpDimensions(filePath) {
  const data = fs.readFileSync(filePath);
  assert.equal(data.toString("ascii", 0, 4), "RIFF", `${filePath}가 RIFF WebP가 아닙니다.`);
  assert.equal(data.toString("ascii", 8, 12), "WEBP", `${filePath}가 WebP가 아닙니다.`);
  const marker = data.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
  assert.ok(marker >= 0, `${filePath}의 VP8 크기 헤더를 읽을 수 없습니다.`);
  return {
    width: data.readUInt16LE(marker + 3) & 0x3fff,
    height: data.readUInt16LE(marker + 5) & 0x3fff,
    bytes: data.length,
  };
}

function pngMetadata(filePath) {
  const data = fs.readFileSync(filePath);
  assert.ok(data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${filePath}가 PNG가 아닙니다.`);
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    hasAlpha: [4, 6].includes(data[25]),
    bytes: data.length,
  };
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}
const storyStart = html.indexOf('<section class="member-story"');
const storyEnd = html.indexOf("</section>", storyStart);

assert.ok(storyStart >= 0 && storyEnd > storyStart, "멤버 소개 안의 스토리툰 영역이 없습니다.");
const story = html.slice(storyStart, storyEnd);

const panelMatches = [...story.matchAll(/<figure class="([^"]*\bstory-panel\b[^"]*)"[^>]*>([\s\S]*?)<\/figure>/g)];
const panels = panelMatches.map((match) => match[2]);
assert.equal(panels.length, 6, "스토리툰이 정확히 6컷이 아닙니다.");

const expectedPanels = [
  {
    asset: "assets/team-story-01-career-v2.webp",
    title: "막내 인생 26년",
    sha256: "a2c1ff56cb1f32f4b5b0c76ddf63e943ed9093baa239ce10bdf4794f0fab87d9",
  },
  {
    asset: "assets/team-story-02-three-picks-v2.webp",
    title: "세 가지의 저주",
    sha256: "a6bb7c8beb0e9f013564fdd403425fec1757ceae0b88ffd5afb33c76f80c577a",
  },
  {
    asset: "assets/team-story-03-overtime-v2.webp",
    title: "쇼핑인데 왜 야근",
    sha256: "a8f74e9d2516d96fc45ea0351fab1ab8320c0c0dcf2a72d34fde399fd6176e1b",
  },
  {
    asset: "assets/team-story-04-origin-v2.webp",
    title: "한이 브랜드가<br>되던 날",
    sha256: "a3d665531e5801706da70c4a3d2565aec9d6c3f814febb84e3bbb0c38bd123ee",
  },
  {
    asset: "assets/team-story-05-curation-v2.webp",
    title: "찾고,<br>고르고,<br>비교하고",
    sha256: "f523072c4dc2ef4247e35a767356dfe3467118e440edc7d85705f1aa45118744",
  },
  {
    asset: "assets/team-story-06-you-are-boss-v2.webp",
    title: "여러분은<br>찾지 마세요.<br>정리하지도 마세요.<br>그냥 보고만<br>받으세요.",
    sha256: "6c6471c59b3275600bd43af3d50fdcc59750a8e099e79d4a9c81d1b42fd147bb",
  },
];

expectedPanels.forEach((expected, index) => {
  const panel = panels[index];
  const cutNumber = String(index + 1).padStart(2, "0");
  assert.ok(panelMatches[index][1].split(/\s+/).includes(`story-panel--${cutNumber}`), `컷 ${cutNumber}의 폭·정렬 클래스가 순서와 맞지 않습니다.`);
  assert.match(panel, new RegExp(`class="story-panel__no"[^>]*>[^<]*${cutNumber}[^<]*<`), `컷 ${cutNumber} 번호나 순서가 다릅니다.`);
  assert.ok(panel.includes("<picture>"), `컷 ${cutNumber}의 picture 요소가 없습니다.`);
  assert.ok(panel.includes(`<img src="${expected.asset}"`), `컷 ${cutNumber} 자산 참조가 다릅니다.`);
  assert.ok(panel.includes('width="1448" height="1086"'), `컷 ${cutNumber}의 HTML 이미지 크기가 1448×1086이 아닙니다.`);
  assert.ok(panel.includes('alt=""'), `컷 ${cutNumber} 장식 이미지의 빈 대체 텍스트가 없습니다.`);
  assert.ok(panel.includes("<figcaption>"), `컷 ${cutNumber}의 HTML 의미 영역이 없습니다.`);
  assert.ok(panel.indexOf("<picture>") < panel.indexOf("<figcaption>"), `컷 ${cutNumber}의 캡션이 이미지와 같은 패널 내부에 있지 않습니다.`);
  assert.ok(panel.includes(`<h4>${expected.title}</h4>`), `컷 ${cutNumber} 제목 카피가 다릅니다.`);
  const assetPath = path.join(root, expected.asset);
  assert.ok(fs.existsSync(assetPath), `컷 ${cutNumber} 자산 파일이 없습니다.`);
  const dimensions = webpDimensions(assetPath);
  assert.deepEqual({ width: dimensions.width, height: dimensions.height }, { width: 1448, height: 1086 }, `컷 ${cutNumber} WebP 실파일 크기가 다릅니다.`);
  assert.ok(dimensions.bytes > 0, `컷 ${cutNumber} WebP가 비어 있습니다.`);
  assert.equal(sha256(assetPath), expected.sha256, `컷 ${cutNumber} 확정 자산의 SHA-256이 다릅니다.`);
});

for (const expected of expectedPanels) {
  assert.equal((story.match(new RegExp(expected.asset.replaceAll(".", "\\."), "g")) || []).length, 1, `${expected.asset} 참조 수가 1회가 아닙니다.`);
}

function normalizedHtmlText(value) {
  return value.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const expectedStorySegments = [
  "새로운 경험을 꿈꾸고, 또 좇다 보니 대기업부터 중소기업까지 참 열심히도 옮겨 다녔습니다.",
  "덕분에 차곡차곡 쌓인 경력은 무려, 막내 인생 26년.",
  "희한하게도 회사만 옮기면 기다렸다는 듯 제게 찾아오는 일이 하나 있었습니다.",
  "“이번 판촉물 좀 알아봐 줘.” “굿즈도 몇 개 찾아보고.” “최소 세 가지는 비교해서 보고해 줘.”",
  "아니, 제 마음속 1등은 이미 정해졌는데 대체 그놈의 ‘세 가지 비교 보고’가 뭐라고….",
  "귀찮은 마음에 제일 괜찮은 것 하나만 들고 가면 어김없이 돌아오는 3연타.",
  "“차별성이 없는데?” “다른 것도 더 찾아봐.” “장단점까지 정리해 줘.”",
  "네, 다시 해오겠습니다. 제가 막내니까요.",
  "사실 제가 가장 좋아하고, 제일 잘하는 건 쇼핑입니다. 그런데 이상하죠. 회사 굿즈와 판촉물 쇼핑만큼은 한숨이 먼저 나왔습니다.",
  "최신 유행 찾아야지, 가격 비교해야지, 업체 알아봐야지, 최소 수량 확인해야지, 마지막에는 보고서까지 써야지….",
  "쇼핑은 제가 했는데, 왜 결제는 회사가 하고 야근은 제가 하는 걸까요?",
  "그렇게 수많은 막내들의 귀찮음과 한을 차곡차곡 모아 3PICKS가 탄생했습니다.",
  "여러분은 여러분의 일에만 집중하세요. 쇼핑은 저희가 하고, 보고서도 저희가 쓰겠습니다.",
  "최신 트렌드와 지금 가장 핫한 아이템을 샅샅이 찾아 딱 세 가지로 추려드립니다. 가격부터 장단점까지, 상사도 한눈에 알아보게 비교해 드립니다.",
  "여러분은 찾지 마세요. 정리하지도 마세요. 그냥 보고만 받으세요.",
  "3PICKS의 상사는 바로 당신이니까요.",
  "마음에 드실 때까지 찾아오겠습니다. 늘 그래왔듯이요.",
];
const actualStorySegments = [];
panels.forEach((panel, index) => {
  if (index === 5) {
    const finalTitle = panel.match(/<h4>([\s\S]*?)<\/h4>/)?.[1] || "";
    actualStorySegments.push(normalizedHtmlText(finalTitle));
  }
  const copyBlock = panel.match(/<div class="story-panel__copy">([\s\S]*?)<\/div>/)?.[1] || "";
  const paragraphs = [...copyBlock.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map((match) => normalizedHtmlText(match[1]));
  actualStorySegments.push(...paragraphs);
});
assert.equal(expectedStorySegments.length, 17, "스토리 원문 정본 segment 수가 17개가 아닙니다.");
assert.deepEqual(actualStorySegments, expectedStorySegments, "스토리 원문 17개 segment가 누락됐거나 순서·문구가 바뀌었습니다.");
const normalizedStory = normalizedHtmlText(story);
const quotedDirectives = normalizedStory.match(/“[^”]+”/g) || [];
assert.deepEqual(quotedDirectives, [
  "“이번 판촉물 좀 알아봐 줘.”",
  "“굿즈도 몇 개 찾아보고.”",
  "“최소 세 가지는 비교해서 보고해 줘.”",
  "“차별성이 없는데?”",
  "“다른 것도 더 찾아봐.”",
  "“장단점까지 정리해 줘.”",
], "상사의 6개 지시·피드백 인용문이 누락되거나 바뀌었습니다.");
const meaningCheckpoints = [
  ["대기업", "중소기업", "막내 인생 26년"],
  ["회사만 옮기면", "찾아오는 일이", "다시 해오겠습니다", "제가 막내니까요"],
  ["가장 좋아하고, 제일 잘하는 건 쇼핑", "회사 굿즈와 판촉물 쇼핑", "한숨이 먼저"],
  ["최신 유행", "가격 비교", "업체", "최소 수량", "보고서", "야근"],
  ["막내들의 귀찮음과 한", "3PICKS가 탄생"],
  ["여러분의 일에만 집중", "쇼핑은 저희가", "보고서도 저희가"],
  ["최신 트렌드", "핫한 아이템", "세 가지", "가격", "장단점"],
  ["찾지 마세요", "정리하지도 마세요", "보고만", "상사는 바로 당신", "마음에 드실 때까지"],
];
for (const checkpointGroup of meaningCheckpoints) {
  for (const checkpoint of checkpointGroup) assert.ok(normalizedStory.includes(checkpoint), `스토리 의미 체크포인트가 없습니다: ${checkpoint}`);
}

const aboutStart = html.indexOf('<section class="tp-section about" id="about">');
const profileCopy = html.slice(aboutStart, storyStart);
assert.ok(profileCopy.includes("<h2>사람과 브랜드를 이해하는<br>사람들이 함께합니다.</h2>"), "멤버 소개 제목 또는 줄바꿈이 확정 카피와 다릅니다.");
assert.ok(profileCopy.includes("백선미 이사") && profileCopy.includes("브랜드를 알리고, 사람을 찾고, 성장을 가르쳐 온 경험"), "긴머리 화자의 의미 카피가 없습니다.");
assert.ok(profileCopy.includes("두 번째 멤버") && profileCopy.includes("소개와 경력은 곧 업데이트됩니다."), "짧은머리 팀 캐릭터의 확인된 의미 카피가 없습니다.");
const profileAssets = ["assets/team-baek-sunmi-v2.png", "assets/team-member-placeholder-v2.png"];
for (const profileAsset of profileAssets) {
  assert.equal((profileCopy.match(new RegExp(profileAsset.replaceAll(".", "\\."), "g")) || []).length, 1, `${profileAsset} 프로필 참조 수가 1회가 아닙니다.`);
  const metadata = pngMetadata(path.join(root, profileAsset));
  assert.ok(metadata.bytes > 0 && metadata.width > 0 && metadata.height > 0, `${profileAsset} 프로필 PNG가 비어 있습니다.`);
  assert.ok(metadata.hasAlpha, `${profileAsset} 프로필 PNG에 알파 채널이 없습니다.`);
}
assert.equal(
  sha256(path.join(root, "assets/team-baek-sunmi-v2.png")),
  "1b9812de3a83086172ab9052fbe1c1d3c02996d3c7410bd7fa9210fb6f34b333",
  "백선미 프로필의 짙은 브라운 긴머리·둥근 안경 확정 자산이 바뀌었습니다.",
);
assert.equal(
  sha256(path.join(root, "assets/team-member-placeholder-v2.png")),
  "00f68471e72cdd2d131d5e4b6a42d73b9d727a2841dae79e6aa8d470a69e5cd8",
  "짧은머리 성숙한 직장인 확정 프로필 자산이 바뀌었습니다.",
);
const profileImageRule = html.match(/\.team-member__visual img\{([^}]*)\}/)?.[1] || "";
assert.ok(profileImageRule.includes("width:100%") && profileImageRule.includes("height:100%") && profileImageRule.includes("object-fit:contain"), "프로필 공통 contain 시각 크기 기준이 다릅니다.");
assert.match(profileCopy, /<article class="team-member team-member--baek">/, "백선미 프로필에 전용 시각 보정 클래스가 없습니다.");
assert.match(html, /\.team-member--baek \.team-member__visual img\{[^}]*transform:scale\(1\.02\)[^}]*transform-origin:center bottom[^}]*\}/, "백선미 프로필의 1.02 배율·하단 기준 보정이 없습니다.");
assert.ok(!/\.team-member--placeholder \.team-member__visual img\{[^}]*transform:/.test(html), "짧은머리 프로필에 폐기된 transform이 남아 있습니다.");
assert.ok(!story.includes("공동창업자") && !story.includes("두 번째 멤버의 경력"), "짧은머리 캐릭터에 확인되지 않은 이력이 섞였습니다.");
const storyText = story.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
assert.ok(storyText.includes("찾지 마세요. 정리하지도 마세요. 그냥 보고만 받으세요."), "엔딩 제목 카피가 없습니다.");
assert.ok(story.includes("<h4>찾고,<br>비교하고,<br>보고하는 귀찮은 일.<br>이제 3PICKS에 시키세요.</h4>"), "엔딩 4줄 카피 또는 줄바꿈이 다릅니다.");
assert.match(story, /<button[^>]*data-consult[^>]*>[^<]+<\/button>/, "스토리툰 CTA가 기존 data-consult 동작을 재사용하지 않습니다.");
const endingCtaRule = html.match(/\.member-story__ending \.tp-btn\{([^}]*)\}/)?.[1] || "";
assert.ok(endingCtaRule.includes("border-color:var(--tp-cell)") && endingCtaRule.includes("background:transparent") && endingCtaRule.includes("color:var(--tp-cell)"), "스토리 엔딩 CTA의 밝은 테두리·투명 배경·밝은 글자 계약이 다릅니다.");

assert.ok(html.includes(".member-story__grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr))"), "스토리툰의 12열 모자이크 기준이 없습니다.");
assert.ok(!html.includes(".member-story__grid{display:flex;flex-direction:column}"), "폐기된 flex-column 스토리 계약이 남아 있습니다.");
assert.match(html, /\.member-story__head h3\{[^}]*font-size:clamp\(56px,6vw,76px\)[^}]*font-weight:900[^}]*\}/, "스토리 제목의 데스크톱 크기·굵기 계약이 다릅니다.");
assert.match(html, /@media \(max-width:600px\)[\s\S]*?\.member-story__head h3\{[^}]*font-size:42px[^}]*\}/, "스토리 제목의 모바일 42px 계약이 없습니다.");
const desktopGridRule = html.match(/\.member-story__grid\{([^}]*)\}/)?.[1] || "";
assert.ok(desktopGridRule.includes("grid-auto-rows:auto"), "스토리 데스크톱 pair의 자동 행 높이 계약이 없습니다.");
assert.ok(!desktopGridRule.includes("grid-template-rows:repeat(3"), "폐기된 스토리 데스크톱 3행 고정 높이가 남아 있습니다.");
assert.ok(desktopGridRule.includes("align-items:stretch"), "스토리 데스크톱 행의 stretch 정렬 계약이 없습니다.");
const panelRule = html.match(/\.story-panel\{([^}]*)\}/)?.[1] || "";
assert.ok(panelRule.includes("position:relative") && panelRule.includes("height:100%") && panelRule.includes("overflow:hidden"), "스토리 패널의 기준 박스·행 채움·클리핑 계약이 다릅니다.");
assert.ok(panelRule.includes("display:grid") && panelRule.includes("grid-template-rows:auto 1fr"), "스토리 패널의 picture·caption 자동/잔여행 계약이 없습니다.");

const desktopMosaic = {
  "01": ["1/5", "1"],
  "02": ["5/13", "1"],
  "03": ["1/9", "2"],
  "04": ["9/13", "2"],
  "05": ["1/9", "3"],
  "06": ["9/13", "3"],
};
for (const [cutNumber, [column, row]] of Object.entries(desktopMosaic)) {
  const firstRule = html.match(new RegExp(`\\.story-panel--${cutNumber}\\{([^}]*)\\}`))?.[1] || "";
  assert.ok(firstRule.includes(`grid-column:${column}`) && firstRule.includes(`grid-row:${row}`), `컷 ${cutNumber}의 데스크톱 12열 스팬이 다릅니다.`);
}

const pictureRule = html.match(/\.story-panel picture\{([^}]*)\}/)?.[1] || "";
assert.ok(pictureRule.includes("height:clamp(300px,30vw,420px)") && pictureRule.includes("overflow:hidden") && pictureRule.includes("border:0"), "스토리 데스크톱 pair image의 공통 높이·클리핑·무경계 계약이 다릅니다.");
assert.ok(!pictureRule.includes("aspect-ratio:"), "스토리 데스크톱 picture에 폐기된 aspect-ratio가 남아 있습니다.");
const imageRule = html.match(/\.story-panel img\{([^}]*)\}/)?.[1] || "";
assert.ok(imageRule.includes("height:100%") && imageRule.includes("object-fit:cover"), "스토리 이미지가 데스크톱 패널을 cover로 채우지 않습니다.");
assert.match(html, /\.story-panel--02 img\{[^}]*transform:scale\(1\.05\)[^}]*\}/, "02컷 외곽선 crop을 위한 1.05 확대 계약이 없습니다.");

const desktopCss = html.slice(0, html.indexOf("@media (max-width:900px)"));
const panelBorderRules = [...desktopCss.matchAll(/\.(?:story-panel(?:--0[1-6])?)(?![\w-])(?:\s+figcaption)?\{([^}]*)\}/g)];
for (const [, declarations] of panelBorderRules) {
  const borders = [...declarations.matchAll(/border(?:-(?:top|right|bottom|left))?\s*:\s*([^;}]*)/g)].map((match) => match[1].trim());
  assert.ok(borders.every((value) => /^(?:0(?:px)?|none)$/.test(value)), `스토리 패널 또는 figcaption에 0이 아닌 border가 있습니다: ${borders.join(", ")}`);
}
assert.ok(!/\.story-panel--0[1-6]\{[^}]*border-(?:top|right|bottom|left):/.test(html), "스토리 패널에 폐기된 단일 edge가 남아 있습니다.");
assert.ok(!/\.story-panel--0[1-6] figcaption\{[^}]*border-(?:top|right|bottom|left):/.test(html), "figcaption에 폐기된 단일 edge가 남아 있습니다.");
assert.ok(!/\.story-panel__no::before\s*\{/.test(html), "스토리 번호에 폐기된 장식선 pseudo-element가 남아 있습니다.");
assert.ok(!/\.story-panel::after\s*\{/.test(html), "스토리 패널에 폐기된 장식선 pseudo-element가 남아 있습니다.");

assert.match(html, /\.story-panel figcaption\{[^}]*position:relative[^}]*z-index:2[^}]*\}/, "스토리 figcaption이 relative 인플로우 영역이 아닙니다.");
const figcaptionCss = html.slice(html.indexOf(".story-panel figcaption{"), html.indexOf(".story-panel__no{"));
assert.ok(figcaptionCss.includes("background:var(--tp-cell)") && figcaptionCss.includes("border:0") && figcaptionCss.includes("clip-path:none"), "figcaption의 무채색·무경계·무클리핑 인플로우 면 계약이 없습니다.");
assert.ok(!figcaptionCss.includes("position:absolute"), "figcaption에 폐기된 absolute overlay가 남아 있습니다.");
assert.ok(!/(?:--tp-pop|--tp-sun|#FC6B38|#FFFD78)/i.test(figcaptionCss), "figcaption에 유채색이 사용됐습니다.");

const mobileBreakpoint = html.indexOf("@media (max-width:600px)");
const mobileCss = html.slice(mobileBreakpoint);
const tabletBreakpoint = html.indexOf("@media (max-width:900px)");
const tabletCss = html.slice(tabletBreakpoint, mobileBreakpoint);
assert.ok(mobileBreakpoint >= 0, "600px 모바일 분기점이 없습니다.");
assert.ok(tabletBreakpoint >= 0 && tabletBreakpoint < mobileBreakpoint, "900px 태블릿 분기점 순서가 다릅니다.");
assert.match(tabletCss, /\.story-panel picture\{[^}]*height:auto[^}]*aspect-ratio:4\/3[^}]*\}/, "900px 이하 picture의 4:3 자동 높이 계약이 없습니다.");
assert.ok(!/\.story-panel[^}]*position:absolute/.test(mobileCss), "모바일 컷이 DOM 세로 흐름에서 이탈했습니다.");
assert.match(mobileCss, /\.story-panel figcaption\{[^}]*inset:auto[^}]*width:auto[^}]*\}/, "모바일 figcaption의 inset·width 자동 리셋이 없습니다.");
assert.match(mobileCss, /\.story-panel picture\{[^}]*aspect-ratio:3\/4[^}]*\}/, "600px 이하 picture의 3:4 계약이 없습니다.");
const mobileMosaic = {
  "01": ["1/13", "1"],
  "02": ["3/13", "2"],
  "03": ["1/13", "3"],
  "04": ["1/11", "4"],
  "05": ["1/13", "5"],
  "06": ["4/13", "6"],
};
for (const [cutNumber, [column, row]] of Object.entries(mobileMosaic)) {
  const rule = mobileCss.match(new RegExp(`\\.story-panel--${cutNumber}\\{([^}]*)\\}`))?.[1] || "";
  assert.ok(rule.includes(`grid-column:${column}`) && rule.includes(`grid-row:${row}`), `컷 ${cutNumber}의 모바일 혼합 오프셋이 다릅니다.`);
}
assert.ok(html.includes("body{overflow-x:clip"), "모바일 페이지 가로 넘침 차단 규칙이 없습니다.");
assert.ok(!/\.member-story[^}]*overflow-x:auto/.test(html), "스토리툰에 가로 스크롤이 남아 있습니다.");

console.log("PASS member-story panels=6 segments=17 meaning=checkpoints quotes=6 assets=sha256 profiles=baek1.02/short1 story02-scale=1.05 copy=exact-html/br cta=data-consult/white mosaic=12col/auto-pairs/mobile-offset border=zero caption=relative-inflow overflow=0");
