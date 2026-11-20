"use client";

import { ArrowUpRight, Target } from "lucide-react";

export default function StudyPath({ studyPath, weakTopics = [] }) {
  const roadmap = Array.isArray(studyPath?.recommendedTopics)
    ? [...studyPath.recommendedTopics].sort(
        (left, right) => left.priority - right.priority,
      )
    : [];

  return (
    <section className="glass-panel p-6 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-100 to-emerald-100 text-emerald-700">
            <Target size={19} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Your study path
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Focus areas shaped by your latest quiz.
          </p>
        </div>
        {studyPath ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3 py-1 text-xs font-semibold capitalize text-emerald-700 shadow-[0_0_18px_rgba(16,185,129,0.14)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            {studyPath.status.toLowerCase()}
          </span>
        ) : null}
      </div>

      {weakTopics.length > 0 ? (
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Topics to revisit
          </h3>
          <div className="space-y-2">
            {weakTopics.map((topic) => (
              <div
                className="rounded-2xl border border-rose-100/70 bg-rose-50/45 px-4 py-3 backdrop-blur-md"
                key={topic.topic}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-800">
                    {topic.topic}
                  </span>
                  <span className="text-xs font-semibold text-rose-600">
                    {topic.accuracy}% accuracy
                  </span>
                </div>
                <div
                  aria-label={`${topic.accuracy}% accuracy for ${topic.topic}`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={topic.accuracy}
                  className="h-1.5 overflow-hidden rounded-full bg-white/70"
                  role="progressbar"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500"
                    style={{ width: `${topic.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {roadmap.length > 0 ? (
        <div className="space-y-0">
          {roadmap.map((item, index) => {
            const mastery = Number.isFinite(item.mastery)
              ? Math.max(0, Math.min(100, item.mastery))
              : null;

            return (
              <article
                className="relative flex gap-3 pb-5 last:pb-0"
                key={item.topic}
              >
                {index < roadmap.length - 1 ? (
                  <span className="absolute bottom-0 left-[15px] top-8 w-px bg-emerald-200" />
                ) : null}
                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200/80 bg-gradient-to-r from-emerald-600 to-teal-500 text-xs font-bold text-white shadow-sm">
                  {item.priority}
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-white/80 bg-white/45 p-4 shadow-sm backdrop-blur-md">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-800">{item.topic}</h3>
                    <ArrowUpRight
                      className="mt-0.5 shrink-0 text-slate-300"
                      size={16}
                      aria-hidden="true"
                    />
                  </div>
                  {mastery !== null ? (
                    <div className="mt-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-500">Mastery</span>
                        <span className="font-semibold text-emerald-700">
                          {mastery}%
                        </span>
                      </div>
                      <div
                        aria-label={`${mastery}% mastery for ${item.topic}`}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={mastery}
                        className="h-1.5 overflow-hidden rounded-full bg-white/70"
                        role="progressbar"
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500"
                          style={{ width: `${mastery}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.reason}
                  </p>
                  <p className="mt-3 rounded-xl border border-emerald-100/80 bg-gradient-to-r from-emerald-50/80 to-teal-50/70 px-3 py-2 text-sm leading-5 text-emerald-900">
                    {item.action}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/90 bg-white/35 px-5 py-6 text-center backdrop-blur-md">
          <p className="text-sm font-medium text-slate-700">
            {studyPath ? "No weak topics in your latest quiz." : "Your roadmap appears here"}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-slate-500">
            Complete a quiz to get a prioritized plan for what to study next.
          </p>
        </div>
      )}
    </section>
  );
}
