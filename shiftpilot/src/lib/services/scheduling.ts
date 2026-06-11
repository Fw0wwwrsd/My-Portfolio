import { db } from "@/lib/db";
import { addDays, fromDateKey, toDateKey, weekDays } from "@/lib/dates";
import { autoSchedule } from "@/lib/scheduler/engine";
import { detectConflicts } from "@/lib/scheduler/conflicts";
import type {
  Assignment,
  ScheduleResult,
  SchedEmployee,
  SchedShift,
  SchedTimeOff,
  SchedulerOptions,
} from "@/lib/scheduler/types";
import { emitEvent } from "./events";
import { notify } from "./notifier";

type DbShift = {
  id: string;
  roleId: string;
  userId: string | null;
  date: Date;
  startMinute: number;
  endMinute: number;
  role?: { name: string } | null;
};

export function toSchedShift(shift: DbShift): SchedShift {
  return {
    id: shift.id,
    roleId: shift.roleId,
    roleName: shift.role?.name,
    dateKey: toDateKey(shift.date),
    startMinute: shift.startMinute,
    endMinute: shift.endMinute,
    userId: shift.userId,
  };
}

export async function loadEmployees(orgId: string): Promise<SchedEmployee[]> {
  const users = await db.user.findMany({
    where: { orgId, isActive: true },
    include: { roleAssignments: true, availability: true },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    roleIds: u.roleAssignments.map((r) => r.roleId),
    hourlyWage: u.hourlyWage,
    maxHoursPerWeek: u.maxHoursPerWeek,
    minRestHours: u.minRestHours,
    availability: u.availability.map((a) => ({
      dayOfWeek: a.dayOfWeek,
      startMinute: a.startMinute,
      endMinute: a.endMinute,
    })),
  }));
}

export async function loadApprovedTimeOff(orgId: string): Promise<SchedTimeOff[]> {
  const rows = await db.timeOffRequest.findMany({
    where: { orgId, status: "APPROVED" },
  });
  return rows.map((t) => ({
    userId: t.userId,
    startKey: toDateKey(t.startDate),
    endKey: toDateKey(t.endDate),
  }));
}

/** Shifts in [weekStart − 7d, weekStart + 13d] so rest checks see neighbouring weeks. */
async function loadSurroundingShifts(orgId: string, weekStartKey: string) {
  return db.shift.findMany({
    where: {
      orgId,
      date: {
        gte: fromDateKey(addDays(weekStartKey, -7)),
        lte: fromDateKey(addDays(weekStartKey, 13)),
      },
    },
    include: { role: { select: { name: true } } },
  });
}

/** Conflict warnings for assigning `userId` to the given slot (manual edits). */
export async function conflictWarnings(
  orgId: string,
  userId: string,
  slot: { id: string; roleId: string; dateKey: string; startMinute: number; endMinute: number }
): Promise<string[]> {
  const [employees, timeOff, role] = await Promise.all([
    loadEmployees(orgId),
    loadApprovedTimeOff(orgId),
    db.role.findUnique({ where: { id: slot.roleId } }),
  ]);
  const employee = employees.find((e) => e.id === userId);
  if (!employee) return [];
  const others = await db.shift.findMany({
    where: {
      orgId,
      userId,
      id: { not: slot.id },
      date: {
        gte: fromDateKey(addDays(slot.dateKey, -7)),
        lte: fromDateKey(addDays(slot.dateKey, 7)),
      },
    },
    include: { role: { select: { name: true } } },
  });
  const shift: SchedShift = { ...slot, roleName: role?.name, userId };
  return detectConflicts(shift, employee, others.map(toSchedShift), timeOff);
}

export type AutoSchedulePreview = ScheduleResult & {
  shiftLabels: Record<string, string>;
};

export async function previewAutoSchedule(
  orgId: string,
  weekStartKey: string,
  options: SchedulerOptions = {}
): Promise<AutoSchedulePreview> {
  const [employees, timeOff, shifts] = await Promise.all([
    loadEmployees(orgId),
    loadApprovedTimeOff(orgId),
    loadSurroundingShifts(orgId, weekStartKey),
  ]);
  const days = new Set(weekDays(weekStartKey));
  const all = shifts.map(toSchedShift);
  const openShifts = all.filter((s) => !s.userId && days.has(s.dateKey));
  const existingShifts = all.filter((s) => s.userId);

  const result = autoSchedule({ openShifts, employees, existingShifts, timeOff, options });

  const byId = new Map(shifts.map((s) => [s.id, s]));
  const shiftLabels: Record<string, string> = {};
  for (const s of [...openShifts]) {
    const row = byId.get(s.id);
    shiftLabels[s.id] = `${row?.role?.name ?? "Shift"} · ${s.dateKey}`;
  }
  return { ...result, shiftLabels };
}

export async function applyAutoSchedule(
  orgId: string,
  appliedById: string,
  assignments: Assignment[]
): Promise<number> {
  let applied = 0;
  for (const a of assignments) {
    const updated = await db.shift.updateMany({
      // Guard userId: null so we never overwrite a shift assigned meanwhile.
      where: { id: a.shiftId, orgId, userId: null },
      data: { userId: a.employeeId, status: "ASSIGNED" },
    });
    if (updated.count === 0) continue;
    applied++;
    await notify({
      orgId,
      userIds: [a.employeeId],
      type: "shift.assigned",
      title: "New shift assigned",
      body: "The auto-scheduler assigned you a shift. Check your schedule.",
      href: "/app/my",
    });
  }
  await emitEvent(orgId, "schedule.autofilled", { appliedById, count: applied });
  return applied;
}

export async function copyWeek(
  orgId: string,
  createdById: string,
  fromWeekStart: string,
  toWeekStart: string
): Promise<number> {
  const days = new Set(weekDays(fromWeekStart));
  const source = await db.shift.findMany({
    where: {
      orgId,
      date: { gte: fromDateKey(fromWeekStart), lte: fromDateKey(addDays(fromWeekStart, 6)) },
    },
  });
  const rows = source
    .filter((s) => days.has(toDateKey(s.date)))
    .map((s) => {
      const offset = weekDays(fromWeekStart).indexOf(toDateKey(s.date));
      return {
        orgId,
        roleId: s.roleId,
        userId: s.userId,
        date: fromDateKey(addDays(toWeekStart, offset)),
        startMinute: s.startMinute,
        endMinute: s.endMinute,
        status: s.userId ? "ASSIGNED" : "OPEN",
        sourceTemplateId: s.sourceTemplateId,
        createdById,
        notes: s.notes,
      };
    });
  if (rows.length > 0) {
    await db.shift.createMany({ data: rows });
  }
  await emitEvent(orgId, "schedule.week_copied", { fromWeekStart, toWeekStart, count: rows.length });
  return rows.length;
}

/** Creates OPEN shifts for the week from the org's recurring templates. */
export async function generateFromTemplates(
  orgId: string,
  createdById: string,
  weekStartKey: string
): Promise<number> {
  const templates = await db.shiftTemplate.findMany({ where: { orgId } });
  const days = weekDays(weekStartKey);
  const rows: {
    orgId: string;
    roleId: string;
    date: Date;
    startMinute: number;
    endMinute: number;
    status: string;
    sourceTemplateId: string;
    createdById: string;
  }[] = [];
  for (const template of templates) {
    const dows = template.daysOfWeek.split(",").map(Number);
    for (const dateKey of days) {
      if (!dows.includes(fromDateKey(dateKey).getUTCDay())) continue;
      for (let i = 0; i < template.headcount; i++) {
        rows.push({
          orgId,
          roleId: template.roleId,
          date: fromDateKey(dateKey),
          startMinute: template.startMinute,
          endMinute: template.endMinute,
          status: "OPEN",
          sourceTemplateId: template.id,
          createdById,
        });
      }
    }
  }
  if (rows.length > 0) {
    await db.shift.createMany({ data: rows });
  }
  await emitEvent(orgId, "shift.created", { source: "templates", weekStartKey, count: rows.length });
  return rows.length;
}

/** Marks the week's shifts as published and notifies every assignee. */
export async function publishWeek(orgId: string, weekStartKey: string): Promise<number> {
  const shifts = await db.shift.findMany({
    where: {
      orgId,
      userId: { not: null },
      status: "ASSIGNED",
      date: { gte: fromDateKey(weekStartKey), lte: fromDateKey(addDays(weekStartKey, 6)) },
    },
  });
  await db.shift.updateMany({
    where: { id: { in: shifts.map((s) => s.id) } },
    data: { status: "PUBLISHED" },
  });
  const userIds = [...new Set(shifts.map((s) => s.userId as string))];
  if (userIds.length > 0) {
    await notify({
      orgId,
      userIds,
      type: "schedule.published",
      title: "Schedule published",
      body: "Your shifts for the week are confirmed. Take a look.",
      href: "/app/my",
    });
  }
  await emitEvent(orgId, "schedule.published", { weekStartKey, count: shifts.length });
  return shifts.length;
}
