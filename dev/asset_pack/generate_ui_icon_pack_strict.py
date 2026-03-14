#!/usr/bin/env python
from __future__ import annotations

import json
import subprocess
from pathlib import Path


CLI = Path(r"C:\Users\Marco\.codex\skills\imagegen\scripts\image_gen.py")
TMP_OUT = Path("tmp/imagegen/strict_pack")
JOB_FILE = Path("dev/asset_pack/jobs/strict_ui_pack.jsonl")

BASE_STYLE = (
    "Premium mobile game icon, single clear object, centered, strong silhouette, "
    "minimal composition, no scene, no environment, no soil landscape, no extra props, "
    "clean dark outline, soft glow accents, high contrast, vector-like clarity, sharp edges, "
    "consistent top-down lighting, transparent background, no text, no clipping."
)


def job(path: str, concept: str, colors: str) -> dict:
    out_name = path.replace("/", "__")
    prompt = f"{BASE_STYLE} Concept: {concept}. Color language: {colors}."
    return {
        "prompt": prompt,
        "out": f"{out_name}.png",
        "size": "1024x1024",
        "quality": "high",
        "background": "transparent",
        "output_format": "png",
    }


def build_jobs() -> list[dict]:
    items: list[tuple[str, str, str]] = [
        # UI core
        ("assets/ui/icons/menu.png", "menu symbol (three bars) with subtle leaf motif", "green"),
        ("assets/ui/icons/back.png", "left back arrow", "green"),
        ("assets/ui/icons/close.png", "close X symbol", "red"),
        ("assets/ui/icons/settings.png", "settings gear", "green"),
        ("assets/ui/icons/info.png", "info symbol", "blue"),
        ("assets/ui/icons/help.png", "help question mark symbol", "blue"),
        ("assets/ui/icons/pause.png", "pause symbol", "yellow"),
        ("assets/ui/icons/play.png", "play triangle symbol", "green"),
        ("assets/ui/icons/restart.png", "restart circular arrow", "yellow"),
        ("assets/ui/icons/save.png", "save disk symbol", "blue"),
        ("assets/ui/icons/confirm.png", "checkmark confirm symbol", "green"),
        ("assets/ui/icons/cancel.png", "cancel slash symbol", "red"),
        # Actions
        ("assets/gameplay/actions/watering_low.png", "watering can with one droplet", "blue+green"),
        ("assets/gameplay/actions/watering_medium.png", "watering can with medium droplet flow", "blue+green"),
        ("assets/gameplay/actions/watering_high.png", "watering can with strong droplet flow", "blue+green"),
        ("assets/gameplay/actions/fertilizing_low.png", "small fertilizer bottle with leaf", "purple+green"),
        ("assets/gameplay/actions/fertilizing_medium.png", "fertilizer bottle medium potency with leaf", "purple+green"),
        ("assets/gameplay/actions/fertilizing_high.png", "fertilizer bottle high potency with leaf", "purple+green"),
        ("assets/gameplay/actions/training_low.png", "leaf with gentle training bend cue", "green"),
        ("assets/gameplay/actions/training_medium.png", "leaf with medium training bend cue", "green+yellow"),
        ("assets/gameplay/actions/training_high.png", "leaf with strong training cue", "green+yellow"),
        ("assets/gameplay/actions/environment_airflow.png", "leaf with airflow swirl symbol", "blue+green"),
        ("assets/gameplay/actions/environment_climate.png", "leaf with climate control symbol", "blue+green"),
        ("assets/gameplay/actions/environment_reset.png", "leaf with reset circular arrow symbol", "green"),
        # Resources
        ("assets/gameplay/resources/water.png", "water droplet with leaf", "blue+green"),
        ("assets/gameplay/resources/nutrients.png", "nutrient bottle with leaf", "purple+green"),
        ("assets/gameplay/resources/light.png", "sun/light symbol with leaf", "yellow+green"),
        ("assets/gameplay/resources/temperature.png", "thermometer with leaf", "red+blue+green"),
        ("assets/gameplay/resources/humidity.png", "humidity droplet with gauge accent", "blue"),
        ("assets/gameplay/resources/co2.png", "co2 molecule style symbol with leaf", "green"),
        ("assets/gameplay/resources/ph.png", "pH chemistry symbol with droplet", "purple+blue"),
        ("assets/gameplay/resources/ec.png", "EC conductivity bolt with droplet", "purple+blue"),
        # States
        ("assets/gameplay/states/healthy.png", "healthy leaf with sparkle", "green"),
        ("assets/gameplay/states/growth_boost.png", "leaf with upward boost arrow", "green"),
        ("assets/gameplay/states/slow_growth.png", "leaf with downward slow indicator", "yellow+green"),
        ("assets/gameplay/states/nutrient_deficiency.png", "leaf with deficiency spots", "yellow+green"),
        ("assets/gameplay/states/nutrient_burn.png", "leaf tip burn warning", "red+yellow+green"),
        ("assets/gameplay/states/overwatered.png", "leaf with excess water cue", "blue+yellow"),
        ("assets/gameplay/states/underwatered.png", "wilted leaf dry cue", "yellow+green"),
        ("assets/gameplay/states/heat_stress.png", "leaf with small heat sun symbol", "red+yellow+green"),
        ("assets/gameplay/states/light_stress.png", "leaf with intense light warning rays", "yellow+red+green"),
        ("assets/gameplay/states/root_rot.png", "leaf and root rot warning cue", "red+brown+green"),
        ("assets/gameplay/states/recovery.png", "leaf recovery plus symbol", "green+blue"),
        ("assets/gameplay/states/dead.png", "dead leaf silhouette", "red+dark"),
        # Events
        ("assets/gameplay/events/pest_attack.png", "leaf with pest attack warning", "red+yellow+green"),
        ("assets/gameplay/events/disease.png", "leaf with disease biohazard cue", "red+green"),
        ("assets/gameplay/events/nutrient_lockout.png", "nutrient lockout blocked bottle and leaf", "purple+yellow+green"),
        ("assets/gameplay/events/ph_drift.png", "pH symbol with drift arrow", "purple+blue+yellow"),
        ("assets/gameplay/events/dry_soil.png", "dry cracked soil symbol and leaf", "yellow+brown+green"),
        ("assets/gameplay/events/too_wet_soil.png", "too wet soil symbol and droplet warning", "blue+yellow+green"),
        ("assets/gameplay/events/heat_wave.png", "heat wave sun symbol with leaf", "red+yellow+green"),
        ("assets/gameplay/events/cold_roots.png", "cold roots ice cue with leaf", "blue+green"),
        ("assets/gameplay/events/salt_buildup.png", "salt crystal buildup symbol with root cue", "white+yellow+green"),
        ("assets/gameplay/events/fungal_growth.png", "fungal growth warning on leaf", "yellow+green+red"),
        # Pests
        ("assets/gameplay/pests/spider_mites.png", "leaf with spider mite silhouette", "red+green"),
        ("assets/gameplay/pests/aphids.png", "leaf with aphid silhouette", "yellow+green"),
        ("assets/gameplay/pests/thrips.png", "leaf with thrips silhouette", "yellow+green"),
        ("assets/gameplay/pests/fungus_gnats.png", "leaf with fungus gnat silhouette", "yellow+green"),
        # Progression
        ("assets/gameplay/progression/seed.png", "single seed icon", "green+brown"),
        ("assets/gameplay/progression/sprout.png", "sprout icon", "green"),
        ("assets/gameplay/progression/seedling.png", "seedling icon", "green"),
        ("assets/gameplay/progression/vegetative.png", "vegetative leaf icon", "green"),
        ("assets/gameplay/progression/preflower.png", "preflower icon", "green+yellow"),
        ("assets/gameplay/progression/flowering.png", "flowering bud icon", "green+yellow"),
        ("assets/gameplay/progression/late_flower.png", "late flower mature bud icon", "green+amber"),
        ("assets/gameplay/progression/harvest_ready.png", "harvest ready icon with trim cue", "green+yellow"),
    ]
    return [job(path, concept, colors) for path, concept, colors in items]


def main() -> None:
    jobs = build_jobs()
    JOB_FILE.parent.mkdir(parents=True, exist_ok=True)
    TMP_OUT.mkdir(parents=True, exist_ok=True)
    JOB_FILE.write_text("\n".join(json.dumps(j, ensure_ascii=False) for j in jobs) + "\n", encoding="utf-8")
    cmd = [
        "python",
        str(CLI),
        "generate-batch",
        "--input",
        str(JOB_FILE),
        "--out-dir",
        str(TMP_OUT),
        "--model",
        "gpt-image-1.5",
        "--quality",
        "high",
        "--background",
        "transparent",
        "--output-format",
        "png",
        "--concurrency",
        "2",
        "--max-attempts",
        "4",
        "--force",
        "--no-augment",
    ]
    subprocess.check_call(cmd)
    print(f"Generated {len(jobs)} raw icons into {TMP_OUT}")


if __name__ == "__main__":
    main()
