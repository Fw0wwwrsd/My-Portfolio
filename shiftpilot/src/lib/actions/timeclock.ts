"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { clockIn, clockOut } from "@/lib/services/timeclock";
import type { ActionResult } from "./shifts";

export async function clockInAction(): Promise<ActionResult> {
  const user = await requireUser();
  const result = await clockIn(user.orgId, user.id);
  revalidatePath("/app/time-clock");
  if (result.ok) {
    return {
      ok: true,
      info: result.matchedShift
        ? "Clocked in — matched to your scheduled shift."
        : "Clocked in (no scheduled shift nearby — flagged as unscheduled).",
    };
  }
  return result;
}

export async function clockOutAction(): Promise<ActionResult> {
  const user = await requireUser();
  const result = await clockOut(user.orgId, user.id);
  revalidatePath("/app/time-clock");
  return result.ok ? { ok: true, info: "Clocked out. Nice work today." } : result;
}
