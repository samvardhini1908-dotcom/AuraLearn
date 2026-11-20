"use client";

import { BookOpen, LogOut, UserRound } from "lucide-react";
import Link from "next/link";

export default function Navbar({ user, onLogout }) {
  return (
    <header className="sticky top-0 z-20 border-b border-emerald-100/80 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-300/40">
            <BookOpen size={21} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight text-slate-900">
              AuraLearn
            </span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700/70 sm:block">
              Learn with intention
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/70 px-3 py-2 text-xs font-semibold text-emerald-800">
            <UserRound size={15} aria-hidden="true" />
            <span>Welcome, {user.name}</span>
          </span>
          <button
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800"
            onClick={onLogout}
            type="button"
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
