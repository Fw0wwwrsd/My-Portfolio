# Meal Minds — the decision AI for nutrition

> Lose weight without the logging. AI plans your meals; you just eat them.

Meal Minds is a predictive meal-planning and real-time coaching assistant. Instead of
tracking what you ate (reactive), it tells you what to eat **before** you eat (proactive):
AI meal recommendations sized to your remaining calorie/macro budget, one-click logging,
and full-day plan generation.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind CSS v4 |
| State / data | Zustand (auth/profile), TanStack React Query (server data) |
| Backend | Supabase (Postgres + Auth + Edge Functions), RLS on every table |
| AI | Claude API (`claude-sonnet-4-6`) via the `meal-ai` edge function, structured JSON outputs |
| Food data | USDA FoodData Central (free API) |

## Features (Phase 1 MVP)

- **Onboarding** — age/weight/height/goal/timeline/activity → daily calorie budget
  (Mifflin-St Jeor BMR × activity, safe deficit caps) and adjustable 40C/35P/25F macro split
- **Dashboard** — calorie budget progress bar, macro bars, today's meals, motivational nudge,
  quick actions
- **Meal AI assistant** — "I'm at the office, 15 min, craving Thai, 450 kcal left" → 3 exact
  meals with portions, macros, a *why*, and a one-click **Log this** button; asks a clarifying
  question when context is too vague
- **Food logging** — USDA food search with portion adjustment, or one-click from AI recs
- **Day plan generator** — full breakfast/lunch/snack/dinner plan matching your target,
  regenerate with extra instructions, save per date
- **History & trends** — 14-day calendar, 7-day calories-vs-goal chart, macro averages,
  on-track streak (±5% of goal)

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Apply the schema: paste `supabase/migrations/0001_init.sql` into the SQL editor,
   or with the CLI: `supabase link --project-ref <ref> && supabase db push`.
3. Deploy the AI function and set the Anthropic key (server-side only — it is never
   exposed to the browser):

   ```bash
   supabase functions deploy meal-ai
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```

### 2. Frontend

```bash
cp .env.example .env   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_USDA_API_KEY
npm install
npm run dev
```

`npm run build` produces a static bundle in `dist/` — deploy to Vercel, Netlify, or any
static host.

## Architecture notes

- **The Anthropic API key lives only in the edge function** (`supabase/functions/meal-ai`).
  The frontend calls it through `supabase.functions.invoke`, which requires a signed-in
  user's JWT — so AI spend is gated by auth.
- **Structured outputs** (`output_config.format` with a JSON schema) make the model's meal
  responses deterministic JSON — no fragile parsing of prose.
- **Row Level Security** on `profiles`, `food_logs`, and `meal_plans` means every user can
  only ever read/write their own rows, even with the public anon key.
- Calorie math lives in `src/lib/nutrition.ts`: Mifflin-St Jeor BMR, activity multipliers,
  goal-derived deficit capped at 1000 kcal/day and floored at 1200 kcal/day.

## Roadmap (Phase 2)

- Adaptive coaching: post-meal check-ins, trend-based smart notifications, personalized swaps
- Accountability: shareable progress, partner streaks, community challenges
- Monetization: Stripe subscription ($9.99–19.99/mo), free tier limited to N AI calls/day
