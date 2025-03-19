const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const csv = require("csv-parser");
require("dotenv").config();

// Database Connection
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Function to safely parse JSON strings
function safeParseJSON(jsonString) {
  if (!jsonString) return {};
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("❌ Invalid JSON format:", jsonString);
    return {}; 
  }
}

async function seedLessonFile(lessonFilePath) {
  return new Promise((resolve, reject) => {
    console.log("📥 Reading CSV file:", lessonFilePath);
    const records = [];

    fs.createReadStream(lessonFilePath)
      .pipe(csv())
      .on("data", (row) => {
        if (!row["type"] || !row["Lesson"]) {
          console.warn("⚠️ Skipping row missing 'type' or 'Lesson':", row);
          return;
        }

        const type = row["type"].trim().toLowerCase();
        if (type === "kanji") {
          if (!row["Kanji"] || !row["Meaning"]) {
            console.warn("⚠️ Skipping incomplete kanji row:", row);
            return;
          }
        } else {
          if (!row["Word"] || !row["Meaning"]) {
            console.warn("⚠️ Skipping incomplete vocab/grammar row:", row);
            return;
          }
        }

        records.push(row);
      })
      .on("end", async () => {
        if (records.length === 0) {
          console.log(`📭 No valid rows found in '${lessonFilePath}'.`);
          resolve();
          return;
        }

        // Shuffle records
        for (let i = records.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [records[i], records[j]] = [records[j], records[i]];
        }

        let insertedCount = 0;
        try {
          for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const type = row["type"].trim().toLowerCase();
            const lesson = parseInt(row["Lesson"], 10);
            const sequence = i + 1; // 1-based index after shuffle

            let jlpt = row["JLPT"] ? row["JLPT"].trim() : "";
            if (!jlpt && row["JLPT Level"]) {
              jlpt = row["JLPT Level"].trim();
            }

            let content = {};
            if (type === "kanji") {
              const kanji = row["Kanji"].trim();
              const meaning = row["Meaning"].trim();
              const onyomi = row["Onyomi"] ? row["Onyomi"].trim() : "";
              const kunyomi = row["Kunyomi"] ? row["Kunyomi"].trim() : "";
              
              // 🔥 Ensure "Example Words" column is correctly read
              let exampleWords = row["Example Words"] || row["Example words"] || row["example_words"] || "";
              exampleWords = exampleWords.trim();

              // 🔥 Convert example words into an array for better storage
              const exampleWordsArray = exampleWords.length > 0 ? exampleWords.split(";").map(w => w.trim()) : [];

              content = { kanji, meaning, onyomi, kunyomi, example_words: exampleWordsArray };

              console.log(`📝 Kanji: ${kanji}, Example Words:`, exampleWordsArray); // Debugging
            } else {
              const word = row["Word"].trim();
              const meaning = row["Meaning"].trim();
              const reading = row["Reading"] ? row["Reading"].trim() : "";
              const exampleJP = row["Example Sentence JP"] || "";
              const exampleEN = row["Example Sentence EN"] || "";
              const breakdown = safeParseJSON(row["breakdown"] || "{}");

              content = {
                word,
                reading,
                meaning,
                example_sentence: {
                  jp: exampleJP,
                  en: exampleEN,
                },
                breakdown,
              };
            }

            const audio_urls = {};

            // 🔥 Debug: Log full JSON content before inserting
            console.log("🔍 Inserting:", JSON.stringify(content, null, 2));

            // Insert query with ON CONFLICT (lesson, sequence) DO NOTHING
            const query = `
              INSERT INTO Flashcards 
                (flashcard_id, type, content, jlpt_level, audio_urls, lesson, sequence)
              VALUES
                (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
              ON CONFLICT (lesson, sequence) DO NOTHING
            `;

            await pool.query(query, [
              type,
              JSON.stringify(content),
              jlpt,
              JSON.stringify(audio_urls),
              lesson,
              sequence,
            ]);

            insertedCount++;
          }

          console.log(`✅ Inserted ${insertedCount} rows from '${lessonFilePath}'.`);
          resolve();
        } catch (error) {
          console.error(`❌ Error inserting rows from '${lessonFilePath}':`, error);
          reject(error);
        }
      })
      .on("error", (err) => {
        console.error(`❌ Error reading '${lessonFilePath}':`, err);
        reject(err);
      });
  });
}

async function seedAllLessons() {
  try {
    console.log("🚀 Starting database seeding from lesson CSV files...");

    const lessonsDir = path.join(__dirname, "../", "flashcard_preprocessing", "lesson_selection", "lessons");
    if (!fs.existsSync(lessonsDir)) {
      console.error(`❌ The lessons folder does not exist: '${lessonsDir}'`);
      process.exit(1);
    }

    const csvFiles = fs.readdirSync(lessonsDir).filter((fname) => fname.toLowerCase().endsWith(".csv"));

    if (csvFiles.length === 0) {
      console.log("📭 No lesson CSV files found in:", lessonsDir);
      return;
    }

    for (const file of csvFiles) {
      const filePath = path.join(lessonsDir, file);
      await seedLessonFile(filePath);
    }

    console.log("🎉 All lesson CSV files have been processed. Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding lessons:", error);
    process.exit(1);
  }
}

seedAllLessons();
