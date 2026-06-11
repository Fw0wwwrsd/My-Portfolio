"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, hashPassword, requireManager } from "@/lib/auth";
import { getIndustry } from "@/lib/industries";
import { DEFAULT_INTEGRATIONS } from "@/lib/integrations";
import { emitEvent } from "@/lib/services/events";
import type { ActionResult } from "./shifts";

export type OnboardingState = { error?: string };

export async function createOrgFromTemplate(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const orgName = String(formData.get("orgName") ?? "").trim();
  const industrySlug = String(formData.get("industry") ?? "");
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const industry = getIndustry(industrySlug);
  if (!orgName) return { error: "Give your business a name." };
  if (!industry) return { error: "Pick your industry." };
  if (!ownerName || !ownerEmail.includes("@")) return { error: "Your name and a valid email are required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const taken = await db.user.findUnique({ where: { email: ownerEmail } });
  if (taken) return { error: "That email is already registered. Try logging in." };

  const org = await db.organization.create({
    data: {
      name: orgName,
      industry: industry.slug,
      roles: {
        create: industry.roles.map((r) => ({ name: r.name, color: r.color })),
      },
      integrations: { create: DEFAULT_INTEGRATIONS },
    },
    include: { roles: true },
  });

  const roleByName = new Map(org.roles.map((r) => [r.name, r.id]));
  await db.shiftTemplate.createMany({
    data: industry.shiftTemplates.map((t) => ({
      orgId: org.id,
      roleId: roleByName.get(t.roleName)!,
      name: t.name,
      startMinute: t.startMinute,
      endMinute: t.endMinute,
      daysOfWeek: t.daysOfWeek.join(","),
      headcount: t.headcount,
    })),
  });

  const owner = await db.user.create({
    data: {
      orgId: org.id,
      name: ownerName,
      email: ownerEmail,
      passwordHash: hashPassword(password),
      role: "OWNER",
      avatarColor: "#6366f1",
    },
  });

  await emitEvent(org.id, "employee.created", { userId: owner.id, role: "OWNER", onboarding: true });
  await createSession(owner.id);
  redirect("/app/dashboard");
}

export async function updateOrgSettings(formData: FormData): Promise<ActionResult> {
  const manager = await requireManager();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Business name can't be empty." };

  const budgetRaw = String(formData.get("weeklyLaborBudget") ?? "").trim();
  const budget = budgetRaw === "" ? null : Number(budgetRaw);
  if (budget !== null && (Number.isNaN(budget) || budget < 0)) {
    return { ok: false, error: "Budget must be a positive number." };
  }
  const autoDaysRaw = String(formData.get("autoApproveTimeOffDays") ?? "").trim();
  const autoDays = autoDaysRaw === "" ? null : Number(autoDaysRaw);
  if (autoDays !== null && (!Number.isInteger(autoDays) || autoDays < 0)) {
    return { ok: false, error: "Auto-approval lead time must be a whole number of days." };
  }

  await db.organization.update({
    where: { id: manager.orgId },
    data: {
      name,
      weeklyLaborBudget: budget,
      autoApproveTimeOffDays: autoDays,
      autoApproveSwapsSameRole: formData.get("autoApproveSwapsSameRole") === "on",
    },
  });
  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
  return { ok: true, info: "Settings saved." };
}
