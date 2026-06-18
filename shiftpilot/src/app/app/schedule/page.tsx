import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, fromDateKey, isValidDateKey, toDateKey, todayKey, weekStart } from "@/lib/dates";
import { isManager } from "@/lib/types";
import { ScheduleClient } from "@/components/schedule/schedule-client";

export const metadata = { title: "Schedule · ShiftPilot" };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const requested = params.week && isValidDateKey(params.week) ? params.week : todayKey();
  const weekStartKey = weekStart(requested);

  const [roles, employees, shifts] = await Promise.all([
    db.role.findMany({ where: { orgId: user.orgId }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { orgId: user.orgId, isActive: true },
      include: { roleAssignments: true },
      orderBy: { name: "asc" },
    }),
    db.shift.findMany({
      where: {
        orgId: user.orgId,
        date: { gte: fromDateKey(weekStartKey), lte: fromDateKey(addDays(weekStartKey, 6)) },
      },
      orderBy: [{ startMinute: "asc" }],
    }),
  ]);

  return (
    <ScheduleClient
      weekStartKey={weekStartKey}
      manager={isManager(user.role)}
      roles={roles.map((r) => ({ id: r.id, name: r.name, color: r.color }))}
      employees={employees.map((e) => ({
        id: e.id,
        name: e.name,
        avatarColor: e.avatarColor,
        roleIds: e.roleAssignments.map((ra) => ra.roleId),
      }))}
      shifts={shifts.map((s) => ({
        id: s.id,
        dateKey: toDateKey(s.date),
        startMinute: s.startMinute,
        endMinute: s.endMinute,
        roleId: s.roleId,
        userId: s.userId,
        status: s.status,
        notes: s.notes ?? "",
      }))}
    />
  );
}
