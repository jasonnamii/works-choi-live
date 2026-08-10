#!/usr/bin/env python3
"""Build the local 3PICKS catalog data and web-sized product images."""

from __future__ import annotations

import json
import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import openpyxl
import cv2
import numpy as np
from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parent
ASSETS = PROJECT / "assets"
PRODUCT_ASSETS = ASSETS / "products"


def nfc(value: object) -> str:
    return unicodedata.normalize("NFC", str(value or "").strip())


def clean_category(value: object) -> str:
    return re.sub(r"^\d+\.\s*", "", nfc(value))


def first_number(value: object) -> int | None:
    match = re.search(r"\d[\d,]*", nfc(value))
    return int(match.group().replace(",", "")) if match else None


def lead_days(value: object) -> int | None:
    text = nfc(value)
    if not text or any(word in text for word in ("문의", "확인불가")):
        return None
    values = [int(number) for number in re.findall(r"\d+", text)]
    return max(values) if values else None


TAG_KEYWORDS = {
    "미니멀": ("미니멀", "심플", "무지", "뉴트럴"),
    "친환경": ("친환경", "리사이클", "재생", "에코", "OEKO"),
    "실용템": ("실용", "데일리", "기능", "수납", "방수"),
    "데스크테리어": ("데스크", "사무", "오피스", "노트", "볼펜", "머그"),
    "힙한": ("힙", "스트릿", "그래픽", "트렌드"),
    "레트로": ("레트로", "클래식", "빈티지", "크라프트"),
    "아웃도어": ("아웃도어", "피크닉", "캠핑", "스포츠", "방수"),
    "프리미엄": ("프리미엄", "브랜드", "고급", "VIP", "정품"),
    "귀여움": ("귀여", "캐릭터", "프렌즈", "토끼"),
    "컬러팝": ("컬러", "파스텔", "투톤", "배색", "풀컬러"),
    "테크": ("충전", "배터리", "PD", "케이블", "테크"),
    "시즌한정": ("시즌", "연말", "다이어리", "우산", "쿨", "보온", "보냉"),
}


def derive_tags(product: dict[str, object]) -> list[str]:
    haystack = " ".join(
        nfc(product.get(key))
        for key in ("상품명", "상품성격", "특징/비고", "추천 행사", "카테고리")
    ).lower()
    tags = [
        tag
        for tag, keywords in TAG_KEYWORDS.items()
        if any(keyword.lower() in haystack for keyword in keywords)
    ]
    if not tags:
        tags.append("실용템")
    return tags[:3]


def find_inputs() -> tuple[Path, Path]:
    xlsx = next(SOURCE.rglob("*.xlsx"))
    image_root = next(
        path
        for path in SOURCE.iterdir()
        if path.is_dir() and len(list(path.rglob("*.png"))) >= 300
    )
    return xlsx, image_root


def image_index(image_root: Path) -> dict[str, dict[int, list[Path]]]:
    index: dict[str, dict[int, list[Path]]] = {}
    for directory in image_root.iterdir():
        if not directory.is_dir():
            continue
        category = clean_category(directory.name)
        grouped: dict[int, list[Path]] = {}
        for image in sorted(directory.glob("*.png")):
            match = re.match(r"(\d+)_", nfc(image.name))
            if match:
                grouped.setdefault(int(match.group(1)), []).append(image)
        index[category] = grouped
    return index


def variant_label(path: Path) -> str:
    stem = nfc(path.stem)
    variant = stem.split("__", 1)[-1]
    variant = re.sub(r"^\d+_", "", variant)
    return variant.replace("_색상보완", "").replace("_", " ")


def convert_one(source: Path, destination: Path) -> None:
    with Image.open(source) as original:
        image = original.convert("RGB")
        image.thumbnail((560, 560), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (560, 560), "white")
        offset = ((560 - image.width) // 2, (560 - image.height) // 2)
        canvas.paste(image, offset)

        pixels = np.array(canvas)
        near_white = np.all(pixels >= 254, axis=2).astype(np.uint8)
        component_count, labels, stats, _ = cv2.connectedComponentsWithStats(
            near_white, connectivity=4
        )
        border_labels = np.unique(
            np.concatenate((labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]))
        )
        background = np.isin(labels, border_labels[border_labels != 0])
        soft_background = np.zeros(near_white.shape, dtype=np.float32)

        # Handles, straps, mug ears and cable loops can enclose pieces of the
        # original white backdrop. Include only compact, sizeable enclosed
        # white regions whose surrounding edge is visibly darker. This keeps
        # white product surfaces and small white logos intact.
        edge_kernel = np.ones((7, 7), dtype=np.uint8)
        border_set = set(int(label) for label in border_labels)
        for label in range(1, component_count):
            if label in border_set:
                continue
            x, y, width, height, area = (int(value) for value in stats[label])
            fill_ratio = area / max(1, width * height)
            if area < 120 or min(width, height) < 14 or fill_ratio < 0.5:
                continue
            component = (labels == label).astype(np.uint8)
            ring = cv2.dilate(component, edge_kernel, iterations=1).astype(bool)
            ring &= ~component.astype(bool)
            surrounding = pixels[ring]
            if not len(surrounding):
                continue
            dark_edge_ratio = np.mean(np.min(surrounding, axis=1) < 245)
            if dark_edge_ratio >= 0.18:
                background |= component.astype(bool)
            elif area >= 5000 and fill_ratio >= 0.6:
                smooth = cv2.morphologyEx(
                    component,
                    cv2.MORPH_CLOSE,
                    cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)),
                )
                smooth = cv2.morphologyEx(
                    smooth,
                    cv2.MORPH_OPEN,
                    cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)),
                )
                soft_background = np.maximum(
                    soft_background,
                    cv2.GaussianBlur(smooth.astype(np.float32), (0, 0), 2),
                )

        cream = np.array((245, 240, 228), dtype=np.float32)
        pixels[background] = cream.astype(np.uint8)
        if np.any(soft_background):
            pixels_float = pixels.astype(np.float32)
            white_factor = np.clip((np.min(pixels_float, axis=2) - 238) / 17, 0, 1)
            alpha = (soft_background * white_factor)[..., None]
            pixels = np.clip(pixels_float * (1 - alpha) + cream * alpha, 0, 255).astype(np.uint8)
        Image.fromarray(pixels, "RGB").save(destination, "WEBP", quality=82, method=6)


def main() -> None:
    xlsx, image_root = find_inputs()
    workbook = openpyxl.load_workbook(xlsx, data_only=True, read_only=True)
    sheet = workbook["전체마스터"]
    rows = sheet.iter_rows(values_only=True)
    headers = [nfc(value) for value in next(rows)]
    image_map = image_index(image_root)
    category_counts: dict[str, int] = {}
    products: list[dict[str, object]] = []
    jobs: list[tuple[Path, Path]] = []

    for values in rows:
        raw = dict(zip(headers, values))
        if not raw.get("상품명"):
            continue
        category = clean_category(raw.get("카테고리"))
        category_counts[category] = category_counts.get(category, 0) + 1
        local_number = category_counts[category]
        number = first_number(raw.get("No")) or len(products) + 1
        product_id = f"p{number:03d}"
        sources = image_map.get(category, {}).get(local_number, [])
        output_images: list[str] = []
        labels: list[str] = []
        for variant, source_image in enumerate(sources, 1):
            filename = f"{product_id}-{variant:02d}.webp"
            destination = PRODUCT_ASSETS / filename
            output_images.append(f"assets/products/{filename}")
            labels.append(variant_label(source_image))
            jobs.append((source_image, destination))

        source_dict = {key: raw.get(key) for key in raw}
        product = {
            "id": product_id,
            "number": number,
            "category": category,
            "name": nfc(raw.get("상품명")),
            "rank": first_number(raw.get("품질순위")),
            "visibility": nfc(raw.get("★노출구분")),
            "popularity": nfc(raw.get("인기도")),
            "price": first_number(raw.get("객단가(100개,원)")),
            "moq": first_number(raw.get("MOQ")),
            "moqText": nfc(raw.get("MOQ")),
            "printMethod": nfc(raw.get("인쇄방식")),
            "lead": nfc(raw.get("납기")),
            "leadDays": lead_days(raw.get("납기")),
            "available": nfc(raw.get("제작가능")).upper().startswith("Y"),
            "supplier": nfc(raw.get("공급처")),
            "images": output_images,
            "imageLabels": labels,
            "tags": derive_tags(source_dict),
        }
        products.append(product)

    PRODUCT_ASSETS.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = [executor.submit(convert_one, source, destination) for source, destination in jobs]
        for future in as_completed(futures):
            future.result()

    encoded = json.dumps(products, ensure_ascii=False, separators=(",", ":"))
    (ASSETS / "products.json").write_text(
        json.dumps(products, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (ASSETS / "products-data.js").write_text(
        f"window.PRODUCTS={encoded};\n", encoding="utf-8"
    )

    if len(products) != 110:
        raise SystemExit(f"Expected 110 products, found {len(products)}")
    missing = [product["id"] for product in products if len(product["images"]) != 3]
    if missing:
        raise SystemExit(f"Products without exactly three images: {', '.join(missing)}")
    print(f"Built {len(products)} products and {len(jobs)} WebP images")


if __name__ == "__main__":
    main()
