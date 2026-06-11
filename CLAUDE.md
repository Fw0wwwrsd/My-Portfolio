# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repository contains two unrelated projects:

1. **Root** — a personal portfolio website for Nhlamulo Shingange, plain static HTML with no build system, package manager, linters, or tests.
2. **`meal-minds/`** — Meal Minds, an AI nutrition coaching web app (React + TypeScript + Vite + Tailwind v4, Supabase backend, Claude API). See `meal-minds/README.md` for full setup.

## Portfolio site (repo root)

- `index.html` — main portfolio page (summary, education, work experience, skills, awards), links to the other two pages
- `Hobbies.html` — hobbies list
- `Contact  Me.html` — contact details (note: the filename contains **two spaces** between "Contact" and "Me"; `index.html` links to it as `./Contact  Me.html`, so renaming it requires updating that link)
- `Professional picture.jpeg` — profile photo referenced from `index.html`

No build, lint, or test commands. Preview by opening the HTML files in a browser or `python3 -m http.server 8000`. All references use relative paths and several filenames contain spaces — keep links and filenames exactly in sync.

## Meal Minds app (`meal-minds/`)

Commands (run inside `meal-minds/`):

```bash
npm install        # install dependencies
npm run dev        # dev server (needs .env — copy .env.example)
npm run build      # type-check (tsc -b) + production build; this is the CI gate
npm run lint       # eslint
```

Architecture:

- **Frontend**: React 19 + React Router. Zustand holds session/profile (`src/stores/auth.ts`); TanStack React Query handles all Supabase reads/writes (`src/api/`). Tailwind v4 via the `@tailwindcss/vite` plugin — theme tokens live in `src/index.css` (`@theme`), there is no tailwind.config file.
- **Routing gate** in `src/App.tsx`: no session → AuthPage, session without profile row → OnboardingPage, otherwise the app shell.
- **Backend**: Supabase. Schema + RLS policies in `supabase/migrations/0001_init.sql` (tables: `profiles`, `food_logs`, `meal_plans`; every table is owner-only via RLS).
- **AI**: `supabase/functions/meal-ai/index.ts` is a Deno edge function calling the Claude API (`claude-sonnet-4-6`) with structured JSON outputs (`output_config.format`). The `ANTHROPIC_API_KEY` is an edge-function secret only — never put it in frontend env vars. Frontend calls it via `supabase.functions.invoke('meal-ai', ...)` in `src/api/mealAI.ts`.
- **Nutrition math** (BMR/TDEE/calorie targets/macro grams) is centralized in `src/lib/nutrition.ts` — keep calorie logic there, not in components.
- **Food search**: USDA FoodData Central client in `src/lib/usda.ts` (values normalized per 100 g; `scalePortion` converts to grams eaten).

Conventions: snake_case for DB columns and API payloads (matching Postgres), camelCase elsewhere; pages in `src/pages/`, shared primitives in `src/components/ui.tsx`.
