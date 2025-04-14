from openai import OpenAI
import json
import regex as re
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

    **Sentence:** {sentence}  
    **Translation:** {translation}

    Break down your explanation into the following structured format.

    ---

    ## 1. Vocabulary Breakdown

    For **each word or phrase**, provide:

    - **[Word or phrase] ([Reading])**: "[Meaning]" - [Grammatical role].  
    - **Component Breakdown (if applicable)**:  
    - Treat **any word or phrase that can be broken into meaningful parts** (including common phrases like これから, それから, and conjugated verb forms like 食べて, 経った) as compound or conjugated words.  
    - For each component, list it in the form:  
        - **[Component] ([Reading])**: "[Meaning]" - [Part of speech].  
    - **Contribution to Overall Meaning (if applicable)**:  
    - Explain **how the components combine** to form the full meaning of the word or phrase.

    ---

    ## 2. Grammar Explanation

    1. **Context (1-2 sentences)**  
    - Briefly summarize the overall meaning or situation that the sentence describes.

    2. **Steps**  
    - For each **key grammar point**, name it, then provide a **simple, beginner-friendly explanation**.  
    - If there is any **conjugation** involved (e.g., た-form for past tense), mention it.

    3. **Sentence Pattern (if applicable)**  
    - Present the relevant **sentence pattern** in a short bullet or sub-bullet format.  
    - Include one **main example sentence** demonstrating that pattern, separated into three labeled lines:
        - **Kanji**  
        - **Hiragana**  
        - **English Translation**

    ---

    ## 3. Beginner Tips & Common Pitfalls

    - **Tip** (1-2 sentences): A simple, memorable way to understand or remember the structure.  
    - **Common Mistake** (1-2 sentences): Describe **one** typical mistake beginners make and how to avoid it.

    - **Alternative Expression (if applicable)**:
    - Provide **one** alternative phrasing in **Kanji**, **Hiragana**, and **English** (within two sentences).  
    - List any **new words** you used that **weren't in the original sentence** under “New Words in Alternative Expression,” along with short definitions.

    ---

    ## Important Notes

    1. **Follow the exact headings** (### or ##) and the bullet structure shown above.  
    2. Do **not** skip the “Component Breakdown” for words/phrases that can be dissected meaningfully.  
    3. Separate **Kanji**, **Hiragana**, and **English** clearly in the **Sentence Pattern** and **Alternative Expression** examples.  
    4. Keep explanations concise and accessible for beginners.

    ---

    # Examples of a Complete Response

    Below is an **example** of how the final structured response should look when analyzing the sample sentence “それから10年が経った。” You can adapt this format for any sentence.

    ---

    **Sentence**: それから10年が経った。  
    **Translation**: It's been 10 years since then.

    ---

    ### 1. Vocabulary Breakdown

    - **それから (それから)**: “since then” - [Conjunctive/Adverbial phrase]  
    - **Component Breakdown**:  
        - **それ (それ)**: “that” - [Pronoun].  
        - **から (から)**: “from / since” - [Particle].  
    - **Contribution to Overall Meaning**:  
        The phrase sets a time reference point, effectively meaning “from that time on” or “since then.”

    - **10年 (じゅうねん)**: “10 years” - [Noun]  
    - **Component Breakdown**:  
        - **10 (じゅう)**: “ten” - [Numeral].  
        - **年 (ねん)**: “year” - [Noun].  
    - **Contribution to Overall Meaning**:  
        Specifies the duration of time that has passed.

    - **が (が)**: “[Subject Marker]” - [Particle]

    - **経った (たった)**: “have passed” - [Verb, past tense]  
    - **Component Breakdown**:  
        - **経つ (たつ)**: “to pass” or “to elapse” - [Verb].  
        - **た (た)**: Past tense conjugation suffix.  
    - **Contribution to Overall Meaning**:  
        Indicates that the passage of time has completed.

    ---

    ### 2. Grammar Explanation

    1. **Context (1-2 sentences)**  
    This sentence indicates that a total of 10 years has elapsed from a specific point in the past. It establishes a time reference and emphasizes how much time has passed.

    2. **Steps**
    - **それから** - Introduces the starting point in time.  
    - **10年** - Specifies the duration (10 years).  
    - **が** - Marks “10 years” as the subject.  
    - **経った** - The past tense of “経つ,” meaning “time has passed.”

    3. **Sentence Pattern**:
    - [それから] + [Duration] + [が] + [Verb (past tense)]
    - **Kanji**: それから5週間が経った。  
    - **Hiragana**: それからごしゅうかんがたった。  
    - **English Translation**: 5 weeks have passed since then.

    ---

    ### 3. Beginner Tips & Common Pitfalls

    - **Tip**: Think of それから as “from then on.” By pairing it with a duration and a past-tense verb, you get a clear sense of how much time has gone by.  
    - **Common Mistake**: Beginners sometimes omit が or use に instead. Remember to use が here to mark the subject (the “10 years” that have passed).

    - **Alternative Expression**:  
    - **Kanji**: 10年が過ぎた。  
    - **Hiragana**: じゅうねんがすぎた。  
    - **English**: 10 years have gone by.

    - **New Words in Alternative Expression**:
    - **過ぎた (すぎた)**: “has passed” - [Verb, past tense]. It is the past tense of 過ぎる (すぎる), meaning “to pass (time).”

    ---

    Below is an **example** of how the final structured response should look when analyzing the sample sentence “おばあさんはバスから降りた。” You can adapt this format for any sentence.

    **Sentence**: おばあさんはバスから降りた。  
    **Translation**: The old lady got down from the bus.

    ---

    ### 1. Vocabulary Breakdown

    - **おばあさん (おばあさん)**: “old lady” - [Noun]  
    - **は (は)**: “[Topic Marker]” - [Particle]  
    - **バス (ばす)**: “bus” - [Noun]
    - **から (から)**: “from” - [Particle]
    - **降りた (おりた)**: “got down” - [Verb, past tense]
    - **Component Breakdown**:
        - **降りる (おりる)**: “to get down” or “to descend” - [Verb].
        - **た (た)**: Past tense conjugation suffix.
    - **Contribution to Overall Meaning**:
        The verb indicates the action of getting down or descending, and the past tense shows that this action has already occurred.

    ---

    ### 2. Grammar Explanation

    1. **Context (1-2 sentences)**
    This sentence describes an action where an old lady has completed the act of getting off a bus. It provides a clear image of a moment in time when she disembarked.

    2. **Steps**
    - **おばあさん** - Refers to the subject of the sentence, the old lady.
    - **は** - Marks “おばあさん” as the topic of the sentence.
    - **バス** - Indicates the vehicle from which she got down.
    - **から** - Indicates the starting point of the action, meaning “from.”
    - **降りた** - The past tense of “降りる,” indicating that the action of getting down has been completed.

    3. **Sentence Pattern**:
    - [Subject] + [は] + [Location/Vehicle] + [から] + [Verb (past tense)]
    - **Kanji**: 彼は学校から帰った。
    - **Hiragana**: かれはがっこうからかえった。
    - **English Translation**: He came back from school.

    ---

    ### 3. Beginner Tips & Common Pitfalls

    - **Tip**: Remember that は marks the topic of the sentence, which is often the subject, but not always. It helps to focus on what the sentence is about.     
    - **Common Mistake**: Beginners might confuse から with へ or に. Remember that から indicates the starting point of an action, while へ and に indicate direction or destination.

    - **Alternative Expression**:
    - **Kanji**: おばあさんはバスを降りた。
    - **Hiragana**: おばあさんはばすをおりた。
    - **English**: The old lady got off the bus.

    - **New Words in Alternative Expression**:
    - **を (を)**: “[Object Marker]” - [Particle]. It marks the direct object of the verb, in this case, the bus.

    ---

    Below is an **example** of how the final structured response should look when analyzing the sample sentence “平仮名は書けるんだけど、片仮名はまだ書けないんだ。” You can adapt this format for any sentence.

    **Sentence**: 平仮名は書けるんだけど、片仮名はまだ書けないんだ。  
    **Translation**: I can write hiragana, but I can't yet write katakana.

    ---

    ### 1. Vocabulary Breakdown

    - **平仮名 (ひらがな)**: “hiragana” - [Noun]  
    - **は (は)**: “[Topic Marker]” - [Particle]  
    - **書ける (かける)**: “can write” - [Verb, potential form]  
    - **ん (ん)**: “[Explanatory particle]” - [Particle]  
    - **だけど (だけど)**: “but” - [Conjunction]  
    - **片仮名 (かたかな)**: “katakana” - [Noun]  
    - **は (は)**: “[Topic Marker]” - [Particle]  
    - **まだ (まだ)**: “yet” - [Adverb]  
    - **書けない (かけない)**: “cannot write” - [Verb, negative potential form]  
    - **んだ (んだ)**: “[Explanatory particle]” - [Particle]  

    ---

    ### 2. Grammar Explanation

    1. **Context (1-2 sentences)**  
    This sentence expresses the speaker's ability to write hiragana while indicating that they have not yet mastered writing katakana. It contrasts the two skills.

    2. **Steps**
    - **平仮名** - Refers to the first type of Japanese syllabary, hiragana.
    - **は** - Marks “平仮名” as the topic of the first clause.
    - **書ける** - The potential form of the verb “書く” (to write), indicating ability.
    - **んだけど** - A colloquial way to provide an explanation or contrast, meaning “but.”
    - **片仮名** - Refers to the second type of Japanese syllabary, katakana.
    - **は** - Marks “片仮名” as the topic of the second clause.
    - **まだ** - Indicates that the action has not yet been completed.
    - **書けない** - The negative potential form of “書く,” indicating inability.
    - **んだ** - Provides an explanatory nuance to the statement.

    3. **Sentence Pattern**:
    - [Topic 1] + [は] + [Verb (potential)] + [んだけど] + [Topic 2] + [は] + [まだ] + [Verb (negative potential)]
    - **Kanji**: 私は日本語が話せるんだけど、英語はまだ話せないんだ。
    - **Hiragana**: わたしはにほんごがはなせるんだけど、えいごはまだはなせないんだ。
    - **English Translation**: I can speak Japanese, but I can't yet speak English.

    ---

    ### 3. Beginner Tips & Common Pitfalls

    - **Tip**: Remember that the potential form (like 書ける) expresses ability, while the negative potential form (like 書けない) expresses inability. This contrast is key in understanding the sentence.
    - **Common Mistake**: Beginners often confuse the use of は and が. In this context, は is used to mark the topics being discussed (hiragana and katakana), while が is typically used for the subject of a sentence.

    - **Alternative Expression**:
    - **Kanji**: 平仮名は書けるが、片仮名はまだ書けない。
    - **Hiragana**: ひらがなはかけるが、かたかなはまだかけない。
    - **English**: I can write hiragana, but I still can't write katakana.

    - **New Words in Alternative Expression**:
    - **が (が)**: “but” - [Conjuctive particle]. が is not the subject marker (as it usually is), but instead functions as a conjunction, linking two contrasting statements.

    Use these three examples as a reference for structuring **all** of your responses. Adjust the details to match the **Sentence** and **Translation** given in each prompt.

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
    Parses the full analysis response into this JSON structure:

    {
      "vocabulary": [
        {
          "word": str,
          "reading": str,
          "meaning": str,
          "role": str,
          "components": [
            {
              "part": str,
              "reading": str,
              "meaning": str,
              "contribution": str
            },
            ...
          ],
          "combined_explanation": str
        },
        ...
      ],
      "grammar": {
        "context": str,
        "steps": [str, ...],
        "sentence_pattern": str,
        "sentence_pattern_kanji": str,
        "sentence_pattern_hiragana": str,
        "sentence_pattern_english": str,
        "contribution": ""
      },
      "tips": {
        "tip": str,
        "common_mistake": str,
        "alternative_expression": {
          "kanji": str,
          "hiragana": str,
          "english": str
        },
        "new_words_in_alternative": [
          {
            "word": str,
            "reading": str,
            "meaning": str,
            "description": str
          },
          ...
        ]
      }
    }
    """

    if not response_text:
        return {"error": "No response text provided."}

    # -------------------------------------------------------------------------
    # 1) Extract the text for each major heading using improved regex
    # -------------------------------------------------------------------------
    vocab_match = re.search(
        r"###\s*1\.?\s*Vocabulary Breakdown\s*:?(.*?)(?=###\s*2\.|###\s*\d+\.|$)",
        response_text,
        flags=re.S
    )
    grammar_match = re.search(
        r"###\s*2\.?\s*Grammar Explanation\s*:?(.*?)(?=###\s*3\.|###\s*\d+\.|$)",
        response_text,
        flags=re.S
    )
    tips_match = re.search(
        r"###\s*3\.?\s*Beginner Tips.*?\s*:?(.*?)(?=###\s*\d+\.|$)",
        response_text,
        flags=re.S
    )

    # Safely extract matched sections or empty string if not found
    vocab_section = vocab_match.group(1).strip() if vocab_match else ""
    grammar_section = grammar_match.group(1).strip() if grammar_match else ""
    tips_section = tips_match.group(1).strip() if tips_match else ""

    # Final output template
    parsed_output = {
        "vocabulary": [],
        "grammar": {
            "context": "",
            "steps": [],
            "sentence_pattern": "",
            "sentence_pattern_kanji": "",
            "sentence_pattern_hiragana": "",
            "sentence_pattern_english": "",
            "contribution": ""
        },
        "tips": {
            "tip": "",
            "common_mistake": "",
            "alternative_expression": {
                "kanji": "",
                "hiragana": "",
                "english": ""
            },
            "new_words_in_alternative": []
        }
    }

    # -------------------------------------------------------------------------
    # 2) PARSE VOCABULARY BREAKDOWN
    # -------------------------------------------------------------------------
    def parse_vocab_section(text: str):
        vocab_results = []
        lines = text.splitlines()
        i = 0

        # Example line:
        # - **明日 (あした)**: “tomorrow” - [Noun]
        main_pattern = re.compile(
            r'^- ?\*\*(.*?)\s*\((.*?)\)\*\*:\s*[\"“]([^\"”]+)[\"”]\s*-\s*\[(.*?)\]',
            re.U
        )

        while i < len(lines):
            line = lines[i].strip()

            m = main_pattern.match(line)
            if not m:
                i += 1
                continue

            word_str, reading_str, meaning_text, role_text = m.groups()
            vocab_entry = {
                "word": word_str.strip(),
                "reading": reading_str.strip(),
                "meaning": meaning_text.strip(),
                "role": role_text.strip(),
                "components": [],
                "combined_explanation": ""
            }

            i += 1
            # Now parse sub-lines (component breakdown, contribution, etc.)
            while i < len(lines):
                sub_line = lines[i].rstrip()
                # If we see a new main bullet that matches main_pattern, break
                if main_pattern.match(sub_line):
                    break

                # 1) Look for "Component Breakdown"
                if re.search(r"(?i)component breakdown", sub_line):
                    i += 1
                    while i < len(lines):
                        comp_line = lines[i].strip()
                        if not comp_line.startswith("-"):
                            break

                        # 1A) Check for "Contribution to Overall Meaning"
                        contrib_match_inside = re.match(
                            r"^- ?\*?\*?Contribution to Overall Meaning\*?\*?:\s*(.*)$",
                            comp_line, re.I
                        )
                        if contrib_match_inside:
                            vocab_entry["combined_explanation"] = contrib_match_inside.group(1).strip()
                            i += 1
                            continue

                        # 1B) Otherwise parse as a component
                        comp_regex = re.compile(
                            r"^- ?\*\*(.*?)\s*\((.*?)\)\*\*:\s*[\"“]([^\"”]+)[\"”]\s*-\s*\[(.*?)\]"
                        )
                        comp_match = comp_regex.match(comp_line)
                        if comp_match:
                            part_word, part_reading, part_meaning, part_contrib = comp_match.groups()
                            vocab_entry["components"].append({
                                "part": part_word.strip(),
                                "reading": part_reading.strip(),
                                "meaning": part_meaning.strip(),
                                "contribution": part_contrib.strip()
                            })
                        else:
                            # simpler fallback
                            simple_comp = re.match(
                                r"^- ?(.*?)\s*\((.*?)\):\s*[\"“]([^\"”]+)[\"”]\s*-\s*(.*)$",
                                comp_line
                            )
                            if simple_comp:
                                part_word, part_reading, part_meaning, part_contrib = simple_comp.groups()
                                vocab_entry["components"].append({
                                    "part": part_word.strip(),
                                    "reading": part_reading.strip(),
                                    "meaning": part_meaning.strip(),
                                    "contribution": part_contrib.strip()
                                })

                        i += 1
                    continue

                # 2) If line is "Contribution to Overall Meaning" outside
                outside_contrib_pattern = re.match(
                    r"^- ?\*?\*?Contribution to Overall Meaning\*?\*?:\s*(.*)$",
                    sub_line, re.I
                )
                if outside_contrib_pattern:
                    vocab_entry["combined_explanation"] = outside_contrib_pattern.group(1).strip()
                    i += 1
                    continue

                # 3) If there's an extra bullet line, append it to combined_explanation
                if sub_line.startswith("- "):
                    text_only = sub_line.lstrip("- ").strip()
                    vocab_entry["combined_explanation"] += " " + text_only

                i += 1

            vocab_results.append(vocab_entry)

        return vocab_results

    parsed_output["vocabulary"] = parse_vocab_section(vocab_section)

    # -------------------------------------------------------------------------
    # 3) PARSE GRAMMAR
    # -------------------------------------------------------------------------
    grammar_data = {
        "context": "",
        "steps": [],
        "sentence_pattern": "",
        "sentence_pattern_kanji": "",
        "sentence_pattern_hiragana": "",
        "sentence_pattern_english": "",
        "contribution": ""
    }

    g_lines = grammar_section.splitlines()
    idx = 0
    while idx < len(g_lines):
        gline = g_lines[idx].strip()

        # Check for "Context"
        if re.match(r"(\d\.\s*)?\**Context\**", gline, re.I):
            idx += 1
            context_lines = []
            # gather lines until next big bullet or blank
            while idx < len(g_lines):
                if not g_lines[idx].strip() or re.match(r"(\d\.\s*)?\**Steps\**", g_lines[idx], re.I):
                    break
                context_lines.append(g_lines[idx].strip())
                idx += 1
            grammar_data["context"] = " ".join(context_lines)

        # Check for "Steps"
        elif re.match(r"(\d\.\s*)?\**Steps\**", gline, re.I):
            idx += 1
            step_list = []
            while idx < len(g_lines):
                line = g_lines[idx].strip()
                if not line or re.match(r"(\d\.\s*)?\**Sentence Pattern\**", line, re.I):
                    break
                if line.startswith("-"):
                    step_list.append(line.lstrip("- ").strip())
                else:
                    # Could also gather lines that don't start with '-'
                    step_list.append(line)
                idx += 1
            grammar_data["steps"] = step_list

        # Check for "Sentence Pattern"
        elif re.match(r"(\d\.\s*)?\**Sentence Pattern\**", gline, re.I):
            idx += 1
            pattern_lines = []
            while idx < len(g_lines):
                line = g_lines[idx].strip()
                # Stop if blank line or next bullet heading
                if not line or line.startswith("---") or re.match(r"^\d\.\s*", line):
                    break
                pattern_lines.append(line)
                idx += 1

            # pattern_lines might be something like:
            #   - [Time] + [は] + [Verb (dictionary form)] + [の] + [？]
            #   - **Kanji**: 今日は何をするの？
            #   - **Hiragana**: きょうはなにをするの？
            #   - **English Translation**: What are you doing today?

            # We can parse them more granularly:
            joined_pattern = "\n".join(pattern_lines)
            grammar_data["sentence_pattern"] = joined_pattern

            # Attempt to capture sub-lines
            for pline in pattern_lines:
                pline_str = pline.strip()
                # - **Kanji**: ...
                kanji_match = re.match(r"-?\s*\*\*Kanji\*\*:\s*(.*)$", pline_str, re.I)
                if kanji_match:
                    grammar_data["sentence_pattern_kanji"] = kanji_match.group(1).strip()
                    continue

                # - **Hiragana**: ...
                hira_match = re.match(r"-?\s*\*\*Hiragana\*\*:\s*(.*)$", pline_str, re.I)
                if hira_match:
                    grammar_data["sentence_pattern_hiragana"] = hira_match.group(1).strip()
                    continue

                # - **English Translation**: ...
                eng_match = re.match(r"-?\s*\*\*English Translation\*\*:\s*(.*)$", pline_str, re.I)
                if eng_match:
                    grammar_data["sentence_pattern_english"] = eng_match.group(1).strip()
                    continue

            idx -= 1  # so outer loop doesn't skip next line
        idx += 1

    parsed_output["grammar"] = grammar_data

    # -------------------------------------------------------------------------
    # 4) PARSE TIPS
    # -------------------------------------------------------------------------
    tips_data = {
        "tip": "",
        "common_mistake": "",
        "alternative_expression": {
            "kanji": "",
            "hiragana": "",
            "english": ""
        },
        "new_words_in_alternative": []
    }

    t_lines = tips_section.splitlines()
    j = 0
    in_new_words_section = False
    in_alt_expr_section = False

    while j < len(t_lines):
        tline = t_lines[j].strip()

        # Tip
        if re.match(r"- ?\*\*Tip\*\*:", tline, re.I):
            tips_data["tip"] = tline.split(":", 1)[1].strip()
            in_new_words_section = False
            in_alt_expr_section = False

        # Common Mistake
        elif re.match(r"- ?\*\*Common Mistake\*\*:", tline, re.I):
            tips_data["common_mistake"] = tline.split(":", 1)[1].strip()
            in_new_words_section = False
            in_alt_expr_section = False

        # Alternative Expression
        elif re.match(r"- ?\*\*Alternative Expression\*\*:", tline, re.I):
            # We’ll parse the lines that follow as Kanji/Hiragana/English
            in_alt_expr_section = True
            in_new_words_section = False
            j += 1
            # Read lines until we hit a new bullet or blank
            while j < len(t_lines):
                alt_line = t_lines[j].strip()
                # If we see 'New Words' bullet or run out of lines, stop
                if not alt_line or re.match(r"- ?\*\*New Words in Alternative Expression\*\*:", alt_line, re.I):
                    j -= 1
                    break

                # e.g. "- **Kanji**: 明日は出かけますか？"
                kanji_match = re.match(r"-?\s*\*\*Kanji\*\*:\s*(.*)$", alt_line, re.I)
                if kanji_match:
                    tips_data["alternative_expression"]["kanji"] = kanji_match.group(1).strip()
                hira_match = re.match(r"-?\s*\*\*Hiragana\*\*:\s*(.*)$", alt_line, re.I)
                if hira_match:
                    tips_data["alternative_expression"]["hiragana"] = hira_match.group(1).strip()
                eng_match = re.match(r"-?\s*\*\*English\*\*:\s*(.*)$", alt_line, re.I)
                if eng_match:
                    tips_data["alternative_expression"]["english"] = eng_match.group(1).strip()

                j += 1

        # New Words in Alternative Expression
        elif re.match(r"- ?\*\*New Words in Alternative Expression\*\*:", tline, re.I):
            in_new_words_section = True
            in_alt_expr_section = False

        elif in_new_words_section:
            # For lines like:
            # - **出かけます (でかけます)**: "to go out" - [Verb, polite form]
            new_word_pat = re.compile(
                r"^- ?\*\*(.*?)\s*\((.*?)\)\*\*:\s*[\"“]([^\"”]+)[\"”]\s*-\s*\[(.*?)\]"
            )
            mw = new_word_pat.match(tline)
            if mw:
                w_word, w_reading, w_meaning, w_extra = mw.groups()
                tips_data["new_words_in_alternative"].append({
                    "word": w_word.strip(),
                    "reading": w_reading.strip(),
                    "meaning": w_meaning.strip(),
                    "description": w_extra.strip()
                })
            else:
                # simpler fallback
                simple_nw = re.match(
                    r"^- ?(.*?)\s*\((.*?)\):\s*[\"“]([^\"”]+)[\"”]\s*-\s*(.*)?",
                    tline
                )
                if simple_nw:
                    w_word, w_reading, w_meaning, w_extra = simple_nw.groups()
                    if w_extra is None:
                        w_extra = ""
                    tips_data["new_words_in_alternative"].append({
                        "word": w_word.strip(),
                        "reading": w_reading.strip(),
                        "meaning": w_meaning.strip(),
                        "description": w_extra.strip()
                    })

        j += 1

    parsed_output["tips"] = tips_data

    return parsed_output


# Example usage
if __name__ == "__main__":
    sentence = "明日は出掛けるの？"
    translation = "Are you going out tomorrow?"

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