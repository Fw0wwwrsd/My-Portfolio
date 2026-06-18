import { dayOfWeek, fromDateKey, weekStart, DAY_MS } from "@/lib/dates";
import type { SchedEmployee, SchedShift, SchedulerContext } from "./types";

/** Absolute minute interval of a shift on a global timeline (UTC days). */
export function shiftInterval(shift: SchedShift): { start: number; end: number } {
  const dayMinute = (fromDateKey(shift.dateKey).getTime() / DAY_MS) * 1440;
  return { start: dayMinute + shift.startMinute, end: dayMinute + shift.endMinute };
}

export function hoursKey(employeeId: string, dateKey: string): string {
  return `${employeeId}|${weekStart(dateKey)}`;
}

export function shiftHours(shift: SchedShift): number {
  return (shift.endMinute - shift.startMinute) / 60;
}

type Constraint = (
  shift: SchedShift,
  employee: SchedEmployee,
  ctx: SchedulerContext
) => string | null; // null = pass, string = human-readable failure reason

export const hasRole: Constraint = (shift, employee) =>
  employee.roleIds.includes(shift.roleId)
    ? null
    : `not qualified for ${shift.roleName ?? "this role"}`;

export const isAvailable: Constraint = (shift, employee) => {
  if (employee.availability.length === 0) return null; // no windows = always available
  const dow = dayOfWeek(shift.dateKey);
  const fits = employee.availability.some(
    (w) => w.dayOfWeek === dow && w.startMinute <= shift.startMinute && w.endMinute >= shift.endMinute
  );
  return fits ? null : "outside their availability";
};

export const noTimeOff: Constraint = (shift, employee, ctx) => {
  const onLeave = ctx.timeOff.some(
    (t) => t.userId === employee.id && t.startKey <= shift.dateKey && t.endKey >= shift.dateKey
  );
  return onLeave ? "has approved time off" : null;
};

export const noOverlap: Constraint = (shift, employee, ctx) => {
  const mine = ctx.shiftsByEmployee.get(employee.id) ?? [];
  const { start, end } = shiftInterval(shift);
  const clash = mine.some((s) => {
    const o = shiftInterval(s);
    return o.start < end && o.end > start;
  });
  return clash ? "already has an overlapping shift" : null;
};

export const minRest: Constraint = (shift, employee, ctx) => {
  const restMinutes = employee.minRestHours * 60;
  if (restMinutes <= 0) return null;
  const mine = ctx.shiftsByEmployee.get(employee.id) ?? [];
  const { start, end } = shiftInterval(shift);
  const tooClose = mine.some((s) => {
    const o = shiftInterval(s);
    if (o.start < end && o.end > start) return false; // overlap handled by noOverlap
    const gap = o.start >= end ? o.start - end : start - o.end;
    return gap < restMinutes;
  });
  return tooClose ? `less than ${employee.minRestHours}h rest between shifts` : null;
};

export const maxHours: Constraint = (shift, employee, ctx) => {
  const current = ctx.hoursByEmployeeWeek.get(hoursKey(employee.id, shift.dateKey)) ?? 0;
  return current + shiftHours(shift) <= employee.maxHoursPerWeek
    ? null
    : `would exceed ${employee.maxHoursPerWeek}h/week`;
};

export const ALL_CONSTRAINTS: Constraint[] = [
  hasRole,
  isAvailable,
  noTimeOff,
  noOverlap,
  minRest,
  maxHours,
];

/** Returns the first failed constraint's reason, or null if all pass. */
export function firstViolation(
  shift: SchedShift,
  employee: SchedEmployee,
  ctx: SchedulerContext
): string | null {
  for (const constraint of ALL_CONSTRAINTS) {
    const reason = constraint(shift, employee, ctx);
    if (reason) return reason;
  }
  return null;
}

/** Returns every failed constraint's reason (for conflict warnings on manual edits). */
export function allViolations(
  shift: SchedShift,
  employee: SchedEmployee,
  ctx: SchedulerContext
): string[] {
  return ALL_CONSTRAINTS.map((c) => c(shift, employee, ctx)).filter(
    (r): r is string => r !== null
  );
}
