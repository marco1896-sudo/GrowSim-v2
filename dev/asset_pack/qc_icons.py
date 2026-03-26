#!/usr/bin/env python
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Iterable

from PIL import Image


CHECK_DIRS = [
    "assets/ui/icons",
    "assets/gameplay/actions",
    "assets/gameplay/resources",
    "assets/gameplay/states",
    "assets/gameplay/events",
    "assets/gameplay/pests",
    "assets/gameplay/progression",
]


def iter_pngs(paths: Iterable[Path]) -> Iterable[Path]:
    for base in paths:
        if not base.exists():
            continue
        for p in sorted(base.glob("*.png")):
            yield p


def has_alpha(img: Image.Image) -> bool:
    if img.mode in ("RGBA", "LA"):
        return True
    return "transparency" in img.info


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate generated icon assets.")
    parser.add_argument("--strict-alpha", action="store_true", help="Fail if no transparent pixels are found.")
    args = parser.parse_args()

    roots = [Path(p) for p in CHECK_DIRS]
    issues: list[str] = []
    checked = 0

    for icon_path in iter_pngs(roots):
        checked += 1
        with Image.open(icon_path) as img:
            w, h = img.size
            if w != h:
                issues.append(f"{icon_path}: not square ({w}x{h})")
            if not has_alpha(img):
                issues.append(f"{icon_path}: missing alpha channel")
            elif args.strict_alpha:
                alpha = img.getchannel("A")
                bbox = alpha.getbbox()
                if bbox is None:
                    issues.append(f"{icon_path}: fully transparent")
                elif bbox == (0, 0, w, h):
                    issues.append(f"{icon_path}: alpha exists but no transparent border")

    print(f"Checked {checked} PNG icons.")
    if issues:
        print("QC issues:")
        for issue in issues:
            print(f"- {issue}")
        raise SystemExit(1)
    print("QC passed.")


if __name__ == "__main__":
    main()
