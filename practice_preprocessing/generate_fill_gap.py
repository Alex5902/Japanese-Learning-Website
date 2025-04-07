import os
import csv
import json
import psycopg2
from openai import OpenAI
from dotenv import load_dotenv

# Load secrets
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

client = OpenAI(api_key=OPENAI_API_KEY)
OUTPUT_FILE = "fill_gap_questions.csv"

def generate_fill_gap(flashcard_id, word, meaning, word_type):
    prompt = f"""
You are a Japanese teacher preparing JLPT N5 level exercises.

Your job:
1. Use the following word in a new, short and simple N5-level Japanese sentence.
2. The sentence must be different from any the learner has already seen before.
3. Replace the target word with a blank (＿＿＿) to make a fill-in-the-gap quiz.
4. Also provide the correct answer and English translation.

Word: "{word}"
Meaning: "{meaning}"
Type: "{word_type}"

Return JSON like this:
{{
  "question": "私は＿＿＿を食べます。",
  "answer": "りんご",
  "english": "I eat an apple."
}}

Keep it concise, N5-level, and **new** each time.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        return {
            "flashcard_id": flashcard_id,
            "type": "fill_gap",
            "question": data.get("question", "").strip(),
            "answer": data.get("answer", "").strip(),
            "english": data.get("english", "").strip(),
        }
    except Exception as e:
        print(f"Failed on '{word}' ({flashcard_id}): {e}")
        return {
            "flashcard_id": flashcard_id,
            "type": "fill_gap",
            "question": "ERROR",
            "answer": "ERROR",
            "english": str(e),
        }

def process_flashcards_from_db():
    results = []
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            SELECT flashcard_id, content
            FROM Flashcards
            WHERE JLPT_level = 'N5' AND type IN ('vocab', 'grammar')
        """)
        rows = cur.fetchall()
        for flashcard_id, content in rows:
            content_json = content if isinstance(content, dict) else json.loads(content)
            word = content_json.get("word", "").strip()
            meaning = content_json.get("meaning", "").strip()
            word_type = content_json.get("word_type", "N/A").strip()

            if word:
                entry = generate_fill_gap(flashcard_id, word, meaning, word_type)
                results.append(entry)
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Database error: {e}")
    return results

def save_to_csv(data):
    with open(OUTPUT_FILE, mode="w", encoding="utf-8", newline="") as f_out:
        fieldnames = ["flashcard_id", "type", "question", "answer", "english"]
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)

if __name__ == "__main__":
    print("Generating fill-in-the-gap questions...")
    data = process_flashcards_from_db()
    save_to_csv(data)
    print(f"✅ Done. Output saved to: {OUTPUT_FILE}")
