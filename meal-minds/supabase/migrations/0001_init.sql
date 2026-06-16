-- Meal Minds initial schema
-- Apply with: supabase db push  (or paste into the Supabase SQL editor)

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  age int not null check (age between 13 and 120),
  sex text not null check (sex in ('male', 'female')),
  weight_kg numeric not null check (weight_kg > 0),
  height_cm numeric not null check (height_cm > 0),
  goal_weight_kg numeric not null check (goal_weight_kg > 0),
  timeline_weeks int not null default 12 check (timeline_weeks > 0),
  goal text not null check (goal in ('lose', 'build', 'maintain')),
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'intense')),
  timezone text not null default 'UTC',
  carbs_pct int not null default 40,
  protein_pct int not null default 35,
  fat_pct int not null default 25,
  daily_calories int not null check (daily_calories >= 1000),
  preferences text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (carbs_pct + protein_pct + fat_pct = 100)
);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null,
  calories int not null check (calories >= 0),
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  source text not null default 'manual' check (source in ('ai', 'search', 'manual')),
  created_at timestamptz not null default now()
);

create index food_logs_user_date on public.food_logs (user_id, log_date);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

-- Row Level Security: every row is private to its owner.
alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.meal_plans enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own logs" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own plans" on public.meal_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep updated_at fresh on profile edits.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
