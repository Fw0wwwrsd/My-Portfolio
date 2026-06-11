import { allViolations } from "./constraints";
import { buildContext } from "./engine";
import type { SchedEmployee, SchedShift, SchedTimeOff } from "./types";

/**
 * Non-blocking warnings for a manual assignment: runs the same constraint
 * predicates the auto-scheduler uses, against the employee's other shifts.
 */
export function detectConflicts(
  shift: SchedShift,
  employee: SchedEmployee,
  otherShifts: SchedShift[],
  timeOff: SchedTimeOff[]
): string[] {
  const others = otherShifts.filter((s) => s.id !== shift.id);
  const ctx = buildContext(others, timeOff);
  return allViolations(shift, employee, ctx);
}
