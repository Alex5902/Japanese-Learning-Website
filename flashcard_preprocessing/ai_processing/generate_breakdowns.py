from openai import OpenAI
import json
import re
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client with API key from .env
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Function to analyze a Japanese sentence
def analyze_japanese_sentence(sentence, translation):
    """
    Sends a prompt to the OpenAI API to analyze a Japanese sentence
    with vocabulary, grammar explanation, and beginner tips.
    """
    prompt = f"""
    You are a Japanese language tutor for beginners. Please analyze the following Japanese sentence:
    Sentence: {sentence} Translation: {translation}
    Break down your explanation into the following format:

    1. Vocabulary Breakdown:
    Provide each word or phrase in the following structure:
    - **[Word or phrase] ([Reading])**: "[Meaning]" - [Grammatical role].

    2. Grammar Explanation:
    - Context: Describe the overall meaning of the sentence.
    - Steps: List step-by-step grammar points in bullet points.
    - Contribution to meaning: Explain how each grammar point contributes to the sentence meaning.

    3. Beginner Tips & Common Pitfalls:
    - Provide one tip to help remember the grammar.
    - Explain one common mistake and how to avoid it.

    Ensure your response follows the exact format and uses consistent markdown headings (### for sections, bullet points for lists).
    """

    try:
        # Send API request
        response = client.chat.completions.create(
            model="gpt-4o-mini", 
            messages=[
                {"role": "system", "content": "You are a Japanese tutor."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            top_p=0.7,
            max_tokens=1000,
        )
        # Extract and return the response content
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error in API call: {e}")
        return None

# Function to parse the response
def parse_analysis_response(response_text: str) -> dict:
    """
    Parses the response from OpenAI API into structured sections.
    Returns a dictionary with parsed content.
    """
    if not response_text:
        return {"error": "No response text provided."}

    def extract_section(pattern, text):
        match = re.search(pattern, text, re.S)
        return match.group(1).strip() if match else ""
    
    try:
        # Extract the three major sections using lookahead assertions:
        vocab_text = extract_section(
            r"### 1\. Vocabulary Breakdown:(.*?)(?=### 2\. Grammar Explanation:)", 
            response_text
        )
        grammar_text = extract_section(
            r"### 2\. Grammar Explanation:(.*?)(?=### 3\. Beginner Tips & Common Pitfalls:)", 
            response_text
        )
        tips_text = extract_section(
            r"### 3\. Beginner Tips & Common Pitfalls:(.*)", 
            response_text
        )

        # --- Parse Vocabulary Breakdown ---
        # Using a flexible regex to allow for extra whitespace etc.
        vocab = re.findall(r"-\s+\*\*(.*?)\s*\((.*?)\)\*\*:\s*\"(.*?)\"\s*-\s*\[(.*?)\]", vocab_text)
        vocab_list = [
            {"word": w.strip(), "reading": r.strip(), "meaning": m.strip(), "role": gr.strip()}
            for w, r, m, gr in vocab
        ]

        # --- Parse Grammar Explanation ---
        # 1. Extract the context first.
        grammar_context_match = re.search(r"-\s+\*\*Context\*\*:\s*(.+)", grammar_text)
        grammar_context = grammar_context_match.group(1).strip() if grammar_context_match else ""
        
        # 2. Split the grammar_text into steps and contributions using the "Contribution to meaning" heading
        steps_text = grammar_text
        contributions_text = ""
        if "Contribution to meaning" in grammar_text:
            parts = re.split(r"-\s+\*\*Contribution to meaning\*\*:\s*", grammar_text, maxsplit=1)
            if len(parts) == 2:
                steps_text, contributions_text = parts[0], parts[1]

        # Remove the context line from steps_text since we've already captured it.
        grammar_steps = []
        for line in steps_text.splitlines():
            line = line.strip()
            if not line or re.match(r"-\s+\*\*(Context)\*\*:", line):
                continue  # skip empty lines or the context line
            if line.startswith("-"):
                # Remove leading dash and any extra spaces.
                grammar_steps.append(line.lstrip("- ").strip())

        # For contributions, we expect one or more bullet items.
        grammar_contributions = []
        if contributions_text:
            for line in contributions_text.splitlines():
                line = line.strip()
                if not line:
                    continue
                if line.startswith("-"):
                    grammar_contributions.append(line.lstrip("- ").strip())
                else:
                    # Append to the previous contribution if the bullet doesn't start a new line
                    if grammar_contributions:
                        grammar_contributions[-1] += " " + line

        # --- Parse Tips ---
        tips = re.findall(r"-\s+\*\*(Tip|Common Mistake)\*\*:\s*(.*?)\s*$", tips_text, re.M)

        return {
            "vocabulary": vocab_list,
            "grammar": {
                "context": grammar_context,
                "steps": grammar_steps,
                "contribution to meaning": grammar_contributions,
            },
            "tips": tips,
        }
    except Exception as e:
        print(f"Error parsing response: {e}")
        return {"error": "Failed to parse response."}

# Example usage
if __name__ == "__main__":
    sentence = "それから10年が経った。"
    translation = "10 years have passed since then."

    # Generate analysis
    response = analyze_japanese_sentence(sentence, translation)
    if response:
        print("Raw Analysis Output:")
        print(response)

        # Parse the response
        parsed_analysis = parse_analysis_response(response)
        print("\nParsed Analysis Output:")
        print(json.dumps(parsed_analysis, indent=4, ensure_ascii=False))
    else:
        print("No analysis was generated.")