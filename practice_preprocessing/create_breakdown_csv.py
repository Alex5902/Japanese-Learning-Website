import csv
import json
from pathlib import Path
from tqdm import tqdm

# ──────────────────────────────────────────────────────────────────────────
# 1) Import your helper functions
# ──────────────────────────────────────────────────────────────────────────
from generate_breakdown import analyze_japanese_sentence, parse_analysis_response

# ──────────────────────────────────────────────────────────────────────────
# 2) Hardcoded file paths
# ──────────────────────────────────────────────────────────────────────────
INPUT_CSV  = Path("practice_preprocessing/fill_gap_questions.csv")
OUTPUT_CSV = Path("practice_preprocessing/fill_gap_breakdown.csv")

# ──────────────────────────────────────────────────────────────────────────
# 3) Utility to decide which existing rows are “done”
# ──────────────────────────────────────────────────────────────────────────
def has_good_breakdown(analysis_json_text: str) -> bool:
    try:
        data = json.loads(analysis_json_text)
    except json.JSONDecodeError:
        return False
    vocab = data.get("vocabulary", [])
    if not vocab:
        return False
    for entry in vocab:
        if not entry.get("components") and not entry.get("combined_explanation"):
            return False
    return True

# ──────────────────────────────────────────────────────────────────────────
# 4) Load existing output (if any) into memory
# ──────────────────────────────────────────────────────────────────────────
existing_rows = []
if OUTPUT_CSV.exists():
    with OUTPUT_CSV.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            existing_rows.append(row)

# build a lookup by (flashcard_id, question)
by_key = {
    (r["flashcard_id"], r["question"]): r
    for r in existing_rows
    if r.get("analysis_json", "").strip() and has_good_breakdown(r["analysis_json"])
}

# ──────────────────────────────────────────────────────────────────────────
# 5) Figure out which new rows actually need processing
# ──────────────────────────────────────────────────────────────────────────
rows_to_process = []
with INPUT_CSV.open("r", encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    required = {"flashcard_id", "question", "answer", "english"}
    if required - set(reader.fieldnames):
        raise SystemExit(f"[FATAL] Missing columns: {required - set(reader.fieldnames)}")

    for row in reader:
        key = (row["flashcard_id"], row["question"])
        if key not in by_key:
            rows_to_process.append(row)

if not rows_to_process:
    print("✅ All rows already have a good breakdown!")
    exit()

# ──────────────────────────────────────────────────────────────────────────
# 6) Process each “to_process” row and update our in-memory lookup
# ──────────────────────────────────────────────────────────────────────────
fieldnames = ["flashcard_id", "question", "answer", "sentence", "english", "analysis_json"]

for row in tqdm(rows_to_process, desc="Analyzing", unit="sentence"):
    fid      = row["flashcard_id"].strip()
    question = row["question"].strip()
    answer   = row["answer"].strip()
    english  = row["english"].strip()
    sentence = question.replace("＿＿＿", answer)

    try:
        raw_response = analyze_japanese_sentence(sentence, english)
        parsed_json  = parse_analysis_response(raw_response)
    except Exception as e:
        parsed_json = {"error": str(e)}

    new_json = json.dumps(parsed_json, ensure_ascii=False)
    by_key[(fid, question)] = {
        "flashcard_id": fid,
        "question":     question,
        "answer":       answer,
        "sentence":     sentence,
        "english":      english,
        "analysis_json": new_json,
    }

# ──────────────────────────────────────────────────────────────────────────
# 7) Write **all** rows back out, replacing the old file
# ──────────────────────────────────────────────────────────────────────────
with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for row in by_key.values():
        writer.writerow(row)

print(f"\n🎉 Done! Updated breakdown saved to: {OUTPUT_CSV}")
