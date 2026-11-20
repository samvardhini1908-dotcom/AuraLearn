const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function calculateNextReview(
  quality,
  repetitions = 0,
  easeFactor = 2.5,
  interval = 0,
) {
  if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
    throw new RangeError("quality must be an integer from 0 to 5.");
  }

  const safeRepetitions =
    Number.isInteger(repetitions) && repetitions >= 0 ? repetitions : 0;
  const safeEaseFactor =
    Number.isFinite(easeFactor) && easeFactor > 0 ? easeFactor : 2.5;
  const safeInterval = Number.isInteger(interval) && interval >= 0 ? interval : 0;

  const qualityDifference = 5 - quality;
  const nextEaseFactor = Math.max(
    1.3,
    safeEaseFactor +
      0.1 -
      qualityDifference * (0.08 + qualityDifference * 0.02),
  );
  const nextRepetitions = quality < 3 ? 0 : safeRepetitions + 1;
  let nextInterval;

  if (quality < 3) {
    nextInterval = 1;
  } else if (safeRepetitions === 0) {
    nextInterval = 1;
  } else if (safeRepetitions === 1) {
    nextInterval = 6;
  } else {
    nextInterval = Math.max(1, Math.round(safeInterval * safeEaseFactor));
  }

  return {
    repetitions: nextRepetitions,
    easeFactor: nextEaseFactor,
    interval: nextInterval,
    nextReviewDate: new Date(Date.now() + nextInterval * DAY_IN_MS),
  };
}