import { supabase } from '../lib/supabase'
import type { DayPlan, MealRecommendation, Profile } from '../lib/types'

export interface RecommendInput {
  /** Free-form context, e.g. "At home, 20 min, want something Mexican" */
  context: string
  caloriesRemaining: number
  proteinRemainingG: number
}

export interface RecommendResult {
  recommendations: MealRecommendation[]
  /** Set when the model needs more context instead of recommending. */
  clarifying_question: string | null
}

function profileSummary(profile: Profile) {
  return {
    goal: profile.goal,
    daily_calories: profile.daily_calories,
    macro_split: `${profile.carbs_pct}C/${profile.protein_pct}P/${profile.fat_pct}F`,
    preferences: profile.preferences ?? 'none stated',
  }
}

export async function getMealRecommendations(
  profile: Profile,
  input: RecommendInput,
): Promise<RecommendResult> {
  const { data, error } = await supabase.functions.invoke('meal-ai', {
    body: {
      action: 'recommend',
      profile: profileSummary(profile),
      context: input.context,
      calories_remaining: input.caloriesRemaining,
      protein_remaining_g: input.proteinRemainingG,
    },
  })
  if (error) throw new Error(error.message ?? 'Meal AI request failed')
  return data as RecommendResult
}

export async function generateDayPlan(
  profile: Profile,
  opts: { planDate: string; extraInstructions: string },
): Promise<DayPlan> {
  const { data, error } = await supabase.functions.invoke('meal-ai', {
    body: {
      action: 'plan_day',
      profile: profileSummary(profile),
      plan_date: opts.planDate,
      extra_instructions: opts.extraInstructions,
    },
  })
  if (error) throw new Error(error.message ?? 'Meal AI request failed')
  return data as DayPlan
}
