import { db } from "@/lib/db";
import { fromDateKey, todayKey } from "@/lib/dates";
import { emitEvent } from "./events";

const MATCH_WINDOW_MINUTES = 90;

/** Minutes since UTC midnight right now (the demo treats server time as org time). */
function nowMinute(): number {
  const now = new Date();
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

export async function getOpenEntry(userId: string) {
  return db.timeEntry.findFirst({
    where: { userId, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
}

export async function clockIn(
  orgId: string,
  userId: string
): Promise<{ ok: boolean; error?: string; matchedShift?: boolean }> {
  const open = await getOpenEntry(userId);
  if (open) return { ok: false, error: "You're already clocked in." };

  // Match today's shift whose start is within ±90 minutes of now.
  const today = todayKey();
  const minute = nowMinute();
  const todaysShifts = await db.shift.findMany({
    where: { orgId, userId, date: fromDateKey(today) },
  });
  const matched = todaysShifts.find(
    (s) => Math.abs(s.startMinute - minute) <= MATCH_WINDOW_MINUTES
  );

  await db.timeEntry.create({
    data: { orgId, userId, shiftId: matched?.id ?? null, clockIn: new Date() },
  });
  await emitEvent(orgId, "timeclock.in", { userId, shiftId: matched?.id ?? null });
  return { ok: true, matchedShift: !!matched };
}

export async function clockOut(
  orgId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const open = await getOpenEntry(userId);
  if (!open) return { ok: false, error: "You aren't clocked in." };

  await db.timeEntry.update({
    where: { id: open.id },
    data: { clockOut: new Date() },
  });
  await emitEvent(orgId, "timeclock.out", { userId, entryId: open.id });
  return { ok: true };
}
