#!/usr/bin/env python3
"""
add_readings.py  –  generate hiragana readings for question / answer
--------------------------------------------------------------------
pip install pykakasi
"""

import csv
from pathlib import Path
from pykakasi import kakasi

INPUT_CSV  = Path("practice_preprocessing/fill_gap_breakdown.csv")
OUTPUT_CSV = Path("practice_preprocessing/fill_gap_with_readings.csv")

if not INPUT_CSV.exists():
    raise SystemExit(f"❌ CSV not found: {INPUT_CSV}")

# ------------------------------------------------------------------
# 1) build a converter  (kanji → reading, katakana → hiragana)
# ------------------------------------------------------------------
kks = kakasi()
kks.setMode("J", "H")   # kanji     → hiragana
kks.setMode("K", "H")   # katakana  → hiragana
kks.setMode("H", "H")   # hiragana  → hiragana (leave as-is)
conv = kks.getConverter()

def to_hiragana(text: str) -> str:
    """Return hiragana reading for the full string."""
    return conv.do(text)

# ------------------------------------------------------------------
# 2) read, enrich, write
# ------------------------------------------------------------------
with INPUT_CSV.open(encoding="utf-8", newline="") as fin:
    reader = csv.DictReader(fin)
    rows   = list(reader)

for row in rows:
    row["question_reading"] = to_hiragana(row["question"])
    row["answer_reading"]   = to_hiragana(row["answer"])

# keep the original order + new columns at the end
fieldnames = reader.fieldnames + ["question_reading", "answer_reading"]

with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as fout:
    writer = csv.DictWriter(fout, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"✅  Wrote {len(rows)} rows with readings → {OUTPUT_CSV}")
