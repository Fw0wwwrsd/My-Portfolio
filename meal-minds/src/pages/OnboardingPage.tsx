import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/auth'
import { dailyCalorieTarget, macroGrams } from '../lib/nutrition'
import type { ActivityLevel, Goal } from '../lib/types'
import { Button, Card, Input, Label, Select } from '../components/ui'

export function OnboardingPage() {
  const { session, refreshProfile } = useAuth()
  const [form, setForm] = useState({
    age: 32,
    sex: 'male' as 'male' | 'female',
    weight_kg: 85,
    height_cm: 175,
    goal: 'lose' as Goal,
    goal_weight_kg: 78,
    timeline_weeks: 12,
    activity_level: 'light' as ActivityLevel,
    carbs_pct: 40,
    protein_pct: 35,
    fat_pct: 25,
    preferences: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const calories = dailyCalorieTarget({
    sex: form.sex,
    weightKg: form.weight_kg,
    heightCm: form.height_cm,
    age: form.age,
    activity: form.activity_level,
    goal: form.goal,
    goalWeightKg: form.goal_weight_kg,
    timelineWeeks: form.timeline_weeks,
  })
  const macros = macroGrams(calories, form.carbs_pct, form.protein_pct, form.fat_pct)
  const splitOk = form.carbs_pct + form.protein_pct + form.fat_pct === 100

  async function save() {
    if (!session) return
    if (!splitOk) {
      setError('Macro percentages must add up to 100.')
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('profiles').upsert({
      user_id: session.user.id,
      ...form,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      daily_calories: calories,
      preferences: form.preferences || null,
    })
    if (error) setError(error.message)
    else await refreshProfile()
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-lg p-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Set up your plan</h1>
      <p className="mb-6 text-sm text-stone-500">
        We use this to calculate your daily calorie budget and macro targets.
      </p>
      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Age</Label>
            <Input type="number" min={16} max={100} value={form.age} onChange={(e) => set('age', +e.target.value)} />
          </div>
          <div>
            <Label>Sex</Label>
            <Select value={form.sex} onChange={(e) => set('sex', e.target.value as 'male' | 'female')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
          </div>
          <div>
            <Label>Weight (kg)</Label>
            <Input type="number" min={30} value={form.weight_kg} onChange={(e) => set('weight_kg', +e.target.value)} />
          </div>
          <div>
            <Label>Height (cm)</Label>
            <Input type="number" min={100} value={form.height_cm} onChange={(e) => set('height_cm', +e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Goal</Label>
          <Select value={form.goal} onChange={(e) => set('goal', e.target.value as Goal)}>
            <option value="lose">Lose weight</option>
            <option value="build">Build muscle</option>
            <option value="maintain">Maintenance</option>
          </Select>
        </div>

        {form.goal === 'lose' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Goal weight (kg)</Label>
              <Input
                type="number"
                min={30}
                value={form.goal_weight_kg}
                onChange={(e) => set('goal_weight_kg', +e.target.value)}
              />
            </div>
            <div>
              <Label>Timeline (weeks)</Label>
              <Input
                type="number"
                min={1}
                max={104}
                value={form.timeline_weeks}
                onChange={(e) => set('timeline_weeks', +e.target.value)}
              />
            </div>
          </div>
        )}

        <div>
          <Label>Activity level</Label>
          <Select
            value={form.activity_level}
            onChange={(e) => set('activity_level', e.target.value as ActivityLevel)}
          >
            <option value="sedentary">Sedentary (desk job, little exercise)</option>
            <option value="light">Light (1–3 workouts/week)</option>
            <option value="moderate">Moderate (3–5 workouts/week)</option>
            <option value="intense">Intense (6–7 workouts/week)</option>
          </Select>
        </div>

        <div>
          <Label>Macro split (% carbs / protein / fat)</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" min={0} max={100} value={form.carbs_pct} onChange={(e) => set('carbs_pct', +e.target.value)} />
            <Input type="number" min={0} max={100} value={form.protein_pct} onChange={(e) => set('protein_pct', +e.target.value)} />
            <Input type="number" min={0} max={100} value={form.fat_pct} onChange={(e) => set('fat_pct', +e.target.value)} />
          </div>
          {!splitOk && <p className="mt-1 text-xs text-red-600">Must add up to 100%.</p>}
        </div>

        <div>
          <Label>Food preferences (optional)</Label>
          <Input
            placeholder='e.g. "vegetarian, hate fish, max 20 min to cook"'
            value={form.preferences}
            onChange={(e) => set('preferences', e.target.value)}
          />
        </div>

        <div className="rounded-lg bg-brand-50 p-4 text-sm">
          <p className="font-semibold text-brand-700">Your daily target: {calories} kcal</p>
          <p className="text-stone-600">
            {macros.carbs_g}g carbs · {macros.protein_g}g protein · {macros.fat_g}g fat
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={save} disabled={busy} className="w-full">
          {busy ? 'Saving…' : 'Start my plan'}
        </Button>
      </Card>
    </div>
  )
}
