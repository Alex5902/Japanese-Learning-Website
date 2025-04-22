// backend/functions/practice/fetchPractice.js
const { Client } = require("pg");
require("dotenv").config();

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

  const { user_id = null } = body;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(
      `
      WITH due AS (
        SELECT f.flashcard_id
        FROM UserFlashcards f
        WHERE f.user_id = $1
          AND f.next_review <= NOW()
      ),
      unanswered AS (
        SELECT DISTINCT p.flashcard_id
        FROM Practice p
        WHERE NOT EXISTS (
          SELECT 1
          FROM UserPractice up
          WHERE up.user_id = $1
            AND up.practice_id = p.practice_id
        )
      ),
      todo AS (
        SELECT flashcard_id
        FROM due
        INTERSECT
        SELECT flashcard_id
        FROM unanswered
      )
      SELECT
        P.practice_id,
        P.flashcard_id,
        F.type,
        F.content,
        P.question,
        P.answer,
        P.english,
        P.breakdown
      FROM todo t
      CROSS JOIN LATERAL (
        SELECT *
        FROM Practice
        WHERE flashcard_id = t.flashcard_id
          AND NOT EXISTS (
            SELECT 1
            FROM UserPractice up
            WHERE up.user_id     = $1
              AND up.practice_id = Practice.practice_id
          )
        ORDER BY RANDOM()
        LIMIT 1
      ) AS P
      JOIN Flashcards F ON F.flashcard_id = P.flashcard_id
      `,
      [user_id]
    );

    // parse JSON columns and return
    const practice = rows.map(r => ({
      practice_id:  r.practice_id,
      flashcard_id: r.flashcard_id,
      question:     r.question,
      answer:       r.answer,
      english:      r.english,
      type:         r.type,
      content:      typeof r.content === 'string' ? JSON.parse(r.content) : r.content,
      breakdown:    r.breakdown
        ? (typeof r.breakdown === 'string'
             ? JSON.parse(r.breakdown)
             : r.breakdown)
        : undefined
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ practice }),
    };
  } catch (err) {
    console.error("[practice/get]", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
  } finally {
    await client.end();
  }
};
