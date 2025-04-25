/* scripts/seedPractice.js – fully reset & reseed `practice` table  */
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";
const require      = createRequire(import.meta.url);
const __filename   = fileURLToPath(import.meta.url);
const __dirname    = dirname(__filename);

const fs           = require("fs");
const { parse }    = require("csv-parse/sync");
const { v4: uuidv4 } = require("uuid");
const { Client }   = require("pg");
require("dotenv").config();

/* ────────────────────────────────────────────────────────────── */
/* 1) Load CSV                                                   */
/* ────────────────────────────────────────────────────────────── */
const CSV_PATH = join(
  __dirname,
  "..",
  "practice_preprocessing",
  "fill_gap_with_readings.csv"
);
if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌  CSV not found at ${CSV_PATH}`);
  process.exit(1);
}

const rows = parse(fs.readFileSync(CSV_PATH, "utf8"), {
  columns: true,
  skip_empty_lines: true,
});

/* ────────────────────────────────────────────────────────────── */
/* 2) Connect to Postgres                                        */
/* ────────────────────────────────────────────────────────────── */
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

/* ────────────────────────────────────────────────────────────── */
/* 3) Nuke & reseed                                              */
/* ────────────────────────────────────────────────────────────── */
try {
  console.warn("⚠️  TRUNCATING userpractice & practice …");
  await client.query("BEGIN");
  await client.query(
    `TRUNCATE TABLE userpractice, practice RESTART IDENTITY CASCADE;`
  );

  let inserted = 0;

  for (const r of rows) {
    await client.query(
      `
      INSERT INTO practice (
        practice_id,
        flashcard_id,
        type,
        question,
        answer,
        english,
        question_reading,
        answer_reading,
        breakdown
      ) VALUES (
        $1,                     -- practice_id
        $2,                     -- flashcard_id
        'fill_gap',             -- type
        $3, $4, $5,             -- question / answer / english
        $6, $7,                 -- question_reading / answer_reading
        $8::jsonb               -- breakdown
      );
      `,
      [
        uuidv4(),                             // $1
        r.flashcard_id.trim(),                // $2
        r.question.trim(),                    // $3
        r.answer.trim(),                      // $4
        r.english.trim(),                     // $5
        r.question_reading?.trim() || null,   // $6
        r.answer_reading?.trim()   || null,   // $7
        (r.analysis_json?.trim() || "{}"),    // $8
      ]
    );
    inserted++;
  }

  await client.query("COMMIT");
  console.log(`✅  Inserted ${inserted} practice rows`);
} catch (err) {
  console.error("❌  Seeding failed – rolled back.", err);
  await client.query("ROLLBACK");
  process.exit(1);
} finally {
  await client.end();
}
