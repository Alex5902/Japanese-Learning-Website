import pandas as pd

# Load the CSV file
input_file = "flashcard_preprocessing/N5_Grammar/N5_grammar_with_breakdowns.csv"  # Update this with your actual file name
output_file = "flashcard_preprocessing/N5_Grammar/N5_Grammar_List.csv"

# Select only the necessary columns
columns_to_keep = ["JLPT", "Grammar", "Reading", "Meaning", "Word Type"]

# Read the CSV file, keeping only the required columns
df = pd.read_csv(input_file, usecols=columns_to_keep)

# Save the new CSV file
df.to_csv(output_file, index=False)

print(f"✅ Extracted data saved to: {output_file}")
