import os
import csv
import json
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI Client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

INPUT_FILE = "flashcard_preprocessing/N5_Grammar/N5_Grammar_List.csv"   
OUTPUT_FILE = "flashcard_preprocessing/N5_Grammar/N5_Grammar_List_with_Example_Sentences.csv"

def check_and_fix_with_openai(word, reading, meaning, word_type):
    """
    Uses OpenAI's API to:
    1) Verify/fix meaning if incorrect.
    2) Verify/fix word type if incorrect.
    3) Generate an N5-level example sentence (JP) using the 'word'.
    4) Provide an English translation (EN) of that sentence.

    Returns: (corrected_meaning, corrected_word_type, example_jp, example_en)
    """

    prompt = f"""You are an assistant that validates Japanese flashcards.
For the Japanese word: "{word}" (reading: "{reading}"),
with the current meaning: "{meaning}" and word type: "{word_type}", do the following:

1. Check if the 'Meaning' is correct and clear for an N5 learner; if not, provide a corrected version.
2. Check if the 'Word Type' is correct (e.g., 'Noun', 'Verb', 'Particle', 'Expression', etc.). If it's wrong, correct it.
3. Create a sample sentence in Japanese (N5 difficulty) that uses the word naturally.
4. Provide an English translation of that sample sentence.

Respond in valid JSON with this format:
{{
  "meaning": "...",
  "word_type": "...",
  "example_jp": "...",
  "example_en": "..."
}}

Ensure your response is **strictly JSON** formatted.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,  # Lower temperature ensures more controlled responses
        )

        # Correct way to access the response data
        content = response.choices[0].message.content  # ✅ FIXED

        # Parse JSON response
        data = json.loads(content)
        corrected_meaning = data.get("meaning", meaning).strip()
        corrected_word_type = data.get("word_type", word_type).strip()
        example_jp = data.get("example_jp", "(Example sentence failed)").strip()
        example_en = data.get("example_en", "(Example translation failed)").strip()

    except json.JSONDecodeError:
        corrected_meaning = meaning
        corrected_word_type = word_type
        example_jp = "(Failed to parse example sentence.)"
        example_en = "(Failed to parse example sentence.)"
    except Exception as e:
        print(f"Error during OpenAI API call: {e}")
        return meaning, word_type, "(Example sentence generation failed)", "(Example sentence generation failed)"

    return corrected_meaning, corrected_word_type, example_jp, example_en


def process_flashcards(input_file, output_file):
    """
    Reads each row from the input CSV, calls the OpenAI function to
    check & fix meaning/word type, and generate example sentences.
    Then writes the updated data to the output CSV.
    """
    updated_rows = []

    with open(input_file, mode="r", encoding="utf-8") as f_in:
        reader = csv.DictReader(f_in)
        fieldnames = reader.fieldnames

        # Ensure we have the required columns
        required_cols = {"JLPT", "Word", "Reading", "Meaning", "Word Type"}
        for rc in required_cols:
            if rc not in fieldnames:
                raise ValueError(f"Required column '{rc}' not found in input CSV.")

        # If Example Sentence JP/EN columns don't exist, let's create them
        if "Example Sentence JP" not in fieldnames:
            fieldnames.append("Example Sentence JP")
        if "Example Sentence EN" not in fieldnames:
            fieldnames.append("Example Sentence EN")

        for row in reader:
            word = row["Word"].strip()
            reading = row["Reading"].strip() if "Reading" in row else ""
            meaning = row["Meaning"].strip() if "Meaning" in row else ""
            word_type = row["Word Type"].strip() if "Word Type" in row else ""

            # Call OpenAI to check/fix data and generate examples
            new_meaning, new_word_type, example_jp, example_en = check_and_fix_with_openai(
                word, reading, meaning, word_type
            )

            # Update the row with corrected data
            row["Meaning"] = new_meaning
            row["Word Type"] = new_word_type
            row["Example Sentence JP"] = example_jp
            row["Example Sentence EN"] = example_en

            updated_rows.append(row)

    # Write the updated rows to the output CSV
    with open(output_file, mode="w", encoding="utf-8", newline="") as f_out:
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

    print(f"✅ Successfully updated flashcards. Output written to: {output_file}")


if __name__ == "__main__":
    process_flashcards(INPUT_FILE, OUTPUT_FILE)
