import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../stores/auth'
import { useLogsForDate, sumLogs, useAddLog } from '../api/logs'
import { getMealRecommendations, type RecommendResult } from '../api/mealAI'
import { macroGrams, todayISO } from '../lib/nutrition'
import type { MealType } from '../lib/types'
import { Button, Card, Input, Label, MacroPill, Select } from '../components/ui'

export function AssistantPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const today = todayISO()
  const { data: logs } = useLogsForDate(today)
  const addLog = useAddLog()

  const [context, setContext] = useState('')
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [result, setResult] = useState<RecommendResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!profile) return null
  const eaten = sumLogs(logs ?? [])
  const remaining = profile.daily_calories - eaten.calories
  const proteinTarget = macroGrams(
    profile.daily_calories, profile.carbs_pct, profile.protein_pct, profile.fat_pct,
  ).protein_g
  const proteinRemaining = Math.max(0, proteinTarget - eaten.protein_g)

  async function ask() {
    if (!profile) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await getMealRecommendations(profile, {
        context: `Meal: ${mealType}. ${context || 'No extra context given.'}`,
        caloriesRemaining: remaining,
        proteinRemainingG: proteinRemaining,
      })
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function logRecommendation(i: number) {
    const rec = result?.recommendations[i]
    if (!rec) return
    await addLog.mutateAsync({
      log_date: today,
      meal_type: mealType,
      description: rec.title,
      calories: rec.calories,
      protein_g: rec.protein_g,
      carbs_g: rec.carbs_g,
      fat_g: rec.fat_g,
      source: 'ai',
    })
    navigate('/')
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-1 font-semibold">What should I eat?</h2>
        <p className="mb-4 text-sm text-stone-500">
          You have <strong>{remaining} kcal</strong> and ~{Math.round(proteinRemaining)}g protein left today.
        </p>
        <div className="space-y-3">
          <div>
            <Label>Meal</Label>
            <Select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </Select>
          </div>
          <div>
            <Label>Context (where you are, time, cravings…)</Label>
            <Input
              placeholder='e.g. "At the office, 15 minutes, craving Thai"'
              value={context}
              onChange={(e) => setContext(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
            />
          </div>
          <Button onClick={ask} disabled={busy} className="w-full">
            {busy ? 'Thinking…' : 'Recommend 3 meals'}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Card>

      {result?.clarifying_question && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            <strong>Quick question:</strong> {result.clarifying_question}
          </p>
          <p className="mt-1 text-xs text-amber-700">Add details to the context box and ask again.</p>
        </Card>
      )}

      {result?.recommendations.map((rec, i) => (
        <Card key={i}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{rec.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{rec.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <MacroPill label="P" grams={rec.protein_g} />
                <MacroPill label="C" grams={rec.carbs_g} />
                <MacroPill label="F" grams={rec.fat_g} />
              </div>
              <p className="mt-2 text-xs italic text-brand-700">{rec.reason}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold">{rec.calories}</p>
              <p className="text-xs text-stone-400">kcal</p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="mt-3 w-full"
            disabled={addLog.isPending}
            onClick={() => logRecommendation(i)}
          >
            Log this
          </Button>
        </Card>
      ))}
    </div>
  )
}
