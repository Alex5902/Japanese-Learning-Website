// backend/functions/practice/updatePractice.js
const { Client }     = require("pg");
const { v4: uuidv4 } = require("uuid");
const { getNextReviewDateAndLevel } = require("../../utils/srs");
require("dotenv").config();

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Bad JSON in body" }) };
  }

  const { user_id, practice_id, correct } = body;
  if (!practice_id || !user_id || typeof correct !== "boolean") {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid parameters" }) };
  }

  // 1) Connect
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // 2) Look up the current level (if any)
    const priorRes = await client.query(
      `SELECT level FROM UserPractice WHERE user_id = $1 AND practice_id = $2`,
      [user_id, practice_id]
    );
    const currentLevel = priorRes.rows.length ? priorRes.rows[0].level : 0;

    // 3) Compute new SRS level + next review timestamp
    const { newLevel, nextReview } = getNextReviewDateAndLevel(
      currentLevel,
      correct,
      "UTC"
    );

    // 4) Increment correct/incorrect counts
    const incCorrect   = correct ? 1 : 0;
    const incIncorrect = correct ? 0 : 1;

    // 5) Upsert with updated level & next_review
    await client.query(
      `
      INSERT INTO UserPractice (
        id,
        user_id,
        practice_id,
        level,
        correct_count,
        incorrect_count,
        accuracy,
        next_review
      )
      VALUES (
        $1::uuid, $2::uuid, $3::uuid,
        $4::int,
        $5::int, $6::int,
        -- accuracy over the new single attempt
        CASE WHEN ($5 + $6) > 0
             THEN ROUND($5::numeric * 100 / ($5 + $6))
             ELSE 0
        END,
        $7::timestamptz
      )
      ON CONFLICT (user_id, practice_id) DO UPDATE
        SET
          correct_count   = UserPractice.correct_count   + EXCLUDED.correct_count,
          incorrect_count = UserPractice.incorrect_count + EXCLUDED.incorrect_count,
          level           = EXCLUDED.level,
          next_review     = EXCLUDED.next_review,
          accuracy = CASE
            WHEN (UserPractice.correct_count   + EXCLUDED.correct_count
                  + UserPractice.incorrect_count + EXCLUDED.incorrect_count
                 ) > 0
            THEN ROUND(
              (UserPractice.correct_count   + EXCLUDED.correct_count)::numeric
              * 100 /
              (UserPractice.correct_count   + EXCLUDED.correct_count
               + UserPractice.incorrect_count + EXCLUDED.incorrect_count)
            )
            ELSE 0
          END
      `,
      [
        uuidv4(),
        user_id,
        practice_id,
        newLevel,     // ← bump’d by your SRS logic
        incCorrect,
        incIncorrect,
        nextReview    // ← timestamp from your SRS file
      ]
    );

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("[practice/update]", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
  } finally {
    await client.end();
  }
};
