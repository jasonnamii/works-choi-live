(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AdminCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
  const MAX_IMAGE_PIXELS = 25_000_000;
  const MAX_IMAGE_EDGE = 6000;

  function normalizeConnection(input) {
    return {
      owner: String(input && input.owner || "").trim(),
      repo: String(input && input.repo || "").trim(),
      branch: String(input && input.branch || "main").trim() || "main",
      token: String(input && input.token || "").trim(),
    };
  }

  function connectionIdentity(input) {
    const value = normalizeConnection(input);
    return `${value.owner}/${value.repo}@${value.branch}|${value.token}`;
  }

  function publishedSnapshot(overrides, updatedAt) {
    return { ...JSON.parse(JSON.stringify(overrides)), updatedAt };
  }

  function withoutUploadedImage(pendingImages, imagePath) {
    const next = { ...(pendingImages || {}) };
    delete next[imagePath];
    return next;
  }

  async function publishOperation({ overrides, pendingImages, uploadImage, saveSettings, now, onCheckpoint }) {
    let remaining = { ...(pendingImages || {}) };
    const entries = Object.entries(remaining);
    for (let index = 0; index < entries.length; index += 1) {
      const [imagePath, image] = entries[index];
      const uploaded = await uploadImage(imagePath, image, index, entries.length);
      if (!uploaded || !uploaded.ok) {
        return { ok: false, phase: "image", status: uploaded && uploaded.status, index, total: entries.length, remaining };
      }
      remaining = withoutUploadedImage(remaining, imagePath);
      if (onCheckpoint) await onCheckpoint(remaining, imagePath);
    }
    const published = publishedSnapshot(overrides, now());
    const saved = await saveSettings(published);
    if (!saved || !saved.ok) return { ok: false, phase: "settings", status: saved && saved.status, remaining, published };
    return { ok: true, phase: "done", remaining, published, saved };
  }

  function validateUploadMeta(file, width, height) {
    if (!file || !ALLOWED_IMAGE_TYPES.includes(file.type)) return "JPG·PNG·WebP 이미지만 올릴 수 있습니다.";
    if (!(file.size > 0) || file.size > MAX_UPLOAD_BYTES) return "사진은 한 장에 10MB 이하여야 합니다.";
    if (!(width > 0) || !(height > 0)) return "이미지 크기를 확인할 수 없습니다.";
    if (width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE || width * height > MAX_IMAGE_PIXELS) {
      return "사진은 한 변 6,000px·전체 2,500만 픽셀 이하여야 합니다.";
    }
    return "";
  }

  return {
    ALLOWED_IMAGE_TYPES,
    MAX_UPLOAD_BYTES,
    MAX_IMAGE_PIXELS,
    MAX_IMAGE_EDGE,
    normalizeConnection,
    connectionIdentity,
    publishedSnapshot,
    withoutUploadedImage,
    publishOperation,
    validateUploadMeta,
  };
});
