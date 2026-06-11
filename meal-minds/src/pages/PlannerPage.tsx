import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../stores/auth'
import { generateDayPlan } from '../api/mealAI'
import { useAddLog } from '../api/logs'
import { todayISO } from '../lib/nutrition'
import type { DayPlan } from '../lib/types'
import { Button, Card, Input, Label, MacroPill, Select } from '../components/ui'

function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function PlannerPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const addLog = useAddLog()
  const [planDate, setPlanDate] = useState(tomorrowISO())
  const [instructions, setInstructions] = useState('')
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  const savedPlan = useQuery({
    queryKey: ['plan', planDate],
    queryFn: async (): Promise<DayPlan | null> => {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('plan')
        .eq('plan_date', planDate)
        .maybeSingle()
      if (error) throw error
      return (data?.plan as DayPlan) ?? null
    },
  })

  const generate = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('No profile')
      return generateDayPlan(profile, { planDate, extraInstructions: instructions })
    },
    onSuccess: (p) => {
      setPlan(p)
      setError(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Generation failed'),
  })

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user || !plan) throw new Error('Nothing to save')
      const { error } = await supabase
        .from('meal_plans')
        .upsert({ user_id: userData.user.id, plan_date: planDate, plan }, { onConflict: 'user_id,plan_date' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', planDate] }),
  })

  if (!profile) return null
  const shown = plan ?? savedPlan.data ?? null

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 font-semibold">Plan a full day</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Day</Label>
              <Select value={planDate} onChange={(e) => setPlanDate(e.target.value)}>
                <option value={todayISO()}>Today</option>
                <option value={tomorrowISO()}>Tomorrow</option>
              </Select>
            </div>
            <div>
              <Label>Target</Label>
              <p className="py-2 text-sm font-medium">{profile.daily_calories} kcal</p>
            </div>
          </div>
          <div>
            <Label>Anything to consider? (optional)</Label>
            <Input
              placeholder='e.g. "dinner out with friends, keep lunch light"'
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending} className="w-full">
            {generate.isPending ? 'Planning…' : shown ? 'Regenerate plan' : 'Generate plan'}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Card>

      {shown && (
        <>
          {shown.meals.map((m, i) => (
            <Card key={i}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{m.meal_type}</p>
                  <h3 className="font-semibold">{m.title}</h3>
                  <p className="mt-1 text-sm text-stone-600">{m.description}</p>
                  <div className="mt-2 flex gap-1">
                    <MacroPill label="P" grams={m.protein_g} />
                    <MacroPill label="C" grams={m.carbs_g} />
                    <MacroPill label="F" grams={m.fat_g} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold">{m.calories}</p>
                  <p className="text-xs text-stone-400">kcal</p>
                </div>
              </div>
              {planDate === todayISO() && (
                <Button
                  variant="ghost"
                  className="mt-2 w-full"
                  disabled={addLog.isPending}
                  onClick={() =>
                    addLog.mutate({
                      log_date: planDate,
                      meal_type: m.meal_type,
                      description: m.title,
                      calories: m.calories,
                      protein_g: m.protein_g,
                      carbs_g: m.carbs_g,
                      fat_g: m.fat_g,
                      source: 'ai',
                    })
                  }
                >
                  I ate this — log it
                </Button>
              )}
            </Card>
          ))}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Day total: {shown.total_calories} kcal</p>
                {shown.notes && <p className="mt-1 text-xs text-stone-500">{shown.notes}</p>}
              </div>
              <Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? 'Saving…' : save.isSuccess ? 'Saved ✓' : 'Save plan'}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
