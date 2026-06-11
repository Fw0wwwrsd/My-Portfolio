"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DAY_NAMES, formatMinute, parseTimeToMinute } from "@/lib/dates";
import { deactivateEmployee, setAvailability, updateEmployee } from "@/lib/actions/employees";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, Input, Label } from "@/components/ui/form";

type AvailabilityRow = { enabled: boolean; start: string; end: string };

export function EmployeeEditor({
  employee,
  roles,
}: {
  employee: {
    id: string;
    name: string;
    email: string;
    hourlyWage: number;
    maxHoursPerWeek: number;
    minRestHours: number;
    isActive: boolean;
    isSelf: boolean;
    roleIds: string[];
    availability: { dayOfWeek: number; startMinute: number; endMinute: number }[];
  };
  roles: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Profile
  const [name, setName] = useState(employee.name);
  const [wage, setWage] = useState(String(employee.hourlyWage));
  const [maxHours, setMaxHours] = useState(String(employee.maxHoursPerWeek));
  const [minRest, setMinRest] = useState(String(employee.minRestHours));
  const [roleIds, setRoleIds] = useState<string[]>(employee.roleIds);
  const [profileMsg, setProfileMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  // Availability — one row per weekday (Mon-first display order)
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const [rows, setRows] = useState<Record<number, AvailabilityRow>>(() => {
    const initial: Record<number, AvailabilityRow> = {};
    for (const d of dayOrder) {
      const win = employee.availability.find((a) => a.dayOfWeek === d);
      initial[d] = win
        ? { enabled: true, start: formatMinute(win.startMinute), end: formatMinute(Math.min(win.endMinute, 1439)) }
        : { enabled: false, start: "09:00", end: "17:00" };
    }
    return initial;
  });
  const anyWindows = employee.availability.length > 0;
  const [restricted, setRestricted] = useState(anyWindows);
  const [availMsg, setAvailMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const toggleRole = (id: string) =>
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));

  const saveProfile = () => {
    setProfileMsg(null);
    startTransition(async () => {
      const result = await updateEmployee(employee.id, {
        name,
        email: employee.email,
        hourlyWage: Number(wage) || 0,
        maxHoursPerWeek: Number(maxHours) || 40,
        minRestHours: Number(minRest) || 10,
        roleIds,
      });
      setProfileMsg(
        result.ok
          ? { tone: "success", text: "Profile saved." }
          : { tone: "error", text: result.error ?? "Could not save." }
      );
      router.refresh();
    });
  };

  const saveAvailability = () => {
    setAvailMsg(null);
    const windows: { dayOfWeek: number; startMinute: number; endMinute: number }[] = [];
    if (restricted) {
      for (const d of dayOrder) {
        const row = rows[d];
        if (!row.enabled) continue;
        const start = parseTimeToMinute(row.start);
        const end = parseTimeToMinute(row.end);
        if (start === null || end === null || end <= start) {
          setAvailMsg({ tone: "error", text: `${DAY_NAMES[d]}: enter a valid time range.` });
          return;
        }
        windows.push({ dayOfWeek: d, startMinute: start, endMinute: end });
      }
      if (windows.length === 0) {
        setAvailMsg({ tone: "error", text: "Enable at least one day, or switch to 'available any time'." });
        return;
      }
    }
    startTransition(async () => {
      const result = await setAvailability(employee.id, windows);
      setAvailMsg(
        result.ok
          ? { tone: "success", text: "Availability saved — the auto-scheduler will respect it." }
          : { tone: "error", text: result.error ?? "Could not save." }
      );
      router.refresh();
    });
  };

  const deactivate = () => {
    startTransition(async () => {
      const result = await deactivateEmployee(employee.id);
      if (result.ok) router.push("/app/employees");
      else setProfileMsg({ tone: "error", text: result.error ?? "Could not deactivate." });
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Profile & limits" subtitle="The auto-scheduler enforces these limits when filling shifts" />
        <CardBody className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Hourly wage (R)</Label>
              <Input type="number" min="0" value={wage} onChange={(e) => setWage(e.target.value)} />
            </div>
            <div>
              <Label>Max hours / week</Label>
              <Input type="number" min="1" max="60" value={maxHours} onChange={(e) => setMaxHours(e.target.value)} />
            </div>
            <div>
              <Label>Min rest (hours)</Label>
              <Input type="number" min="0" max="24" value={minRest} onChange={(e) => setMinRest(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Roles they can work</Label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRole(r.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    roleIds.includes(r.id)
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-600 hover:border-brand-300"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
          {profileMsg && <Alert tone={profileMsg.tone}>{profileMsg.text}</Alert>}
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={pending}>
              {pending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Weekly availability"
          subtitle="Shifts outside these windows are flagged and never auto-assigned"
        />
        <CardBody className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setRestricted(false)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                !restricted ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
              }`}
            >
              Available any time
            </button>
            <button
              onClick={() => setRestricted(true)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                restricted ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"
              }`}
            >
              Specific times only
            </button>
          </div>

          {restricted && (
            <div className="space-y-2">
              {dayOrder.map((d) => {
                const row = rows[d];
                return (
                  <div key={d} className="flex items-center gap-3">
                    <label className="flex w-28 items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => setRows({ ...rows, [d]: { ...row, enabled: e.target.checked } })}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {DAY_NAMES[d].slice(0, 3)}
                    </label>
                    <Input
                      type="time"
                      value={row.start}
                      disabled={!row.enabled}
                      onChange={(e) => setRows({ ...rows, [d]: { ...row, start: e.target.value } })}
                    />
                    <span className="text-slate-400">–</span>
                    <Input
                      type="time"
                      value={row.end}
                      disabled={!row.enabled}
                      onChange={(e) => setRows({ ...rows, [d]: { ...row, end: e.target.value } })}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {availMsg && <Alert tone={availMsg.tone}>{availMsg.text}</Alert>}
          <div className="flex justify-end">
            <Button onClick={saveAvailability} disabled={pending}>
              {pending ? "Saving…" : "Save availability"}
            </Button>
          </div>
        </CardBody>
      </Card>

      {!employee.isSelf && employee.isActive && (
        <Card>
          <CardHeader title="Danger zone" />
          <CardBody className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Deactivating releases all their future shifts back to the open pool.
            </p>
            <Button variant="danger" onClick={deactivate} disabled={pending}>
              Deactivate
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
