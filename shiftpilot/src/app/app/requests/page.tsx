import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateKey, formatTimeRange, toDateKey } from "@/lib/dates";
import { isManager } from "@/lib/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { AcceptSwapButton, ReviewButtons } from "./request-actions";

export const metadata = { title: "Requests · ShiftPilot" };

export default async function RequestsPage() {
  const user = await requireUser();
  const manager = isManager(user.role);

  const [timeOff, swaps] = await Promise.all([
    db.timeOffRequest.findMany({
      where: { orgId: user.orgId },
      include: { user: { select: { name: true, avatarColor: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.swapRequest.findMany({
      where: { orgId: user.orgId },
      include: {
        requester: { select: { id: true, name: true, avatarColor: true } },
        targetUser: { select: { name: true } },
        shift: { include: { role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const pendingTimeOff = timeOff.filter((t) => t.status === "PENDING");
  const otherTimeOff = timeOff.filter((t) => t.status !== "PENDING");
  const openSwapOffers = swaps.filter((s) => s.status === "PENDING" && s.requesterId !== user.id);
  const awaitingApproval = swaps.filter((s) => s.status === "ACCEPTED_AWAITING_APPROVAL");
  const swapHistory = swaps.filter((s) => !["PENDING", "ACCEPTED_AWAITING_APPROVAL"].includes(s.status));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Requests</h1>
        <p className="text-sm text-slate-500">
          {manager
            ? "Approve or decline your team's time off and shift swaps."
            : "Pick up swap offers from coworkers and track your requests."}
        </p>
      </div>

      {manager && (
        <Card>
          <CardHeader
            title="Waiting for your approval"
            subtitle={`${pendingTimeOff.length + awaitingApproval.length + swaps.filter((s) => s.status === "PENDING").length} items`}
          />
          <CardBody className="space-y-2">
            {pendingTimeOff.length === 0 &&
              awaitingApproval.length === 0 &&
              swaps.filter((s) => s.status === "PENDING").length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">Queue is empty. ✅</p>
              )}

            {pendingTimeOff.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <Avatar name={t.user.name} color={t.user.avatarColor} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{t.user.name} · time off</p>
                  <p className="text-xs text-slate-500">
                    {formatDateKey(toDateKey(t.startDate))} – {formatDateKey(toDateKey(t.endDate))}
                    {t.reason && ` · ${t.reason}`}
                  </p>
                </div>
                <ReviewButtons kind="timeoff" id={t.id} />
              </div>
            ))}

            {awaitingApproval.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                <Avatar name={s.requester.name} color={s.requester.avatarColor} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    Swap: {s.requester.name} → {s.targetUser?.name ?? "?"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.shift.role.name} · {formatDateKey(toDateKey(s.shift.date))} ·{" "}
                    {formatTimeRange(s.shift.startMinute, s.shift.endMinute)}
                  </p>
                </div>
                <ReviewButtons kind="swap" id={s.id} />
              </div>
            ))}

            {swaps
              .filter((s) => s.status === "PENDING")
              .map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                  <Avatar name={s.requester.name} color={s.requester.avatarColor} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {s.requester.name} offered a shift — waiting for a volunteer
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.shift.role.name} · {formatDateKey(toDateKey(s.shift.date))} ·{" "}
                      {formatTimeRange(s.shift.startMinute, s.shift.endMinute)}
                      {s.note && ` · "${s.note}"`}
                    </p>
                  </div>
                  <ReviewButtons kind="swap" id={s.id} declineOnly />
                </div>
              ))}
          </CardBody>
        </Card>
      )}

      {!manager && (
        <Card>
          <CardHeader title="Swap offers from coworkers" subtitle="Volunteer to take a shift — a manager confirms the handover" />
          <CardBody className="space-y-2">
            {openSwapOffers.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">No open swap offers right now.</p>
            )}
            {openSwapOffers.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg border border-dashed border-purple-200 bg-purple-50/40 px-3 py-2">
                <Avatar name={s.requester.name} color={s.requester.avatarColor} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{s.requester.name} needs cover</p>
                  <p className="text-xs text-slate-500">
                    {s.shift.role.name} · {formatDateKey(toDateKey(s.shift.date))} ·{" "}
                    {formatTimeRange(s.shift.startMinute, s.shift.endMinute)}
                    {s.note && ` · "${s.note}"`}
                  </p>
                </div>
                <AcceptSwapButton swapId={s.id} />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Time-off history" />
          <CardBody className="space-y-2">
            {otherTimeOff.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">Nothing here yet.</p>
            )}
            {otherTimeOff.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-slate-700">
                  {t.user.name} · {formatDateKey(toDateKey(t.startDate))} – {formatDateKey(toDateKey(t.endDate))}
                </span>
                <Badge tone={statusTone(t.status)}>{t.status.toLowerCase()}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Swap history" />
          <CardBody className="space-y-2">
            {swapHistory.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">Nothing here yet.</p>
            )}
            {swapHistory.slice(0, 8).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-slate-700">
                  {s.requester.name}
                  {s.targetUser ? ` → ${s.targetUser.name}` : ""} · {s.shift.role.name}{" "}
                  {formatDateKey(toDateKey(s.shift.date))}
                </span>
                <Badge tone={statusTone(s.status)}>{s.status.replaceAll("_", " ").toLowerCase()}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
