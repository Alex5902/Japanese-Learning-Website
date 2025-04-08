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
FLASHCARDS_INPUT = "flashcards_n5.csv"
FILL_GAP_OUTPUT = "fill_gap_questions.csv"

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
1. The sentence must contain the target word below, but replaced in the final output with ＿＿＿.
2. It must be different from this example the student already saw: "{example_sentence}"
3. Keep the sentence simple, natural, and short (N5 level).
4. Provide the final answer (the word) and a brief English translation.
5. Return valid JSON in this format:

{{
  "question": "私は＿＿＿を食べます。",
  "answer": "りんご",
  "english": "I eat an apple."
}}

Target word: "{word}"
Meaning: "{meaning}"
Type: "{word_type}"
"""
    # We will allow multiple tries in case the model returns duplicates or invalid JSON.
    max_retries = 4
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",  # or your preferred model
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5
            )
            content = response.choices[0].message.content.strip()
            data = json.loads(content)

            question = data.get("question", "").strip()
            answer = data.get("answer", "").strip()
            english = data.get("english", "").strip()

            # Basic sanity checks
            if not question or not answer or not english:
                raise ValueError("Missing question, answer, or english in response.")

            # Check if the question was already used for this word
            if question in used_questions[word]:
                # It's a duplicate; try again
                print(f"Duplicate fill-in-the-gap detected for '{word}'. Retrying...")
                continue

            # If it's new, update the used_questions and return
            used_questions[word].add(question)
            return question, answer, english

        except Exception as e:
            print(f"Error in generation (attempt {attempt+1}/{max_retries}) for '{word}': {e}")
            time.sleep(1)  # brief pause to avoid spamming the API

    # If we exhaust all retries, return an error
    return "ERROR", "ERROR", "ERROR"

def create_fill_gap_csv():
    """
    Reads each row from flashcards_n5.csv, generates a fill-in-the-gap sentence
    that’s different from the DB example and from any previously generated.
    Saves results to fill_gap_questions.csv.
    """
    with open(FLASHCARDS_INPUT, mode="r", encoding="utf-8") as f_in, \
         open(FILL_GAP_OUTPUT, mode="w", encoding="utf-8", newline="") as f_out:

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
                continue  # skip if no word

            # Initialize a used set for each word if not present
            if word not in used_questions:
                used_questions[word] = set()

            question, answer, english = generate_fill_gap(
                word, meaning, word_type, example_sentence
            )

            writer.writerow({
                "flashcard_id": flashcard_id,
                "question": question,
                "answer": answer,
                "english": english
            })

    print(f"✅ Fill-gap exercises saved to: {FILL_GAP_OUTPUT}")

if __name__ == "__main__":
    create_fill_gap_csv()
