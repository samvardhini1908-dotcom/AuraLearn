"use client";

import { useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  BookOpen,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import LearningDashboard from "@/components/LearningDashboard";

const USER_STORAGE_KEY = "auralearn:user";

function subscribeToUser(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener("auralearn:user-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("auralearn:user-change", callback);
  };
}

function getStoredUser() {
  return window.localStorage.getItem(USER_STORAGE_KEY) || "";
}

function getServerUser() {
  return "__loading__";
}

function parseUser(storedUser) {
  try {
    const parsedUser = JSON.parse(storedUser);
    return parsedUser &&
      typeof parsedUser.id === "string" &&
      typeof parsedUser.name === "string" &&
      typeof parsedUser.email === "string"
      ? parsedUser
      : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const storedUser = useSyncExternalStore(
    subscribeToUser,
    getStoredUser,
    getServerUser,
  );
  const user = storedUser === "__loading__" ? null : parseUser(storedUser);
  const isReady = storedUser !== "__loading__";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Learner");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not sign in.");
      }

      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
      window.dispatchEvent(new Event("auralearn:user-change"));
    } catch (requestError) {
      setError(requestError.message || "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem(USER_STORAGE_KEY);
    window.dispatchEvent(new Event("auralearn:user-change"));
    setName("");
    setEmail("");
  }

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="animate-spin text-emerald-600" size={28} />
      </main>
    );
  }

  if (user) {
    return (
      <main className="min-h-screen text-slate-900">
        <Navbar user={user} onLogout={handleLogout} />
        <LearningDashboard key={user.id} user={user} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col px-4 py-6 text-slate-900">
      <header className="mx-auto flex w-full max-w-7xl items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-300/50">
          <BookOpen size={22} aria-hidden="true" />
        </span>
        <span>
          <span className="block text-lg font-bold tracking-tight">AuraLearn</span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/70">
            Learn with intention
          </span>
        </span>
      </header>

      <section className="flex flex-1 items-center justify-center py-10">
        <div className="glass-panel w-full max-w-md p-7 sm:p-9">
          <div className="mb-7 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-300/40">
              <BookOpen size={27} aria-hidden="true" />
            </span>
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles size={13} aria-hidden="true" />
              Your learning space awaits
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome to AuraLearn
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to organize your notes, review cards, and grow your skills.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSignIn}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="full-name">
                Full name
              </label>
              <input
                autoComplete="name"
                className="form-input"
                id="full-name"
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                required
                value={name}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="email">
                Email address
              </label>
              <input
                autoComplete="email"
                className="form-input"
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="role">
                Role or target subject/course
              </label>
              <input
                className="form-input"
                id="role"
                maxLength={80}
                onChange={(event) => setRole(event.target.value)}
                placeholder="Student, Biology, or Web Development"
                value={role}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Choose Student/Learner or enter what you’re studying.
              </p>
            </div>

            {error ? (
              <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
                {error}
              </p>
            ) : null}

            <button
              className="primary-button w-full"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
              ) : (
                <ArrowRight size={17} aria-hidden="true" />
              )}
              {isSubmitting ? "Signing you in..." : "Continue to AuraLearn"}
            </button>
          </form>
          <p className="mt-5 text-center text-xs leading-5 text-slate-400">
            Your learner profile and study progress are saved to your AuraLearn account.
          </p>
        </div>
      </section>
    </main>
  );
}
