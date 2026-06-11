import { ProgressBar } from './ui'

export function MacroBars({
  eaten,
  target,
}: {
  eaten: { protein_g: number; carbs_g: number; fat_g: number }
  target: { protein_g: number; carbs_g: number; fat_g: number }
}) {
  const rows = [
    { label: 'Protein', value: eaten.protein_g, max: target.protein_g },
    { label: 'Carbs', value: eaten.carbs_g, max: target.carbs_g },
    { label: 'Fat', value: eaten.fat_g, max: target.fat_g },
  ]
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between text-xs text-stone-500">
            <span>{r.label}</span>
            <span>
              {Math.round(r.value)} / {r.max} g
            </span>
          </div>
          <ProgressBar value={r.value} max={r.max} />
        </div>
      ))}
    </div>
  )
}
