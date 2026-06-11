export type Goal = 'lose' | 'build' | 'maintain'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'intense'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Profile {
  user_id: string
  age: number
  sex: 'male' | 'female'
  weight_kg: number
  height_cm: number
  goal_weight_kg: number
  timeline_weeks: number
  goal: Goal
  activity_level: ActivityLevel
  timezone: string
  carbs_pct: number
  protein_pct: number
  fat_pct: number
  daily_calories: number
  preferences: string | null
}

export interface FoodLog {
  id: string
  user_id: string
  log_date: string
  meal_type: MealType
  description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  source: 'ai' | 'search' | 'manual'
  created_at: string
}

export interface MealRecommendation {
  title: string
  description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  reason: string
}

export interface PlannedMeal {
  meal_type: MealType
  title: string
  description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface DayPlan {
  meals: PlannedMeal[]
  total_calories: number
  notes: string
}
