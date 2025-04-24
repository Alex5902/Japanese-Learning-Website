/* scripts/seedPractice.js  –  CommonJS-ish with ES module loader */
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const fs         = require("fs");
const { parse }  = require("csv-parse/sync");
const { v4: uuidv4 } = require("uuid");
const { Client } = require("pg");
require("dotenv").config();

(async () => {
  // 1) Load CSV
  const csvPath = join(__dirname, "..", "practice_preprocessing", "fill_gap_breakdown.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV not found at ${csvPath}`);
    process.exit(1);
  }
  const rows = parse(fs.readFileSync(csvPath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  });

  // 2) Connect
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let count = 0;
  for (const r of rows) {
    const raw = (r.analysis_json || "").trim();
    if (!raw) continue;              // nothing to seed
    count++;

    // 3a) Try updating an existing row
    const upd = await client.query(
      `UPDATE Practice
         SET breakdown = $1
       WHERE flashcard_id = $2
         AND question     = $3
         AND (breakdown IS NULL OR breakdown = '{}'::jsonb)
      `,
      [raw, r.flashcard_id, r.question]
    );

    if (upd.rowCount === 0) {
      // 3b) No existing row updated → insert a fresh one
      const practice_id = uuidv4();
      await client.query(
        `INSERT INTO Practice
           (practice_id, flashcard_id, type, question, answer, english, breakdown)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          practice_id,
          r.flashcard_id,
          "fill_gap",
          r.question,
          r.answer,
          r.english,
          raw,
        ]
      );
    }
  }

  console.log(`✅ Seeded ${count} breakdowns`);
  await client.end();
})();
