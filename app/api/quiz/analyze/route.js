import { buildAdaptiveStudyPath } from "@/lib/contentParser";
import { prisma } from "@/lib/prisma";

function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getAnswerIndex(answer, options) {
  if (Number.isInteger(answer)) {
    return answer >= 0 && answer < options.length ? answer : -1;
  }

  if (typeof answer === "string") {
    const normalizedAnswer = answer.trim().toLocaleLowerCase();
    return options.findIndex(
      (option) => option.trim().toLocaleLowerCase() === normalizedAnswer,
    );
  }

  return -1;
}

function isValidStoredQuestion(question) {
  return (
    isObject(question) &&
    typeof question.question === "string" &&
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.every(
      (option) => typeof option === "string" && option.trim().length > 0,
    ) &&
    Number.isInteger(question.correctAnswer) &&
    question.correctAnswer >= 0 &&
    question.correctAnswer < question.options.length &&
    typeof question.topic === "string" &&
    question.topic.trim().length > 0
  );
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
    typeof body.userId !== "string" ||
    body.userId.trim().length === 0 ||
    typeof body.quizId !== "string" ||
    body.quizId.trim().length === 0 ||
    !Array.isArray(body.answers)
  ) {
    return jsonError("userId, quizId, and an answers array are required.", 400);
  }

  try {
    const userId = body.userId.trim();
    const quizId = body.quizId.trim();
    const [user, quiz] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      prisma.quiz.findFirst({
        where: {
          id: quizId,
          material: { is: { userId } },
        },
        include: { material: { select: { userId: true } } },
      }),
    ]);

    if (!user) {
      return jsonError("User not found.", 404);
    }
    if (!quiz || quiz.material.userId !== userId) {
      return jsonError("Quiz not found for this user.", 404);
    }

    if (
      !Array.isArray(quiz.questions) ||
      quiz.questions.length === 0 ||
      !quiz.questions.every(isValidStoredQuestion)
    ) {
      console.error("Quiz contains questions with an invalid stored format.");
      return jsonError("Quiz questions are not in a gradeable format.", 500);
    }

    if (body.answers.length !== quiz.questions.length) {
      return jsonError("Provide one answer for every quiz question.", 400);
    }

    const answerIndexes = body.answers.map((answer, index) =>
      getAnswerIndex(answer, quiz.questions[index].options),
    );
    if (answerIndexes.some((answerIndex) => answerIndex < 0)) {
      return jsonError(
        "Each answer must be a valid option index or option string.",
        400,
      );
    }

    const topicStats = new Map();
    let correctCount = 0;

    quiz.questions.forEach((question, index) => {
      const topic = question.topic.trim();
      const stats = topicStats.get(topic) ?? {
        totalQuestions: 0,
        incorrectAnswers: 0,
      };

      stats.totalQuestions += 1;
      if (answerIndexes[index] === question.correctAnswer) {
        correctCount += 1;
      } else {
        stats.incorrectAnswers += 1;
      }
      topicStats.set(topic, stats);
    });

    const weakTopics = [...topicStats.entries()]
      .filter(([, stats]) => stats.incorrectAnswers > 0)
      .map(([topic, stats]) => ({
        topic,
        incorrectAnswers: stats.incorrectAnswers,
        totalQuestions: stats.totalQuestions,
        accuracy: Math.round(
          ((stats.totalQuestions - stats.incorrectAnswers) /
            stats.totalQuestions) *
            100,
        ),
      }))
      .sort(
        (left, right) =>
          right.incorrectAnswers - left.incorrectAnswers ||
          left.accuracy - right.accuracy,
      );
    const score = Math.round((correctCount / quiz.questions.length) * 10000) / 100;

    const [priorAttempts, difficultFlashcards] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.flashcard.findMany({
        where: { userId, easeFactor: { lt: 2.5 } },
        include: { material: { select: { extractedConcepts: true } } },
        orderBy: { easeFactor: "asc" },
        take: 200,
      }),
    ]);
    const recommendedTopics = buildAdaptiveStudyPath(
      [{ score, weakTopics }, ...priorAttempts],
      difficultFlashcards,
    );

    const { attempt, studyPath } = await prisma.$transaction(async (transaction) => {
      const attempt = await transaction.quizAttempt.create({
        data: {
          userId,
          quizId,
          score,
          weakTopics,
        },
      });
      const studyPath = await transaction.studyPath.create({
        data: {
          userId,
          recommendedTopics,
        },
      });
      return { attempt, studyPath };
    });

    return Response.json({
      attempt,
      studyPath,
      correctCount,
      totalQuestions: quiz.questions.length,
    });
  } catch (error) {
    console.error("Failed to analyze quiz answers locally.", error);
    return jsonError("Failed to analyze quiz answers.", 500);
  }
}
