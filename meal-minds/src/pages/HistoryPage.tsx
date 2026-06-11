import { useMemo, useState } from 'react'
import { useAuth } from '../stores/auth'
import { useLogsForRange, sumLogs } from '../api/logs'
import { Card, MacroPill, Spinner } from '../components/ui'
import type { FoodLog } from '../lib/types'

const DAYS_SHOWN = 14

function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function HistoryPage() {
  const { profile } = useAuth()
  const from = isoDaysAgo(DAYS_SHOWN - 1)
  const to = isoDaysAgo(0)
  const { data: logs, isLoading } = useLogsForRange(from, to)
  const [selectedDate, setSelectedDate] = useState(to)

  const byDate = useMemo(() => {
    const map = new Map<string, FoodLog[]>()
    for (const l of logs ?? []) {
      map.set(l.log_date, [...(map.get(l.log_date) ?? []), l])
    }
    return map
  }, [logs])

  if (!profile) return null
  if (isLoading) return <Spinner />

  const target = profile.daily_calories
  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => isoDaysAgo(DAYS_SHOWN - 1 - i))
  const last7 = days.slice(-7)

  // Streak: consecutive days (ending today, skipping today if unlogged) within ±5% of goal
  let streak = 0
  for (let i = 0; i < DAYS_SHOWN; i++) {
    const date = isoDaysAgo(i)
    const dayLogs = byDate.get(date)
    if (!dayLogs?.length) {
      if (i === 0) continue // today may simply not be logged yet
      break
    }
    const total = sumLogs(dayLogs).calories
    if (Math.abs(total - target) / target <= 0.05) streak++
    else break
  }

  const loggedDays7 = last7.filter((d) => byDate.get(d)?.length)
  const avg = (sel: (s: ReturnType<typeof sumLogs>) => number) =>
    loggedDays7.length
      ? Math.round(loggedDays7.reduce((acc, d) => acc + sel(sumLogs(byDate.get(d)!)), 0) / loggedDays7.length)
      : 0

  const selectedLogs = byDate.get(selectedDate) ?? []
  const maxBar = Math.max(target * 1.2, ...last7.map((d) => sumLogs(byDate.get(d) ?? []).calories))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="text-3xl font-bold text-brand-700">{streak}</p>
          <p className="text-xs text-stone-500">day streak on track (±5%)</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold">{avg((s) => s.calories)}</p>
          <p className="text-xs text-stone-500">avg kcal/day (last 7 logged)</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Last 7 days vs goal</h2>
        <div className="flex h-32 items-end gap-2">
          {last7.map((d) => {
            const total = sumLogs(byDate.get(d) ?? []).calories
            const onTrack = total > 0 && Math.abs(total - target) / target <= 0.05
            return (
              <button
                key={d}
                className="group flex flex-1 flex-col items-center gap-1"
                onClick={() => setSelectedDate(d)}
                title={`${d}: ${total} kcal`}
              >
                <div className="flex w-full flex-1 items-end rounded bg-stone-100">
                  <div
                    className={`w-full rounded ${total > target ? 'bg-red-400' : onTrack ? 'bg-brand-500' : 'bg-brand-100'}`}
                    style={{ height: `${maxBar > 0 ? (total / maxBar) * 100 : 0}%` }}
                  />
                </div>
                <span className={`text-[10px] ${d === selectedDate ? 'font-bold text-brand-700' : 'text-stone-400'}`}>
                  {d.slice(8)}
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-stone-400">
          Goal: {target} kcal/day · 7-day averages: {avg((s) => s.protein_g)}g P / {avg((s) => s.carbs_g)}g C /{' '}
          {avg((s) => s.fat_g)}g F
        </p>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{selectedDate}</h2>
          <select
            className="rounded border border-stone-200 px-2 py-1 text-xs"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            {days
              .slice()
              .reverse()
              .map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
          </select>
        </div>
        {selectedLogs.length === 0 ? (
          <p className="text-sm text-stone-500">No meals logged this day.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {selectedLogs.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2">
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
                <span className="shrink-0 text-sm font-semibold">{l.calories}</span>
              </li>
            ))}
            <li className="flex justify-between py-2 text-sm font-bold">
              <span>Total</span>
              <span>{sumLogs(selectedLogs).calories} kcal</span>
            </li>
          </ul>
        )}
      </Card>
    </div>
  )
}
