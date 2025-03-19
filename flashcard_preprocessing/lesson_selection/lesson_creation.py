import csv
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
# Initialize OpenAI client with API key from .env
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Define lesson descriptions with clarifications to avoid overlap between spatial directions and commands:
LESSON_DESCRIPTIONS = {
    1: "Lesson 1: Basic introductions, copula, simple Q/A (who, what, where)",
    2: "Lesson 2: Pronouns, 'go'/'come', basic object markers, direction particles",
    3: "Lesson 3: Adjectives (i-adjectives & na-adjectives), describing things",
    4: "Lesson 4: Family terms, negative/past copula",
    5: "Lesson 5: Daily routine verbs, telling time, -masu forms",
    6: "Lesson 6: Activities & hobbies, て-form usage, ている for ongoing actions",
    7: "Lesson 7: Spatial location and directions (existence います/あります, physical placement, how to get there)",
    8: "Lesson 8: Counting & quantities, comparisons (AよりB)",
    9: "Lesson 9: Food & dining, たり〜たり for multiple actions",
    10: "Lesson 10: Commands & instructions (prohibitions てはいけない, advice ほうがいい)",
    11: "Lesson 11: Past experiences (たことがある), and review of たり〜たり for past events",
    12: "Lesson 12: Asking/giving permission (てもいい) and prohibitions",
    13: "Lesson 13: Conditionals (もし〜なら, 〜たら), and how to do something (方)",
    14: "Lesson 14: Polite speech, final particles (ね, よ), and honorifics",
    15: "Lesson 15: Review & wrap-up, leftover items, advanced combos"
}

LESSON_SUMMARY_TEXT = "\n".join(
    f"Lesson {num}: {desc}" for num, desc in LESSON_DESCRIPTIONS.items()
)

def determine_lesson(item_text):
    """
    Given an item description, returns the recommended lesson number (1-15).
    """
    prompt = f"""
We have 15 lessons with the following themes:
{LESSON_SUMMARY_TEXT}

Here is a Japanese item: {item_text}

Which lesson number (1 to 15) is the best fit for this item? 
Return ONLY the lesson number (no extra words).
"""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=5,
        temperature=0.0
    )
    lesson_str = response.choices[0].message.content.strip()
    try:
        lesson_num = int(lesson_str)
        if 1 <= lesson_num <= 15:
            return lesson_num
        else:
            return 15  # fallback if out of range
    except Exception as e:
        print(f"Error parsing lesson number: {e}")
        return 15

def classify_csv(input_csv, output_csv):
    with open(input_csv, 'r', encoding='utf-8-sig', newline='') as fin, \
         open(output_csv, 'w', encoding='utf-8', newline='') as fout:

        reader = csv.DictReader(fin)
        # Create new field order: insert "Lesson" right after "JLPT"
        fieldnames = []
        for field in reader.fieldnames:
            fieldnames.append(field)
            if field.strip().lower() == "jlpt":
                fieldnames.append("Lesson")
        if "Lesson" not in fieldnames:
            fieldnames.append("Lesson")
            
        writer = csv.DictWriter(fout, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            # Build a description from the relevant columns:
            # Try "Vocab", or if not available, "Grammar" or "Kanji"
            vocab = row.get("Word", "") or row.get("Kanji", "")
            meaning = row.get("Meaning", "")
            word_type = row.get("Word Type", "")
            item_text = f"{vocab} -> {meaning}. It's a {word_type}."
            
            lesson_num = determine_lesson(item_text)
            row["Lesson"] = lesson_num
            writer.writerow(row)

if __name__ == "__main__":
    input_csv = "flashcard_preprocessing/N5_Grammar/N5_Grammar_List_with_Example_Sentences_and_Breakdowns.csv"
    output_csv = "flashcard_preprocessing/lesson_selection/5_Grammar_List_with_Example_Sentences_and_Breakdown_and_Lesson.csv"
    classify_csv(input_csv, output_csv)
