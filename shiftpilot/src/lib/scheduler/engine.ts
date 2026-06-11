import { firstViolation, hoursKey, shiftHours } from "./constraints";
import { scoreCandidate } from "./scoring";
import type {
  Assignment,
  ScheduleResult,
  SchedEmployee,
  SchedShift,
  SchedTimeOff,
  SchedulerContext,
  SchedulerOptions,
  UnfilledShift,
} from "./types";

export type AutoScheduleInput = {
  openShifts: SchedShift[];
  employees: SchedEmployee[];
  /** Already-assigned shifts (any week) — used for overlap, rest and weekly-hour checks. */
  existingShifts: SchedShift[];
  timeOff: SchedTimeOff[];
  options?: SchedulerOptions;
};

export function buildContext(
  existingShifts: SchedShift[],
  timeOff: SchedTimeOff[]
): SchedulerContext {
  const shiftsByEmployee = new Map<string, SchedShift[]>();
  const hoursByEmployeeWeek = new Map<string, number>();
  for (const shift of existingShifts) {
    if (!shift.userId) continue;
    const list = shiftsByEmployee.get(shift.userId) ?? [];
    list.push(shift);
    shiftsByEmployee.set(shift.userId, list);
    const key = hoursKey(shift.userId, shift.dateKey);
    hoursByEmployeeWeek.set(key, (hoursByEmployeeWeek.get(key) ?? 0) + shiftHours(shift));
  }
  return { shiftsByEmployee, hoursByEmployeeWeek, timeOff };
}

function tentativelyAssign(ctx: SchedulerContext, shift: SchedShift, employeeId: string): void {
  const assigned = { ...shift, userId: employeeId };
  const list = ctx.shiftsByEmployee.get(employeeId) ?? [];
  list.push(assigned);
  ctx.shiftsByEmployee.set(employeeId, list);
  const key = hoursKey(employeeId, shift.dateKey);
  ctx.hoursByEmployeeWeek.set(key, (ctx.hoursByEmployeeWeek.get(key) ?? 0) + shiftHours(shift));
}

/**
 * Greedy, most-constrained-first auto-scheduler. Deterministic: ties broken
 * by employee id so repeated runs produce identical results.
 */
export function autoSchedule(input: AutoScheduleInput): ScheduleResult {
  const { openShifts, employees, existingShifts, timeOff, options } = input;
  const ctx = buildContext(existingShifts, timeOff);

  const assignments: Assignment[] = [];
  const unfilled: UnfilledShift[] = [];

  const eligibleCount = (shift: SchedShift) =>
    employees.filter((e) => firstViolation(shift, e, ctx) === null).length;

  // Most-constrained shifts first dramatically improves fill rates vs naive order.
  const queue = [...openShifts].sort((a, b) => {
    const diff = eligibleCount(a) - eligibleCount(b);
    if (diff !== 0) return diff;
    if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? -1 : 1;
    if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
    return a.id < b.id ? -1 : 1;
  });

  for (const shift of queue) {
    let best: { employee: SchedEmployee; score: number } | null = null;
    const reasons: string[] = [];

    for (const employee of [...employees].sort((a, b) => (a.id < b.id ? -1 : 1))) {
      const violation = firstViolation(shift, employee, ctx);
      if (violation) {
        reasons.push(`${employee.name}: ${violation}`);
        continue;
      }
      const score = scoreCandidate(shift, employee, ctx, options);
      if (!best || score > best.score) {
        best = { employee, score };
      }
    }

    if (best) {
      tentativelyAssign(ctx, shift, best.employee.id);
      assignments.push({
        shiftId: shift.id,
        employeeId: best.employee.id,
        employeeName: best.employee.name,
      });
    } else {
      unfilled.push({ shiftId: shift.id, reasons });
    }
  }

  return { assignments, unfilled };
}
