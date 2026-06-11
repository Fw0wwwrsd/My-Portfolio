"use server";

import { revalidatePath } from "next/cache";
import { requireManager, requireUser } from "@/lib/auth";
import { isValidDateKey } from "@/lib/dates";
import {
  acceptSwap,
  claimOpenShift,
  requestSwap,
  requestTimeOff,
  reviewSwap,
  reviewTimeOff,
} from "@/lib/services/requests";
import type { ActionResult } from "./shifts";

export async function claimShiftAction(shiftId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await claimOpenShift(user.orgId, user.id, shiftId);
  revalidatePath("/app/my");
  revalidatePath("/app/schedule");
  return result;
}

export async function requestSwapAction(shiftId: string, note?: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await requestSwap(user.orgId, user.id, shiftId, note);
  revalidatePath("/app/my");
  revalidatePath("/app/requests");
  return result;
}

export async function acceptSwapAction(swapId: string): Promise<ActionResult> {
  const user = await requireUser();
  const result = await acceptSwap(user.orgId, user.id, swapId);
  revalidatePath("/app/requests");
  revalidatePath("/app/my");
  return result;
}

export async function reviewSwapAction(swapId: string, approve: boolean): Promise<ActionResult> {
  const manager = await requireManager();
  const result = await reviewSwap(manager.orgId, manager.id, swapId, approve);
  revalidatePath("/app/requests");
  revalidatePath("/app/schedule");
  return result;
}

export async function requestTimeOffAction(
  startKey: string,
  endKey: string,
  reason?: string
): Promise<ActionResult> {
  const user = await requireUser();
  if (!isValidDateKey(startKey) || !isValidDateKey(endKey)) {
    return { ok: false, error: "Pick valid dates." };
  }
  const result = await requestTimeOff(user.orgId, user.id, startKey, endKey, reason);
  revalidatePath("/app/requests");
  if (result.ok && result.autoApproved) {
    return { ok: true, info: "Auto-approved — requested far enough in advance." };
  }
  return result;
}

export async function reviewTimeOffAction(
  requestId: string,
  approve: boolean
): Promise<ActionResult> {
  const manager = await requireManager();
  const result = await reviewTimeOff(manager.orgId, manager.id, requestId, approve);
  revalidatePath("/app/requests");
  revalidatePath("/app/schedule");
  return result;
}
