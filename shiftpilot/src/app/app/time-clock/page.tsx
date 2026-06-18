import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatTimeRange, shiftDurationHours } from "@/lib/dates";
import { isManager } from "@/lib/types";
import { getOpenEntry } from "@/lib/services/timeclock";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ClockButtons } from "./clock-buttons";

export const metadata = { title: "Time clock · ShiftPilot" };

const fmtTime = (d: Date) =>
  d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function TimeClockPage() {
  const user = await requireUser();
  const manager = isManager(user.role);

  const since = new Date(Date.now() - 14 * 86_400_000);
  const [openEntry, entries] = await Promise.all([
    getOpenEntry(user.id),
    db.timeEntry.findMany({
      where: {
        orgId: user.orgId,
        clockIn: { gte: since },
        ...(manager ? {} : { userId: user.id }),
      },
      include: {
        user: { select: { name: true, avatarColor: true, hourlyWage: true } },
        shift: { include: { role: true } },
      },
      orderBy: { clockIn: "desc" },
      take: 40,
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Time clock</h1>
          <p className="text-sm text-slate-500">
            Clock-ins auto-match your scheduled shift, so timesheets write themselves.
          </p>
        </div>
        <ClockButtons
          clockedInSince={openEntry ? fmtTime(openEntry.clockIn) : null}
        />
      </div>

      <Card>
        <CardHeader
          title={manager ? "Team timesheets" : "My timesheet"}
          subtitle="Last 14 days · actual vs scheduled"
        />
        <CardBody className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                {manager && <th className="px-4 py-2.5 font-medium">Who</th>}
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Clocked</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Scheduled</th>
                <th className="px-4 py-2.5 font-medium">Hours</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Variance</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={manager ? 6 : 5} className="px-4 py-8 text-center text-sm text-slate-400">
                    No time entries yet. Clock in when your shift starts.
                  </td>
                </tr>
              )}
              {entries.map((e) => {
                const actualMin = e.clockOut
                  ? Math.round((e.clockOut.getTime() - e.clockIn.getTime()) / 60_000)
                  : null;
                const scheduledMin = e.shift ? e.shift.endMinute - e.shift.startMinute : null;
                const variance =
                  actualMin !== null && scheduledMin !== null ? actualMin - scheduledMin : null;
                return (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    {manager && (
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={e.user.name} color={e.user.avatarColor} size={24} />
                          <span className="truncate text-slate-800">{e.user.name}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-slate-600">{fmtDate(e.clockIn)}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">
                      {fmtTime(e.clockIn)} – {e.clockOut ? fmtTime(e.clockOut) : <Badge tone="green">on shift</Badge>}
                    </td>
                    <td className="hidden px-4 py-2.5 tabular-nums text-slate-500 sm:table-cell">
                      {e.shift ? (
                        <>
                          {e.shift.role.name} · {formatTimeRange(e.shift.startMinute, e.shift.endMinute)}
                        </>
                      ) : (
                        <Badge tone="amber">unscheduled</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-800">
                      {actualMin !== null ? `${(actualMin / 60).toFixed(2)}h` : "—"}
                    </td>
                    <td className="hidden px-4 py-2.5 tabular-nums md:table-cell">
                      {variance === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={variance > 10 ? "text-amber-600" : variance < -10 ? "text-blue-600" : "text-slate-500"}>
                          {variance > 0 ? "+" : ""}
                          {variance} min
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {manager && (
        <p className="text-xs text-slate-400">
          💡 Future payroll integrations read these timesheets straight from the API — no
          re-typing hours. See{" "}
          <a href="/app/integrations" className="font-medium text-brand-600 hover:underline">
            Integrations
          </a>
          .
        </p>
      )}
    </div>
  );
}
