import { hoursKey } from "./constraints";
import type { SchedEmployee, SchedShift, SchedulerContext, SchedulerOptions } from "./types";

/**
 * Higher = better candidate. The dominant term spreads hours fairly:
 * employees furthest below their weekly max are picked first.
 */
export function scoreCandidate(
  shift: SchedShift,
  employee: SchedEmployee,
  ctx: SchedulerContext,
  options: SchedulerOptions = {}
): number {
  const current = ctx.hoursByEmployeeWeek.get(hoursKey(employee.id, shift.dateKey)) ?? 0;
  let score = employee.maxHoursPerWeek - current;
  if (options.preferLowerCost) {
    score -= employee.hourlyWage * 0.5;
  }
  return score;
}
