"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addDays,
  DAY_NAMES_SHORT,
  formatDateKey,
  formatTimeRange,
  formatWeekRange,
  fromDateKey,
  shiftDurationHours,
  todayKey,
  weekDays,
} from "@/lib/dates";
import {
  copyPreviousWeek,
  deleteShift,
  generateWeekFromTemplates,
  publishWeekAction,
  type ActionResult,
} from "@/lib/actions/shifts";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/form";
import { ShiftDialog, type GridRole, type GridEmployee, type GridShift } from "./shift-dialog";
import { AutoFillDialog } from "./autofill-dialog";

export function ScheduleClient({
  weekStartKey,
  manager,
  roles,
  employees,
  shifts,
}: {
  weekStartKey: string;
  manager: boolean;
  roles: GridRole[];
  employees: GridEmployee[];
  shifts: GridShift[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "error" | "success" | "warning"; text: string } | null>(null);
  const [dialog, setDialog] = useState<
    | { mode: "create"; dateKey: string; userId: string | null }
    | { mode: "edit"; shift: GridShift }
    | null
  >(null);
  const [autoFillOpen, setAutoFillOpen] = useState(false);

  const days = weekDays(weekStartKey);
  const today = todayKey();
  const roleById = new Map(roles.map((r) => [r.id, r]));

  const openShifts = shifts.filter((s) => !s.userId);
  const byUserDay = new Map<string, GridShift[]>();
  for (const s of shifts) {
    if (!s.userId) continue;
    const key = `${s.userId}|${s.dateKey}`;
    byUserDay.set(key, [...(byUserDay.get(key) ?? []), s]);
  }
  const hoursByUser = new Map<string, number>();
  for (const s of shifts) {
    if (!s.userId) continue;
    hoursByUser.set(s.userId, (hoursByUser.get(s.userId) ?? 0) + shiftDurationHours(s.startMinute, s.endMinute));
  }

  const run = (action: () => Promise<ActionResult>) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setFeedback({ tone: "error", text: result.error ?? "Something went wrong." });
      else if (result.warnings && result.warnings.length > 0)
        setFeedback({ tone: "warning", text: `Saved with warnings: ${result.warnings.join("; ")}` });
      else if (result.info) setFeedback({ tone: "success", text: result.info });
      router.refresh();
    });
  };

  const unstaffed = openShifts.length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/app/schedule?week=${addDays(weekStartKey, -7)}`}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            aria-label="Previous week"
          >
            ←
          </Link>
          <Link
            href={`/app/schedule?week=${addDays(weekStartKey, 7)}`}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            aria-label="Next week"
          >
            →
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900">{formatWeekRange(weekStartKey)}</h1>
            <p className="text-xs text-slate-500">
              {shifts.length} shifts · {unstaffed > 0 ? `${unstaffed} open` : "fully staffed"}
            </p>
          </div>
          {weekStartKey !== addDays(todayKey(), 0) && (
            <Link href="/app/schedule" className="ml-1 text-xs font-medium text-brand-600 hover:underline">
              Today
            </Link>
          )}
        </div>

        {manager && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => copyPreviousWeek(weekStartKey))}>
              Copy last week
            </Button>
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => generateWeekFromTemplates(weekStartKey))}>
              From templates
            </Button>
            <Button size="sm" disabled={pending || unstaffed === 0} onClick={() => setAutoFillOpen(true)}>
              ⚡ Auto-fill ({unstaffed})
            </Button>
            <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => publishWeekAction(weekStartKey))}>
              Publish week
            </Button>
          </div>
        )}
      </div>

      {feedback && <Alert tone={feedback.tone}>{feedback.text}</Alert>}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {roles.map((r) => (
          <span key={r.id} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
            {r.name}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-amber-500" /> Open shift
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-44 px-3 py-2 text-xs font-semibold text-slate-500">Team</th>
              {days.map((d) => (
                <th
                  key={d}
                  className={`border-l border-slate-100 px-2 py-2 text-xs font-semibold ${
                    d === today ? "bg-brand-50 text-brand-700" : "text-slate-500"
                  }`}
                >
                  {DAY_NAMES_SHORT[fromDateKey(d).getUTCDay()]}{" "}
                  <span className="font-normal">{formatDateKey(d).split(" ").slice(1).join(" ")}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Open shifts row */}
            <tr className="border-b border-slate-200 bg-amber-50/40 align-top">
              <td className="px-3 py-2">
                <p className="text-xs font-semibold text-amber-700">Open shifts</p>
                <p className="text-[10px] text-amber-600">{openShifts.length} unassigned</p>
              </td>
              {days.map((d) => (
                <td key={d} className="border-l border-slate-100 px-1.5 py-1.5">
                  <div className="space-y-1">
                    {openShifts
                      .filter((s) => s.dateKey === d)
                      .map((s) => (
                        <ShiftChip
                          key={s.id}
                          shift={s}
                          role={roleById.get(s.roleId)}
                          onClick={manager ? () => setDialog({ mode: "edit", shift: s }) : undefined}
                        />
                      ))}
                    {manager && (
                      <button
                        onClick={() => setDialog({ mode: "create", dateKey: d, userId: null })}
                        className="w-full rounded-md border border-dashed border-slate-200 py-1 text-[10px] text-slate-400 hover:border-brand-300 hover:text-brand-500"
                      >
                        +
                      </button>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Employee rows */}
            {employees.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={e.name} color={e.avatarColor} size={26} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-800">{e.name}</p>
                      <p className="text-[10px] tabular-nums text-slate-400">
                        {(hoursByUser.get(e.id) ?? 0).toFixed(1)}h this week
                      </p>
                    </div>
                  </div>
                </td>
                {days.map((d) => (
                  <td key={d} className={`border-l border-slate-100 px-1.5 py-1.5 ${d === today ? "bg-brand-50/40" : ""}`}>
                    <div className="space-y-1">
                      {(byUserDay.get(`${e.id}|${d}`) ?? []).map((s) => (
                        <ShiftChip
                          key={s.id}
                          shift={s}
                          role={roleById.get(s.roleId)}
                          onClick={manager ? () => setDialog({ mode: "edit", shift: s }) : undefined}
                        />
                      ))}
                      {manager && (
                        <button
                          onClick={() => setDialog({ mode: "create", dateKey: d, userId: e.id })}
                          className="w-full rounded-md py-0.5 text-[10px] text-transparent transition-colors hover:bg-slate-50 hover:text-slate-400"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!manager && (
        <p className="text-xs text-slate-400">
          Want to pick up an open shift or swap one of yours? Head to{" "}
          <Link href="/app/my" className="font-medium text-brand-600 hover:underline">
            My shifts
          </Link>
          .
        </p>
      )}

      {dialog && (
        <ShiftDialog
          roles={roles}
          employees={employees}
          days={days}
          initial={
            dialog.mode === "edit"
              ? { shift: dialog.shift }
              : { dateKey: dialog.dateKey, userId: dialog.userId }
          }
          onClose={() => setDialog(null)}
          onSaved={(result) => {
            setDialog(null);
            if (result.warnings && result.warnings.length > 0)
              setFeedback({ tone: "warning", text: `Saved with warnings: ${result.warnings.join("; ")}` });
            else setFeedback({ tone: "success", text: "Shift saved." });
            router.refresh();
          }}
          onDelete={(shiftId) => {
            setDialog(null);
            run(() => deleteShift(shiftId));
          }}
        />
      )}

      {autoFillOpen && (
        <AutoFillDialog
          weekStartKey={weekStartKey}
          onClose={() => setAutoFillOpen(false)}
          onApplied={(info) => {
            setAutoFillOpen(false);
            setFeedback({ tone: "success", text: info });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ShiftChip({
  shift,
  role,
  onClick,
}: {
  shift: GridShift;
  role?: GridRole;
  onClick?: () => void;
}) {
  const open = !shift.userId;
  const body = (
    <>
      <span className="block truncate text-[10px] font-semibold leading-tight">
        {role?.name ?? "Shift"}
        {shift.status === "PUBLISHED" && <span className="ml-1 opacity-70">✓</span>}
      </span>
      <span className="block text-[10px] tabular-nums leading-tight opacity-80">
        {formatTimeRange(shift.startMinute, shift.endMinute)}
      </span>
    </>
  );
  const classes = open
    ? "border border-dashed border-amber-400 bg-amber-50 text-amber-800"
    : "text-white";
  const style = open ? undefined : { backgroundColor: role?.color ?? "#64748b" };

  if (!onClick) {
    return (
      <div className={`w-full rounded-md px-1.5 py-1 text-left ${classes}`} style={style}>
        {body}
      </div>
    );
  }
  return (
    <button onClick={onClick} className={`w-full rounded-md px-1.5 py-1 text-left transition-opacity hover:opacity-85 ${classes}`} style={style}>
      {body}
    </button>
  );
}
