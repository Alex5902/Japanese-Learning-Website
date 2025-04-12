import os
import csv
import json
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

# Input/Output files
FLASHCARDS_INPUT = "practice_preprocessing/flashcards_n5.csv"
FILL_GAP_OUTPUT = "practice_preprocessing/fill_gap_questions.csv"

# Dictionary to track used questions for each word:
#   used_questions[word] = set of previously used "question" strings.
used_questions = {}

def generate_fill_gap(word, meaning, word_type, example_sentence):
    """
    Returns a (question, answer, english) triple for a fill-in-the-gap sentence.
    If it can't generate a new unique question after several attempts, returns ("ERROR", "ERROR", "ERROR").
    """
    prompt = f"""
You are a Japanese teacher preparing JLPT N5-level exercises.

Task:
1. Generate 3 unique Japanese sentences, each using the target word below.
2. In each sentence, replace the target word with ____ (an underline).
3. Do NOT repeat the sentence used in this example: "{example_sentence}"
4. Each sentence must be natural, one setence long (can be simple or complex sentence) and be at an N5 level (N5 level).
5. For each sentence, include:
   - "question" (Japanese with ____)
   - "answer" (the correct word)
   - "english" (a short English translation)

Return a JSON array with 3 objects in this format:

[
  {{
    "question": "私は____を食べます。",
    "answer": "りんご",
    "english": "I eat an apple."
  }},
  ...
]

Target word: "{word}"
Meaning: "{meaning}"
Type: "{word_type}"
"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5
            )
            content = response.choices[0].message.content.strip()

            # Strip markdown code block if it exists
            if content.startswith("```"):
                content = content.replace("```json", "").replace("```", "").strip()

            data = json.loads(content)

            results = []
            for item in data:
                question = item.get("question", "").strip()
                answer = item.get("answer", "").strip()
                english = item.get("english", "").strip()

                if not question or not answer or not english:
                    continue

                # Deduplicate
                if question in used_questions[word]:
                    continue

                used_questions[word].add(question)
                results.append((question, answer, english))

            return results

        except Exception as e:
            print(f"❌ Error (attempt {attempt+1}) for '{word}': {e}")
            time.sleep(1)

    return []  # Return empty list if failed

def create_fill_gap_csv():
    """
    For each flashcard, generates 3 unique fill-in-the-gap sentences
    that differ from the DB example and from each other.
    """
    with open(FLASHCARDS_INPUT, mode="r", encoding="utf-8") as f_in, \
         open(FILL_GAP_OUTPUT, mode="w", encoding="utf-8", newline="") as f_out:

        reader = csv.DictReader(f_in)
        fieldnames = ["flashcard_id", "question", "answer", "english"]
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            flashcard_id = row.get("flashcard_id", "").strip()
            word = row.get("word", "").strip()
            meaning = row.get("meaning", "").strip()
            word_type = row.get("word_type", "").strip()
            example_sentence = row.get("example_sentence", "").strip()

            if not word:
                continue  # Skip if no word

            # Initialise used set if not already
            if word not in used_questions:
                used_questions[word] = set()

            results = generate_fill_gap(word, meaning, word_type, example_sentence)

            for question, answer, english in results[:3]:  # Just in case GPT returns more than 3
                writer.writerow({
                    "flashcard_id": flashcard_id,
                    "question": question,
                    "answer": answer,
                    "english": english
                })

            if len(results) < 3:
                print(f"⚠️ Only got {len(results)} questions for '{word}' ({flashcard_id})")

    print(f"✅ 3 fill-gap exercises generated for each flashcard and saved to: {FILL_GAP_OUTPUT}")

if __name__ == "__main__":
    create_fill_gap_csv()
