// utils/srs.js
import { DateTime } from "luxon";

/**
 * Given a user's current flashcard level and whether they answered correctly,
 * computes the new level and the next review timestamp (UTC) based on your SRS intervals.
 *
 * @param {number} oldLevel - The current level of the flashcard (e.g. 0, 1, 2, ...).
 * @param {boolean} correct - Whether the user answered correctly or not.
 * @param {string} userTimeZone - The user's timezone identifier (e.g. "America/New_York").
 *                                If you don't track user timezones, you can default to "UTC".
 *
 * @returns {{ newLevel: number, nextReview: string }} - The updated level, plus an ISO string for the next review in UTC.
 */
export function getNextReviewDateAndLevel(oldLevel, correct, userTimeZone = "UTC") {
  // 1) Determine the new level
  let level = isNaN(oldLevel) ? 0 : oldLevel;

  if (correct) {
    level += 1; // If correct, go up by 1
  } else {
    // If incorrect, only decrement if level > 0 (so it doesn't go below 0)
    if (level > 1) {
      level -= 1;
    }
  }

  // 2) Initialize date/time in the user's timezone (or fallback to UTC)
  let currentDate = DateTime.now().setZone(userTimeZone);

  // 3) Determine how many hours/days/months to add based on the new level
  let hoursToAdd = 0;
  let daysToAdd = 0;
  let monthsToAdd = 0;

  switch (level) {
    case 1:
      hoursToAdd = 0;
      break;
    case 2:
      hoursToAdd = 0;
      break;
    case 3:
      daysToAdd = 1;
      break;
    case 4:
      daysToAdd = 2;
      break;
    case 5:
      daysToAdd = 7;
      break;
    case 6:
      daysToAdd = 14;
      break;
    case 7:
      monthsToAdd = 1;
      break;
    case 8:
      monthsToAdd = 4;
      break;
    default:
      // For level 0 (or above 8), you can decide what to do:
      // e.g. immediate review => hoursToAdd = 0
      break;
  }

  // 4) Add the intervals
  currentDate = currentDate.plus({ hours: hoursToAdd, days: daysToAdd, months: monthsToAdd });

  // 5) Convert to UTC ISO string
  const nextReview = currentDate.toUTC().toISO();

  return { newLevel: level, nextReview };
}
