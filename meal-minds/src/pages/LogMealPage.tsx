import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchFoods, scalePortion, type UsdaFood } from '../lib/usda'
import { useAddLog } from '../api/logs'
import { todayISO } from '../lib/nutrition'
import type { MealType } from '../lib/types'
import { Button, Card, Input, Label, MacroPill, Select, Spinner } from '../components/ui'

export function LogMealPage() {
  const navigate = useNavigate()
  const addLog = useAddLog()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UsdaFood[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<UsdaFood | null>(null)
  const [grams, setGrams] = useState(100)
  const [mealType, setMealType] = useState<MealType>('lunch')

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    setError(null)
    setSelected(null)
    try {
      setResults(await searchFoods(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function confirm() {
    if (!selected) return
    const scaled = scalePortion(selected, grams)
    await addLog.mutateAsync({
      log_date: todayISO(),
      meal_type: mealType,
      description: `${selected.description} (${grams}g)`,
      ...scaled,
      source: 'search',
    })
    navigate('/')
  }

  const scaled = selected ? scalePortion(selected, grams) : null

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 font-semibold">Log a meal</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search foods (USDA database)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search} disabled={searching}>
            Search
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      {searching && <Spinner />}

      {selected && scaled && (
        <Card className="border-brand-500">
          <h3 className="font-semibold">{selected.description}</h3>
          {selected.brandName && <p className="text-xs text-stone-400">{selected.brandName}</p>}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label>Portion (grams)</Label>
              <Input type="number" min={1} value={grams} onChange={(e) => setGrams(+e.target.value || 0)} />
              <div className="mt-1 flex gap-1">
                {[50, 100, 150, 250].map((g) => (
                  <button
                    key={g}
                    className="rounded bg-stone-100 px-2 py-0.5 text-xs hover:bg-stone-200"
                    onClick={() => setGrams(g)}
                  >
                    {g}g
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Meal</Label>
              <Select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1">
              <MacroPill label="P" grams={scaled.protein_g} />
              <MacroPill label="C" grams={scaled.carbs_g} />
              <MacroPill label="F" grams={scaled.fat_g} />
            </div>
            <span className="font-bold">{scaled.calories} kcal</span>
          </div>
          <Button className="mt-3 w-full" disabled={addLog.isPending} onClick={confirm}>
            {addLog.isPending ? 'Logging…' : 'Confirm & add to today'}
          </Button>
        </Card>
      )}

      {results && !selected && (
        <Card>
          {results.length === 0 ? (
            <p className="text-sm text-stone-500">No results. Try a simpler term.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {results.map((f) => (
                <li key={f.fdcId}>
                  <button
                    className="flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-stone-50"
                    onClick={() => setSelected(f)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{f.description}</p>
                      <p className="text-xs text-stone-400">
                        {f.brandName ? `${f.brandName} · ` : ''}per 100g: {Math.round(f.caloriesPer100g)} kcal,{' '}
                        {Math.round(f.proteinPer100g)}g protein
                      </p>
                    </div>
                    <span className="text-xs text-brand-700">Select</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}
