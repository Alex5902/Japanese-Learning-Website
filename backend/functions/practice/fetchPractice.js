/**
 *  POST /practice/get
 *  Body: { user_id: string|null, limit?: number }
 *
 *  ❶ FIRST  → flashcards the learner has already accepted into UserFlashcards
 *             but that do NOT yet exist in UserPractice → “fresh practice”.
 *  ❷ SECOND → normal SRS queue: existing rows in UserPractice whose
 *             next_review <= NOW()  (oldest first).
 *
 *  Guests still get random sentences.
 */
const { Client } = require("pg");
require("dotenv").config();

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Bad JSON" }) }; }

  const { user_id = null, limit = 10 } = body;

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // /* ---------- guests: just random sentences ---------- */
    // if (!user_id) {
    //   const { rows } = await client.query(
    //     `SELECT practice_id, flashcard_id,
    //             question, question_reading, answer, english
    //        FROM Practice
    //       ORDER BY RANDOM()
    //       LIMIT $1;`,
    //     [limit]
    //   );
    //   return ok(rows);
    // }

    /* ---------- 1) “fresh” sentences (not in UserPractice yet) ---------- */
    const { rows: fresh } = await client.query(
      `
      SELECT P.practice_id, P.flashcard_id,
             P.question, P.answer, P.english
        FROM Practice         P
        JOIN UserFlashcards   U ON U.flashcard_id = P.flashcard_id
   LEFT JOIN UserPractice     UP ON UP.practice_id = P.practice_id
                                 AND UP.user_id    = $1
       WHERE U.user_id = $1
         AND UP.practice_id IS NULL          -- ← never practised
       ORDER BY RANDOM()
       LIMIT $2;
      `,
      [user_id, limit]
    );

    if (fresh.length >= limit) return ok(fresh);

    /* ---------- 2) due sentences already in UserPractice ---------- */
    const remaining = limit - fresh.length;
    const { rows: due } = await client.query(
      `
        SELECT P.practice_id, P.flashcard_id,
          P.question, P.answer, P.english
        FROM UserPractice   UP
        JOIN Practice       P  ON P.practice_id = UP.practice_id
       WHERE UP.user_id    = $1
         AND (UP.next_review IS NULL OR UP.next_review <= NOW())
       ORDER BY UP.next_review NULLS FIRST, UP.incorrect_count DESC
       LIMIT $2;
      `,
      [user_id, remaining]
    );

    return ok([...fresh, ...due]);
  } catch (err) {
    console.error("[practice/get]", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
  } finally {
    await client.end();
  }

  /* helper */
  function ok(rows) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practice: rows }),
    };
  }
};
