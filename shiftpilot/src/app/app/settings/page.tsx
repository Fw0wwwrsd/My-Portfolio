import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { getIndustry } from "@/lib/industries";
import { formatTimeRange } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings · ShiftPilot" };

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default async function SettingsPage() {
  const manager = await requireManager();
  const [org, templates] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: manager.orgId } }),
    db.shiftTemplate.findMany({
      where: { orgId: manager.orgId },
      include: { role: true },
      orderBy: [{ startMinute: "asc" }, { name: "asc" }],
    }),
  ]);
  const industry = getIndustry(org.industry);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          {industry ? `${industry.icon} ${industry.name}` : org.industry} · automation rules save
          you approvals every single week
        </p>
      </div>

      <SettingsForm
        initial={{
          name: org.name,
          weeklyLaborBudget: org.weeklyLaborBudget,
          autoApproveTimeOffDays: org.autoApproveTimeOffDays,
          autoApproveSwapsSameRole: org.autoApproveSwapsSameRole,
        }}
      />

      <Card>
        <CardHeader
          title="Recurring shift templates"
          subtitle='These drive "From templates" on the schedule — your week builds itself'
        />
        <CardBody className="p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">Template</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Days</th>
                <th className="px-4 py-2.5 font-medium">People</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{t.name}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: t.role.color }}
                    >
                      {t.role.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">
                    {formatTimeRange(t.startMinute, t.endMinute)}
                  </td>
                  <td className="hidden px-4 py-2.5 text-xs text-slate-500 sm:table-cell">
                    {t.daysOfWeek
                      .split(",")
                      .map((d) => DAY_LABELS[Number(d)])
                      .join(" ")}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-600">×{t.headcount}</td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                    No templates yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
