import csv
import sys
import collections
from pathlib import Path

################################################################################
# Helpers to read the two CSVs
################################################################################

DEFAULT_FLASHCARDS = "practice_preprocessing/flashcards_n5.csv"
DEFAULT_FILLGAPS    = "practice_preprocessing/fill_gap_questions.csv"
DEFAULT_REPORT     = "practice_preprocessing/fill_gap_report.csv"

def read_flashcards(path):
    """
    Returns a dict: {flashcard_id: word}
    Assumes the flashcard CSV has at least the columns:
        flashcard_id, word
    """
    flashcards = {}
    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        required = {"flashcard_id", "word"}
        if not required.issubset(reader.fieldnames):
            missing = ", ".join(required - set(reader.fieldnames))
            sys.exit(f"[FATAL] flashcard file missing column(s): {missing}")

        for row in reader:
            fid = row["flashcard_id"].strip()
            word = row["word"].strip()
            if fid:
                flashcards[fid] = word
    return flashcards


def read_fill_gaps(path):
    """
    Returns:
        gaps_by_id : dict {flashcard_id: [row, row, ...]}
        dup_questions : list[(question, first_line, dup_line)]
    Each row is the original DictReader row with an added "_line" key.
    """
    gaps_by_id = collections.defaultdict(list)
    seen_questions = {}
    dup_questions = []

    with open(path, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        required = {"flashcard_id", "question", "answer", "english"}
        if not required.issubset(reader.fieldnames):
            missing = ", ".join(required - set(reader.fieldnames))
            sys.exit(f"[FATAL] fill‑gap file missing column(s): {missing}")

        for idx, row in enumerate(reader, start=2):          # line 1 = header
            row["_line"] = idx
            fid = row["flashcard_id"].strip()
            question = row["question"].strip()

            gaps_by_id[fid].append(row)

            if question in seen_questions:
                dup_questions.append(
                    (question, seen_questions[question], idx)
                )
            else:
                seen_questions[question] = idx

    return gaps_by_id, dup_questions

################################################################################
# Core checks
################################################################################

def validate(flashcards_path, fillgap_path, report_path=None):
    flashcards = read_flashcards(flashcards_path)
    gaps_by_id, dup_questions = read_fill_gaps(fillgap_path)

    missing_ids   = []   # flashcard exists but no gap rows
    wrong_count   = []   # id has ≠ 3 rows
    answer_errors = []   # answer != word

    for fid, word in flashcards.items():
        rows = gaps_by_id.get(fid, [])
        if not rows:
            missing_ids.append(fid)
            continue
        if len(rows) != 3:
            wrong_count.append((fid, len(rows)))

        for row in rows:
            if row["answer"].strip() != word:
                answer_errors.append(
                    (fid, row["_line"], row["answer"], word)
                )

    # IDs present in fill‑gap but not in flashcard file
    extra_ids = sorted(set(gaps_by_id) - set(flashcards))

    ############################################################################
    # Print summary
    ############################################################################
    print("────────────────────────────────────────────────────────")
    print("📊  VALIDATION SUMMARY")
    print("────────────────────────────────────────────────────────")
    print(f"Flashcards (N5 file):          {len(flashcards):>5}")
    print(f"Fill‑gap rows checked:         {sum(len(v) for v in gaps_by_id.values()):>5}")
    print()
    print(f"Missing flashcard IDs:         {len(missing_ids):>5}")
    print(f"IDs with wrong # of gaps:      {len(wrong_count):>5}")
    print(f"Answer mismatches:             {len(answer_errors):>5}")
    print(f"Duplicate questions found:     {len(dup_questions):>5}")
    print(f"Extra IDs in fill‑gap file:    {len(extra_ids):>5}")
    print("────────────────────────────────────────────────────────")

    ############################################################################
    # Optional detailed report
    ############################################################################
    if report_path:
        with open(report_path, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            w.writerow(["issue", "details"])

            for fid in missing_ids:
                w.writerow(["missing_id", fid])

            for fid, count in wrong_count:
                w.writerow(["wrong_count", f"{fid} (has {count}, expected 3)"])

            for fid, line, got, exp in answer_errors:
                w.writerow(
                    ["answer_mismatch",
                     f"id={fid} line={line} answer='{got}' expected='{exp}'"]
                )

            for q, first, dup in dup_questions:
                w.writerow(
                    ["duplicate_question",
                     f"first_line={first}, dup_line={dup}, text={q}"]
                )

            for fid in extra_ids:
                w.writerow(["extra_id", fid])

        print(f"📝 Detailed CSV report written to: {report_path}")

################################################################################
# Entry‑point
################################################################################

if __name__ == "__main__":
    if len(sys.argv) == 1:
        # no CLI args – fall back to defaults
        flashcards_csv = Path(DEFAULT_FLASHCARDS)
        fillgap_csv    = Path(DEFAULT_FILLGAPS)
        report_csv     = Path(DEFAULT_REPORT) if DEFAULT_REPORT else None
    else:
        if len(sys.argv) < 3:
            sys.exit("Usage: python validate_fill_gaps.py flashcards_n5.csv fill_gap_questions.csv [error_report.csv]")
        flashcards_csv = Path(sys.argv[1])
        fillgap_csv    = Path(sys.argv[2])
        report_csv     = Path(sys.argv[3]) if len(sys.argv) > 3 else None

    if not flashcards_csv.exists():
        sys.exit(f"Flashcard file not found: {flashcards_csv}")
    if not fillgap_csv.exists():
        sys.exit(f"Fill‑gap file not found: {fillgap_csv}")

    validate(flashcards_csv, fillgap_csv, report_csv)
