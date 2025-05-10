// backend/functions/practice/fetchPractice.js
const { Client } = require("pg");
const kuromoji = require("kuromoji");
const wanakana = require("wanakana"); // To convert Katakana readings to Hiragana
require("dotenv").config();
const path = require("path");

// --- Kuromoji Builder ---
// Initialize the builder once - builds the dictionary.
// This might take a few seconds the first time a Lambda instance starts.
let tokenizer = null;
const kuromojiBuilder = kuromoji.builder({
    // Adjust path based on where node_modules/kuromoji/dict is relative to this file
    // This path might need tweaking depending on your deployment structure.
    dicPath: path.join(__dirname, "..", "..", "..", "node_modules", "kuromoji", "dict")
});

// Function to ensure tokenizer is ready
function getTokenizer() {
    return new Promise((resolve, reject) => {
        if (tokenizer) {
            console.log("Kuromoji: Using existing tokenizer."); // Add log
            return resolve(tokenizer);
        }
        console.log("Kuromoji: Building tokenizer..."); // Add log
        kuromojiBuilder.build((err, builtTokenizer) => {
            if (err) {
                console.error("Kuromoji Build Error:", err); // Critical log
                return reject(err); // This reject is important
            }
            tokenizer = builtTokenizer;
            console.log("Kuromoji tokenizer built successfully.");
            resolve(tokenizer);
        });
    });
}

// --- Helper to generate structured reading ---
async function generateStructuredReading(questionText) {
    console.log("generateStructuredReading called for:", questionText);
    if (!questionText) return "";
    try {
        const tokenizerInstance = await getTokenizer();
        if (!tokenizerInstance) { // Add this check
            console.error("generateStructuredReading: Tokenizer instance is null/undefined. Falling back.");
            return questionText;
        }
        const tokens = tokenizerInstance.tokenize(questionText);
        console.log(`Tokens for "${questionText}":`, JSON.stringify(tokens, null, 2));
        let structuredReading = "";

        for (const token of tokens) {
            // Check if the token is Kanji and has a reading
            const isKanji = /[\u4E00-\u9FFF々]/.test(token.surface_form);
            const hasReading = token.reading && token.reading !== '*'; // Kuromoji uses '*' for unknown readings

            if (isKanji && hasReading) {
                // Convert Katakana reading to Hiragana
                const hiraganaReading = wanakana.toHiragana(token.reading);
                // Append in Base[Reading] format only if reading differs from surface form
                if (token.surface_form !== hiraganaReading) {
                    structuredReading += `${token.surface_form}[${hiraganaReading}]`;
                } else {
                     structuredReading += token.surface_form; // Append Kanji if reading is the same (rare)
                }
            } else {
                // Append non-Kanji tokens directly
                structuredReading += token.surface_form;
            }
        }
        return structuredReading;
    } catch (error) {
        console.error(`Error generating structured reading for "${questionText}":`, error);
        return questionText; // Fallback to original text on error
    }
}


// --- Lambda Handler ---
exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || "{}");
    } catch {
        return { statusCode: 400, body: JSON.stringify({ error: "Bad JSON" }) };
    }

    const { user_id = null } = body;
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        // ssl: { rejectUnauthorized: false } // Uncomment if needed for Render/etc.
    });

    try {
        await client.connect();

        // --- DB Query (Keep your existing query) ---
        const query = `
          WITH due_flashcards AS (
            SELECT uf.flashcard_id
            FROM UserFlashcards uf
            WHERE uf.user_id = $1 AND uf.next_review <= NOW()
          ),
          unanswered_practice_flashcards AS (
            SELECT DISTINCT p.flashcard_id
            FROM Practice p
            WHERE NOT EXISTS (
              SELECT 1 FROM UserPractice up
              WHERE up.user_id = $1 AND up.practice_id = p.practice_id
            )
          ),
          flashcards_to_practice AS (
            SELECT flashcard_id FROM due_flashcards
            INTERSECT
            SELECT flashcard_id FROM unanswered_practice_flashcards
          )
          SELECT
            P.practice_id, P.flashcard_id, F.type AS flashcard_type,
            F.content AS flashcard_content, P.question, P.answer,
            P.english, P.breakdown,
            P.question_reading, P.answer_reading -- Keep original readings if needed elsewhere
          FROM flashcards_to_practice ftp
          CROSS JOIN LATERAL (
            SELECT * FROM Practice pr
            WHERE pr.flashcard_id = ftp.flashcard_id AND NOT EXISTS (
              SELECT 1 FROM UserPractice up_check
              WHERE up_check.user_id = $1 AND up_check.practice_id = pr.practice_id
            )
            ORDER BY RANDOM() LIMIT 1
          ) AS P
          JOIN Flashcards F ON F.flashcard_id = P.flashcard_id
        `; // Removed LIMIT 10 for testing, add back if needed

        const { rows } = await client.query(query, [user_id]);

        // --- Response Mapping with Structured Reading ---
        const practicePromises = rows.map(async (r) => { // Make map async
            const safeParseJson = (jsonStringOrObject) => { /* ... same as before ... */
                if (!jsonStringOrObject) return null;
                if (typeof jsonStringOrObject === 'object') return jsonStringOrObject;
                try { return JSON.parse(jsonStringOrObject); }
                catch (e) { console.error("Backend JSON Parse Error:", e); return null; }
            };

            // Generate the structured reading string using Kuromoji
            const structuredReading = await generateStructuredReading(r.question); // Await the helper

            return {
                practice_id: r.practice_id,
                flashcard_id: r.flashcard_id,
                question: r.question,
                answer: r.answer,
                english: r.english,
                // Send the NEW structured reading for furigana rendering
                question_reading_structured: structuredReading,
                // Keep original flat reading if needed for other purposes (optional)
                // question_reading_flat: r.question_reading,
                answer_reading: r.answer_reading, // Keep this as is for now
                type: r.flashcard_type,
                content: safeParseJson(r.flashcard_content),
                breakdown: safeParseJson(r.breakdown)
            };
        });

        // Wait for all structured readings to be generated
        const practice = await Promise.all(practicePromises);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ practice }),
        };
    } catch (err) {
        console.error("[practice/get] Error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error", details: err.message }),
        };
    } finally {
        await client.end();
    }
};