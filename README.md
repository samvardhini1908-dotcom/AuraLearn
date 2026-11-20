# AuraLearn

AuraLearn is a JavaScript-only learning dashboard built with Next.js App Router, Prisma, PostgreSQL, and Tailwind CSS. Learning materials are processed locally; the app does not require an external AI API.

## Neon and Prisma

Copy `.env.example` to `.env.local` and set both Neon connection strings:

- `DATABASE_URL`: pooled Neon URL used by the app at runtime.
- `DATABASE_URL_UNPOOLED`: direct Neon URL used by Prisma for migrations.

Apply database migrations and generate the Prisma Client:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm start
```

AuraLearn opens with an email-based learner profile gate. The profile is saved in
the current browser so the learner can return to their dashboard, which is
organized into Study Materials, Cards Due, and Quiz sections. Learners can paste
notes or add a plain-text/Markdown file to create study materials, flashcards,
and quizzes.

The API routes create learner profiles, process materials, analyze quiz answers,
review flashcards, and serve user-scoped dashboard data under `app/api/`.
