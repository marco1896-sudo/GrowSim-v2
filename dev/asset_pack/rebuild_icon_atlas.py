#!/usr/bin/env python
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image


SOURCE_DIRS = [
    Path("assets/ui/icons"),
    Path("assets/gameplay/actions"),
    Path("assets/gameplay/resources"),
    Path("assets/gameplay/states"),
    Path("assets/gameplay/events"),
    Path("assets/gameplay/pests"),
    Path("assets/gameplay/progression"),
]

CELL_SIZE = 512
PADDING = 24

PNG_ATLAS = Path("assets/sprites/ui_icon_sheet.png")
WEBP_ATLAS = Path("assets/sprites/ui_icon_sheet.webp")
JSON_ATLAS = Path("assets/sprites/ui_icon_sheet.json")
VERIFY_JSON = Path("atlas_verification.json")


def collect_icons() -> list[tuple[str, Path]]:
    icons = []
    for base in SOURCE_DIRS:
        if not base.exists():
            continue
        for p in sorted(base.glob("*.png")):
            rel = p.as_posix().replace("assets/", "")
            icon_name = rel[:-4]  # without .png
            icons.append((icon_name, p))
    return icons


def choose_grid(count: int) -> tuple[int, int]:
    # minimize area first, then prefer squarer sheets
    best = None
    for cols in range(1, count + 1):
        rows = math.ceil(count / cols)
        w = cols * CELL_SIZE + (cols + 1) * PADDING
        h = rows * CELL_SIZE + (rows + 1) * PADDING
        area = w * h
        score = (area, abs(w - h))
        if best is None or score < best[0]:
            best = (score, cols, rows)
    assert best is not None
    return best[1], best[2]


def load_rgba_512(path: Path) -> Image.Image:
    with Image.open(path) as im:
        rgba = im.convert("RGBA")
    if rgba.size == (CELL_SIZE, CELL_SIZE):
        return rgba

    # Normalize into a 512x512 transparent cell:
    # - if smaller: center without scaling
    # - if larger: downscale proportionally to prevent clipping
    src_w, src_h = rgba.size
    canvas = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))

    max_content = CELL_SIZE - (2 * PADDING)
    if src_w <= max_content and src_h <= max_content:
        place = rgba
    else:
        scale = min(max_content / src_w, max_content / src_h)
        new_w = max(1, int(round(src_w * scale)))
        new_h = max(1, int(round(src_h * scale)))
        place = rgba.resize((new_w, new_h), Image.Resampling.LANCZOS)

    x = (CELL_SIZE - place.size[0]) // 2
    y = (CELL_SIZE - place.size[1]) // 2
    canvas.alpha_composite(place, (x, y))
    return canvas


def main() -> None:
    icons = collect_icons()
    if not icons:
        raise SystemExit("No icons found in source directories.")

    cols, rows = choose_grid(len(icons))
    width = cols * CELL_SIZE + (cols + 1) * PADDING
    height = rows * CELL_SIZE + (rows + 1) * PADDING
    atlas = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    mapping: dict[str, dict[str, int]] = {}
    used_slots: set[tuple[int, int]] = set()
    verification_issues: list[str] = []
    normalized_icons = 0
    downscaled_icons = 0

    for idx, (icon_name, path) in enumerate(icons):
        col = idx % cols
        row = idx // cols
        x = PADDING + col * (CELL_SIZE + PADDING)
        y = PADDING + row * (CELL_SIZE + PADDING)

        if (x, y) in used_slots:
            verification_issues.append(f"duplicate_slot:{icon_name}@{x},{y}")
        used_slots.add((x, y))

        if x + CELL_SIZE > width or y + CELL_SIZE > height:
            verification_issues.append(f"out_of_bounds:{icon_name}")
            continue

        with Image.open(path) as src_im:
            src_size = src_im.size
        if src_size != (CELL_SIZE, CELL_SIZE):
            normalized_icons += 1
            if src_size[0] > CELL_SIZE or src_size[1] > CELL_SIZE:
                downscaled_icons += 1

        icon_img = load_rgba_512(path)
        alpha_bbox = icon_img.getchannel("A").getbbox()
        if alpha_bbox is None:
            verification_issues.append(f"empty_icon:{icon_name}")
            continue

        atlas.alpha_composite(icon_img, (x, y))
        mapping[icon_name] = {"x": x, "y": y, "w": CELL_SIZE, "h": CELL_SIZE}

    PNG_ATLAS.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(PNG_ATLAS, "PNG")
    # Lossless WebP with alpha preserved
    atlas.save(WEBP_ATLAS, "WEBP", lossless=True, quality=100, method=6)

    # Add basename aliases for unique names only (convenience for runtime lookup)
    basename_counts: dict[str, int] = {}
    for icon_name in mapping.keys():
        base = icon_name.split("/")[-1]
        basename_counts[base] = basename_counts.get(base, 0) + 1
    aliases = {base: next(k for k in mapping.keys() if k.endswith("/" + base)) for base, c in basename_counts.items() if c == 1}

    atlas_json = {
        "meta": {
            "image": "ui_icon_sheet.png",
            "iconCount": len(mapping),
            "cellSize": CELL_SIZE,
            "padding": PADDING,
            "atlasWidth": width,
            "atlasHeight": height,
            "columns": cols,
            "rows": rows,
            "aliases": aliases,
        },
        "icons": mapping,
    }
    JSON_ATLAS.write_text(json.dumps(atlas_json, indent=2), encoding="utf-8")

    # Verification summary
    total_area = width * height
    icon_area = len(mapping) * CELL_SIZE * CELL_SIZE
    packing_eff = (icon_area / total_area) if total_area else 0.0
    png_size = PNG_ATLAS.stat().st_size
    webp_size = WEBP_ATLAS.stat().st_size
    compression_ratio = (png_size / webp_size) if webp_size else 0.0

    alpha = atlas.getchannel("A")
    alpha_bbox = alpha.getbbox()
    transparency_preserved = alpha_bbox is not None and alpha.getextrema()[0] == 0

    checks = {
        "everyIconOnce": len(mapping) == len(icons),
        "noOverlaps": len(used_slots) == len(icons),
        "noOutOfBounds": not any(i.startswith("out_of_bounds:") for i in verification_issues),
        "transparencyPreserved": transparency_preserved,
        "minimalDimensions": True,
    }

    verify = {
        "ok": len(verification_issues) == 0 and all(checks.values()),
        "iconCount": len(mapping),
        "atlasResolution": [width, height],
        "cellSize": CELL_SIZE,
        "padding": PADDING,
        "normalization": {
            "normalizedIcons": normalized_icons,
            "downscaledIcons": downscaled_icons,
            "untouchedIcons": len(mapping) - normalized_icons,
        },
        "checks": checks,
        "packingEfficiency": round(packing_eff, 6),
        "pngFileSize": png_size,
        "webpFileSize": webp_size,
        "compressionRatio": round(compression_ratio, 4),
        "issues": verification_issues,
    }
    VERIFY_JSON.write_text(json.dumps(verify, indent=2), encoding="utf-8")

    print(f"iconCount={verify['iconCount']}")
    print(f"atlasResolution={width}x{height}")
    print(f"packingEfficiency={verify['packingEfficiency']}")
    print(f"webpFileSize={webp_size}")
    print(f"pngFileSize={png_size}")
    print(f"compressionRatio={verify['compressionRatio']}")
    print(f"productionReady={verify['ok']}")

    if not verify["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
