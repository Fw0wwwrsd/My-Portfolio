"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateOrgSettings } from "@/lib/actions/onboarding";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, Input, Label } from "@/components/ui/form";

export function SettingsForm({
  initial,
}: {
  initial: {
    name: string;
    weeklyLaborBudget: number | null;
    autoApproveTimeOffDays: number | null;
    autoApproveSwapsSameRole: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const submit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateOrgSettings(formData);
      setMessage(
        result.ok
          ? { tone: "success", text: result.info ?? "Saved." }
          : { tone: "error", text: result.error ?? "Could not save." }
      );
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader title="Business & automation" />
      <CardBody>
        <form action={submit} className="space-y-4">
          <div>
            <Label>Business name</Label>
            <Input name="name" defaultValue={initial.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Weekly labor budget (R, blank = none)</Label>
              <Input
                name="weeklyLaborBudget"
                type="number"
                min="0"
                defaultValue={initial.weeklyLaborBudget ?? ""}
                placeholder="e.g. 8500"
              />
              <p className="mt-1 text-xs text-slate-400">The dashboard warns you before you blow it.</p>
            </div>
            <div>
              <Label>Auto-approve time off requested ≥ N days ahead (blank = always review)</Label>
              <Input
                name="autoApproveTimeOffDays"
                type="number"
                min="0"
                defaultValue={initial.autoApproveTimeOffDays ?? ""}
                placeholder="e.g. 14"
              />
              <p className="mt-1 text-xs text-slate-400">Early requests approve themselves.</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="autoApproveSwapsSameRole"
              defaultChecked={initial.autoApproveSwapsSameRole}
              className="h-4 w-4 rounded border-slate-300"
            />
            Auto-approve swaps when both employees hold the shift&apos;s role
          </label>
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
