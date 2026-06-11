import { Link } from 'react-router-dom'
import { useAuth } from '../stores/auth'
import { useLogsForDate, sumLogs, useDeleteLog } from '../api/logs'
import { macroGrams, todayISO } from '../lib/nutrition'
import { Button, Card, MacroPill, ProgressBar, Spinner } from '../components/ui'
import { MacroBars } from '../components/MacroBars'

function motivation(eaten: number, target: number): string {
  if (eaten === 0) return 'Fresh day, fresh start. Plan your meals before hunger decides for you.'
  const pct = eaten / target
  if (pct < 0.5) return "You're pacing well. Plenty of budget left for a satisfying dinner."
  if (pct <= 1.0) return 'Right on track — finish strong tonight.'
  if (pct <= 1.05) return "You're a touch over, but within range. A light dinner keeps the streak alive."
  return 'Over budget today. Tomorrow is a clean slate — let the AI plan it for you.'
}

export function DashboardPage() {
  const { profile } = useAuth()
  const today = todayISO()
  const { data: logs, isLoading } = useLogsForDate(today)
  const deleteLog = useDeleteLog()

  if (!profile) return null
  if (isLoading || !logs) return <Spinner />

  const eaten = sumLogs(logs)
  const remaining = profile.daily_calories - eaten.calories
  const targets = macroGrams(profile.daily_calories, profile.carbs_pct, profile.protein_pct, profile.fat_pct)

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">Today's budget</h2>
          <span className="text-sm text-stone-500">
            {eaten.calories} / {profile.daily_calories} kcal
          </span>
        </div>
        <ProgressBar value={eaten.calories} max={profile.daily_calories} />
        <p className={`mt-2 text-sm font-medium ${remaining >= 0 ? 'text-brand-700' : 'text-red-600'}`}>
          {remaining >= 0 ? `${remaining} kcal remaining` : `${-remaining} kcal over`}
        </p>
        <p className="mt-3 text-sm text-stone-500">{motivation(eaten.calories, profile.daily_calories)}</p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Macros</h2>
        <MacroBars eaten={eaten} target={targets} />
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Link to="/plan">
          <Button variant="secondary" className="w-full">Plan meals</Button>
        </Link>
        <Link to="/log">
          <Button variant="secondary" className="w-full">Log meal</Button>
        </Link>
        <Link to="/assistant">
          <Button className="w-full">Get meal idea</Button>
        </Link>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Meals logged today ({logs.length})</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing yet. Ask the AI what to eat.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize">
                    <span className="text-stone-400">{l.meal_type} · </span>
                    {l.description}
                  </p>
                  <div className="mt-1 flex gap-1">
                    <MacroPill label="P" grams={l.protein_g} />
                    <MacroPill label="C" grams={l.carbs_g} />
                    <MacroPill label="F" grams={l.fat_g} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold">{l.calories}</span>
                  <button
                    className="text-xs text-stone-400 hover:text-red-600"
                    onClick={() => deleteLog.mutate(l.id)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
