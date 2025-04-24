/* scripts/seedPractice.js  –  CommonJS-ish with ES module loader */
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
/* 1) Load CSV                                                    */
/* ────────────────────────────────────────────────────────────── */
const CSV_PATH = join(
  __dirname, "..", "practice_preprocessing", "fill_gap_with_readings.csv"
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
/* 2) Connect to Postgres                                         */
/* ────────────────────────────────────────────────────────────── */
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

/* ────────────────────────────────────────────────────────────── */
/* 3) Seed                                                        */
/* ────────────────────────────────────────────────────────────── */
let processed = 0;

for (const r of rows) {
  // normalise JSON → '{}' when empty
  const breakdown = r.analysis_json?.trim() || "{}";

  /* ---------- try UPDATE first -------------------------------- */
  const updateRes = await client.query(
    `
    UPDATE "practice"
       SET breakdown        = CASE
                                WHEN (breakdown IS NULL OR breakdown = '{}'::jsonb)
                                  AND $1::jsonb <> '{}'::jsonb
                                THEN $1::jsonb
                                ELSE breakdown
                              END,
           question_reading = COALESCE(question_reading, $2),
           answer_reading   = COALESCE(answer_reading  , $3)
     WHERE flashcard_id = $4
       AND question     = $5
    `,
    [
      breakdown,              // $1
      r.question_reading,     // $2
      r.answer_reading,       // $3
      r.flashcard_id,         // $4
      r.question              // $5
    ]
  );

  /* ---------- if no row updated → INSERT ---------------------- */
  if (updateRes.rowCount === 0) {
    await client.query(
      `
      INSERT INTO "practice"
        (practice_id, flashcard_id, type,
         question, answer, english,
         question_reading, answer_reading, breakdown)
      VALUES ($1,$2,'fill_gap',
              $3,$4,$5,
              $6,$7,$8::jsonb)
      `,
      [
        uuidv4(),               // $1
        r.flashcard_id,         // $2
        r.question,             // $3
        r.answer,               // $4
        r.english,              // $5
        r.question_reading,     // $6
        r.answer_reading,       // $7
        breakdown               // $8
      ]
    );
  }

  processed++;
}

console.log(`✅  Seeded / updated ${processed} practice rows`);
await client.end();
