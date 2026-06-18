import { db } from "@/lib/db";

/**
 * Every domain event lands in EventLog. This is the integration backbone:
 * future connectors (payroll, POS, WhatsApp, webhooks) subscribe to this
 * stream rather than being wired into each feature.
 */
export async function emitEvent(
  orgId: string,
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  await db.eventLog.create({
    data: { orgId, type, payload: JSON.stringify(payload) },
  });
}

/** Event catalog surfaced by GET /api/v1/webhooks for future subscribers. */
export const EVENT_TYPES = [
  "shift.created",
  "shift.updated",
  "shift.deleted",
  "shift.assigned",
  "shift.claimed",
  "schedule.published",
  "schedule.autofilled",
  "schedule.week_copied",
  "swap.requested",
  "swap.accepted",
  "swap.approved",
  "swap.declined",
  "timeoff.requested",
  "timeoff.approved",
  "timeoff.declined",
  "timeclock.in",
  "timeclock.out",
  "employee.created",
  "employee.updated",
] as const;
