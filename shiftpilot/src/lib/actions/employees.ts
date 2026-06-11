"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, requireManager } from "@/lib/auth";
import { emitEvent } from "@/lib/services/events";
import type { ActionResult } from "./shifts";

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#f97316", "#22c55e", "#3b82f6", "#a855f7", "#eab308", "#14b8a6"];

type EmployeeInput = {
  name: string;
  email: string;
  hourlyWage: number;
  maxHoursPerWeek: number;
  minRestHours: number;
  roleIds: string[];
};

export async function createEmployee(input: EmployeeInput): Promise<ActionResult> {
  const manager = await requireManager();
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim() || !email.includes("@")) {
    return { ok: false, error: "Name and a valid email are required." };
  }
  const taken = await db.user.findUnique({ where: { email } });
  if (taken) return { ok: false, error: "That email is already in use." };

  const user = await db.user.create({
    data: {
      orgId: manager.orgId,
      name: input.name.trim(),
      email,
      passwordHash: hashPassword("demo123"),
      role: "EMPLOYEE",
      hourlyWage: input.hourlyWage,
      maxHoursPerWeek: input.maxHoursPerWeek,
      minRestHours: input.minRestHours,
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      roleAssignments: { create: input.roleIds.map((roleId) => ({ roleId })) },
    },
  });
  await emitEvent(manager.orgId, "employee.created", { userId: user.id, by: manager.id });
  revalidatePath("/app/employees");
  return { ok: true, info: `${user.name} added. They can log in with password "demo123".` };
}

export async function updateEmployee(userId: string, input: EmployeeInput): Promise<ActionResult> {
  const manager = await requireManager();
  const employee = await db.user.findFirst({ where: { id: userId, orgId: manager.orgId } });
  if (!employee) return { ok: false, error: "Employee not found." };

  await db.user.update({
    where: { id: userId },
    data: {
      name: input.name.trim(),
      hourlyWage: input.hourlyWage,
      maxHoursPerWeek: input.maxHoursPerWeek,
      minRestHours: input.minRestHours,
      roleAssignments: {
        deleteMany: {},
        create: input.roleIds.map((roleId) => ({ roleId })),
      },
    },
  });
  await emitEvent(manager.orgId, "employee.updated", { userId, by: manager.id });
  revalidatePath("/app/employees");
  revalidatePath(`/app/employees/${userId}`);
  return { ok: true };
}

export async function setAvailability(
  userId: string,
  windows: { dayOfWeek: number; startMinute: number; endMinute: number }[]
): Promise<ActionResult> {
  const manager = await requireManager();
  const employee = await db.user.findFirst({ where: { id: userId, orgId: manager.orgId } });
  if (!employee) return { ok: false, error: "Employee not found." };

  for (const w of windows) {
    if (w.dayOfWeek < 0 || w.dayOfWeek > 6 || w.endMinute <= w.startMinute) {
      return { ok: false, error: "Each availability window needs a valid day and time range." };
    }
  }

  await db.$transaction([
    db.availabilityWindow.deleteMany({ where: { userId } }),
    db.availabilityWindow.createMany({
      data: windows.map((w) => ({ userId, ...w })),
    }),
  ]);
  await emitEvent(manager.orgId, "employee.updated", { userId, field: "availability" });
  revalidatePath(`/app/employees/${userId}`);
  return { ok: true };
}

export async function deactivateEmployee(userId: string): Promise<ActionResult> {
  const manager = await requireManager();
  if (userId === manager.id) return { ok: false, error: "You can't deactivate yourself." };
  const updated = await db.user.updateMany({
    where: { id: userId, orgId: manager.orgId },
    data: { isActive: false },
  });
  if (updated.count === 0) return { ok: false, error: "Employee not found." };
  // Release their future shifts back to the open pool.
  await db.shift.updateMany({
    where: { orgId: manager.orgId, userId, date: { gte: new Date() } },
    data: { userId: null, status: "OPEN" },
  });
  revalidatePath("/app/employees");
  return { ok: true };
}
