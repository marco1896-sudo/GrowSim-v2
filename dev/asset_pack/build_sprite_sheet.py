#!/usr/bin/env python
from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image


ICON_DIRS = [
    Path("assets/ui/icons"),
    Path("assets/gameplay/actions"),
    Path("assets/gameplay/resources"),
    Path("assets/gameplay/states"),
    Path("assets/gameplay/events"),
    Path("assets/gameplay/pests"),
    Path("assets/gameplay/progression"),
]


@dataclass
class IconRecord:
    icon_id: str
    path: Path
    folder_key: str
    stem: str
    size: tuple[int, int]
    bbox: tuple[int, int, int, int] | None
    transparent_ratio: float
    edge_touch_count: int
    category: str
    reasons: list[str]


def collect_files() -> list[tuple[Path, str, str]]:
    items: list[tuple[Path, str, str]] = []
    for folder in ICON_DIRS:
        if not folder.exists():
            continue
        folder_key = folder.as_posix().replace("assets/", "")
        for path in sorted(folder.glob("*.png")):
            items.append((path, folder_key, path.stem))
    return items


def build_icon_ids(items: list[tuple[Path, str, str]]) -> dict[Path, str]:
    stem_counts = Counter(stem for _, _, stem in items)
    mapping: dict[Path, str] = {}
    for path, folder_key, stem in items:
        if stem_counts[stem] == 1:
            mapping[path] = stem
        else:
            safe_folder = folder_key.replace("/", "__")
            mapping[path] = f"{safe_folder}__{stem}"
    return mapping


def analyze(path: Path, icon_id: str, folder_key: str, stem: str) -> IconRecord:
    reasons: list[str] = []
    try:
        with Image.open(path) as im:
            im.load()
            rgba = im.convert("RGBA")
            w, h = rgba.size
            alpha = rgba.getchannel("A")
            bbox = alpha.getbbox()
            if bbox is None:
                return IconRecord(icon_id, path, folder_key, stem, (w, h), None, 1.0, 4, "BROKEN_SOURCE_ICONS", ["fully_transparent_no_visible_icon"])

            x0, y0, x1, y1 = bbox
            edge_touch_count = sum([x0 == 0, y0 == 0, x1 == w, y1 == h])
            hist = alpha.histogram()
            transparent_ratio = (hist[0] / (w * h)) if (w * h) else 0.0

            if transparent_ratio < 0.01:
                return IconRecord(icon_id, path, folder_key, stem, (w, h), bbox, transparent_ratio, edge_touch_count, "BROKEN_SOURCE_ICONS", ["missing_effective_transparency"])

            # Strong clipping indicator: content touches 3+ canvas edges.
            if edge_touch_count >= 3:
                reasons.append("content_touches_3_or_more_edges_likely_truncated_source")
                return IconRecord(icon_id, path, folder_key, stem, (w, h), bbox, transparent_ratio, edge_touch_count, "BROKEN_SOURCE_ICONS", reasons)

            # Already normalized profile.
            cx = (x0 + x1) / 2
            cy = (y0 + y1) / 2
            centered = abs((cx - w / 2) / w) <= 0.08 and abs((cy - h / 2) / h) <= 0.08
            has_padding = x0 >= 24 and y0 >= 24 and (w - x1) >= 24 and (h - y1) >= 24
            if (w, h) == (512, 512) and has_padding and centered and edge_touch_count == 0:
                return IconRecord(icon_id, path, folder_key, stem, (w, h), bbox, transparent_ratio, edge_touch_count, "VALID_SOURCE_ICONS", [])

            reasons.append("requires_resize_recenter_padding_normalization")
            if edge_touch_count > 0:
                reasons.append("content_touches_edge_possible_partial_truncation")
            return IconRecord(icon_id, path, folder_key, stem, (w, h), bbox, transparent_ratio, edge_touch_count, "NEEDS_NORMALIZATION", reasons)

    except Exception as exc:  # pragma: no cover
        return IconRecord(icon_id, path, folder_key, stem, (0, 0), None, 0.0, 4, "BROKEN_SOURCE_ICONS", [f"png_read_error:{exc}"])


def normalize_to_cell(path: Path, bbox: tuple[int, int, int, int], cell: int, padding: int) -> Image.Image:
    with Image.open(path) as im:
        src = im.convert("RGBA")
    cropped = src.crop(bbox)
    max_dim = cell - 2 * padding
    scale = min(max_dim / cropped.width, max_dim / cropped.height, 1.0)
    nw = max(1, int(round(cropped.width * scale)))
    nh = max(1, int(round(cropped.height * scale)))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    cell_img = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    x = (cell - nw) // 2
    y = (cell - nh) // 2
    cell_img.alpha_composite(resized, (x, y))
    return cell_img


def write_validation_report(records: list[IconRecord], out_path: Path) -> dict[str, Any]:
    groups = {
        "VALID_SOURCE_ICONS": [],
        "BROKEN_SOURCE_ICONS": [],
        "NEEDS_NORMALIZATION": [],
    }
    for rec in records:
        groups[rec.category].append(
            {
                "id": rec.icon_id,
                "file": rec.path.as_posix(),
                "size": [rec.size[0], rec.size[1]],
                "bbox": list(rec.bbox) if rec.bbox else None,
                "transparentRatio": round(rec.transparent_ratio, 4),
                "edgeTouchCount": rec.edge_touch_count,
                "reasons": rec.reasons,
            }
        )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(groups, indent=2), encoding="utf-8")
    return groups


def verify(sheet: Image.Image, atlas: dict[str, dict[str, int]], cell: int) -> dict[str, Any]:
    issues: list[str] = []
    seen_pos: set[tuple[int, int]] = set()
    for icon_id, rect in atlas.items():
        x, y, w, h = rect["x"], rect["y"], rect["w"], rect["h"]
        if w != cell or h != cell:
            issues.append(f"{icon_id}: unexpected cell size {w}x{h}")
        if x < 0 or y < 0 or (x + w) > sheet.width or (y + h) > sheet.height:
            issues.append(f"{icon_id}: out_of_bounds")
            continue
        if (x, y) in seen_pos:
            issues.append(f"{icon_id}: duplicate_placement_at_{x}_{y}")
        seen_pos.add((x, y))
        region = sheet.crop((x, y, x + w, y + h))
        if region.getchannel("A").getbbox() is None:
            issues.append(f"{icon_id}: empty_cell")
    return {"ok": not issues, "issues": issues}


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate source icons, normalize, and rebuild clean sprite sheet.")
    parser.add_argument("--out-image", default="assets/sprites/ui_icon_sheet.png")
    parser.add_argument("--out-json", default="assets/sprites/ui_icon_sheet.json")
    parser.add_argument("--validation-report", default="assets/sprites/source_icon_validation.json")
    parser.add_argument("--verification-report", default="assets/sprites/atlas_verification.json")
    parser.add_argument("--cell-size", type=int, default=512)
    parser.add_argument("--padding", type=int, default=24)
    args = parser.parse_args()

    files = collect_files()
    id_map = build_icon_ids(files)
    records = [analyze(path, id_map[path], folder, stem) for path, folder, stem in files]
    groups = write_validation_report(records, Path(args.validation_report))

    usable = [r for r in records if r.category in {"VALID_SOURCE_ICONS", "NEEDS_NORMALIZATION"} and r.bbox is not None]
    usable.sort(key=lambda r: r.icon_id)
    if not usable:
        raise SystemExit("No valid/salvageable icons available to pack.")

    cell = int(args.cell_size)
    padding = int(args.padding)
    cols = math.ceil(math.sqrt(len(usable)))
    rows = math.ceil(len(usable) / cols)
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (0, 0, 0, 0))

    atlas: dict[str, dict[str, int]] = {}
    for i, rec in enumerate(usable):
        col = i % cols
        row = i // cols
        x = col * cell
        y = row * cell
        normalized = normalize_to_cell(rec.path, rec.bbox, cell, padding)
        sheet.alpha_composite(normalized, (x, y))
        atlas[rec.icon_id] = {"x": x, "y": y, "w": cell, "h": cell}

    out_image = Path(args.out_image)
    out_json = Path(args.out_json)
    out_image.parent.mkdir(parents=True, exist_ok=True)
    out_json.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_image, "PNG")

    payload = {
        "meta": {
            "image": "ui_icon_sheet.png",
            "iconCount": len(atlas),
            "cellSize": cell,
            "padding": padding,
        },
        "icons": atlas,
    }
    out_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    verification = verify(sheet, atlas, cell)
    verification_payload = {
        "sourceInspected": len(records),
        "validSourceIcons": len(groups["VALID_SOURCE_ICONS"]),
        "brokenSourceIcons": len(groups["BROKEN_SOURCE_ICONS"]),
        "needsNormalization": len(groups["NEEDS_NORMALIZATION"]),
        "finalAtlasIcons": len(atlas),
        "verification": verification,
    }
    Path(args.verification_report).write_text(json.dumps(verification_payload, indent=2), encoding="utf-8")

    print(f"Source inspected: {len(records)}")
    print(f"Valid: {len(groups['VALID_SOURCE_ICONS'])}")
    print(f"Broken: {len(groups['BROKEN_SOURCE_ICONS'])}")
    print(f"Needs normalization: {len(groups['NEEDS_NORMALIZATION'])}")
    print(f"Final atlas icons: {len(atlas)}")
    print(f"Wrote: {out_image}")
    print(f"Wrote: {out_json}")
    print(f"Wrote: {args.validation_report}")
    print(f"Wrote: {args.verification_report}")
    if not verification["ok"]:
        print("Verification issues:")
        for issue in verification["issues"]:
            print(f"- {issue}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
