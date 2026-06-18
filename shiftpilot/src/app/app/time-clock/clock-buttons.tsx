"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clockInAction, clockOutAction } from "@/lib/actions/timeclock";
import { Button } from "@/components/ui/button";

export function ClockButtons({ clockedInSince }: { clockedInSince: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string; info?: string }>) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(result.ok ? result.info ?? null : result.error ?? "Something went wrong.");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      {clockedInSince ? (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-green-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            On shift since {clockedInSince}
          </span>
          <Button variant="danger" disabled={pending} onClick={() => run(clockOutAction)}>
            {pending ? "…" : "Clock out"}
          </Button>
        </div>
      ) : (
        <Button disabled={pending} onClick={() => run(clockInAction)}>
          {pending ? "…" : "⏱️ Clock in"}
        </Button>
      )}
      {message && <span className="max-w-72 text-right text-xs text-slate-500">{message}</span>}
    </div>
  );
}
