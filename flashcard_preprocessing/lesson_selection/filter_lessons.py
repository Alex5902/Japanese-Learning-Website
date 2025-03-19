import csv
import os

def read_csv_file(file_path, source_label):
    """
    Reads a CSV file and adds a new key "Source" with the given source_label.
    Removes the "breakdown" column if present.
    Returns a list of rows (as dictionaries).
    """
    rows = []
    with open(file_path, 'r', encoding='utf-8-sig', newline='') as fin:
        reader = csv.DictReader(fin)
        for row in reader:
            row["Source"] = source_label
            rows.append(row)
    return rows

def combine_rows(file_paths_sources):
    """
    Given a list of tuples (file_path, source_label), reads each CSV
    and combines all rows into a single list.
    """
    combined = []
    for file_path, source_label in file_paths_sources:
        combined.extend(read_csv_file(file_path, source_label))
    return combined

def union_fieldnames(rows):
    """
    Returns a list of all unique keys found in any row (to be used as header).
    """
    fieldnames = set()
    for row in rows:
        fieldnames.update(row.keys())
    return list(fieldnames)

def filter_and_write_by_lesson(combined_rows, output_dir, num_lessons=15):
    """
    For each lesson number (1 to num_lessons), filters rows with that Lesson number,
    and writes them to a CSV file in the output_dir named "LessonX.csv".
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    for lesson in range(1, num_lessons + 1):
        lesson_rows = []
        for row in combined_rows:
            # Get the "Lesson" value; strip whitespace.
            lesson_value = row.get("Lesson", "").strip()
            try:
                if int(lesson_value) == lesson:
                    lesson_rows.append(row)
            except ValueError:
                continue

        if lesson_rows:
            # Use union of all fieldnames from the lesson rows.
            fieldnames = union_fieldnames(lesson_rows)
        else:
            # If no rows, define a default header.
            fieldnames = ["JLPT", "Lesson", "Word", "Reading", "Meaning", "Word Type", 
                          "Example Sentence JP", "Example Sentence EN", "Kanji", "Onyomi", "Kunyomi", "Example Words", "Source", "breakdown"]

        output_file = os.path.join(output_dir, f"Lesson{lesson}.csv")
        with open(output_file, 'w', encoding='utf-8', newline='') as fout:
            writer = csv.DictWriter(fout, fieldnames=fieldnames)
            writer.writeheader()
            for row in lesson_rows:
                writer.writerow(row)
        print(f"Wrote {len(lesson_rows)} rows to {output_file}")

if __name__ == "__main__":
    # Define your input CSV file paths. Adjust these filenames as needed.
    # These CSVs may have different structures.
    vocab_file = "flashcard_preprocessing/lesson_selection/N5_Vocab_List_with_Example_Sentences_and_Breakdowns_and_Lesson.csv"
    grammar_file = "flashcard_preprocessing/lesson_selection/N5_Grammar_List_with_Example_Sentences_and_Breakdowns_and_Lesson.csv"
    kanji_file = "flashcard_preprocessing/lesson_selection/N5_Kanji_List_and_Lesson.csv"

    # Pair each file with a source label.
    file_paths_sources = [
        (vocab_file, "Vocab"),
        (grammar_file, "Grammar"),
        (kanji_file, "Kanji")
    ]

    # Combine all rows from the three CSVs.
    combined_rows = combine_rows(file_paths_sources)

    # Define the output directory (will be created inside the current directory).
    output_dir = "flashcard_preprocessing/lesson_selection/lessons"  # This folder will be created in the current directory

    # Filter rows by Lesson (1 to 15) and write separate CSV files.
    filter_and_write_by_lesson(combined_rows, output_dir, num_lessons=15)
