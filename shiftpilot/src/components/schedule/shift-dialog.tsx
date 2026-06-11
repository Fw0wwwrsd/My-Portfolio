"use client";

import { useMemo, useState, useTransition } from "react";
import { formatDateKey, formatMinute, parseTimeToMinute } from "@/lib/dates";
import { createShift, updateShift, type ActionResult } from "@/lib/actions/shifts";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, Input, Label, Select } from "@/components/ui/form";

export type GridRole = { id: string; name: string; color: string };
export type GridEmployee = { id: string; name: string; avatarColor: string; roleIds: string[] };
export type GridShift = {
  id: string;
  dateKey: string;
  startMinute: number;
  endMinute: number;
  roleId: string;
  userId: string | null;
  status: string;
  notes: string;
};

export function ShiftDialog({
  roles,
  employees,
  days,
  initial,
  onClose,
  onSaved,
  onDelete,
}: {
  roles: GridRole[];
  employees: GridEmployee[];
  days: string[];
  initial: { shift: GridShift } | { dateKey: string; userId: string | null };
  onClose: () => void;
  onSaved: (result: ActionResult) => void;
  onDelete: (shiftId: string) => void;
}) {
  const editing = "shift" in initial ? initial.shift : null;
  const [roleId, setRoleId] = useState(editing?.roleId ?? roles[0]?.id ?? "");
  const [userId, setUserId] = useState<string>(editing?.userId ?? ("userId" in initial ? initial.userId ?? "" : ""));
  const [dateKey, setDateKey] = useState(editing?.dateKey ?? ("dateKey" in initial ? initial.dateKey : days[0]));
  const [start, setStart] = useState(formatMinute(editing?.startMinute ?? 9 * 60));
  const [end, setEnd] = useState(formatMinute(editing?.endMinute ?? 17 * 60));
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const qualified = useMemo(
    () => employees.filter((e) => e.roleIds.includes(roleId)),
    [employees, roleId]
  );

  const overnight = useMemo(() => {
    const s = parseTimeToMinute(start);
    const e = parseTimeToMinute(end);
    return s !== null && e !== null && e <= s;
  }, [start, end]);

  const save = () => {
    const startMinute = parseTimeToMinute(start);
    let endMinute = parseTimeToMinute(end);
    if (startMinute === null || endMinute === null) {
      setError("Enter valid start and end times.");
      return;
    }
    if (endMinute <= startMinute) endMinute += 1440; // crosses midnight

    const input = {
      roleId,
      userId: userId || null,
      dateKey,
      startMinute,
      endMinute,
      notes: notes.trim() || undefined,
    };
    setError(null);
    startTransition(async () => {
      const result = editing ? await updateShift(editing.id, input) : await createShift(input);
      if (!result.ok) setError(result.error ?? "Could not save the shift.");
      else onSaved(result);
    });
  };

  return (
    <Dialog open onClose={onClose} title={editing ? "Edit shift" : "New shift"}>
      <div className="space-y-3">
        <div>
          <Label>Role</Label>
          <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Assign to</Label>
          <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">— Leave open (anyone can claim) —</option>
            {qualified.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
          {qualified.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">No one on the team has this role yet.</p>
          )}
        </div>
        <div>
          <Label>Day</Label>
          <Select value={dateKey} onChange={(e) => setDateKey(e.target.value)}>
            {days.map((d) => (
              <option key={d} value={d}>
                {formatDateKey(d)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Starts</Label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label>Ends</Label>
            <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        {overnight && (
          <Alert tone="warning">End is before start — this will be saved as an overnight shift (ends next day).</Alert>
        )}
        <div>
          <Label>Notes (optional)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Private function in the back room" />
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex items-center justify-between pt-1">
          {editing ? (
            <Button variant="danger" size="sm" disabled={pending} onClick={() => onDelete(editing.id)}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending || !roleId}>
              {pending ? "Saving…" : "Save shift"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
