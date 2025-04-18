const db = require("../../utils/db");
const { distance } = require("damerau-levenshtein");
const { getNextReviewDateAndLevel } = require("../../utils/srs");

// 1. Fetch new lesson flashcards (limit 15) while excluding learned ones, in ascending lesson + sequence
exports.fetchLessonFlashcards = async (event) => {
  console.log("Fetching lesson flashcards for:", event.body);

  const { user_id, lesson } = JSON.parse(event.body);

  try {
    if (!user_id) {
      // Guest user: Return first 15 flashcards of Lesson 1, no mastery check
      console.log("Guest user detected. Returning first 15 flashcards of Lesson 1.");
      const query = `
        SELECT * FROM Flashcards
        WHERE lesson = 1
        ORDER BY sequence ASC
        LIMIT 15
      `;
      const flashcards = await db.query(query);
      return {
        statusCode: 200,
        body: JSON.stringify({ flashcards: flashcards.rows }),
      };
    }

    if (lesson > 1) {
      const prevLesson = lesson - 1;
      const totalRes = await db.query(
        `SELECT COUNT(*) AS total FROM Flashcards WHERE lesson = $1`,
        [prevLesson]
      );
      const total = parseInt(totalRes.rows[0].total, 10);

      const masteredRes = await db.query(
        `SELECT COUNT(*) AS mastered 
         FROM UserFlashcards uf
         JOIN Flashcards f ON uf.flashcard_id = f.flashcard_id
         WHERE f.lesson = $1
           AND uf.user_id = $2 
           AND uf.level >= 3`,
        [prevLesson, user_id]
      );
      const mastered = parseInt(masteredRes.rows[0].mastered, 10);
      const masteryPercent = total > 0 ? (mastered / total) * 100 : 0;

      console.log(`Lesson ${prevLesson}: ${masteryPercent}% mastered`);

      if (masteryPercent < 90) {
        return {
          statusCode: 403,
          body: JSON.stringify({
            error: `You must master at least 90% of Lesson ${prevLesson} before starting Lesson ${lesson}.`,
            masteryPercent,
          }),
        };
      }
    }

    const query = `
      WITH unlearned AS (
        SELECT flashcard_id
        FROM Flashcards
        WHERE lesson = $1
          AND NOT EXISTS (
            SELECT 1
            FROM UserFlashcards uf
            WHERE uf.user_id = $2
              AND uf.flashcard_id = Flashcards.flashcard_id
          )
        ORDER BY sequence ASC
        LIMIT 15
      )
      SELECT f.*
      FROM Flashcards f
      JOIN unlearned u ON f.flashcard_id = u.flashcard_id
      ORDER BY f.sequence ASC
    `;

    const flashcards = await db.query(query, [lesson, user_id]);

    return {
      statusCode: 200,
      body: JSON.stringify({ flashcards: flashcards.rows }),
    };
  } catch (error) {
    console.error("[DEBUG] Error fetching lesson flashcards:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Database query failed",
        details: error.message,
      }),
    };
  }
};

// 2. Update flashcard familiarity based on user input during lessons
exports.updateUserFlashcard = async (event) => {
  console.log("[DEBUG] updateUserFlashcard event body:", event.body);

  const { user_id, flashcard_id, known, next_review } = JSON.parse(event.body);

  if (!flashcard_id || typeof known !== "boolean") {
    console.error("[DEBUG] Missing or invalid parameters:", {
      user_id,
      flashcard_id,
      known,
      next_review,
    });
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing or invalid parameters (flashcard_id, known).",
      }),
    };
  }

  if (!user_id) {
    console.log("[DEBUG] Guest user detected. Not saving flashcard progress.");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Guest user: Progress not saved." }),
    };
  }

  const level = known ? 3 : 0;
  console.log(`[DEBUG] Setting level to ${level} for flashcard_id: ${flashcard_id}`);
  console.log(`[DEBUG] next_review is:`, next_review);

  try {
    const query = `
      INSERT INTO UserFlashcards (
        user_id,
        flashcard_id,
        level,
        next_review,
        reached_level_3
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        CASE WHEN $3 = 3 THEN NOW() ELSE NULL END
      )
      ON CONFLICT (user_id, flashcard_id)
      DO UPDATE
        SET level = EXCLUDED.level,
            next_review = EXCLUDED.next_review,
            reached_level_3 = CASE
              WHEN EXCLUDED.level = 3 THEN NOW()
              ELSE UserFlashcards.reached_level_3
            END
    `;
    const result = await db.query(query, [user_id, flashcard_id, level, next_review]);

    console.log("[DEBUG] Query result:", result);
    console.log("[DEBUG] UserFlashcard updated successfully");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Flashcard updated successfully",
        level,
        next_review,
      }),
    };
  } catch (error) {
    console.error("[DEBUG] Error updating flashcard:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Database update failed",
        details: error.message,
      }),
    };
  }
};

// 3. Fetch review flashcards
exports.fetchReviewFlashcards = async (event) => {
  const { user_id, mode } = JSON.parse(event.body) || {};
  const reviewMode = mode || "normal";

  if (!user_id) {
    if (reviewMode === "immediate") {
      console.log("[DEBUG] Guest user immediate review allowed (Lesson 1 cards).");

      const query = `
        SELECT * FROM Flashcards
        WHERE lesson = 1
        ORDER BY sequence ASC
        LIMIT 15
      `;
      const flashcards = await db.query(query);

      return {
        statusCode: 200,
        body: JSON.stringify({ flashcards: flashcards.rows }),
      };
    } else {
      console.log("[DEBUG] Guest user tried accessing normal review - blocked.");
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Please log in to access normal review mode." }),
      };
    }
  }

  let whereClause;
  if (reviewMode === "immediate") {
    whereClause = "uf.level = 0";
  } else {
    whereClause = "uf.next_review <= (NOW() AT TIME ZONE 'UTC')";
  }

  try {
    const sql = `
      SELECT f.*, uf.next_review
      FROM UserFlashcards uf
      JOIN Flashcards f ON uf.flashcard_id = f.flashcard_id
      WHERE uf.user_id = $1
        AND ${whereClause}
      ORDER BY uf.next_review ASC
      LIMIT 100
    `;

    const flashcards = await db.query(sql, [user_id]);

    return {
      statusCode: 200,
      body: JSON.stringify({ flashcards: flashcards.rows }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Database query failed",
        details: error.message,
      }),
    };
  }
};

// 4. Validate user's flashcard answer based on type
exports.validateFlashcardAnswer = async (event) => {
  const { flashcard_id, user_answer, answer_type } = JSON.parse(event.body);

  if (!flashcard_id || !user_answer || !answer_type) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing flashcard_id, user_answer, or answer_type",
      }),
    };
  }

  try {
    // Fetch flashcard details
    const result = await db.query(
      "SELECT meaning, reading FROM Flashcards WHERE flashcard_id = $1",
      [flashcard_id]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Flashcard not found" }),
      };
    }

    const flashcard = result.rows[0];
    let correctAnswers =
      answer_type === "reading"
        ? [flashcard.reading.trim()]
        : flashcard.meaning.toLowerCase().split(";").map((m) => m.trim());

    const userInput = user_answer.trim().toLowerCase();

    let isCorrect = false;
    let editDistance = null;

    if (answer_type === "reading") {
      // If user input matches reading exactly
      isCorrect = correctAnswers.includes(userInput);
    } else {
      // If user input is close enough to any accepted meaning
      correctAnswers.forEach((answer) => {
        let dist = distance(userInput, answer);
        const maxLen = Math.max(userInput.length, answer.length);
        const similarityThreshold = maxLen > 4 ? 2 : 1;
        if (dist <= similarityThreshold) {
          isCorrect = true;
          editDistance = dist;
        }
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ isCorrect, correctAnswers, editDistance }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Database query failed",
        details: error.message,
      }),
    };
  }
};

// 5. Mark flashcard as reviewed and update streak
exports.markFlashcardReview = async (event) => {
  const { user_id, flashcard_id, correct } = JSON.parse(event.body);

  if (!user_id || !flashcard_id || typeof correct !== "boolean") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing or invalid parameters" }),
    };
  }

  try {
    // Fetch current streak & last_correct_review_date
    const result = await db.query(
      "SELECT streak, last_correct_review_date FROM UserFlashcards WHERE user_id = $1 AND flashcard_id = $2",
      [user_id, flashcard_id]
    );

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Flashcard not found for this user",
        }),
      };
    }

    let { streak, last_correct_review_date } = result.rows[0];

    if (correct) {
      // Check if the last correct review was today
      const lastReviewDate = last_correct_review_date ? new Date(last_correct_review_date) : null;
      const today = new Date();
      const isSameDay =
        lastReviewDate &&
        lastReviewDate.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
      streak = isSameDay ? streak : streak + 1;
    } else {
      // Decrease streak but prevent negative
      streak = Math.max(streak - 1, 0);
    }

    await db.query(
      `UPDATE UserFlashcards 
       SET last_review = NOW(),
           correct_count = correct_count + $1,
           streak = $2,
           last_correct_review_date = CASE WHEN $1 = 1 THEN NOW() ELSE last_correct_review_date END,
           next_review = CASE
             WHEN $1 = 1 THEN NOW() + INTERVAL '2 days'
             ELSE NOW() + INTERVAL '1 day'
           END
       WHERE user_id = $3 AND flashcard_id = $4`,
      [correct ? 1 : 0, streak, user_id, flashcard_id]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Review updated successfully",
        new_streak: streak,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Database update failed",
        details: error.message,
      }),
    };
  }
};

/**
 * 6. Update Review Flashcard
 * Called when a user finishes checking both meaning & reading for a single flashcard.
 * This function uses our SRS logic from utils/srs.js to compute the new level and next review timestamp.
 */
exports.updateReviewFlashcard = async (event) => {
  console.log("[DEBUG] updateReviewFlashcard event body:", event.body);
  const { user_id, flashcard_id, bothCorrect } = JSON.parse(event.body);

  if (!user_id || !flashcard_id || typeof bothCorrect !== "boolean") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing or invalid parameters" }),
    };
  }

  try {
    // 1) Fetch current row from UserFlashcards
    const res = await db.query(
      `SELECT level, correct_count, incorrect_count
       FROM UserFlashcards
       WHERE user_id = $1 AND flashcard_id = $2`,
      [user_id, flashcard_id]
    );

    if (res.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Flashcard not found for this user" }),
      };
    }

    let { level, correct_count, incorrect_count } = res.rows[0];

    // 2) Use SRS logic
    const { newLevel, nextReview } = getNextReviewDateAndLevel(level, bothCorrect, "UTC");

    // 3) Update correct/incorrect
    const newCorrectCount = correct_count + (bothCorrect ? 1 : 0);
    const newIncorrectCount = incorrect_count + (bothCorrect ? 0 : 1);

    // 4) Update row
    const query = `
      UPDATE UserFlashcards
      SET
        level = $1,
        correct_count = $2,
        incorrect_count = $3,
        reached_level_3 = CASE
          WHEN $1 = 3 THEN NOW()
          ELSE reached_level_3
        END,
        next_review = $4
      WHERE user_id = $5 AND flashcard_id = $6
      RETURNING level, correct_count, incorrect_count, reached_level_3, next_review
    `;
    const updateRes = await db.query(query, [
      newLevel,
      newCorrectCount,
      newIncorrectCount,
      nextReview,
      user_id,
      flashcard_id,
    ]);

    const updatedRow = updateRes.rows[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Flashcard review updated",
        level: updatedRow.level,
        correct_count: updatedRow.correct_count,
        incorrect_count: updatedRow.incorrect_count,
        reached_level_3: updatedRow.reached_level_3,
        next_review: updatedRow.next_review,
      }),
    };
  } catch (error) {
    console.error("[DEBUG] Error in updateReviewFlashcard:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Database update failed",
        details: error.message,
      }),
    };
  }
};

/**
 * Endpoint: fetchNextLesson
 */
exports.fetchNextLesson = async (event) => {
  try {
    const { user_id } = JSON.parse(event.body);
    if (!user_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing user_id" }),
      };
    }

    // 1) Check if user has ANY flashcards in userflashcards table
    const anyRow = await db.query(
      `SELECT 1 
       FROM UserFlashcards
       WHERE user_id=$1
       LIMIT 1`,
      [user_id]
    );

    // If none => brand new user => nextLesson=1
    if (anyRow.rowCount === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          nextLesson: 1,  // user can start from lesson 1
          locked: false,
        }),
      };
    }

    // 2) Find highest lesson the user has touched
    const hlRes = await db.query(
      `
      SELECT MAX(f.lesson) AS highest_lesson
      FROM UserFlashcards uf
      JOIN Flashcards f ON uf.flashcard_id = f.flashcard_id
      WHERE uf.user_id = $1
    `,
      [user_id]
    );

    const highest_lesson = hlRes.rows[0].highest_lesson;
    if (!highest_lesson) {
      // fallback if something strange happened => nextLesson=1
      return {
        statusCode: 200,
        body: JSON.stringify({
          nextLesson: 1,
          locked: false,
        }),
      };
    }

    // 3) Count how many flashcards exist in highest_lesson
    const totalHLRes = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM Flashcards
      WHERE lesson = $1
    `,
      [highest_lesson]
    );
    const totalHL = parseInt(totalHLRes.rows[0].total, 10);

    // 4) Count how many of that lesson's flashcards the user has in userflashcards
    const learnedHLRes = await db.query(
      `
      SELECT COUNT(*) AS learned
      FROM UserFlashcards uf
      JOIN Flashcards f ON uf.flashcard_id = f.flashcard_id
      WHERE uf.user_id = $1
        AND f.lesson = $2
    `,
      [user_id, highest_lesson]
    );
    const learnedHL = parseInt(learnedHLRes.rows[0].learned, 10);

    // 5) If learnedHL < totalHL => user hasn't learned all => nextLesson=highest_lesson => unlocked
    if (learnedHL < totalHL) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          nextLesson: highest_lesson,
          locked: false, // can keep learning
        }),
      };
    }

    // 6) Otherwise, user has "learned" all flashcards in highest_lesson
    const isMastered = await checkLessonMastery(user_id, highest_lesson);
    if (!isMastered) {
      // locked from going further
      return {
        statusCode: 200,
        body: JSON.stringify({
          nextLesson: highest_lesson,
          locked: true,
        }),
      };
    }

    // 7) mastery>=90 => see if there's a next lesson
    const nextL = highest_lesson + 1;
    const nextCheck = await db.query(
      `
      SELECT 1 FROM Flashcards
      WHERE lesson = $1
      LIMIT 1
    `,
      [nextL]
    );

    if (nextCheck.rowCount === 0) {
      // No more lessons
      return {
        statusCode: 200,
        body: JSON.stringify({
          nextLesson: null,
          message: "All lessons mastered! Congratulations!",
        }),
      };
    }

    // 8) next lesson exists => unlocked
    return {
      statusCode: 200,
      body: JSON.stringify({
        nextLesson: nextL,
        locked: false,
      }),
    };
  } catch (error) {
    console.error("Error in fetchNextLesson:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
    };
  }
};

/**
 * Check if a user has >=90% mastery of the given lessonNumber
 */
async function checkLessonMastery(user_id, lessonNumber) {
  // 1) Count total cards in that lesson
  const totalRes = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM Flashcards
    WHERE lesson=$1
  `,
    [lessonNumber]
  );
  const total = parseInt(totalRes.rows[0].total, 10);
  if (total === 0) {
    return false;
  }

  // 2) Count how many are level>=3
  const masteredRes = await db.query(
    `
    SELECT COUNT(*) AS mastered
    FROM UserFlashcards uf
    JOIN Flashcards f ON uf.flashcard_id = f.flashcard_id
    WHERE f.lesson=$1
      AND uf.user_id=$2
      AND uf.level>=3
  `,
    [lessonNumber, user_id]
  );
  const masteredCount = parseInt(masteredRes.rows[0].mastered, 10);

  const masteryPercent = (masteredCount / total) * 100;
  return masteryPercent >= 90;
}

/**
 * ============================================
 *       New: bulkSyncGuestProgress
 * ============================================
 *
 * Accepts an array of flashcard objects with full SRS data
 * (level, correct_count, incorrect_count, next_review, reached_level_3, etc.)
 * and does an UPSERT for each record under the user's ID.
 *
 * Example incoming payload:
 * {
 *   "user_id": 123,
 *   "progress": [
 *     {
 *       "flashcard_id": 1001,
 *       "level": 3,
 *       "correct_count": 2,
 *       "incorrect_count": 1,
 *       "next_review": "2025-03-12T10:00:00Z",
 *       "reached_level_3": "2025-03-10T09:30:00Z"
 *     },
 *     ...
 *   ]
 * }
 */
exports.bulkSyncGuestProgress = async (event) => {
  try {
    const { user_id, progress } = JSON.parse(event.body) || {};

    if (!user_id || !Array.isArray(progress)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid payload. Must include user_id and a progress array.",
        }),
      };
    }

    // Use a single transaction
    await db.query("BEGIN");

    for (const item of progress) {
      const {
        flashcard_id,
        level,
        correct_count,
        incorrect_count,
        next_review,
        reached_level_3
      } = item;

      // Insert/Update each flashcard record
      await db.query(
        `
        INSERT INTO UserFlashcards (
          user_id,
          flashcard_id,
          level,
          correct_count,
          incorrect_count,
          next_review,
          reached_level_3
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, flashcard_id)
        DO UPDATE SET
          level = EXCLUDED.level,
          correct_count = EXCLUDED.correct_count,
          incorrect_count = EXCLUDED.incorrect_count,
          next_review = EXCLUDED.next_review,
          reached_level_3 = CASE 
            WHEN EXCLUDED.level >= 3 THEN EXCLUDED.reached_level_3
            ELSE UserFlashcards.reached_level_3
          END
      `,
        [
          user_id,
          flashcard_id,
          level || 0,
          correct_count || 0,
          incorrect_count || 0,
          next_review || null,
          // If they gave a reached_level_3 date, we’ll use it only if level>=3
          level >= 3 ? reached_level_3 || new Date() : null
        ]
      );
    }

    await db.query("COMMIT");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Guest progress synced successfully",
      }),
    };
  } catch (error) {
    console.error("Error in bulkSyncGuestProgress:", error);
    // If something goes wrong, rollback transaction
    await db.query("ROLLBACK");
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to sync guest progress",
        details: error.message,
      }),
    };
  }
};

/**
 * Endpoint: fetchFlashcardCounts
 * Returns { newLessonCardCount, reviewCount, practiceCount } for the given user.
 */
exports.fetchFlashcardCounts = async (event) => {
  try {
    const { user_id } = JSON.parse(event.body) || {};
    if (!user_id) {
      // If you want to handle guest logic, do it here:
      return {
        statusCode: 200,
        body: JSON.stringify({
          newLessonCardCount: 15, // or 0, or however many you want for guest
          reviewCount: 0,
          practiceCount: 0,
        }),
      };
    }

    // ----------------------------------------------------------------
    // 1) Figure out which lesson is "next" (or current) and if locked
    //    We'll replicate some of the logic from fetchNextLesson
    // ----------------------------------------------------------------

    // Check if user has any flashcards in userflashcards
    const anyRow = await db.query(
      `SELECT 1 
         FROM UserFlashcards
        WHERE user_id = $1
        LIMIT 1`,
      [user_id]
    );

    let lessonToLearn = 1;
    let locked = false;

    if (anyRow.rowCount === 0) {
      // brand new user => nextLesson=1, unlocked
      lessonToLearn = 1;
      locked = false;
    } else {
      // find highest lesson they have touched
      const hlRes = await db.query(
        `SELECT MAX(f.lesson) AS highest_lesson
           FROM UserFlashcards uf
           JOIN Flashcards f ON uf.flashcard_id = f.flashcard_id
          WHERE uf.user_id = $1`,
        [user_id]
      );
      const highest_lesson = hlRes.rows[0].highest_lesson || 1;

      // Count how many total in that highest lesson
      const totalHLRes = await db.query(
        `SELECT COUNT(*) AS total
           FROM Flashcards
          WHERE lesson = $1`,
        [highest_lesson]
      );
      const totalHL = parseInt(totalHLRes.rows[0].total, 10);

      // Count how many user has actually “learned”
      const learnedHLRes = await db.query(
        `SELECT COUNT(*) AS learned
           FROM UserFlashcards uf
           JOIN Flashcards f ON uf.flashcard_id = f.flashcard_id
          WHERE uf.user_id = $1
            AND f.lesson = $2`,
        [user_id, highest_lesson]
      );
      const learnedHL = parseInt(learnedHLRes.rows[0].learned, 10);

      if (learnedHL < totalHL) {
        // user still has unlearned cards in the highest_lesson
        lessonToLearn = highest_lesson;
        locked = false;
      } else {
        // user learned them all, check mastery >= 90%
        const isMastered = await checkLessonMastery(user_id, highest_lesson);
        if (!isMastered) {
          // locked from going to next lesson
          lessonToLearn = highest_lesson;
          locked = true;
        } else {
          // check if next lesson exists
          const nextL = highest_lesson + 1;
          const nextCheck = await db.query(
            `SELECT 1
               FROM Flashcards
              WHERE lesson = $1
              LIMIT 1`,
            [nextL]
          );

          if (nextCheck.rowCount === 0) {
            // no more lessons
            // (we can set lessonToLearn = null or keep it as highest + 1)
            lessonToLearn = null; // means no new lesson
            locked = false;
          } else {
            // next lesson exists, unlocked
            lessonToLearn = nextL;
            locked = false;
          }
        }
      }
    }

    // ----------------------------------------------------------------
    // 2) newLessonCardCount: number of *unlearned* flashcards in lessonToLearn
    //    If locked or lessonToLearn=null, we set this to 0.
    // ----------------------------------------------------------------
    let newLessonCardCount = 0;
    if (lessonToLearn && !locked) {
      const unlearnedCount = await db.query(
        `
        SELECT COUNT(*) AS cnt
          FROM Flashcards f
         WHERE f.lesson = $1
           AND NOT EXISTS (
             SELECT 1 
               FROM UserFlashcards uf
              WHERE uf.flashcard_id = f.flashcard_id
                AND uf.user_id = $2
           )
        `,
        [lessonToLearn, user_id]
      );
      newLessonCardCount = parseInt(unlearnedCount.rows[0].cnt, 10);
    }

    // ----------------------------------------------------------------
    // 3) reviewCount: how many are up for normal review now
    // ----------------------------------------------------------------
    const reviewRes = await db.query(
      `
      SELECT COUNT(*) AS review_count
        FROM UserFlashcards uf
       WHERE uf.user_id = $1
         AND uf.next_review <= (NOW() AT TIME ZONE 'UTC')
    `,
      [user_id]
    );
    const reviewCount = parseInt(reviewRes.rows[0].review_count, 10);

    // Return the aggregated result:
    return {
      statusCode: 200,
      body: JSON.stringify({
        newLessonCardCount,
        reviewCount,
        // Optionally also return which lesson is next + locked?
        nextLesson: lessonToLearn,
        locked,
      }),
    };
  } catch (error) {
    console.error("Error in fetchFlashcardCounts:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to fetch flashcard counts",
        details: error.message,
      }),
    };
  }
};