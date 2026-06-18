import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmployeeEditor } from "./employee-editor";

export const metadata = { title: "Employee · ShiftPilot" };

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const manager = await requireManager();
  const { id } = await params;

  const [employee, roles] = await Promise.all([
    db.user.findFirst({
      where: { id, orgId: manager.orgId },
      include: { roleAssignments: true, availability: { orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] } },
    }),
    db.role.findMany({ where: { orgId: manager.orgId }, orderBy: { name: "asc" } }),
  ]);
  if (!employee) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/app/employees" className="text-xs font-medium text-brand-600 hover:underline">
          ← Back to team
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <Avatar name={employee.name} color={employee.avatarColor} size={44} />
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {employee.name}{" "}
              {!employee.isActive && <Badge tone="red">deactivated</Badge>}
            </h1>
            <p className="text-sm text-slate-500">{employee.email}</p>
          </div>
        </div>
      </div>

      <EmployeeEditor
        employee={{
          id: employee.id,
          name: employee.name,
          email: employee.email,
          hourlyWage: employee.hourlyWage,
          maxHoursPerWeek: employee.maxHoursPerWeek,
          minRestHours: employee.minRestHours,
          isActive: employee.isActive,
          isSelf: employee.id === manager.id,
          roleIds: employee.roleAssignments.map((ra) => ra.roleId),
          availability: employee.availability.map((a) => ({
            dayOfWeek: a.dayOfWeek,
            startMinute: a.startMinute,
            endMinute: a.endMinute,
          })),
        }}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
      />
    </div>
  );
}
