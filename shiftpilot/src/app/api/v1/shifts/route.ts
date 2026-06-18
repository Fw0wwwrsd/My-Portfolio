import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { addDays, fromDateKey, isValidDateKey, toDateKey, todayKey, weekStart } from "@/lib/dates";

/**
 * Read-only schedule feed — a preview of the integration surface that
 * payroll/POS connectors consume. Authenticate with a logged-in session or
 * the demo bearer token.
 *
 *   curl -H "Authorization: Bearer demo-api-key" http://localhost:3000/api/v1/shifts?week=2026-06-08
 */
export async function GET(request: NextRequest) {
  let orgId: string | null = null;

  const auth = request.headers.get("authorization");
  if (auth === "Bearer demo-api-key") {
    const org = await db.organization.findFirst({ select: { id: true } });
    orgId = org?.id ?? null;
  } else {
    const user = await getSessionUser();
    orgId = user?.orgId ?? null;
  }
  if (!orgId) {
    return NextResponse.json(
      { error: "Unauthorized. Log in or pass 'Authorization: Bearer demo-api-key'." },
      { status: 401 }
    );
  }

  const weekParam = request.nextUrl.searchParams.get("week");
  const weekStartKey = weekStart(weekParam && isValidDateKey(weekParam) ? weekParam : todayKey());

  const shifts = await db.shift.findMany({
    where: {
      orgId,
      date: { gte: fromDateKey(weekStartKey), lte: fromDateKey(addDays(weekStartKey, 6)) },
    },
    include: { role: { select: { name: true } }, user: { select: { name: true, email: true } } },
    orderBy: [{ date: "asc" }, { startMinute: "asc" }],
  });

  return NextResponse.json({
    week_start: weekStartKey,
    count: shifts.length,
    shifts: shifts.map((s) => ({
      id: s.id,
      date: toDateKey(s.date),
      start_minute: s.startMinute,
      end_minute: s.endMinute,
      role: s.role.name,
      status: s.status,
      assignee: s.user ? { name: s.user.name, email: s.user.email } : null,
    })),
  });
}
