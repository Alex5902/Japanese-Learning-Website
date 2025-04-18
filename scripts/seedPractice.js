/* scripts/seedPractice.js  –  CommonJS */
import { fileURLToPath } from "url";
import { dirname }       from "path";
import { createRequire } from "module";

// ────────────────────────────────────────────────────────────────
// re‑create CommonJS helpers
// ────────────────────────────────────────────────────────────────
const require   = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const fs  = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { v4: uuidv4 } = require("uuid");
const { Client } = require("pg");
require("dotenv").config();

/* 1) CSV location ------------------------------------------------------- */
const csvPath = path.join(
  __dirname, "..", "practice_preprocessing", "fill_gap_breakdown.csv"
);
if (!fs.existsSync(csvPath)) {
  console.error(`❌  CSV not found at: ${csvPath}`);
  process.exit(1);
}

/* 2) Parse CSV ---------------------------------------------------------- */
const rows = parse(fs.readFileSync(csvPath, "utf8"), {
  columns: true,
  skip_empty_lines: true,
});

/* 3) Connect to Postgres ----------------------------------------------- */
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect().catch((err) => {
  console.error("❌  DB connection failed:", err);
  process.exit(1);
});

/* 4) Seed --------------------------------------------------------------- */
(async () => {
  try {
    for (const r of rows) {
      const practice_id = r.practice_id || uuidv4();

      await client.query(
        `INSERT INTO Practice (
            practice_id, flashcard_id, type,
            question, answer, english, breakdown
         ) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (practice_id) DO UPDATE
           SET flashcard_id  = EXCLUDED.flashcard_id,
               question      = EXCLUDED.question,
               answer        = EXCLUDED.answer,
               english       = EXCLUDED.english,
               breakdown = EXCLUDED.breakdown`,
        [
          practice_id,
          r.flashcard_id,
          "fill_gap",
          r.question,
          r.answer,
          r.english,
          r.analysis_json || "{}",        // fallback if column empty
        ]
      );
    }

    console.log(`✅  Processed ${rows.length} practice rows`);
  } catch (err) {
    console.error("❌  Seeding failed:", err);
  } finally {
    await client.end();
  }
})();
