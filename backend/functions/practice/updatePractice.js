const { Client } = require('pg');
require('dotenv').config();

/**
 * POST  /practice/update
 * ----------------------
 * body = {
 *   user_id     : string | null   // guests → null   (still passed, may use later)
 *   practice_id : string          // uuid of the question
 *   correct     : boolean         // whether the answer was right
 * }
 */
exports.handler = async (event) => {
  /* ────── basic request checks ────── */
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad JSON in body' }) };
  }

  const { practice_id, correct } = body;
  if (!practice_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'practice_id required' }) };
  }

  /* ────── open PG connection ────── */
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  /* Counters to add with this submission */
  const incCorrect   =  correct ? 1 : 0;
  const incIncorrect = !correct ? 1 : 0;

  try {
    /*  If the row already exists for this practice_id, add the new counts.
        Otherwise create it with level = 0 and the current counts.
        ────────────────────────────────────────────────────────────── */
    await client.query(
      `
      INSERT INTO UserPractice
             (id,                  practice_id, level,
              correct_count, incorrect_count, accuracy, next_review)
      VALUES (uuid_generate_v4(), $1,          0,
              $2,             $3,             ROUND($2::numeric * 100 / NULLIF($2+$3,0)), NULL)
      ON CONFLICT (practice_id) DO UPDATE
        SET correct_count   = UserPractice.correct_count   + EXCLUDED.correct_count,
            incorrect_count = UserPractice.incorrect_count + EXCLUDED.incorrect_count,
            /* accuracy = correct / total (stored as integer %) */
            accuracy        = ROUND(
                                (UserPractice.correct_count   + EXCLUDED.correct_count)::numeric
                                * 100 /
                                (UserPractice.correct_count   + EXCLUDED.correct_count +
                                 UserPractice.incorrect_count + EXCLUDED.incorrect_count)
                              );
      `,
      [practice_id, incCorrect, incIncorrect]
    );

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('[practice/update]', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  } finally {
    await client.end();
  }
};
