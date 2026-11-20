"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Layers3,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import FlashcardDeck from "@/components/FlashcardDeck";
import StudyPath from "@/components/StudyPath";
import UploadMaterial from "@/components/UploadMaterial";

const sections = [
  { id: "materials", label: "Study Materials", icon: BookOpen },
  { id: "cards", label: "Cards Due", icon: Layers3 },
  { id: "quiz", label: "Quiz", icon: Brain },
];

function getConcepts(material) {
  const extracted = material?.extractedConcepts;
  if (Array.isArray(extracted)) {
    return extracted;
  }
  return Array.isArray(extracted?.concepts) ? extracted.concepts : [];
}

function QuizPanel({ quiz, userId, onAnalyzed }) {
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  if (!quiz) {
    return (
      <section className="glass-panel p-6 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Brain size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Knowledge check</h2>
            <p className="mt-1 text-sm text-slate-500">
              Add study material to generate your first quiz.
            </p>
          </div>
        </div>
        <div className="flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-white/40 px-6 text-center text-sm text-slate-500">
          Your personalized multiple-choice quiz will appear here.
        </div>
      </section>
    );
  }

  const allAnswered = quiz.questions.every((_, index) =>
    Number.isInteger(answers[index]),
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/quiz/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          quizId: quiz.id,
          answers: quiz.questions.map((_, index) => answers[index]),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not submit your quiz.");
      }

      setResult(data);
      onAnalyzed(data);
    } catch (requestError) {
      setError(requestError.message || "Could not submit your quiz.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="glass-panel p-6 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Brain size={19} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Knowledge check
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{quiz.title}</h2>
          </div>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          {quiz.questions.length} questions
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          {quiz.questions.map((question, questionIndex) => (
            <fieldset
              className="border-b border-emerald-100/80 pb-5 last:border-0 last:pb-0"
              key={`${quiz.id}-${questionIndex}`}
            >
              <legend className="mb-3 text-sm font-semibold leading-6 text-slate-800">
                <span className="mr-2 text-xs font-bold text-emerald-700">
                  {String(questionIndex + 1).padStart(2, "0")}
                </span>
                {question.question}
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {question.options.map((option, optionIndex) => {
                  const selected = answers[questionIndex] === optionIndex;
                  return (
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm leading-5 transition ${
                        selected
                          ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                          : "border-emerald-100/80 bg-white/45 text-slate-600 hover:bg-emerald-50/60"
                      }`}
                      key={optionIndex}
                    >
                      <input
                        checked={selected}
                        className="mt-1 accent-emerald-600"
                        name={`question-${quiz.id}-${questionIndex}`}
                        onChange={() =>
                          setAnswers((current) => ({
                            ...current,
                            [questionIndex]: optionIndex,
                          }))
                        }
                        type="radio"
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
        {result ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4" role="status">
            <CheckCircle2 className="shrink-0 text-emerald-700" size={20} aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                {result.attempt.score}% · {result.correctCount} of {result.totalQuestions} correct
              </p>
              <p className="mt-0.5 text-xs leading-5 text-emerald-800">
                {result.attempt.weakTopics?.length
                  ? `Focus next on ${result.attempt.weakTopics.map((topic) => topic.topic).join(", ")}.`
                  : "Excellent work. Your study path has been updated."}
              </p>
            </div>
          </div>
        ) : null}

        <button
          className="primary-button mt-5 w-full"
          disabled={!allAnswered || isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
          ) : (
            <Sparkles size={17} aria-hidden="true" />
          )}
          {isSubmitting ? "Reviewing your answers..." : "Submit answers"}
        </button>
      </form>
    </section>
  );
}

export default function LearningDashboard({ user }) {
  const [activeSection, setActiveSection] = useState("materials");
  const [materials, setMaterials] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [studyPath, setStudyPath] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [latestScore, setLatestScore] = useState(null);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/dashboard?userId=${encodeURIComponent(user.id)}`,
          { cache: "no-store" },
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "Could not load your saved study data.");
        }
        if (!cancelled) {
          setMaterials(data.materials);
          setFlashcards(data.dueFlashcards);
          setFlashcardCount(data.flashcardCount);
          setStudyPath(data.studyPath);
          setWeakTopics(data.weakTopics);
          setLatestScore(data.latestScore);
          setSelectedQuizId(data.materials[0]?.quizzes[0]?.id || "");
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Could not load your saved study data.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const quizzes = useMemo(
    () =>
      materials.flatMap((material) =>
        material.quizzes.map((quiz) => ({
          ...quiz,
          materialTitle: material.title,
        })),
      ),
    [materials],
  );
  const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedQuizId) || null;

  function handleMaterialProcessed(data) {
    setMaterials((current) => [
      { ...data.material, quizzes: [data.quiz] },
      ...current,
    ]);
    setSelectedQuizId(data.quiz.id);
    setFlashcards((current) => [...data.flashcards, ...current]);
    setFlashcardCount((count) => count + data.flashcards.length);
  }

  function handleFlashcardUpdate(updatedFlashcard) {
    setFlashcards((current) =>
      current.filter((card) => card.id !== updatedFlashcard.id),
    );
  }

  function handleQuizAnalyzed(data) {
    setStudyPath(data.studyPath);
    setWeakTopics(data.attempt.weakTopics);
    setLatestScore(data.attempt.score);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <section className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Sparkles size={15} aria-hidden="true" />
            Your learning space
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            A little progress, every day.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Bring your notes, build understanding, and keep your next steps clear.
          </p>
        </div>
        {isLoading ? (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="animate-spin text-emerald-600" size={16} aria-hidden="true" />
            Syncing your workspace
          </span>
        ) : null}
      </section>

      {error ? (
        <div className="glass-panel mb-5 border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </div>
      ) : null}

      <nav aria-label="Learning sections" className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-emerald-100/80 bg-white/55 p-1.5 backdrop-blur-xl">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            aria-current={activeSection === id ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeSection === id
                ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-200/60"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            }`}
            key={id}
            onClick={() => setActiveSection(id)}
            type="button"
          >
            <Icon size={17} aria-hidden="true" />
            {label}
            {id === "cards" ? (
              <span className={`rounded-full px-2 py-0.5 text-xs ${activeSection === id ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                {flashcards.length}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {activeSection === "materials" ? (
        <section className="space-y-6">
          <UploadMaterial onProcessed={handleMaterialProcessed} userId={user.id} />
          <div className="glass-panel p-6 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Saved materials</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {materials.length} {materials.length === 1 ? "study set" : "study sets"} in your library
                </p>
              </div>
              <BookOpen className="text-emerald-700" size={20} aria-hidden="true" />
            </div>
            {materials.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {materials.map((material) => {
                  const concepts = getConcepts(material);
                  return (
                    <article className="rounded-2xl border border-emerald-100 bg-white/55 p-5" key={material.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{material.title}</h3>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(material.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {concepts.length} concepts
                        </span>
                      </div>
                      {concepts.length ? (
                        <ul className="mt-4 flex flex-wrap gap-2">
                          {concepts.slice(0, 8).map((concept) => (
                            <li className="rounded-full border border-emerald-100 bg-white/70 px-3 py-1 text-xs text-emerald-900" key={concept.term}>
                              {concept.term}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 text-sm text-slate-500">Key concepts are not available.</p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/40 px-5 py-8 text-center text-sm text-slate-500">
                Your processed study notes will be saved here with their key concepts.
              </div>
            )}
          </div>
        </section>
      ) : null}

      {activeSection === "cards" ? (
        <div className="mx-auto max-w-3xl space-y-6">
          <FlashcardDeck
            flashcards={flashcards}
            hasFlashcards={flashcardCount > 0}
            onUpdate={handleFlashcardUpdate}
            userId={user.id}
          />
        </div>
      ) : null}

      {activeSection === "quiz" ? (
        <section className="mx-auto max-w-3xl space-y-6">
          {quizzes.length > 1 ? (
            <div className="glass-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-sm font-semibold text-slate-700" htmlFor="quiz-select">
                Choose a study set
              </label>
              <select
                className="form-input sm:max-w-sm"
                id="quiz-select"
                onChange={(event) => setSelectedQuizId(event.target.value)}
                value={selectedQuizId}
              >
                {quizzes.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.materialTitle}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <QuizPanel
            key={selectedQuiz?.id || "empty-quiz"}
            onAnalyzed={handleQuizAnalyzed}
            quiz={selectedQuiz}
            userId={user.id}
          />
          <StudyPath studyPath={studyPath} weakTopics={weakTopics} />
          {latestScore !== null ? (
            <p className="text-center text-xs text-slate-500">
              Latest quiz score: <span className="font-semibold text-emerald-700">{latestScore}%</span>
            </p>
          ) : null}
        </section>
      ) : null}

      <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100/80 pt-5 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2">
          <Sparkles size={13} aria-hidden="true" />
          Small steps add up.
        </span>
        <span>AuraLearn · Your study data stays connected to your profile</span>
      </footer>
    </div>
  );
}
