#!/usr/bin/env python3
import csv
import json
from pathlib import Path

CSV_PATH = Path("practice_preprocessing/fill_gap_breakdown.csv")

def is_empty_breakdown(raw_json: str) -> bool:
    """True if the analysis_json is blank or not valid JSON."""
    raw = raw_json.strip()
    if not raw:
        return True
    try:
        json.loads(raw)
    except json.JSONDecodeError:
        return True
    return False

def main():
    missing = []
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for lineno, row in enumerate(reader, start=2):  # account for header
            if is_empty_breakdown(row.get("analysis_json", "")):
                missing.append((lineno, row["flashcard_id"], row["question"]))

    if not missing:
        print("✅ No completely empty breakdowns found.")
        return

    print(f"Found {len(missing)} empty breakdown(s):\n")
    print(f"{'Line':<6}{'Flashcard ID':<38}Question")
    print(f"{'-'*6} {'-'*36} {'-'*40}")
    for line, fid, q in missing:
        print(f"{line:<6}{fid:<38}{q}")

if __name__ == "__main__":
    main()
