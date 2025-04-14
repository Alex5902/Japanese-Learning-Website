import csv
import json
from pathlib import Path
from tqdm import tqdm

# ──────────────────────────────────────────────────────────────────────────
# 1) Import your helper functions
# ──────────────────────────────────────────────────────────────────────────
from practice_preprocessing import analyze_japanese_sentence, parse_analysis_response
# Adjust the import above if needed
# ──────────────────────────────────────────────────────────────────────────

# ──────────────────────────────────────────────────────────────────────────
# 2) Hardcoded file paths
# ──────────────────────────────────────────────────────────────────────────
INPUT_CSV  = Path("practice_preprocessing/fill_gap_questions.csv")
OUTPUT_CSV = Path("practice_preprocessing/fill_gap_breakdown.csv")

# ──────────────────────────────────────────────────────────────────────────
# 3) Load already processed entries
# ──────────────────────────────────────────────────────────────────────────
already_done = set()
if OUTPUT_CSV.exists():
    with OUTPUT_CSV.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if {"flashcard_id", "question"} <= set(reader.fieldnames):
            for row in reader:
                already_done.add((row["flashcard_id"], row["question"]))

# ──────────────────────────────────────────────────────────────────────────
# 4) Load fill-in-the-gap rows to process
# ──────────────────────────────────────────────────────────────────────────
rows_to_process = []
with INPUT_CSV.open(encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    required = {"flashcard_id", "question", "answer", "english"}
    if required - set(reader.fieldnames):
        raise SystemExit(f"[FATAL] Input CSV missing column(s): {required - set(reader.fieldnames)}")

    for row in reader:
        key = (row["flashcard_id"], row["question"])
        if key not in already_done:
            rows_to_process.append(row)

if not rows_to_process:
    print("✅ All rows already analyzed!")
    exit()

# ──────────────────────────────────────────────────────────────────────────
# 5) Open output CSV and write headers if needed
# ──────────────────────────────────────────────────────────────────────────
fieldnames = ["flashcard_id", "question", "answer", "sentence", "english", "analysis_json"]
need_header = not OUTPUT_CSV.exists()

with OUTPUT_CSV.open("a", encoding="utf-8", newline="") as fout:
    writer = csv.DictWriter(fout, fieldnames=fieldnames)
    if need_header:
        writer.writeheader()

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

        writer.writerow({
            "flashcard_id": fid,
            "question": question,
            "answer": answer,
            "sentence": sentence,
            "english": english,
            "analysis_json": json.dumps(parsed_json, ensure_ascii=False)
        })

print(f"\n🎉 Done! Breakdown saved to: {OUTPUT_CSV}")
