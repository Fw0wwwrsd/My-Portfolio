import type { ActivityLevel, Goal } from './types'

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  intense: 1.725,
}

/** Mifflin-St Jeor basal metabolic rate. */
export function bmr(sex: 'male' | 'female', weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function tdee(
  sex: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  age: number,
  activity: ActivityLevel,
): number {
  return bmr(sex, weightKg, heightCm, age) * ACTIVITY_MULTIPLIER[activity]
}

/**
 * Daily calorie target. For weight loss the deficit is derived from the goal
 * (7700 kcal per kg of body weight), capped at 1000 kcal/day and floored at
 * 1200 kcal/day total, which keeps targets in a safe range.
 */
export function dailyCalorieTarget(opts: {
  sex: 'male' | 'female'
  weightKg: number
  heightCm: number
  age: number
  activity: ActivityLevel
  goal: Goal
  goalWeightKg: number
  timelineWeeks: number
}): number {
  const maintenance = tdee(opts.sex, opts.weightKg, opts.heightCm, opts.age, opts.activity)
  if (opts.goal === 'maintain') return Math.round(maintenance)
  if (opts.goal === 'build') return Math.round(maintenance + 300)

  const kgToLose = Math.max(0, opts.weightKg - opts.goalWeightKg)
  const days = Math.max(1, opts.timelineWeeks * 7)
  const deficit = Math.min(1000, (kgToLose * 7700) / days)
  return Math.round(Math.max(1200, maintenance - deficit))
}

/** Convert a calorie target + macro percentages into gram targets. */
export function macroGrams(calories: number, carbsPct: number, proteinPct: number, fatPct: number) {
  return {
    carbs_g: Math.round((calories * carbsPct) / 100 / 4),
    protein_g: Math.round((calories * proteinPct) / 100 / 4),
    fat_g: Math.round((calories * fatPct) / 100 / 9),
  }
}

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
