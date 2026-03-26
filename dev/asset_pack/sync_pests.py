#!/usr/bin/env python
from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(".")
PAIRS = [
    (ROOT / "assets/gameplay/states/pest_mites.png", ROOT / "assets/gameplay/pests/pest_mites.png"),
    (ROOT / "assets/gameplay/states/pest_thrips.png", ROOT / "assets/gameplay/pests/pest_thrips.png"),
    (ROOT / "assets/gameplay/events/fungus_gnat_wave.png", ROOT / "assets/gameplay/pests/fungus_gnats.png"),
    (ROOT / "assets/gameplay/events/topsoil_mold.png", ROOT / "assets/gameplay/pests/mold.png"),
    (ROOT / "assets/gameplay/events/late_flower_humidity.png", ROOT / "assets/gameplay/pests/bud_rot.png"),
    (ROOT / "assets/gameplay/events/mite_hotspot.png", ROOT / "assets/gameplay/pests/spider_mites.png"),
    (ROOT / "assets/gameplay/events/thrips_early.png", ROOT / "assets/gameplay/pests/thrips.png"),
]


def main() -> None:
    out_dir = ROOT / "assets/gameplay/pests"
    out_dir.mkdir(parents=True, exist_ok=True)
    copied = 0
    missing = []
    for src, dst in PAIRS:
        if not src.exists():
            missing.append(str(src))
            continue
        shutil.copy2(src, dst)
        copied += 1
    print(f"Pest sync done. Copied {copied} files.")
    if missing:
        print("Missing sources:")
        for item in missing:
            print(f"- {item}")


if __name__ == "__main__":
    main()
