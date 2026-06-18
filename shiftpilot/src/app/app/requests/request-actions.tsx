"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptSwapAction, reviewSwapAction, reviewTimeOffAction } from "@/lib/actions/requests";
import { Button } from "@/components/ui/button";

export function ReviewButtons({
  kind,
  id,
  declineOnly = false,
}: {
  kind: "timeoff" | "swap";
  id: string;
  declineOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const review = (approve: boolean) => {
    setError(null);
    startTransition(async () => {
      const result =
        kind === "timeoff" ? await reviewTimeOffAction(id, approve) : await reviewSwapAction(id, approve);
      if (!result.ok) setError(result.error ?? "Failed.");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {!declineOnly && (
          <Button size="sm" disabled={pending} onClick={() => review(true)}>
            Approve
          </Button>
        )}
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => review(false)}>
          Decline
        </Button>
      </div>
      {error && <span className="max-w-48 text-right text-[10px] text-red-600">{error}</span>}
    </div>
  );
}

export function AcceptSwapButton({ swapId }: { swapId: string }) {
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
            const result = await acceptSwapAction(swapId);
            if (!result.ok) setError(result.error ?? "Could not take this shift.");
            router.refresh();
          });
        }}
      >
        {pending ? "…" : "Take this shift"}
      </Button>
      {error && <span className="max-w-48 text-right text-[10px] text-red-600">{error}</span>}
    </div>
  );
}
