import boto3
import pandas as pd
import os
import re

# AWS Polly Configuration
aws_region = os.environ.get('AWS_REGION')
aws_access_key = os.environ.get('AWS_ACCESS_KEY')
aws_secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY')

polly_client = boto3.client(
    "polly",
    region_name=aws_region,
    aws_access_key_id=aws_access_key,
    aws_secret_access_key=aws_secret_key,
)

# Create output directories
os.makedirs("flashcard_preprocessing/N5_Vocab/audio/words/female", exist_ok=True)
os.makedirs("flashcard_preprocessing/N5_Vocab/audio/words/male", exist_ok=True)
os.makedirs("flashcard_preprocessing/N5_Vocab/audio/examples/female", exist_ok=True)
os.makedirs("flashcard_preprocessing/N5_Vocab/audio/examples/male", exist_ok=True)

def sanitize_filename(filename: str) -> str:
    """
    Replace invalid file system characters with an underscore.
    Adjust the regex for your needs/operating system.
    """
    # Characters typically invalid on Windows: \ / : * ? " < > |
    # We'll replace them with an underscore "_"
    return re.sub(r'[\\/*?:"<>|]', '_', filename)

# Function to generate speech
def synthesize_speech(text, output_file, voice_id, engine="neural"):
    try:
        response = polly_client.synthesize_speech(
            Text=text,
            OutputFormat="mp3",
            VoiceId=voice_id,
            Engine=engine,
        )
        with open(output_file, "wb") as file:
            file.write(response["AudioStream"].read())
        print(f"Saved: {output_file}")
    except Exception as e:
        print(f"Error generating audio for '{text}': {e}")

# Load CSV
csv_file = "flashcard_preprocessing/N5_Vocab/N5_Vocab_List_with_Example_Sentences_and_Breakdowns.csv"
df = pd.read_csv(csv_file)

# Process each row for both male and female voices
for index, row in df.iterrows():
    print(f"Processing row {index + 1}...")
    word = row.get("Word")
    example = row.get("Example Sentence JP")

    if pd.notna(word):
        # Sanitize the vocab (word) so it won't break file naming
        safe_word = sanitize_filename(str(word))

        # Female
        female_word_path = f"flashcard_preprocessing/N5_Vocab/audio/words/female/{safe_word}.mp3"
        if not os.path.exists(female_word_path):
            synthesize_speech(word, female_word_path, "Tomoko")

        # Male
        male_word_path = f"flashcard_preprocessing/N5_Vocab/audio/words/male/{safe_word}.mp3"
        if not os.path.exists(male_word_path):
            synthesize_speech(word, male_word_path, "Takumi")

    if pd.notna(example) and pd.notna(word):
        # Also sanitize for example audio file
        safe_word = sanitize_filename(str(word))  # reuse or redefine, same result
        female_example_path = f"flashcard_preprocessing/N5_Vocab/audio/examples/female/{safe_word}_example.mp3"
        if not os.path.exists(female_example_path):
            synthesize_speech(example, female_example_path, "Tomoko")

        male_example_path = f"flashcard_preprocessing/N5_Vocab/audio/examples/male/{safe_word}_example.mp3"
        if not os.path.exists(male_example_path):
            synthesize_speech(example, male_example_path, "Takumi")

print("All audio files have been generated.")