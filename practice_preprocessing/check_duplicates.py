#!/usr/bin/env python3
"""
check_duplicate_questions.py

Finds identical "question" strings in a fill‑gap CSV and tells you
whether each duplicate set comes from the same flashcard_id or different ones.

Usage:
    python check_duplicate_questions.py fill_gap_questions.csv [-o dup_report.csv]
"""

import csv
import argparse
import collections
from pathlib import Path

###############################################################################
# CLI
###############################################################################

parser = argparse.ArgumentParser(description="Detect duplicate fill‑gap questions")
parser.add_argument("fillgaps", help="fill_gap_questions.csv to analyse")
parser.add_argument("-o", "--output", help="optional CSV report of duplicates")
args = parser.parse_args()

fillgap_path = Path(args.fillgaps)
if not fillgap_path.exists():
    raise SystemExit(f"[FATAL] file not found: {fillgap_path}")

###############################################################################
# 1. Read file and collect duplicates
###############################################################################

# question_text  -> list of (line_no, flashcard_id)
occurrences = collections.defaultdict(list)

with fillgap_path.open(encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    required = {"flashcard_id", "question"}
    if required - set(reader.fieldnames):
        missing = ", ".join(required - set(reader.fieldnames))
        raise SystemExit(f"[FATAL] CSV missing column(s): {missing}")

    for idx, row in enumerate(reader, start=2):        # header = line 1
        q = row["question"].strip()
        fid = row["flashcard_id"].strip()
        occurrences[q].append((idx, fid))

# Keep only questions that appear more than once
duplicates = {q: lst for q, lst in occurrences.items() if len(lst) > 1}

###############################################################################
# 2. Categorise duplicates
###############################################################################

same_id_dups    = {}   # question -> list[(line, id), ...] (all same id)
cross_id_dups   = {}   # question -> list[(line, id), ...] (≥2 different ids)

for q, lst in duplicates.items():
    ids = {fid for _, fid in lst}
    if len(ids) == 1:
        same_id_dups[q]  = lst
    else:
        cross_id_dups[q] = lst

###############################################################################
# 3. Print summary
###############################################################################

print("────────────────────────────────────────────────────────")
print("🔍  DUPLICATE QUESTION ANALYSIS")
print("────────────────────────────────────────────────────────")
print(f"Total rows checked:              {sum(len(v) for v in occurrences.values()):>6}")
print(f"Total unique questions:          {len(occurrences):>6}")
print()
print(f"Questions duplicated (any kind): {len(duplicates):>6}")
print(f"  ↳ Same flashcard_id:           {len(same_id_dups):>6}")
print(f"  ↳ Across different ids:        {len(cross_id_dups):>6}")
print("────────────────────────────────────────────────────────")

if same_id_dups:
    print("❗  Duplicates with the SAME flashcard_id (need variety):")
    for q, lst in list(same_id_dups.items())[:10]:    # show first 10
        ids = {fid for _, fid in lst}
        print(f"    • id={next(iter(ids))}  → {len(lst)} copies")
    if len(same_id_dups) > 10:
        print(f"    …and {len(same_id_dups)-10} more")

if cross_id_dups:
    print("\nℹ️  Duplicates shared ACROSS ids (less critical):")
    for q, lst in list(cross_id_dups.items())[:10]:
        id_list = ", ".join(sorted({fid for _, fid in lst}))
        print(f"    • {len(lst)} copies  across ids: {id_list}")
    if len(cross_id_dups) > 10:
        print(f"    …and {len(cross_id_dups)-10} more")

###############################################################################
# 4. Optional detailed CSV report
###############################################################################

if args.output:
    with Path(args.output).open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["question", "duplicate_type", "line_numbers", "flashcard_ids"])
        for q, lst in duplicates.items():
            ids = {fid for _, fid in lst}
            dup_type = "same_id" if len(ids) == 1 else "cross_id"
            lines = ";".join(str(line) for line, _ in lst)
            id_str = ";".join(sorted(ids))
            w.writerow([q, dup_type, lines, id_str])

    print(f"\n📝  Detailed duplicate report written to: {args.output}")
