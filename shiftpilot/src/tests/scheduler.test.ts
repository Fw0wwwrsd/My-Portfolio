import { describe, expect, it } from "vitest";
import { autoSchedule } from "@/lib/scheduler/engine";
import { detectConflicts } from "@/lib/scheduler/conflicts";
import type { SchedEmployee, SchedShift } from "@/lib/scheduler/types";

const SERVER = "role-server";
const COOK = "role-cook";

function employee(overrides: Partial<SchedEmployee> & { id: string }): SchedEmployee {
  return {
    name: overrides.id,
    roleIds: [SERVER],
    hourlyWage: 20,
    maxHoursPerWeek: 40,
    minRestHours: 10,
    availability: [],
    ...overrides,
  };
}

function shift(overrides: Partial<SchedShift> & { id: string; dateKey: string }): SchedShift {
  return {
    roleId: SERVER,
    roleName: "Server",
    startMinute: 9 * 60,
    endMinute: 17 * 60,
    userId: null,
    ...overrides,
  };
}

describe("autoSchedule", () => {
  it("assigns an open shift to a qualified employee", () => {
    const result = autoSchedule({
      openShifts: [shift({ id: "s1", dateKey: "2026-06-08" })],
      employees: [employee({ id: "alice" })],
      existingShifts: [],
      timeOff: [],
    });
    expect(result.assignments).toEqual([
      { shiftId: "s1", employeeId: "alice", employeeName: "alice" },
    ]);
    expect(result.unfilled).toHaveLength(0);
  });

  it("skips employees without the required role and reports the reason", () => {
    const result = autoSchedule({
      openShifts: [shift({ id: "s1", dateKey: "2026-06-08", roleId: COOK, roleName: "Cook" })],
      employees: [employee({ id: "alice" })],
      existingShifts: [],
      timeOff: [],
    });
    expect(result.assignments).toHaveLength(0);
    expect(result.unfilled[0].reasons[0]).toContain("not qualified for Cook");
  });

  it("respects availability windows", () => {
    const eveningOnly = employee({
      id: "eve",
      availability: [{ dayOfWeek: 1, startMinute: 17 * 60, endMinute: 23 * 60 }],
    });
    // 2026-06-08 is a Monday
    const result = autoSchedule({
      openShifts: [
        shift({ id: "day", dateKey: "2026-06-08" }),
        shift({ id: "night", dateKey: "2026-06-08", startMinute: 17 * 60, endMinute: 22 * 60 }),
      ],
      employees: [eveningOnly],
      existingShifts: [],
      timeOff: [],
    });
    expect(result.assignments).toEqual([
      { shiftId: "night", employeeId: "eve", employeeName: "eve" },
    ]);
    expect(result.unfilled[0].shiftId).toBe("day");
    expect(result.unfilled[0].reasons[0]).toContain("outside their availability");
  });

  it("never schedules over approved time off", () => {
    const result = autoSchedule({
      openShifts: [shift({ id: "s1", dateKey: "2026-06-10" })],
      employees: [employee({ id: "alice" })],
      existingShifts: [],
      timeOff: [{ userId: "alice", startKey: "2026-06-09", endKey: "2026-06-11" }],
    });
    expect(result.unfilled[0].reasons[0]).toContain("time off");
  });

  it("never double-books overlapping shifts", () => {
    const result = autoSchedule({
      openShifts: [shift({ id: "s2", dateKey: "2026-06-08", startMinute: 12 * 60, endMinute: 20 * 60 })],
      employees: [employee({ id: "alice" })],
      existingShifts: [shift({ id: "s1", dateKey: "2026-06-08", userId: "alice" })],
      timeOff: [],
    });
    expect(result.unfilled[0].reasons[0]).toContain("overlapping");
  });

  it("enforces minimum rest, including closing-then-opening across midnight", () => {
    // Alice closes Monday 18:00–01:00 (+1d); a Tuesday 08:00 opening = 7h rest < 10h.
    const closing = shift({
      id: "close",
      dateKey: "2026-06-08",
      startMinute: 18 * 60,
      endMinute: 25 * 60,
      userId: "alice",
    });
    const result = autoSchedule({
      openShifts: [shift({ id: "open", dateKey: "2026-06-09", startMinute: 8 * 60, endMinute: 16 * 60 })],
      employees: [employee({ id: "alice" })],
      existingShifts: [closing],
      timeOff: [],
    });
    expect(result.unfilled[0].reasons[0]).toContain("rest");
  });

  it("enforces max weekly hours across tentative assignments", () => {
    // Five 8h shifts hit 40h; a sixth in the same week must go unfilled.
    const week = ["2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12", "2026-06-13"];
    const result = autoSchedule({
      openShifts: week.map((dateKey, i) => shift({ id: `s${i}`, dateKey })),
      employees: [employee({ id: "alice" })],
      existingShifts: [],
      timeOff: [],
    });
    expect(result.assignments).toHaveLength(5);
    expect(result.unfilled).toHaveLength(1);
    expect(result.unfilled[0].reasons[0]).toContain("exceed 40h");
  });

  it("spreads hours fairly across employees", () => {
    const result = autoSchedule({
      openShifts: [
        shift({ id: "s1", dateKey: "2026-06-08" }),
        shift({ id: "s2", dateKey: "2026-06-09" }),
        shift({ id: "s3", dateKey: "2026-06-10" }),
        shift({ id: "s4", dateKey: "2026-06-11" }),
      ],
      employees: [employee({ id: "alice" }), employee({ id: "bob" })],
      existingShifts: [],
      timeOff: [],
    });
    const byEmployee = new Map<string, number>();
    for (const a of result.assignments) {
      byEmployee.set(a.employeeId, (byEmployee.get(a.employeeId) ?? 0) + 1);
    }
    expect(byEmployee.get("alice")).toBe(2);
    expect(byEmployee.get("bob")).toBe(2);
  });

  it("fills the most constrained shifts first", () => {
    // Cook shift can only go to bob (the only cook); server shift could go to either.
    // If the server shift were filled first with bob, the cook shift would starve.
    const bob = employee({ id: "bob", roleIds: [SERVER, COOK], maxHoursPerWeek: 8 });
    const alice = employee({ id: "alice" });
    const result = autoSchedule({
      openShifts: [
        shift({ id: "server-shift", dateKey: "2026-06-08" }),
        shift({ id: "cook-shift", dateKey: "2026-06-09", roleId: COOK, roleName: "Cook" }),
      ],
      employees: [alice, bob],
      existingShifts: [],
      timeOff: [],
    });
    expect(result.unfilled).toHaveLength(0);
    const cookAssignee = result.assignments.find((a) => a.shiftId === "cook-shift");
    expect(cookAssignee?.employeeId).toBe("bob");
  });

  it("prefers cheaper employees when preferLowerCost is on", () => {
    const cheap = employee({ id: "cheap", hourlyWage: 15 });
    const pricey = employee({ id: "pricey", hourlyWage: 30 });
    const result = autoSchedule({
      openShifts: [shift({ id: "s1", dateKey: "2026-06-08" })],
      employees: [pricey, cheap],
      existingShifts: [],
      timeOff: [],
      options: { preferLowerCost: true },
    });
    expect(result.assignments[0].employeeId).toBe("cheap");
  });

  it("is deterministic across runs", () => {
    const input = {
      openShifts: [
        shift({ id: "s1", dateKey: "2026-06-08" }),
        shift({ id: "s2", dateKey: "2026-06-09" }),
      ],
      employees: [employee({ id: "alice" }), employee({ id: "bob" })],
      existingShifts: [],
      timeOff: [],
    };
    expect(autoSchedule(input)).toEqual(autoSchedule(input));
  });
});

describe("detectConflicts", () => {
  it("flags a double-booking on manual assignment", () => {
    const existing = shift({ id: "s1", dateKey: "2026-06-08", userId: "alice" });
    const conflicting = shift({
      id: "s2",
      dateKey: "2026-06-08",
      startMinute: 14 * 60,
      endMinute: 22 * 60,
      userId: "alice",
    });
    const warnings = detectConflicts(conflicting, employee({ id: "alice" }), [existing], []);
    expect(warnings.some((w) => w.includes("overlapping"))).toBe(true);
  });

  it("returns no warnings for a clean assignment", () => {
    const clean = shift({ id: "s1", dateKey: "2026-06-08", userId: "alice" });
    expect(detectConflicts(clean, employee({ id: "alice" }), [], [])).toEqual([]);
  });
});
