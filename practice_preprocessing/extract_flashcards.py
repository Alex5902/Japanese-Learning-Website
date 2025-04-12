import os
import csv
import json
import psycopg2
from dotenv import load_dotenv, dotenv_values
from pathlib import Path
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)
DATABASE_URL = os.getenv("DATABASE_URL")

FLASHCARDS_CSV = "practice_preprocessing/flashcards_n5.csv"

def safe_strip(value):
    return value.strip() if isinstance(value, str) else ""

def export_flashcards_to_csv():
    """
    Connects to PostgreSQL, extracts N5 flashcards, and writes them to a CSV.
    For each flashcard, we assume `content` is a JSON field that contains:
      - word
      - meaning
      - word_type
      - example_sentence (if available)
    Adjust the SQL or JSON keys as needed for your schema.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            SELECT flashcard_id, content
            FROM Flashcards
            WHERE JLPT_level = 'N5' AND type IN ('vocab', 'grammar');
        """)
        rows = cur.fetchall()

        with open(FLASHCARDS_CSV, mode="w", encoding="utf-8", newline="") as f_out:
            writer = csv.DictWriter(
                f_out, 
                fieldnames=["flashcard_id", "word", "meaning", "word_type", "example_sentence"]
            )
            writer.writeheader()

            for flashcard_id, content in rows:
                # Ensure 'content' is loaded as dict
                if isinstance(content, str):
                    content = json.loads(content)

                # Safely extract fields
                word = safe_strip(content.get("word"))
                meaning = safe_strip(content.get("meaning"))
                word_type = safe_strip(content.get("word_type"))
                example_sentence = safe_strip(content.get("example_sentence"))

                # Write row
                writer.writerow({
                    "flashcard_id": flashcard_id,
                    "word": word,
                    "meaning": meaning,
                    "word_type": word_type,
                    "example_sentence": example_sentence
                })

        cur.close()
        conn.close()
        print(f"✅ Flashcards exported to {FLASHCARDS_CSV}")
    except Exception as e:
        print(f"Error exporting flashcards: {e}")

if __name__ == "__main__":
    export_flashcards_to_csv()
