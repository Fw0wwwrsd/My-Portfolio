import { db } from "@/lib/db";
import { toDateKey } from "@/lib/dates";
import { emitEvent } from "./events";
import { managerIds, notify } from "./notifier";
import { conflictWarnings } from "./scheduling";

/** An employee takes an unassigned shift. Returns conflict warnings (non-blocking for managers, blocking for employees). */
export async function claimOpenShift(
  orgId: string,
  userId: string,
  shiftId: string
): Promise<{ ok: boolean; error?: string }> {
  const shift = await db.shift.findFirst({
    where: { id: shiftId, orgId, userId: null },
    include: { role: true },
  });
  if (!shift) return { ok: false, error: "This shift is no longer open." };

  const qualified = await db.userRole.findUnique({
    where: { userId_roleId: { userId, roleId: shift.roleId } },
  });
  if (!qualified) return { ok: false, error: `You aren't assigned the ${shift.role.name} role.` };

  const warnings = await conflictWarnings(orgId, userId, {
    id: shift.id,
    roleId: shift.roleId,
    dateKey: toDateKey(shift.date),
    startMinute: shift.startMinute,
    endMinute: shift.endMinute,
  });
  if (warnings.length > 0) {
    return { ok: false, error: `Can't claim: ${warnings[0]}.` };
  }

  const updated = await db.shift.updateMany({
    where: { id: shiftId, userId: null },
    data: { userId, status: "ASSIGNED" },
  });
  if (updated.count === 0) return { ok: false, error: "Someone claimed it first." };

  const user = await db.user.findUnique({ where: { id: userId } });
  await notify({
    orgId,
    userIds: await managerIds(orgId),
    type: "shift.claimed",
    title: "Open shift claimed",
    body: `${user?.name ?? "An employee"} claimed the ${shift.role.name} shift on ${toDateKey(shift.date)}.`,
    href: "/app/schedule",
  });
  await emitEvent(orgId, "shift.claimed", { shiftId, userId });
  return { ok: true };
}

export async function requestSwap(
  orgId: string,
  requesterId: string,
  shiftId: string,
  note?: string
): Promise<{ ok: boolean; error?: string }> {
  const shift = await db.shift.findFirst({
    where: { id: shiftId, orgId, userId: requesterId },
    include: { role: true },
  });
  if (!shift) return { ok: false, error: "You can only offer your own shifts for swap." };

  const existing = await db.swapRequest.findFirst({
    where: { shiftId, status: { in: ["PENDING", "ACCEPTED_AWAITING_APPROVAL"] } },
  });
  if (existing) return { ok: false, error: "A swap is already pending for this shift." };

  await db.swapRequest.create({
    data: { orgId, shiftId, requesterId, note },
  });
  const requester = await db.user.findUnique({ where: { id: requesterId } });
  await notify({
    orgId,
    userIds: await managerIds(orgId),
    type: "swap.requested",
    title: "Shift swap requested",
    body: `${requester?.name ?? "An employee"} wants to give away a ${shift.role.name} shift on ${toDateKey(shift.date)}.`,
    href: "/app/requests",
  });
  await emitEvent(orgId, "swap.requested", { shiftId, requesterId });
  return { ok: true };
}

/** A coworker volunteers to take a swapped shift. */
export async function acceptSwap(
  orgId: string,
  takerId: string,
  swapId: string
): Promise<{ ok: boolean; error?: string }> {
  const swap = await db.swapRequest.findFirst({
    where: { id: swapId, orgId, status: "PENDING" },
    include: { shift: { include: { role: true } }, requester: true },
  });
  if (!swap) return { ok: false, error: "This swap is no longer available." };
  if (swap.requesterId === takerId) return { ok: false, error: "You can't take your own swap." };

  const qualified = await db.userRole.findUnique({
    where: { userId_roleId: { userId: takerId, roleId: swap.shift.roleId } },
  });
  if (!qualified) {
    return { ok: false, error: `You aren't assigned the ${swap.shift.role.name} role.` };
  }
  const warnings = await conflictWarnings(orgId, takerId, {
    id: swap.shift.id,
    roleId: swap.shift.roleId,
    dateKey: toDateKey(swap.shift.date),
    startMinute: swap.shift.startMinute,
    endMinute: swap.shift.endMinute,
  });
  if (warnings.length > 0) {
    return { ok: false, error: `Can't take this shift: ${warnings[0]}.` };
  }

  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  const sameRole = await db.userRole.findUnique({
    where: { userId_roleId: { userId: swap.requesterId, roleId: swap.shift.roleId } },
  });

  if (org.autoApproveSwapsSameRole && sameRole) {
    // Auto-approval rule: both parties hold the role, no manager needed.
    await finalizeSwap(swap.id, takerId, null);
    await notify({
      orgId,
      userIds: [swap.requesterId],
      type: "swap.approved",
      title: "Swap completed",
      body: `Your shift was taken over (auto-approved same-role swap).`,
      href: "/app/my",
    });
    await emitEvent(orgId, "swap.approved", { swapId, takerId, auto: true });
    return { ok: true };
  }

  await db.swapRequest.update({
    where: { id: swap.id },
    data: { targetUserId: takerId, status: "ACCEPTED_AWAITING_APPROVAL" },
  });
  await notify({
    orgId,
    userIds: await managerIds(orgId),
    type: "swap.accepted",
    title: "Swap awaiting approval",
    body: `A coworker volunteered to take ${swap.requester.name}'s ${swap.shift.role.name} shift. Approve or decline.`,
    href: "/app/requests",
  });
  await emitEvent(orgId, "swap.accepted", { swapId, takerId });
  return { ok: true };
}

async function finalizeSwap(swapId: string, takerId: string, reviewerId: string | null) {
  const swap = await db.swapRequest.findUniqueOrThrow({ where: { id: swapId } });
  await db.shift.update({
    where: { id: swap.shiftId },
    data: { userId: takerId, status: "ASSIGNED" },
  });
  await db.swapRequest.update({
    where: { id: swapId },
    data: { status: "APPROVED", targetUserId: takerId, reviewedById: reviewerId, reviewedAt: new Date() },
  });
}

export async function reviewSwap(
  orgId: string,
  reviewerId: string,
  swapId: string,
  approve: boolean
): Promise<{ ok: boolean; error?: string }> {
  const swap = await db.swapRequest.findFirst({
    where: { id: swapId, orgId, status: { in: ["PENDING", "ACCEPTED_AWAITING_APPROVAL"] } },
  });
  if (!swap) return { ok: false, error: "Swap not found or already reviewed." };

  if (approve) {
    if (!swap.targetUserId) {
      return { ok: false, error: "No coworker has volunteered to take this shift yet." };
    }
    await finalizeSwap(swapId, swap.targetUserId, reviewerId);
  } else {
    await db.swapRequest.update({
      where: { id: swapId },
      data: { status: "DECLINED", reviewedById: reviewerId, reviewedAt: new Date() },
    });
  }

  const audience = [swap.requesterId, swap.targetUserId].filter((x): x is string => !!x);
  await notify({
    orgId,
    userIds: audience,
    type: approve ? "swap.approved" : "swap.declined",
    title: approve ? "Swap approved" : "Swap declined",
    body: approve ? "The shift swap was approved by a manager." : "The shift swap was declined.",
    href: "/app/my",
  });
  await emitEvent(orgId, approve ? "swap.approved" : "swap.declined", { swapId, reviewerId });
  return { ok: true };
}

export async function requestTimeOff(
  orgId: string,
  userId: string,
  startKey: string,
  endKey: string,
  reason?: string
): Promise<{ ok: boolean; error?: string; autoApproved?: boolean }> {
  if (endKey < startKey) return { ok: false, error: "End date must be after start date." };

  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  const daysAhead = Math.floor(
    (new Date(`${startKey}T00:00:00Z`).getTime() - Date.now()) / 86_400_000
  );
  const autoApprove =
    org.autoApproveTimeOffDays !== null && daysAhead >= org.autoApproveTimeOffDays;

  const request = await db.timeOffRequest.create({
    data: {
      orgId,
      userId,
      startDate: new Date(`${startKey}T00:00:00Z`),
      endDate: new Date(`${endKey}T00:00:00Z`),
      reason,
      status: autoApprove ? "APPROVED" : "PENDING",
      reviewedAt: autoApprove ? new Date() : null,
    },
  });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (autoApprove) {
    await notify({
      orgId,
      userIds: [userId],
      type: "timeoff.approved",
      title: "Time off auto-approved",
      body: `Your time off (${startKey} – ${endKey}) was auto-approved (requested ${daysAhead} days ahead).`,
      href: "/app/requests",
    });
  } else {
    await notify({
      orgId,
      userIds: await managerIds(orgId),
      type: "timeoff.requested",
      title: "Time off requested",
      body: `${user?.name ?? "An employee"} requested ${startKey} – ${endKey}.`,
      href: "/app/requests",
    });
  }
  await emitEvent(orgId, autoApprove ? "timeoff.approved" : "timeoff.requested", {
    requestId: request.id,
    userId,
    auto: autoApprove,
  });
  return { ok: true, autoApproved: autoApprove };
}

export async function reviewTimeOff(
  orgId: string,
  reviewerId: string,
  requestId: string,
  approve: boolean
): Promise<{ ok: boolean; error?: string }> {
  const request = await db.timeOffRequest.findFirst({
    where: { id: requestId, orgId, status: "PENDING" },
  });
  if (!request) return { ok: false, error: "Request not found or already reviewed." };

  await db.timeOffRequest.update({
    where: { id: requestId },
    data: {
      status: approve ? "APPROVED" : "DECLINED",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });

  if (approve) {
    // Free up the employee's assigned shifts during the leave so the gaps
    // become visible open shifts the auto-scheduler can refill.
    await db.shift.updateMany({
      where: {
        orgId,
        userId: request.userId,
        date: { gte: request.startDate, lte: request.endDate },
      },
      data: { userId: null, status: "OPEN" },
    });
  }

  await notify({
    orgId,
    userIds: [request.userId],
    type: approve ? "timeoff.approved" : "timeoff.declined",
    title: approve ? "Time off approved" : "Time off declined",
    body: approve
      ? "Your time off was approved. Any shifts during it were released."
      : "Your time off request was declined. Talk to your manager.",
    href: "/app/requests",
  });
  await emitEvent(orgId, approve ? "timeoff.approved" : "timeoff.declined", {
    requestId,
    reviewerId,
  });
  return { ok: true };
}
