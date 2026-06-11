import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AddEmployeeButton } from "./add-employee";

export const metadata = { title: "Team · ShiftPilot" };

export default async function EmployeesPage() {
  const manager = await requireManager();
  const [employees, roles] = await Promise.all([
    db.user.findMany({
      where: { orgId: manager.orgId, isActive: true },
      include: { roleAssignments: { include: { role: true } }, availability: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    db.role.findMany({ where: { orgId: manager.orgId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500">{employees.length} active people</p>
        </div>
        <AddEmployeeButton roles={roles.map((r) => ({ id: r.id, name: r.name }))} />
      </div>

      <Card>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Roles</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Wage</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Max hours</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Availability</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={e.name} color={e.avatarColor} size={30} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{e.name}</p>
                      <p className="truncate text-xs text-slate-400">{e.email}</p>
                    </div>
                    {e.role !== "EMPLOYEE" && <Badge tone="purple">{e.role.toLowerCase()}</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {e.roleAssignments.map((ra) => (
                      <span
                        key={ra.roleId}
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: ra.role.color }}
                      >
                        {ra.role.name}
                      </span>
                    ))}
                    {e.roleAssignments.length === 0 && <span className="text-xs text-slate-400">—</span>}
                  </div>
                </td>
                <td className="hidden px-4 py-3 tabular-nums text-slate-600 sm:table-cell">
                  {e.hourlyWage > 0 ? `R${e.hourlyWage}/h` : "—"}
                </td>
                <td className="hidden px-4 py-3 tabular-nums text-slate-600 md:table-cell">{e.maxHoursPerWeek}h/wk</td>
                <td className="hidden px-4 py-3 text-xs text-slate-500 md:table-cell">
                  {e.availability.length === 0 ? "Any time" : `${e.availability.length} windows`}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/app/employees/${e.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
