"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { claimShiftAction, requestSwapAction, requestTimeOffAction } from "@/lib/actions/requests";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert, Input, Label } from "@/components/ui/form";

export function ClaimButton({ shiftId }: { shiftId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await claimShiftAction(shiftId);
            if (!result.ok) setError(result.error ?? "Could not claim.");
            router.refresh();
          });
        }}
      >
        {pending ? "Claiming…" : "Claim"}
      </Button>
      {error && <span className="max-w-44 text-right text-[10px] text-red-600">{error}</span>}
    </div>
  );
}

export function SwapButton({ shiftId }: { shiftId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await requestSwapAction(shiftId, note.trim() || undefined);
      if (!result.ok) setError(result.error ?? "Could not request the swap.");
      else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Swap
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Offer this shift for swap">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Your coworkers will see the offer and can volunteer to take the shift. A manager
            approves the handover (instant if your org auto-approves same-role swaps).
          </p>
          <div>
            <Label>Note for your coworkers (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Exam the next morning — can anyone cover?" />
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Sending…" : "Offer swap"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

export function RequestTimeOffButton({ autoApproveDays }: { autoApproveDays: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await requestTimeOffAction(start, end || start, reason.trim() || undefined);
      if (!result.ok) setMessage({ tone: "error", text: result.error ?? "Could not submit." });
      else {
        setMessage({ tone: "success", text: result.info ?? "Request sent to your manager." });
        setStart("");
        setEnd("");
        setReason("");
        router.refresh();
      }
    });
  };

  return (
    <>
      <Button variant="secondary" onClick={() => { setOpen(true); setMessage(null); }}>
        🌴 Request time off
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Request time off">
        <div className="space-y-3">
          {autoApproveDays !== null && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
              Requests made {autoApproveDays}+ days in advance are approved automatically.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First day off</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>Last day off</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Reason (optional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family wedding" />
          </div>
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Close
            </Button>
            <Button onClick={submit} disabled={pending || !start}>
              {pending ? "Sending…" : "Submit request"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
