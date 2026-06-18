import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EVENT_TYPES } from "@/lib/services/events";

/**
 * Event catalog for future webhook subscribers. Every domain action in
 * ShiftPilot is written to the EventLog; connectors (payroll, POS, WhatsApp,
 * Zapier-style automations) subscribe to this stream instead of being wired
 * into individual features.
 */
export async function GET() {
  const recent = await db.eventLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { type: true, payload: true, createdAt: true },
  });

  return NextResponse.json({
    description:
      "ShiftPilot emits these events for every org. Webhook delivery is on the roadmap; the stream already exists today.",
    event_types: EVENT_TYPES,
    sample_recent_events: recent.map((e) => ({
      type: e.type,
      payload: JSON.parse(e.payload),
      created_at: e.createdAt.toISOString(),
    })),
  });
}
