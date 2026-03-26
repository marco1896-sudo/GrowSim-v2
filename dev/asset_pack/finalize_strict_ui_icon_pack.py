#!/usr/bin/env python
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image


RAW_DIR = Path("tmp/imagegen/strict_pack")
JOB_FILE = Path("dev/asset_pack/jobs/strict_ui_pack.jsonl")
QC_REPORT = Path("dev/asset_pack/strict_ui_qc_report.json")

CELL = 512
SAFE_PAD = 80
MAX_DIM = CELL - SAFE_PAD * 2


def out_name_for_path(path: str) -> str:
    return f"{path.replace('/', '__')}.png"


def normalize_to_target(src_path: Path, dst_path: Path) -> dict[str, Any]:
    with Image.open(src_path) as im:
        rgba = im.convert("RGBA")
    alpha = rgba.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError(f"no visible content: {src_path}")

    cropped = rgba.crop(bbox)
    scale = min(MAX_DIM / cropped.width, MAX_DIM / cropped.height, 1.0)
    nw = max(1, int(round(cropped.width * scale)))
    nh = max(1, int(round(cropped.height * scale)))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)

    out = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    x = (CELL - nw) // 2
    y = (CELL - nh) // 2
    out.alpha_composite(resized, (x, y))

    dst_path.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst_path, "PNG")
    return {"size": [CELL, CELL], "placed": [x, y, nw, nh]}


def qc_file(path: Path) -> dict[str, Any]:
    with Image.open(path) as im:
        rgba = im.convert("RGBA")
        w, h = rgba.size
    a = rgba.getchannel("A")
    bbox = a.getbbox()
    reasons: list[str] = []
    if (w, h) != (CELL, CELL):
        reasons.append(f"not_{CELL}x{CELL}:{w}x{h}")
    if bbox is None:
        reasons.append("no_visible_content")
        return {"ok": False, "bbox": None, "reasons": reasons}
    x0, y0, x1, y1 = bbox
    pad = min(x0, y0, w - x1, h - y1)
    if pad < SAFE_PAD:
        reasons.append(f"pad_lt_{SAFE_PAD}:{pad}")
    edge_touch = sum([x0 == 0, y0 == 0, x1 == w, y1 == h])
    if edge_touch > 0:
        reasons.append(f"edge_touch:{edge_touch}")
    if a.histogram()[0] <= 0:
        reasons.append("no_transparency")
    return {"ok": len(reasons) == 0, "bbox": [x0, y0, x1, y1], "reasons": reasons}


def main() -> None:
    jobs = []
    for line in JOB_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        jobs.append(json.loads(line))

    report: dict[str, Any] = {"total": len(jobs), "normalized": [], "failed": []}
    for j in jobs:
        dst = Path(j["out"].replace("__", "/", 2))  # placeholder to avoid accidental use
        # real destination from out basename (reverse mapping not reliable) -> use stored path in out key pattern:
        # assets/ui/icons/menu.png => assets__ui__icons__menu.png
        out_basename = str(j["out"])
        parts = out_basename[:-4].split("__")
        dst = Path("/".join(parts))
        src = RAW_DIR / out_basename
        if not src.exists():
            alt = RAW_DIR / f"{out_basename}.png"
            if alt.exists():
                src = alt
        if not src.exists():
            report["failed"].append({"path": str(dst), "reason": f"missing_raw:{src}"})
            continue
        try:
            placement = normalize_to_target(src, dst)
            qc = qc_file(dst)
            item = {"path": str(dst).replace("\\", "/"), "placement": placement, "qc": qc}
            if qc["ok"]:
                report["normalized"].append(item)
            else:
                report["failed"].append(item)
        except Exception as exc:
            report["failed"].append({"path": str(dst).replace("\\", "/"), "reason": str(exc)})

    QC_REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Normalized OK: {len(report['normalized'])}")
    print(f"Failed: {len(report['failed'])}")
    print(f"Report: {QC_REPORT}")
    if report["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
