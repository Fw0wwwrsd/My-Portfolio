import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, formatDateKey, formatTimeRange, fromDateKey, shiftDurationHours, toDateKey, todayKey, weekStart } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { ClaimButton, RequestTimeOffButton, SwapButton } from "./my-actions";

export const metadata = { title: "My shifts · ShiftPilot" };

export default async function MyPage() {
  const user = await requireUser();
  const today = todayKey();
  const horizon = addDays(today, 14);

  const myRoleIds = (
    await db.userRole.findMany({ where: { userId: user.id }, select: { roleId: true } })
  ).map((r) => r.roleId);

  const [myShifts, openShifts, myTimeOff, pendingSwapShiftIds, org, me] = await Promise.all([
    db.shift.findMany({
      where: { orgId: user.orgId, userId: user.id, date: { gte: fromDateKey(today), lte: fromDateKey(horizon) } },
      include: { role: true },
      orderBy: [{ date: "asc" }, { startMinute: "asc" }],
    }),
    db.shift.findMany({
      where: {
        orgId: user.orgId,
        userId: null,
        roleId: { in: myRoleIds },
        date: { gte: fromDateKey(today), lte: fromDateKey(horizon) },
      },
      include: { role: true },
      orderBy: [{ date: "asc" }, { startMinute: "asc" }],
      take: 12,
    }),
    db.timeOffRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.swapRequest.findMany({
      where: { requesterId: user.id, status: { in: ["PENDING", "ACCEPTED_AWAITING_APPROVAL"] } },
      select: { shiftId: true },
    }),
    db.organization.findUniqueOrThrow({ where: { id: user.orgId } }),
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { hourlyWage: true } }),
  ]);
  const swapPending = new Set(pendingSwapShiftIds.map((s) => s.shiftId));

  const thisWeek = weekStart(today);
  const hoursThisWeek = myShifts
    .filter((s) => {
      const k = toDateKey(s.date);
      return k >= thisWeek && k <= addDays(thisWeek, 6);
    })
    .reduce((sum, s) => sum + shiftDurationHours(s.startMinute, s.endMinute), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hi {user.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-slate-500">
            {hoursThisWeek.toFixed(1)}h scheduled this week
            {me.hourlyWage > 0 && ` · ≈ R${Math.round(hoursThisWeek * me.hourlyWage)} earned`}
          </p>
        </div>
        <RequestTimeOffButton autoApproveDays={org.autoApproveTimeOffDays} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="My upcoming shifts" subtitle="Next 14 days" />
          <CardBody className="space-y-2">
            {myShifts.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">No shifts scheduled. Enjoy the rest! 🌴</p>
            )}
            {myShifts.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.role.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {s.role.name}
                    <span className="ml-2 text-xs font-normal text-slate-400">{formatDateKey(toDateKey(s.date))}</span>
                  </p>
                  <p className="text-xs tabular-nums text-slate-500">{formatTimeRange(s.startMinute, s.endMinute)}</p>
                </div>
                <Badge tone={statusTone(s.status)}>{s.status.toLowerCase()}</Badge>
                {swapPending.has(s.id) ? (
                  <Badge tone="amber">swap pending</Badge>
                ) : (
                  <SwapButton shiftId={s.id} />
                )}
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Open shifts you can claim" subtitle="First come, first served — conflicts are checked automatically" />
          <CardBody className="space-y-2">
            {openShifts.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">No open shifts match your roles right now.</p>
            )}
            {openShifts.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2">
                <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.role.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {s.role.name}
                    <span className="ml-2 text-xs font-normal text-slate-400">{formatDateKey(toDateKey(s.date))}</span>
                  </p>
                  <p className="text-xs tabular-nums text-slate-500">{formatTimeRange(s.startMinute, s.endMinute)}</p>
                </div>
                <ClaimButton shiftId={s.id} />
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="My time off" />
        <CardBody className="space-y-2">
          {myTimeOff.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">No time-off requests yet.</p>
          )}
          {myTimeOff.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-700">
                {formatDateKey(toDateKey(t.startDate))} – {formatDateKey(toDateKey(t.endDate))}
                {t.reason && <span className="ml-2 text-xs text-slate-400">({t.reason})</span>}
              </span>
              <Badge tone={statusTone(t.status)}>{t.status.toLowerCase()}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
