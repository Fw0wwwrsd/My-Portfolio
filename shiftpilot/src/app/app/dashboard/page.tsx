import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  addDays,
  formatDateKey,
  formatTimeRange,
  fromDateKey,
  shiftDurationHours,
  todayKey,
  weekStart,
} from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";

export const metadata = { title: "Dashboard · ShiftPilot" };

export default async function DashboardPage() {
  const user = await requireManager();
  const today = todayKey();
  const thisWeek = weekStart(today);

  const [org, weekShifts, pendingTimeOff, pendingSwaps, recentEvents] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: user.orgId } }),
    db.shift.findMany({
      where: {
        orgId: user.orgId,
        date: { gte: fromDateKey(thisWeek), lte: fromDateKey(addDays(thisWeek, 6)) },
      },
      include: { role: true, user: { select: { id: true, name: true, hourlyWage: true, avatarColor: true } } },
      orderBy: [{ date: "asc" }, { startMinute: "asc" }],
    }),
    db.timeOffRequest.count({ where: { orgId: user.orgId, status: "PENDING" } }),
    db.swapRequest.count({
      where: { orgId: user.orgId, status: { in: ["PENDING", "ACCEPTED_AWAITING_APPROVAL"] } },
    }),
    db.eventLog.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const todayShifts = weekShifts.filter((s) => s.date.toISOString().slice(0, 10) === today);
  const openThisWeek = weekShifts.filter((s) => !s.userId);
  const assignedThisWeek = weekShifts.filter((s) => s.userId);

  const laborCost = assignedThisWeek.reduce(
    (sum, s) => sum + shiftDurationHours(s.startMinute, s.endMinute) * (s.user?.hourlyWage ?? 0),
    0
  );
  const budget = org.weeklyLaborBudget;
  const overBudget = budget !== null && laborCost > budget;

  // Today's coverage by role
  const coverage = new Map<string, { name: string; color: string; assigned: number; total: number }>();
  for (const s of todayShifts) {
    const entry = coverage.get(s.roleId) ?? { name: s.role.name, color: s.role.color, assigned: 0, total: 0 };
    entry.total++;
    if (s.userId) entry.assigned++;
    coverage.set(s.roleId, entry);
  }

  const pendingApprovals = pendingTimeOff + pendingSwaps;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Good day, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">
          Here&apos;s what&apos;s happening at {org.name} this week.
        </p>
      </div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's shifts"
          value={String(todayShifts.length)}
          detail={`${todayShifts.filter((s) => s.userId).length} covered`}
          href="/app/schedule"
        />
        <StatCard
          label="Open shifts this week"
          value={String(openThisWeek.length)}
          detail={openThisWeek.length > 0 ? "Run auto-fill to close the gaps" : "Fully staffed 🎉"}
          href="/app/schedule"
          alert={openThisWeek.length > 0}
        />
        <StatCard
          label="Labor cost this week"
          value={`R${Math.round(laborCost).toLocaleString()}`}
          detail={
            budget !== null
              ? `${overBudget ? "Over" : "Within"} budget of R${budget.toLocaleString()}`
              : "No budget set"
          }
          href="/app/settings"
          alert={overBudget}
        />
        <StatCard
          label="Pending approvals"
          value={String(pendingApprovals)}
          detail={`${pendingTimeOff} time off · ${pendingSwaps} swaps`}
          href="/app/requests"
          alert={pendingApprovals > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's coverage */}
        <Card>
          <CardHeader
            title="Today's coverage"
            subtitle={formatDateKey(today)}
            action={
              <Link href="/app/schedule" className="text-xs font-medium text-brand-600 hover:underline">
                Open schedule →
              </Link>
            }
          />
          <CardBody>
            {coverage.size === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No shifts scheduled today.</p>
            ) : (
              <div className="space-y-3">
                {[...coverage.values()].map((c) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="w-24 text-sm font-medium text-slate-700">{c.name}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${c.assigned === c.total ? "bg-green-500" : "bg-amber-400"}`}
                        style={{ width: `${(c.assigned / c.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-slate-500">
                      {c.assigned}/{c.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {todayShifts.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {todayShifts.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm">
                    {s.user ? (
                      <Avatar name={s.user.name} color={s.user.avatarColor} size={24} />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-amber-400 text-[10px] text-amber-500">
                        ?
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-slate-700">
                      {s.user?.name ?? <span className="text-amber-600">Unassigned</span>} · {s.role.name}
                    </span>
                    <span className="text-xs tabular-nums text-slate-400">
                      {formatTimeRange(s.startMinute, s.endMinute)}
                    </span>
                  </div>
                ))}
                {todayShifts.length > 5 && (
                  <p className="text-xs text-slate-400">+ {todayShifts.length - 5} more on the schedule</p>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Alerts + activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Needs your attention" />
            <CardBody className="space-y-2.5">
              {openThisWeek.length > 0 && (
                <AlertRow
                  tone="amber"
                  text={`${openThisWeek.length} open shifts this week`}
                  action={{ href: "/app/schedule", label: "Auto-fill" }}
                />
              )}
              {pendingTimeOff > 0 && (
                <AlertRow
                  tone="blue"
                  text={`${pendingTimeOff} time-off request${pendingTimeOff > 1 ? "s" : ""} waiting`}
                  action={{ href: "/app/requests", label: "Review" }}
                />
              )}
              {pendingSwaps > 0 && (
                <AlertRow
                  tone="purple"
                  text={`${pendingSwaps} shift swap${pendingSwaps > 1 ? "s" : ""} in progress`}
                  action={{ href: "/app/requests", label: "Review" }}
                />
              )}
              {overBudget && (
                <AlertRow
                  tone="red"
                  text={`Labor cost is R${Math.round(laborCost - (budget ?? 0)).toLocaleString()} over budget`}
                  action={{ href: "/app/schedule", label: "Adjust" }}
                />
              )}
              {openThisWeek.length === 0 && pendingApprovals === 0 && !overBudget && (
                <p className="py-4 text-center text-sm text-slate-400">
                  All clear — nothing needs your attention. ☕
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recent activity" subtitle="From the event log — the same stream future integrations subscribe to" />
            <CardBody className="space-y-2">
              {recentEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                  <Badge tone="gray">{e.type}</Badge>
                  <span className="text-xs tabular-nums text-slate-400">
                    {e.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              {recentEvents.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">No activity yet.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  href,
  alert = false,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardBody>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${alert ? "text-amber-600" : "text-slate-900"}`}>{value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
        </CardBody>
      </Card>
    </Link>
  );
}

function AlertRow({
  tone,
  text,
  action,
}: {
  tone: "amber" | "blue" | "purple" | "red";
  text: string;
  action: { href: string; label: string };
}) {
  const dots = { amber: "bg-amber-400", blue: "bg-blue-400", purple: "bg-purple-400", red: "bg-red-500" };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dots[tone]}`} />
      <span className="min-w-0 flex-1 text-sm text-slate-700">{text}</span>
      <Link href={action.href} className="text-xs font-semibold text-brand-600 hover:underline">
        {action.label} →
      </Link>
    </div>
  );
}
