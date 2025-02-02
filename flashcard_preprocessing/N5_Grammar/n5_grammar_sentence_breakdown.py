import time
import json
import pandas as pd
from flashcard_preprocessing.ai_processing.generate_breakdowns import analyze_japanese_sentence, parse_analysis_response

# File paths (adjust as necessary)
INPUT_CSV = 'flashcard_preprocessing/N5_Grammar/N5_grammar_refined_examples_updated_again_again_again_again.csv'
OUTPUT_CSV = 'flashcard_preprocessing/N5_Grammar/N5_grammar_with_breakdowns.csv'

def process_csv(input_csv: str, output_csv: str):
    # Read the CSV file into a pandas DataFrame.
    # The CSV is expected to have columns like: sentence, translation (at least)
    df = pd.read_csv(input_csv)
    
    # Create a new column for the breakdown result.
    df['breakdown'] = None

    # Loop over each row to process the sentence.
    for index, row in df.iterrows():
        sentence = row['Example Sentence JP'] if 'Example Sentence JP' in row else row.get('sentence')
        translation = row['Example Sentence EN'] if 'Example Sentence EN' in row else row.get('translation')
        
        # If your CSV columns differ from "sentence" and "translation", adjust accordingly.
        print(f"Processing row {index}: {sentence}")
        
        # Generate analysis (this sends the sentence to the OpenAI API)
        analysis_response = analyze_japanese_sentence(sentence, translation)
        if analysis_response:
            # Parse the API response into a structured JSON object
            parsed_breakdown = parse_analysis_response(analysis_response)
        else:
            parsed_breakdown = {"error": "No analysis generated."}

        # Convert the parsed breakdown dict to a JSON string to store in one CSV cell.
        df.at[index, 'breakdown'] = json.dumps(parsed_breakdown, ensure_ascii=False)

        # Optional: add a short delay to avoid hitting API rate limits.
        time.sleep(1)

    # Save the updated DataFrame back to CSV.
    df.to_csv(output_csv, index=False)
    print(f"Processing complete. Updated CSV saved to '{output_csv}'.")

if __name__ == "__main__":
    process_csv(INPUT_CSV, OUTPUT_CSV)