/** USDA FoodData Central search. Free API; DEMO_KEY works for light testing. */

const API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY'
const BASE = 'https://api.nal.usda.gov/fdc/v1'

// FDC nutrient numbers
const NUTRIENT = { energy: '208', protein: '203', fat: '204', carbs: '205' }

export interface UsdaFood {
  fdcId: number
  description: string
  brandName?: string
  /** Values per 100 g */
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

interface RawNutrient {
  nutrientNumber?: string
  nutrientName?: string
  unitName?: string
  value?: number
}

export async function searchFoods(query: string): Promise<UsdaFood[]> {
  const res = await fetch(
    `${BASE}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&pageSize=15&dataType=Foundation,SR%20Legacy,Branded`,
  )
  if (!res.ok) throw new Error(`USDA search failed (${res.status})`)
  const data = await res.json()

  return (data.foods ?? [])
    .map((f: { fdcId: number; description: string; brandName?: string; foodNutrients?: RawNutrient[] }) => {
      const get = (num: string) =>
        f.foodNutrients?.find((n) => n.nutrientNumber === num)?.value ?? 0
      return {
        fdcId: f.fdcId,
        description: f.description,
        brandName: f.brandName,
        caloriesPer100g: get(NUTRIENT.energy),
        proteinPer100g: get(NUTRIENT.protein),
        carbsPer100g: get(NUTRIENT.carbs),
        fatPer100g: get(NUTRIENT.fat),
      }
    })
    .filter((f: UsdaFood) => f.caloriesPer100g > 0)
}

export function scalePortion(food: UsdaFood, grams: number) {
  const k = grams / 100
  return {
    calories: Math.round(food.caloriesPer100g * k),
    protein_g: Math.round(food.proteinPer100g * k * 10) / 10,
    carbs_g: Math.round(food.carbsPer100g * k * 10) / 10,
    fat_g: Math.round(food.fatPer100g * k * 10) / 10,
  }
}
