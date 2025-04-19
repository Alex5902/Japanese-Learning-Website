// backend/functions/practice/fetchPractice.js
const { Client } = require("pg");
require("dotenv").config();

/**
 * POST /practice/get
 * Body: { user_id: string|null, limit?: number }
 *
 * ❶ FIRST  → fresh practice items (in UserFlashcards but not in UserPractice)
 * ❷ SECOND → due items from UserPractice (based on next_review)
 */
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

  const { user_id = null, limit = 10 } = body;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // 1) fresh
    const { rows: fresh } = await client.query(
      `
      SELECT
        P.practice_id,
        P.flashcard_id,
        F.type,
        F.content,
        P.question,
        P.answer,
        P.english,
        P.breakdown
      FROM Practice       P
      JOIN Flashcards     F ON F.flashcard_id = P.flashcard_id
      JOIN UserFlashcards U ON U.flashcard_id = P.flashcard_id
      LEFT JOIN UserPractice UP
        ON UP.practice_id = P.practice_id
        AND UP.user_id    = $1
      WHERE U.user_id = $1
        AND UP.practice_id IS NULL
      ORDER BY RANDOM()
      LIMIT $2
      `,
      [user_id, limit]
    );

    if (fresh.length >= limit) {
      return respond(fresh);
    }

    // 2) due
    const remaining = limit - fresh.length;
    const { rows: due } = await client.query(
      `
      SELECT
        P.practice_id,
        P.flashcard_id,
        F.type,
        F.content,
        P.question,
        P.answer,
        P.english,
        P.breakdown
      FROM UserPractice  UP
      JOIN Practice      P ON P.practice_id = UP.practice_id
      JOIN Flashcards    F ON F.flashcard_id = P.flashcard_id
      WHERE UP.user_id = $1
        AND (UP.next_review IS NULL OR UP.next_review <= NOW())
      ORDER BY UP.next_review NULLS FIRST, UP.incorrect_count DESC
      LIMIT $2
      `,
      [user_id, remaining]
    );

    return respond([...fresh, ...due]);
  } catch (err) {
    console.error("[practice/get]", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
  } finally {
    await client.end();
  }
};

function respond(rows) {
  // parse JSON columns
  const practice = rows.map(r => ({
    practice_id:  r.practice_id,
    flashcard_id: r.flashcard_id,
    question:     r.question,
    answer:       r.answer,
    english:      r.english,
    type:         r.type,
    content:      typeof r.content === 'string' ? JSON.parse(r.content) : r.content,
    breakdown: r.breakdown
      ? (typeof r.breakdown === 'string' ? JSON.parse(r.breakdown) : r.breakdown)
      : undefined
  }));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ practice }),
  };
}
