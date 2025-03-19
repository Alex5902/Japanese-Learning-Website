import csv
import os
import random
import re
import string

# Set your desired maximum rows per lesson file.
MAX_ROWS = 60
# Folder where your base lesson files are stored.
LESSON_DIR = "flashcard_preprocessing/lesson_selection/lessons"

def split_lesson_file(file_path, max_rows=MAX_ROWS):
    """
    Reads the CSV file at file_path, shuffles the rows,
    and if the total number of rows (excluding header) exceeds max_rows,
    splits them into multiple files named with a letter suffix (e.g. Lesson3A.csv, Lesson3B.csv, etc.).
    """
    with open(file_path, 'r', encoding='utf-8-sig', newline='') as fin:
        reader = csv.DictReader(fin)
        rows = list(reader)
        fieldnames = reader.fieldnames
    total_rows = len(rows)
    if total_rows <= max_rows:
        print(f"File '{file_path}' has {total_rows} rows (<= {max_rows}). No split needed.")
        return

    # Shuffle rows to randomize distribution.
    random.shuffle(rows)
    num_chunks = (total_rows + max_rows - 1) // max_rows  # Ceiling division.

    base_filename = os.path.basename(file_path)
    name, ext = os.path.splitext(base_filename)
    
    for i in range(num_chunks):
        chunk = rows[i * max_rows : (i + 1) * max_rows]
        suffix = string.ascii_uppercase[i]  # Use letters A, B, C, etc.
        new_filename = f"{name}{suffix}{ext}"
        new_filepath = os.path.join(os.path.dirname(file_path), new_filename)
        with open(new_filepath, 'w', encoding='utf-8', newline='') as fout:
            writer = csv.DictWriter(fout, fieldnames=fieldnames)
            writer.writeheader()
            for row in chunk:
                writer.writerow(row)
        print(f"Wrote {len(chunk)} rows to '{new_filepath}'.")

def split_all_lessons(lessons_dir=LESSON_DIR, max_rows=MAX_ROWS):
    """
    Looks for base lesson CSV files (matching the pattern "Lesson<number>.csv")
    in the lessons_dir and splits any file that has more than max_rows.
    """
    # Use a regex to match only files like "Lesson3.csv" (and not "Lesson3A.csv")
    pattern = re.compile(r"^Lesson\d+\.csv$")
    for filename in os.listdir(lessons_dir):
        if pattern.match(filename):
            file_path = os.path.join(lessons_dir, filename)
            split_lesson_file(file_path, max_rows)

if __name__ == "__main__":
    split_all_lessons()
