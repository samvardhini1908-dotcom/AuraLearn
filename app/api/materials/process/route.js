import { extractConceptsAndCards } from "@/lib/contentParser";
import { prisma } from "@/lib/prisma";

const MAX_CONTENT_LENGTH = 50000;

function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  if (
    !isObject(body) ||
    !isNonEmptyString(body.userId) ||
    !isNonEmptyString(body.title) ||
    !isNonEmptyString(body.content)
  ) {
    return jsonError("userId, title, and content are required.", 400);
  }

  const userId = body.userId.trim();
  const title = body.title.trim();
  const content = body.content;

  if (content.length > MAX_CONTENT_LENGTH) {
    return jsonError(
      `content must not exceed ${MAX_CONTENT_LENGTH} characters.`,
      413,
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return jsonError("User not found.", 404);
    }

    let generated;
    try {
      generated = extractConceptsAndCards(title, content);
    } catch (error) {
      if (error instanceof RangeError) {
        return jsonError(error.message, 422);
      }
      throw error;
    }

    const material = await prisma.studyMaterial.create({
      data: {
        title,
        rawContent: content,
        extractedConcepts: {
          concepts: generated.extractedConcepts,
          keywords: generated.keywords,
        },
        user: { connect: { id: userId } },
        flashcards: {
          create: generated.flashcards.map((card) => ({
            front: card.front,
            back: card.back,
            user: { connect: { id: userId } },
          })),
        },
        quizzes: {
          create: {
            title: `${title} Quiz`,
            questions: generated.quizQuestions,
          },
        },
      },
      include: {
        flashcards: true,
        quizzes: true,
      },
    });

    return Response.json(
      {
        material: {
          id: material.id,
          title: material.title,
          extractedConcepts: material.extractedConcepts,
          createdAt: material.createdAt,
        },
        flashcards: material.flashcards,
        quiz: {
          id: material.quizzes[0].id,
          title: material.quizzes[0].title,
          questions: generated.quizQuestions.map(
            ({ question, options, topic }) => ({ question, options, topic }),
          ),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to process study material locally.", error);
    return jsonError("Failed to process study material.", 500);
  }
}
