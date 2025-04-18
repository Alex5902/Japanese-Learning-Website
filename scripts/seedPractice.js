/* scripts/seedPractice.js  –  CommonJS version */
const fs   = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { v4: uuidv4 } = require("uuid");
const { Client } = require("pg");
require("dotenv").config();           // loads .env

/** -----------------------------------------------------------
 * 1) Point to your CSV 
 * ---------------------------------------------------------- */
const csvPath = path.join(
  __dirname,               // …/scripts
  "..",                    // project root
  "practice_preprocessing",
  "fill_gap_questions.csv" // <‑‑ the file you showed me
);

// Quick existence check
if (!fs.existsSync(csvPath)) {
  console.error(`❌ CSV not found at: ${csvPath}`);
  process.exit(1);
}

/** -----------------------------------------------------------
 * 2) Parse CSV  (columns must match header row)
 * ---------------------------------------------------------- */
const csvContent = fs.readFileSync(csvPath, "utf8");
const rows = parse(csvContent, { columns: true, skip_empty_lines: true });

/** -----------------------------------------------------------
 * 3) Connect to Postgres
 * ---------------------------------------------------------- */
const client = new Client({
  connectionString: process.env.DATABASE_URL, // set in .env
});
client.connect().catch((err) => {
  console.error("❌  DB connection failed:", err);
  process.exit(1);
});

/** -----------------------------------------------------------
 * 4) Seed rows
 * ---------------------------------------------------------- */
(async () => {
  try {
    for (const r of rows) {
      // Generate an id if the CSV doesn’t have one
      const practice_id = r.practice_id || uuidv4();

      await client.query(
        `INSERT INTO Practice
           (practice_id, flashcard_id, type, question, answer, english)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (practice_id) DO NOTHING`,
        [
          practice_id,
          r.flashcard_id,
          "fill_gap",      // type is fixed for now
          r.question,
          r.answer,
          r.english,
        ]
      );
    }

    console.log(`✅  Inserted/ignored ${rows.length} practice rows`);
  } catch (err) {
    console.error("❌  Seeding failed:", err);
  } finally {
    await client.end();
  }
})();
