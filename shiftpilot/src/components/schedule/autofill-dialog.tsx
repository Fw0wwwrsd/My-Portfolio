"use client";

import { useEffect, useState, useTransition } from "react";
import { applyAutoScheduleAction, runAutoSchedule } from "@/lib/actions/shifts";
import type { AutoSchedulePreview } from "@/lib/services/scheduling";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form";

export function AutoFillDialog({
  weekStartKey,
  onClose,
  onApplied,
}: {
  weekStartKey: string;
  onClose: () => void;
  onApplied: (info: string) => void;
}) {
  const [preferLowerCost, setPreferLowerCost] = useState(false);
  const [preview, setPreview] = useState<AutoSchedulePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReasons, setShowReasons] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    runAutoSchedule(weekStartKey, { preferLowerCost }).then((result) => {
      if (!cancelled) {
        setPreview(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [weekStartKey, preferLowerCost]);

  const apply = () => {
    if (!preview) return;
    startTransition(async () => {
      const result = await applyAutoScheduleAction(preview.assignments);
      onApplied(result.info ?? "Auto-fill applied.");
    });
  };

  return (
    <Dialog open onClose={onClose} title="⚡ Auto-fill this week" wide>
      <p className="mb-4 text-sm text-slate-500">
        The scheduler fills open shifts respecting availability, approved time off, qualified
        roles, max weekly hours and minimum rest — then spreads hours fairly. Nothing is saved
        until you apply.
      </p>

      <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={preferLowerCost}
          onChange={(e) => setPreferLowerCost(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Prefer lower-cost employees when fairness is equal
      </label>

      {loading || !preview ? (
        <p className="py-8 text-center text-sm text-slate-400">Crunching the roster…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{preview.assignments.length}</p>
              <p className="text-xs text-green-600">shifts filled</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{preview.unfilled.length}</p>
              <p className="text-xs text-amber-600">couldn&apos;t be filled</p>
            </div>
          </div>

          {preview.assignments.length > 0 && (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2">
              {preview.assignments.map((a) => (
                <div key={a.shiftId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-600">{preview.shiftLabels[a.shiftId] ?? a.shiftId}</span>
                  <span className="shrink-0 font-medium text-slate-900">→ {a.employeeName}</span>
                </div>
              ))}
            </div>
          )}

          {preview.unfilled.length > 0 && (
            <div>
              <button
                onClick={() => setShowReasons((v) => !v)}
                className="text-xs font-medium text-amber-700 hover:underline"
              >
                {showReasons ? "Hide" : "Show"} why {preview.unfilled.length} shifts couldn&apos;t be filled
              </button>
              {showReasons && (
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-amber-100 bg-amber-50/50 p-2">
                  {preview.unfilled.map((u) => (
                    <div key={u.shiftId} className="text-xs">
                      <p className="font-semibold text-amber-800">{preview.shiftLabels[u.shiftId] ?? u.shiftId}</p>
                      <ul className="ml-3 list-disc text-amber-700">
                        {u.reasons.slice(0, 4).map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                        {u.reasons.length > 4 && <li>… and {u.reasons.length - 4} more</li>}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {preview.assignments.length === 0 && (
            <Alert tone="warning">
              No open shifts could be filled. Check team availability, roles, and time off.
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={pending || preview.assignments.length === 0}>
              {pending ? "Applying…" : `Apply ${preview.assignments.length} assignments`}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
