import os
import csv
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)
INPUT_FILE = "flashcards_n5.csv"
OUTPUT_FILE = "fill_gap_questions.csv"

def generate_fill_gap(word, meaning, word_type, example_sentence):
    """
    Calls OpenAI to create a new N5-level sentence that is:
      - Short
      - Different from the existing example_sentence
      - JSON structure: { "question": "...", "answer": "...", "english": "..." }
      - The word itself replaced by ＿＿＿ in the 'question'
    """
    # We explicitly tell the model NOT to mimic the example sentence.
    prompt = f"""
You are a Japanese teacher preparing JLPT N5-level exercises.

Task:
1. The sentence must contain the target word below, but replaced in the final output with ＿＿＿.
2. It must be different from this example the student already saw: "{example_sentence}"
3. Keep the sentence simple, natural, and short.
4. Provide the final answer (the word) and a brief English translation.

Target word: "{word}" 
Meaning: "{meaning}"
Type: "{word_type}"

Return valid JSON in the format:

{{
  "question": "私は＿＿＿を食べます。",
  "answer": "りんご",
  "english": "I eat an apple."
}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # or whichever model you want to use
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        content = response.choices[0].message.content.strip()

        # Attempt to parse the JSON
        data = json.loads(content)

        # Basic checks
        question = data.get("question", "").strip()
        answer = data.get("answer", "").strip()
        english = data.get("english", "").strip()

        return question, answer, english

    except Exception as e:
        # If there's an error, return placeholders so your CSV doesn't break
        print(f"OpenAI error on word={word}: {e}")
        return "ERROR", "ERROR", str(e)

def create_fill_gap_csv():
    # Read from the CSV of flashcards
    with open(INPUT_FILE, mode="r", encoding="utf-8") as f_in, \
         open(OUTPUT_FILE, mode="w", encoding="utf-8", newline="") as f_out:

        reader = csv.DictReader(f_in)
        fieldnames = ["flashcard_id", "question", "answer", "english"]
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            flashcard_id = row["flashcard_id"]
            word = row["word"]
            meaning = row["meaning"]
            word_type = row["word_type"]
            example_sentence = row["example_sentence"]

            if not word:
                continue  # skip if missing

            question, answer, english = generate_fill_gap(
                word, meaning, word_type, example_sentence
            )

            writer.writerow({
                "flashcard_id": flashcard_id,
                "question": question,
                "answer": answer,
                "english": english
            })

    print(f"✅ Fill-gap exercises saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    create_fill_gap_csv()
