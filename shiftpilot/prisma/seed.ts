// Demo seed: one rich restaurant org with rosters built by the real
// auto-scheduler engine. All dates are relative to today so the demo never
// goes stale. Run with `npm run db:seed` (or `npm run setup` to reset first).

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { createHash } from "node:crypto";
import { addDays, fromDateKey, todayKey, toDateKey, weekStart, weekDays } from "../src/lib/dates";
import { autoSchedule } from "../src/lib/scheduler/engine";
import type { SchedEmployee, SchedShift, SchedTimeOff } from "../src/lib/scheduler/types";
import { getIndustry } from "../src/lib/industries";
import { DEFAULT_INTEGRATIONS } from "../src/lib/integrations";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const db = new PrismaClient({ adapter });

const hash = (pw: string) => createHash("sha256").update(`shiftpilot:${pw}`).digest("hex");
const h = (hour: number, minute = 0) => hour * 60 + minute;

const THIS_WEEK = weekStart(todayKey());
const LAST_WEEK = addDays(THIS_WEEK, -7);

type SeedEmployee = {
  name: string;
  email: string;
  roles: string[];
  wage: number;
  maxHours: number;
  color: string;
  availability?: { dayOfWeek: number; startMinute: number; endMinute: number }[];
};

const EMPLOYEES: SeedEmployee[] = [
  { name: "Sipho Dlamini", email: "sipho@copperpot.demo", roles: ["Server", "Bartender"], wage: 24, maxHours: 40, color: "#3b82f6" },
  { name: "Maria Santos", email: "maria@copperpot.demo", roles: ["Server"], wage: 22, maxHours: 40, color: "#ec4899" },
  { name: "Jabu Nkosi", email: "jabu@copperpot.demo", roles: ["Cook"], wage: 27, maxHours: 40, color: "#f97316" },
  { name: "Chen Wei", email: "chen@copperpot.demo", roles: ["Cook"], wage: 26, maxHours: 40, color: "#22c55e" },
  { name: "Anika Patel", email: "anika@copperpot.demo", roles: ["Cook", "Server"], wage: 25, maxHours: 35, color: "#a855f7" },
  {
    name: "Lerato Mokoena", email: "lerato@copperpot.demo", roles: ["Host", "Server"], wage: 19, maxHours: 30, color: "#eab308",
    availability: [
      { dayOfWeek: 0, startMinute: h(8), endMinute: h(23, 30) },
      { dayOfWeek: 6, startMinute: h(8), endMinute: h(23, 30) },
      ...[1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startMinute: h(16), endMinute: h(23, 30) })),
    ],
  },
  {
    name: "Tom Becker", email: "tom@copperpot.demo", roles: ["Bartender"], wage: 24, maxHours: 25, color: "#14b8a6",
    availability: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, startMinute: h(16), endMinute: h(24) })),
  },
  {
    name: "Zanele Khumalo", email: "zanele@copperpot.demo", roles: ["Server"], wage: 21, maxHours: 20, color: "#6366f1",
    availability: [
      ...[1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startMinute: h(17), endMinute: h(23) })),
      { dayOfWeek: 0, startMinute: h(9), endMinute: h(23) },
      { dayOfWeek: 6, startMinute: h(9), endMinute: h(23) },
    ],
  },
  { name: "Pieter van Wyk", email: "pieter@copperpot.demo", roles: ["Server", "Host"], wage: 20, maxHours: 40, color: "#3b82f6" },
  {
    name: "Naledi Mthembu", email: "naledi@copperpot.demo", roles: ["Host"], wage: 19, maxHours: 25, color: "#ec4899",
    availability: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startMinute: h(9), endMinute: h(22, 30) })),
  },
  { name: "Diego Fernandez", email: "diego@copperpot.demo", roles: ["Cook"], wage: 28, maxHours: 40, color: "#f97316" },
  { name: "Amy O'Connor", email: "amy@copperpot.demo", roles: ["Server", "Bartender"], wage: 23, maxHours: 32, color: "#22c55e" },
];

async function main() {
  console.log("Seeding ShiftPilot demo data…");
  await db.organization.deleteMany();
  await db.user.deleteMany();

  const industry = getIndustry("restaurants")!;

  const org = await db.organization.create({
    data: {
      name: "The Copper Pot Bistro",
      industry: "restaurants",
      weeklyLaborBudget: 8500,
      autoApproveSwapsSameRole: true,
      autoApproveTimeOffDays: 14,
      roles: { create: industry.roles.map((r) => ({ name: r.name, color: r.color })) },
      integrations: { create: DEFAULT_INTEGRATIONS },
    },
    include: { roles: true },
  });
  const roleId = (name: string) => org.roles.find((r) => r.name === name)!.id;

  await db.shiftTemplate.createMany({
    data: industry.shiftTemplates.map((t) => ({
      orgId: org.id,
      roleId: roleId(t.roleName),
      name: t.name,
      startMinute: t.startMinute,
      endMinute: t.endMinute,
      daysOfWeek: t.daysOfWeek.join(","),
      headcount: t.headcount,
    })),
  });
  const templates = await db.shiftTemplate.findMany({ where: { orgId: org.id } });

  const owner = await db.user.create({
    data: {
      orgId: org.id, name: "Thandi Shabalala", email: "owner@copperpot.demo",
      passwordHash: hash("demo123"), role: "OWNER", avatarColor: "#a855f7", hourlyWage: 0,
    },
  });
  const manager = await db.user.create({
    data: {
      orgId: org.id, name: "Marcus Botha", email: "manager@copperpot.demo",
      passwordHash: hash("demo123"), role: "MANAGER", avatarColor: "#f97316", hourlyWage: 38,
    },
  });

  const staff: { id: string; seed: SeedEmployee }[] = [];
  for (const e of EMPLOYEES) {
    const user = await db.user.create({
      data: {
        orgId: org.id, name: e.name, email: e.email, passwordHash: hash("demo123"),
        role: "EMPLOYEE", hourlyWage: e.wage, maxHoursPerWeek: e.maxHours, avatarColor: e.color,
        roleAssignments: { create: e.roles.map((r) => ({ roleId: roleId(r) })) },
        availability: { create: e.availability ?? [] },
      },
    });
    staff.push({ id: user.id, seed: e });
  }

  // ---- Time off ------------------------------------------------------------
  const mariasLeave: SchedTimeOff = {
    userId: staff.find((s) => s.seed.name === "Maria Santos")!.id,
    startKey: addDays(THIS_WEEK, 2),
    endKey: addDays(THIS_WEEK, 3),
  };
  await db.timeOffRequest.create({
    data: {
      orgId: org.id, userId: mariasLeave.userId,
      startDate: fromDateKey(mariasLeave.startKey), endDate: fromDateKey(mariasLeave.endKey),
      reason: "Medical appointment", status: "APPROVED",
      reviewedById: manager.id, reviewedAt: new Date(),
    },
  });
  await db.timeOffRequest.create({
    data: {
      orgId: org.id, userId: staff.find((s) => s.seed.name === "Sipho Dlamini")!.id,
      startDate: fromDateKey(addDays(THIS_WEEK, 7)), endDate: fromDateKey(addDays(THIS_WEEK, 8)),
      reason: "Family event", status: "PENDING",
    },
  });
  await db.timeOffRequest.create({
    data: {
      orgId: org.id, userId: staff.find((s) => s.seed.name === "Amy O'Connor")!.id,
      startDate: fromDateKey(addDays(THIS_WEEK, 10)), endDate: fromDateKey(addDays(THIS_WEEK, 11)),
      reason: "Moving house", status: "PENDING",
    },
  });

  // ---- Build two weeks of shifts from templates, roster with the engine ----
  const engineEmployees: SchedEmployee[] = staff.map((s) => ({
    id: s.id,
    name: s.seed.name,
    roleIds: s.seed.roles.map(roleId),
    hourlyWage: s.seed.wage,
    maxHoursPerWeek: s.seed.maxHours,
    minRestHours: 10,
    availability: s.seed.availability ?? [],
  }));

  async function createWeekShifts(weekStartKey: string): Promise<SchedShift[]> {
    const created: SchedShift[] = [];
    for (const t of templates) {
      const dows = t.daysOfWeek.split(",").map(Number);
      for (const dateKey of weekDays(weekStartKey)) {
        if (!dows.includes(fromDateKey(dateKey).getUTCDay())) continue;
        for (let i = 0; i < t.headcount; i++) {
          const shift = await db.shift.create({
            data: {
              orgId: org.id, roleId: t.roleId, date: fromDateKey(dateKey),
              startMinute: t.startMinute, endMinute: t.endMinute,
              status: "OPEN", sourceTemplateId: t.id, createdById: manager.id,
            },
          });
          created.push({
            id: shift.id, roleId: t.roleId, dateKey,
            startMinute: t.startMinute, endMinute: t.endMinute, userId: null,
          });
        }
      }
    }
    return created;
  }

  async function rosterWeek(shifts: SchedShift[], timeOff: SchedTimeOff[], publish: boolean) {
    const result = autoSchedule({
      openShifts: shifts,
      employees: engineEmployees,
      existingShifts: [],
      timeOff,
      options: {},
    });
    for (const a of result.assignments) {
      await db.shift.update({
        where: { id: a.shiftId },
        data: { userId: a.employeeId, status: publish ? "PUBLISHED" : "ASSIGNED" },
      });
    }
    return result;
  }

  const lastWeekShifts = await createWeekShifts(LAST_WEEK);
  const lastWeekRoster = await rosterWeek(lastWeekShifts, [], true);

  const thisWeekShifts = await createWeekShifts(THIS_WEEK);
  const thisWeekRoster = await rosterWeek(thisWeekShifts, [mariasLeave], false);

  // Carve out a few extra open shifts late this week so auto-fill has a story.
  const reopened = thisWeekRoster.assignments
    .filter((a) => {
      const shift = thisWeekShifts.find((s) => s.id === a.shiftId)!;
      return shift.dateKey >= addDays(THIS_WEEK, 4);
    })
    .slice(0, 4);
  for (const a of reopened) {
    await db.shift.update({ where: { id: a.shiftId }, data: { userId: null, status: "OPEN" } });
  }

  // ---- Swap request --------------------------------------------------------
  const zanele = staff.find((s) => s.seed.name === "Zanele Khumalo")!;
  const zaneleShift = await db.shift.findFirst({
    where: { orgId: org.id, userId: zanele.id, date: { gte: fromDateKey(THIS_WEEK) } },
    orderBy: { date: "desc" },
  });
  if (zaneleShift) {
    await db.swapRequest.create({
      data: {
        orgId: org.id, shiftId: zaneleShift.id, requesterId: zanele.id,
        note: "Exam the next morning — can anyone cover?", status: "PENDING",
      },
    });
  }

  // ---- Last week's time entries (scheduled vs actual variance) -------------
  const lastWeekAssigned = await db.shift.findMany({
    where: { orgId: org.id, userId: { not: null }, date: { gte: fromDateKey(LAST_WEEK), lte: fromDateKey(addDays(LAST_WEEK, 6)) } },
    take: 18,
    orderBy: { date: "asc" },
  });
  let wobble = 0;
  for (const s of lastWeekAssigned) {
    const inDrift = [-8, -4, 0, 3, 7, 12][wobble % 6];
    const outDrift = [5, 14, -3, 9, 0, 18][wobble % 6];
    wobble++;
    const base = s.date.getTime();
    await db.timeEntry.create({
      data: {
        orgId: org.id, userId: s.userId!, shiftId: s.id,
        clockIn: new Date(base + (s.startMinute + inDrift) * 60_000),
        clockOut: new Date(base + (s.endMinute + outDrift) * 60_000),
      },
    });
  }

  // ---- Notifications & events ----------------------------------------------
  const openCount = await db.shift.count({
    where: { orgId: org.id, userId: null, date: { gte: fromDateKey(THIS_WEEK), lte: fromDateKey(addDays(THIS_WEEK, 6)) } },
  });
  const managerNotes = [
    { type: "swap.requested", title: "Shift swap requested", body: "Zanele Khumalo wants to give away a shift this week.", href: "/app/requests" },
    { type: "timeoff.requested", title: "Time off requested", body: "Sipho Dlamini requested next Monday–Tuesday off.", href: "/app/requests" },
    { type: "schedule.alert", title: `${openCount} open shifts this week`, body: "Run the auto-scheduler to fill the gaps.", href: "/app/schedule" },
  ];
  for (const target of [owner.id, manager.id]) {
    await db.notification.createMany({
      data: managerNotes.map((n) => ({ ...n, orgId: org.id, userId: target })),
    });
  }
  await db.notification.create({
    data: {
      orgId: org.id, userId: mariasLeave.userId, type: "timeoff.approved",
      title: "Time off approved",
      body: "Your time off this week was approved. Your shifts were released.",
      href: "/app/requests", readAt: new Date(),
    },
  });

  await db.eventLog.createMany({
    data: [
      { orgId: org.id, type: "schedule.published", payload: JSON.stringify({ weekStartKey: LAST_WEEK, count: lastWeekRoster.assignments.length }) },
      { orgId: org.id, type: "schedule.autofilled", payload: JSON.stringify({ weekStartKey: THIS_WEEK, count: thisWeekRoster.assignments.length }) },
      { orgId: org.id, type: "timeoff.approved", payload: JSON.stringify({ userId: mariasLeave.userId }) },
      { orgId: org.id, type: "swap.requested", payload: JSON.stringify({ requesterId: zanele.id }) },
    ],
  });

  console.log(`Org: ${org.name}`);
  console.log(`Users: ${2 + staff.length} (all passwords: demo123)`);
  console.log(`Last week: ${lastWeekRoster.assignments.length} published, ${lastWeekRoster.unfilled.length} unfilled`);
  console.log(`This week: ${thisWeekRoster.assignments.length - reopened.length} assigned, ${openCount} open`);
  console.log("Login: manager@copperpot.demo / demo123 (or any employee email)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
