#!/usr/bin/env python
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

from PIL import Image


def crop_grid(image: Image.Image, cols: int, rows: int, slot: int) -> Image.Image:
    if cols <= 0 or rows <= 0:
        raise ValueError("cols/rows must be > 0")
    cell_w = image.width // cols
    cell_h = image.height // rows
    x = (slot % cols) * cell_w
    y = (slot // cols) * cell_h
    return image.crop((x, y, x + cell_w, y + cell_h))


def save_cells(
    image: Image.Image,
    cols: int,
    rows: int,
    names: Iterable[str],
    target_dir: Path,
    start_slot: int = 0,
) -> int:
    target_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for i, name in enumerate(names):
        slot = start_slot + i
        cell = crop_grid(image, cols, rows, slot).convert("RGBA")
        out = target_dir / f"{name}.png"
        cell.save(out, "PNG")
        count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="Split generated icon boards into individual icons.")
    parser.add_argument("--config", default="dev/asset_pack/config/board_slices.json")
    parser.add_argument("--include-optional", action="store_true")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    cols = int(cfg["grid"]["cols"])
    rows = int(cfg["grid"]["rows"])

    total = 0
    for board in cfg.get("boards", []):
        source = Path(board["source"])
        if not source.exists():
            raise FileNotFoundError(f"Missing board source: {source}")
        with Image.open(source) as img:
            total += save_cells(
                img,
                cols,
                rows,
                board["names"],
                Path(board["target_dir"]),
                start_slot=0,
            )

    if args.include_optional:
        for board in cfg.get("optional_boards", []):
            source = Path(board["source"])
            if not source.exists():
                raise FileNotFoundError(f"Missing optional board source: {source}")
            with Image.open(source) as img:
                for target in board.get("targets", []):
                    total += save_cells(
                        img,
                        cols,
                        rows,
                        target["names"],
                        Path(target["target_dir"]),
                        start_slot=int(target.get("start_slot", 0)),
                    )

    print(f"Split complete. Wrote {total} icons.")


if __name__ == "__main__":
    main()
