import { prisma } from "@/lib/prisma";

function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}

export async function GET(request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim();
  if (!userId) {
    return jsonError("userId is required.", 400);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return jsonError("User not found.", 404);
    }

    const [dueFlashcards, studyPath, latestAttempt, materials, flashcardCount] =
      await Promise.all([
        prisma.flashcard.findMany({
          where: {
            userId,
            nextReviewDate: { lte: new Date() },
          },
          orderBy: { nextReviewDate: "asc" },
        }),
        prisma.studyPath.findFirst({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.quizAttempt.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.studyMaterial.findMany({
          where: { userId },
          select: {
            id: true,
            title: true,
            extractedConcepts: true,
            createdAt: true,
            quizzes: {
              select: {
                id: true,
                title: true,
                questions: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.flashcard.count({ where: { userId } }),
      ]);

    return Response.json({
      dueFlashcards,
      flashcardCount,
      studyPath,
      weakTopics: latestAttempt?.weakTopics ?? [],
      latestScore: latestAttempt?.score ?? null,
      materials: materials.map((material) => ({
        ...material,
        quizzes: material.quizzes.map((quiz) => ({
          ...quiz,
          questions: Array.isArray(quiz.questions)
            ? quiz.questions.map(({ question, options, topic }) => ({
                question,
                options,
                topic,
              }))
            : [],
        })),
      })),
    });
  } catch (error) {
    console.error("Failed to load dashboard data.", error);
    return jsonError("Failed to load dashboard data.", 500);
  }
}
