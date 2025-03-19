import boto3
import pandas as pd
import os

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
os.makedirs("flashcard_preprocessing/N5_Kanji/audio/words/female", exist_ok=True)
os.makedirs("flashcard_preprocessing/N5_Kanji/audio/words/male", exist_ok=True)

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
csv_file = "flashcard_preprocessing/N5_Kanji/N5_Kanji_List.csv"
df = pd.read_csv(csv_file)

for index, row in df.iterrows():
    kanji = row.get("Kanji")
    examples = row.get("Example Words")

    # Skip if no kanji or no example words
    if pd.isna(kanji) or pd.isna(examples):
        continue

    print(f"Processing row {index + 1} | Kanji: {kanji}")

    # Split by semicolon to get each example entry
    example_list = [ex.strip() for ex in examples.split(";") if ex.strip()]

    for i, ex_text in enumerate(example_list, start=1):
        # Separate the Japanese part from the English part (split on colon)
        # e.g., "日本(にほん): Japan" -> "日本(にほん)"
        japanese_part = ex_text.split(":", 1)[0].strip()

        # ----- FEMALE (Tomoko) -----
        female_path = f"flashcard_preprocessing/N5_Kanji/audio/words/female/{kanji}_example_{i}.mp3"
        if not os.path.exists(female_path):
            synthesize_speech(japanese_part, female_path, "Tomoko")

        # ----- MALE (Takumi) -----
        male_path = f"flashcard_preprocessing/N5_Kanji/audio/words/male/{kanji}_example_{i}.mp3"
        if not os.path.exists(male_path):
            synthesize_speech(japanese_part, male_path, "Takumi")

print("All audio files have been generated.")