import pandas as pd

# Load the CSV file
input_file = "flashcard_preprocessing/N5_Vocab/N5_vocab_with_breakdowns.csv"  # Update this with your actual file name
output_file = "flashcard_preprocessing/N5_Vocab/N5_Vocab_List.csv"

# Select only the necessary columns
columns_to_keep = ["Word", "Reading", "Meaning", "JLPT", "Word Type"]

# Read the CSV file, keeping only the required columns
df = pd.read_csv(input_file, usecols=columns_to_keep)

# Reorder columns: Move "JLPT" to the first position
df = df[["JLPT", "Word", "Reading", "Meaning", "Word Type"]]

# Save the new CSV file
df.to_csv(output_file, index=False)

print(f"✅ Extracted data saved to: {output_file}")
