import { prisma } from "@/lib/prisma";
import { calculateNextReview } from "@/lib/spacedRepetition";

function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Invalid JSON in flashcard review request.", error);
    return jsonError(
      error instanceof Error ? error.message : String(error),
      400,
    );
  }

  const isObject = body !== null && typeof body === "object" && !Array.isArray(body);
  const userId = isObject && typeof body.userId === "string" ? body.userId.trim() : "";
  const flashcardIdValue = isObject ? body.flashcardId ?? body.id : undefined;
  const flashcardId =
    typeof flashcardIdValue === "string" ? flashcardIdValue.trim() : "";
  const qualityValue = isObject ? body.quality ?? body.rating : undefined;
  const validationErrors = [];

  if (!userId) {
    validationErrors.push("userId must be a non-empty string.");
  }
  if (!flashcardId) {
    validationErrors.push("flashcardId or id must be a non-empty string.");
  }
  if (
    !Number.isInteger(qualityValue) ||
    qualityValue < 0 ||
    qualityValue > 5
  ) {
    validationErrors.push("quality or rating must be an integer from 0 to 5.");
  }

  if (validationErrors.length > 0) {
    const error = new Error(validationErrors.join(" "));
    console.error("Invalid flashcard review request.", {
      errors: validationErrors,
      bodyType: Array.isArray(body) ? "array" : typeof body,
      hasUserId: Boolean(userId),
      hasFlashcardId: Boolean(flashcardId),
      qualityType: typeof qualityValue,
    });
    return jsonError(error.message, 400);
  }

  try {
    const flashcard = await prisma.flashcard.findFirst({
      where: {
        id: flashcardId,
        userId,
      },
    });

    if (!flashcard) {
      const error = new Error("Flashcard not found for this user.");
      console.error("Flashcard review target was not found.", {
        userId,
        flashcardId,
      });
      return jsonError(error.message, 404);
    }

    const review = calculateNextReview(
      qualityValue,
      flashcard.repetitions ?? 0,
      flashcard.easeFactor ?? 2.5,
      flashcard.interval ?? 0,
    );
    const updateResult = await prisma.flashcard.updateMany({
      where: {
        id: flashcard.id,
        userId,
      },
      data: review,
    });
    if (updateResult.count !== 1) {
      const error = new Error("Flashcard not found for this user.");
      console.error("Flashcard review update did not match a record.", {
        userId,
        flashcardId,
        updatedCount: updateResult.count,
      });
      return jsonError(error.message, 404);
    }

    const updatedFlashcard = await prisma.flashcard.findFirst({
      where: {
        id: flashcard.id,
        userId,
      },
    });

    if (!updatedFlashcard) {
      throw new Error("Flashcard was updated but could not be loaded.");
    }

    return Response.json({ flashcard: updatedFlashcard });
  } catch (error) {
    console.error("Failed to record flashcard review.", {
      userId,
      flashcardId,
      quality: qualityValue,
      error,
    });
    return jsonError(
      error instanceof Error ? error.message : String(error),
      500,
    );
  }
}