#!/usr/bin/env python
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Move generated files to final target paths.")
    parser.add_argument("--config", default="dev/asset_pack/config/distribute_generated.json")
    parser.add_argument("--strict", action="store_true", help="Fail if any source file is missing.")
    args = parser.parse_args()

    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    moves = cfg.get("moves", [])
    moved = 0
    missing = []

    for item in moves:
        src = Path(item["source"])
        dst = Path(item["target"])
        if not src.exists():
            missing.append(str(src))
            continue
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))
        moved += 1

    print(f"Moved {moved} generated files.")
    if missing:
        print("Missing generated files:")
        for m in missing:
            print(f"- {m}")
        if args.strict:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
