#!/usr/bin/env python3
"""
fix_fill_gap_answers.py

Corrects answer mismatches in a fill‑gap CSV by replacing each wrong answer
with the canonical `word` from the flashcard master list.

Usage:
    python fix_fill_gap_answers.py -f flashcards_n5.csv -g fill_gap_questions.csv [-o output.csv]

If -o/--output is omitted, the script writes <fillgap>_fixed.csv
"""

import csv
import argparse
from pathlib import Path

###############################################################################
# CLI parsing
###############################################################################

parser = argparse.ArgumentParser(description="Fix answer mismatches in fill‑gap CSV")
parser.add_argument("-f", "--flashcards", required=True, help="flashcards_n5.csv")
parser.add_argument("-g", "--fillgaps",   required=True, help="fill_gap_questions.csv")
parser.add_argument("-o", "--output",     help="corrected output CSV")

args = parser.parse_args()
flashcard_path = Path(args.flashcards)
fillgap_path   = Path(args.fillgaps)
output_path    = Path(args.output) if args.output else fillgap_path.with_stem(fillgap_path.stem + "_fixed")

###############################################################################
# 1. Load flashcard master {id: word}
###############################################################################

flashcards = {}
with flashcard_path.open(encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    if {"flashcard_id", "word"} - set(reader.fieldnames):
        raise SystemExit("[FATAL] flashcard file must have columns 'flashcard_id' and 'word'")
    for row in reader:
        flashcards[row["flashcard_id"].strip()] = row["word"].strip()

###############################################################################
# 2. Process fill‑gap file and fix answers
###############################################################################

fix_count   = 0
total_rows  = 0
fieldnames  = None
corrected   = []

with fillgap_path.open(encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    required = {"flashcard_id", "answer"}
    if required - set(reader.fieldnames):
        raise SystemExit(f"[FATAL] fill‑gap file missing column(s): {', '.join(required - set(reader.fieldnames))}")
    fieldnames = reader.fieldnames

    for row in reader:
        total_rows += 1
        fid    = row["flashcard_id"].strip()
        answer = row["answer"].strip()

        # Only fix if we have the id in flashcards
        if fid in flashcards and answer != flashcards[fid]:
            row["answer"] = flashcards[fid]
            fix_count += 1

        corrected.append(row)

###############################################################################
# 3. Write corrected CSV
###############################################################################

with output_path.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(corrected)

###############################################################################
# 4. Summary
###############################################################################

print("────────────────────────────────────────────────────────")
print("🛠  ANSWER‑FIX SUMMARY")
print("────────────────────────────────────────────────────────")
print(f"Rows checked:    {total_rows}")
print(f"Answers fixed:   {fix_count}")
print(f"Output written:  {output_path}")
print("────────────────────────────────────────────────────────")
