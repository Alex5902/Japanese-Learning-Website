// backend/functions/practice/updatePractice.js
const { Client }    = require("pg");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

/**
 * POST /practice/update
 *
 * body = {
 *   user_id     : string,   // UUID of the user
 *   practice_id : string,   // UUID of the practice item
 *   correct     : boolean   // true if the user was correct
 * }
 */
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
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing or invalid parameters" }),
    };
  }

  // Prepare the two increments
  const incCorrect   = correct   ? 1 : 0;
  const incIncorrect = correct   ? 0 : 1;

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
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
        $1::uuid,
        $2::uuid,
        $3::uuid,
        0,
        $4::int,
        $5::int,
        /* initial accuracy = 100% if correct, 0% if incorrect */
        CASE WHEN $4::int + $5::int > 0
             THEN ROUND( $4::numeric * 100 / ($4 + $5) )
             ELSE 0
        END,
        NULL
      )
      ON CONFLICT (user_id, practice_id) DO UPDATE
        SET
          correct_count   = UserPractice.correct_count   + EXCLUDED.correct_count,
          incorrect_count = UserPractice.incorrect_count + EXCLUDED.incorrect_count,
          accuracy        = CASE
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
        uuidv4(),      // new id
        user_id,
        practice_id,
        incCorrect,
        incIncorrect,
      ]
    );

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("[practice/update]", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  } finally {
    await client.end();
  }
};
