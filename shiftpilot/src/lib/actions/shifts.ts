"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { fromDateKey, isValidDateKey, toDateKey, weekStart } from "@/lib/dates";
import { emitEvent } from "@/lib/services/events";
import {
  applyAutoSchedule,
  conflictWarnings,
  copyWeek,
  generateFromTemplates,
  previewAutoSchedule,
  publishWeek,
} from "@/lib/services/scheduling";
import type { Assignment, SchedulerOptions } from "@/lib/scheduler/types";

export type ActionResult = { ok: boolean; error?: string; warnings?: string[]; info?: string };

type ShiftInput = {
  roleId: string;
  userId: string | null;
  dateKey: string;
  startMinute: number;
  endMinute: number;
  notes?: string;
};

function validateShiftInput(input: ShiftInput): string | null {
  if (!isValidDateKey(input.dateKey)) return "Invalid date.";
  if (input.startMinute < 0 || input.startMinute >= 1440) return "Invalid start time.";
  if (input.endMinute <= input.startMinute) return "End time must be after start time.";
  if (input.endMinute - input.startMinute > 16 * 60) return "Shifts longer than 16h aren't allowed.";
  return null;
}

export async function createShift(input: ShiftInput): Promise<ActionResult> {
  const user = await requireManager();
  const invalid = validateShiftInput(input);
  if (invalid) return { ok: false, error: invalid };

  const role = await db.role.findFirst({ where: { id: input.roleId, orgId: user.orgId } });
  if (!role) return { ok: false, error: "Unknown role." };

  const shift = await db.shift.create({
    data: {
      orgId: user.orgId,
      roleId: input.roleId,
      userId: input.userId,
      date: fromDateKey(input.dateKey),
      startMinute: input.startMinute,
      endMinute: input.endMinute,
      status: input.userId ? "ASSIGNED" : "OPEN",
      notes: input.notes,
      createdById: user.id,
    },
  });

  let warnings: string[] = [];
  if (input.userId) {
    warnings = await conflictWarnings(user.orgId, input.userId, {
      id: shift.id,
      roleId: input.roleId,
      dateKey: input.dateKey,
      startMinute: input.startMinute,
      endMinute: input.endMinute,
    });
  }
  await emitEvent(user.orgId, "shift.created", { shiftId: shift.id, by: user.id });
  revalidatePath("/app/schedule");
  return { ok: true, warnings };
}

export async function updateShift(shiftId: string, input: ShiftInput): Promise<ActionResult> {
  const user = await requireManager();
  const invalid = validateShiftInput(input);
  if (invalid) return { ok: false, error: invalid };

  const existing = await db.shift.findFirst({ where: { id: shiftId, orgId: user.orgId } });
  if (!existing) return { ok: false, error: "Shift not found." };

  await db.shift.update({
    where: { id: shiftId },
    data: {
      roleId: input.roleId,
      userId: input.userId,
      date: fromDateKey(input.dateKey),
      startMinute: input.startMinute,
      endMinute: input.endMinute,
      status: input.userId ? (existing.status === "PUBLISHED" ? "PUBLISHED" : "ASSIGNED") : "OPEN",
      notes: input.notes,
    },
  });

  let warnings: string[] = [];
  if (input.userId) {
    warnings = await conflictWarnings(user.orgId, input.userId, {
      id: shiftId,
      roleId: input.roleId,
      dateKey: input.dateKey,
      startMinute: input.startMinute,
      endMinute: input.endMinute,
    });
  }
  await emitEvent(user.orgId, "shift.updated", { shiftId, by: user.id });
  revalidatePath("/app/schedule");
  return { ok: true, warnings };
}

export async function deleteShift(shiftId: string): Promise<ActionResult> {
  const user = await requireManager();
  const deleted = await db.shift.deleteMany({ where: { id: shiftId, orgId: user.orgId } });
  if (deleted.count === 0) return { ok: false, error: "Shift not found." };
  await emitEvent(user.orgId, "shift.deleted", { shiftId, by: user.id });
  revalidatePath("/app/schedule");
  return { ok: true };
}

export async function copyPreviousWeek(weekStartKey: string): Promise<ActionResult> {
  const user = await requireManager();
  if (!isValidDateKey(weekStartKey)) return { ok: false, error: "Invalid week." };
  const target = weekStart(weekStartKey);
  const source = weekStart(toDateKey(new Date(fromDateKey(target).getTime() - 7 * 86_400_000)));
  const count = await copyWeek(user.orgId, user.id, source, target);
  revalidatePath("/app/schedule");
  return count > 0
    ? { ok: true, info: `Copied ${count} shifts from last week.` }
    : { ok: false, error: "Last week has no shifts to copy." };
}

export async function generateWeekFromTemplates(weekStartKey: string): Promise<ActionResult> {
  const user = await requireManager();
  if (!isValidDateKey(weekStartKey)) return { ok: false, error: "Invalid week." };
  const count = await generateFromTemplates(user.orgId, user.id, weekStart(weekStartKey));
  revalidatePath("/app/schedule");
  return count > 0
    ? { ok: true, info: `Created ${count} open shifts from your templates.` }
    : { ok: false, error: "No shift templates configured yet." };
}

export async function publishWeekAction(weekStartKey: string): Promise<ActionResult> {
  const user = await requireManager();
  if (!isValidDateKey(weekStartKey)) return { ok: false, error: "Invalid week." };
  const count = await publishWeek(user.orgId, weekStart(weekStartKey));
  revalidatePath("/app/schedule");
  return { ok: true, info: `Published ${count} shifts. Assignees were notified.` };
}

export async function runAutoSchedule(weekStartKey: string, options: SchedulerOptions) {
  const user = await requireManager();
  if (!isValidDateKey(weekStartKey)) return null;
  return previewAutoSchedule(user.orgId, weekStart(weekStartKey), options);
}

export async function applyAutoScheduleAction(assignments: Assignment[]): Promise<ActionResult> {
  const user = await requireManager();
  const applied = await applyAutoSchedule(user.orgId, user.id, assignments);
  revalidatePath("/app/schedule");
  return { ok: true, info: `Filled ${applied} shifts. Employees were notified.` };
}
