"use client";

import { useState } from "react";
import { FileText, LoaderCircle, Sparkles } from "lucide-react";

export default function UploadMaterial({ userId, onProcessed }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    setSuccess("");
    if (file.size > 200000) {
      setError("Choose a text file under 50,000 characters.");
      event.target.value = "";
      return;
    }

    try {
      const fileContent = await file.text();
      if (fileContent.length > 50000) {
        setError("Choose a text file no larger than 50,000 characters.");
        event.target.value = "";
        return;
      }
      setContent(fileContent);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.(?:txt|md)$/i, ""));
      }
    } catch (fileError) {
      console.error("Could not read the selected study material.", fileError);
      setError("Could not read this file. Paste your notes or choose another file.");
      event.target.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/materials/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title, content }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not process this material.");
      }

      onProcessed(result);
      setTitle("");
      setContent("");
      setSuccess("Your flashcards and quiz are ready.");
    } catch (requestError) {
      setError(requestError.message || "Could not process this material.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="glass-panel p-6 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700">
            <Sparkles size={19} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Turn notes into a study set
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Add your notes and AuraLearn will create flashcards and a short quiz.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/75 px-3 py-1 text-xs font-semibold text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Offline parser
        </span>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            className="mb-2 block text-sm font-medium text-slate-700"
            htmlFor="material-title"
          >
            Material title
          </label>
          <input
            id="material-title"
            className="form-input"
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Cell biology — week 3"
            required
            value={title}
          />
        </div>

        <div>
          <label
            className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"
            htmlFor="material-file"
          >
            <FileText size={16} aria-hidden="true" />
            Add a text file
          </label>
          <input
            accept=".txt,.md,text/plain,text/markdown"
            className="form-input file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-800"
            id="material-file"
            onChange={handleFileChange}
            type="file"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            Plain text or Markdown, up to 50,000 characters.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="material-content"
            >
              Study notes
            </label>
            <span className="text-xs text-slate-400">
              {content.length.toLocaleString()} / 50,000
            </span>
          </div>
          <textarea
            id="material-content"
            className="form-input min-h-40 resize-y leading-6"
            maxLength={50000}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Paste a lesson, lecture notes, or a topic summary..."
            required
            rows={6}
            value={content}
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
            {success}
          </p>
        ) : null}

        {!userId ? (
          <p className="text-xs text-slate-500">
            Connect an existing learner profile to create a study set.
          </p>
        ) : null}

        <button
          className="primary-button w-full"
          disabled={
            !userId || isLoading || !title.trim() || !content.trim()
          }
          type="submit"
        >
          {isLoading ? (
            <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
          ) : (
            <Sparkles size={17} aria-hidden="true" />
          )}
          {isLoading ? "Creating your study set..." : "Generate study set"}
        </button>
      </form>
    </section>
  );
}
