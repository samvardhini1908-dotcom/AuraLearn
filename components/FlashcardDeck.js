"use client";

import { useState } from "react";
import { Check, Clock3, RotateCcw, Sparkles } from "lucide-react";

const ratings = [
  { label: "Again", quality: 1, classes: "border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100" },
  { label: "Hard", quality: 3, classes: "border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100" },
  { label: "Good", quality: 4, classes: "border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  { label: "Easy", quality: 5, classes: "border-teal-100 bg-teal-50 text-teal-700 hover:bg-teal-100" },
];

export default function FlashcardDeck({
  flashcards = [],
  hasFlashcards = false,
  onUpdate,
  userId,
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [savingQuality, setSavingQuality] = useState(null);
  const [error, setError] = useState("");
  const dueFlashcards = [...flashcards].sort(
      (left, right) =>
        new Date(left.nextReviewDate).getTime() -
        new Date(right.nextReviewDate).getTime(),
    );
  const currentCard = dueFlashcards[0];

  async function rateCard(quality) {
    if (!currentCard || !isFlipped || savingQuality !== null) {
      return;
    }

    setError("");
    setSavingQuality(quality);
    try {
      const response = await fetch("/api/flashcards/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          flashcardId: currentCard.id,
          quality,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not save your review.");
      }

      setIsFlipped(false);
      onUpdate(result.flashcard);
    } catch (requestError) {
      setError(requestError.message || "Could not save your review.");
    } finally {
      setSavingQuality(null);
    }
  }

  return (
    <section className="glass-panel p-6 sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Flashcard review
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-gradient-to-r from-emerald-600 to-teal-500 px-2.5 py-1 text-xs font-semibold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {dueFlashcards.length} due
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Recall first, then rate how it felt.
          </p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <RotateCcw size={18} aria-hidden="true" />
        </span>
      </div>

      {currentCard ? (
        <>
          <div className="mb-4 flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Card 1 of {dueFlashcards.length} due</span>
            <span>{currentCard.material?.title || "Your study set"}</span>
          </div>

          <div className="relative h-56 [perspective:1000px]">
            <button
              aria-label={isFlipped ? "Show flashcard question" : "Reveal flashcard answer"}
              aria-pressed={isFlipped}
              className="absolute inset-0 h-full w-full rounded-2xl text-left transition-transform duration-700 ease-out [transform-style:preserve-3d] focus:outline-none focus:ring-4 focus:ring-emerald-100"
              onClick={() => setIsFlipped((flipped) => !flipped)}
              style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
              type="button"
            >
              <span
                className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-100/85 via-white/75 to-lime-100/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl [backface-visibility:hidden]"
                style={{ backfaceVisibility: "hidden" }}
              >
                <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  <span>Prompt</span>
                  <Sparkles size={15} aria-hidden="true" />
                </span>
                <span className="text-center text-xl font-medium leading-8 text-slate-800">
                  {currentCard.front}
                </span>
                <span className="text-center text-xs text-slate-400">
                  Tap to reveal answer
                </span>
              </span>
              <span
                className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-100/85 via-white/75 to-emerald-100/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl [backface-visibility:hidden]"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                  <span>Answer</span>
                  <Check size={15} aria-hidden="true" />
                </span>
                <span className="text-center text-lg leading-7 text-slate-800">
                  {currentCard.back}
                </span>
                <span className="text-center text-xs text-slate-400">
                  Choose a rating below
                </span>
              </span>
            </button>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            {ratings.map((rating) => (
              <button
                className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm ${rating.classes}`}
                disabled={!isFlipped || savingQuality !== null}
                key={rating.quality}
                onClick={() => rateCard(rating.quality)}
                type="button"
              >
                {savingQuality === rating.quality ? "Saving…" : rating.label}
              </button>
            ))}
          </div>
          {error ? (
            <p className="mt-3 text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-white/90 bg-white/35 px-6 text-center backdrop-blur-md">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-white/70 text-emerald-700 shadow-sm backdrop-blur-md">
            {hasFlashcards ? <Check size={19} /> : <Clock3 size={19} />}
          </span>
          <h3 className="font-semibold text-slate-800">
            {hasFlashcards ? "You’re all caught up" : "Your deck is ready to begin"}
          </h3>
          <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
            {hasFlashcards
              ? "Your next cards will be ready when their review dates arrive."
              : "Create a study set and your due cards will appear here."}
          </p>
        </div>
      )}
    </section>
  );
}
