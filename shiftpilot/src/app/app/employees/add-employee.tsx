"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createEmployee } from "@/lib/actions/employees";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, Input, Label } from "@/components/ui/form";

export function AddEmployeeButton({ roles }: { roles: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wage, setWage] = useState("20");
  const [maxHours, setMaxHours] = useState("40");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleRole = (id: string) =>
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createEmployee({
        name,
        email,
        hourlyWage: Number(wage) || 0,
        maxHoursPerWeek: Number(maxHours) || 40,
        minRestHours: 10,
        roleIds,
      });
      if (!result.ok) setError(result.error ?? "Could not add the employee.");
      else {
        setInfo(result.info ?? "Added.");
        setName("");
        setEmail("");
        setRoleIds([]);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button onClick={() => { setOpen(true); setInfo(null); }}>+ Add employee</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add employee">
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Naledi Mthembu" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naledi@yourbusiness.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hourly wage (R)</Label>
              <Input type="number" min="0" value={wage} onChange={(e) => setWage(e.target.value)} />
            </div>
            <div>
              <Label>Max hours / week</Label>
              <Input type="number" min="1" max="60" value={maxHours} onChange={(e) => setMaxHours(e.target.value)} />
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
          {error && <Alert tone="error">{error}</Alert>}
          {info && <Alert tone="success">{info}</Alert>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Done
            </Button>
            <Button onClick={submit} disabled={pending || !name || !email}>
              {pending ? "Adding…" : "Add employee"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
