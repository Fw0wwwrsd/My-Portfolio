// Pure data shapes for the scheduling engine — decoupled from Prisma so the
// engine is unit-testable without a database.

export type SchedShift = {
  id: string;
  roleId: string;
  roleName?: string;
  dateKey: string; // yyyy-MM-dd
  startMinute: number;
  endMinute: number; // > 1440 = crosses midnight
  userId: string | null;
};

export type SchedAvailability = {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  startMinute: number;
  endMinute: number; // may exceed 1440 to cover overnight availability
};

export type SchedEmployee = {
  id: string;
  name: string;
  roleIds: string[];
  hourlyWage: number;
  maxHoursPerWeek: number;
  minRestHours: number;
  /** Empty array = available any time. */
  availability: SchedAvailability[];
};

export type SchedTimeOff = {
  userId: string;
  startKey: string; // inclusive
  endKey: string; // inclusive
};

export type SchedulerOptions = {
  /** Prefer cheaper employees when scores are otherwise close. */
  preferLowerCost?: boolean;
};

export type SchedulerContext = {
  /** Assigned shifts per employee (existing + tentative), kept sorted-ish. */
  shiftsByEmployee: Map<string, SchedShift[]>;
  /** Scheduled hours per `${employeeId}|${weekStartKey}`. */
  hoursByEmployeeWeek: Map<string, number>;
  timeOff: SchedTimeOff[];
};

export type Assignment = {
  shiftId: string;
  employeeId: string;
  employeeName: string;
};

export type UnfilledShift = {
  shiftId: string;
  /** Why each near-miss candidate was rejected, e.g. "Maria: would exceed 40h/week". */
  reasons: string[];
};

export type ScheduleResult = {
  assignments: Assignment[];
  unfilled: UnfilledShift[];
};
