"use client";

import { useActionState, useState } from "react";
import { INDUSTRIES } from "@/lib/industries";
import { createOrgFromTemplate, type OnboardingState } from "@/lib/actions/onboarding";
import { Alert, Input, Label } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    createOrgFromTemplate,
    {}
  );
  const [industry, setIndustry] = useState("restaurants");

  return (
    <form action={action} className="mt-6 space-y-6">
      <div>
        <Label>Your industry</Label>
        <input type="hidden" name="industry" value={industry} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INDUSTRIES.map((i) => (
            <button
              key={i.slug}
              type="button"
              onClick={() => setIndustry(i.slug)}
              className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-medium transition-colors ${
                industry === i.slug
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-slate-200 text-slate-700 hover:border-brand-300"
              }`}
            >
              <span className="text-base">{i.icon}</span>
              {i.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Business name</Label>
          <Input name="orgName" required placeholder="The Copper Pot Bistro" />
        </div>
        <div>
          <Label>Your name</Label>
          <Input name="ownerName" required placeholder="Thandi Shabalala" />
        </div>
        <div>
          <Label>Your email</Label>
          <Input name="ownerEmail" type="email" required placeholder="you@business.com" />
        </div>
        <div className="sm:col-span-2">
          <Label>Password</Label>
          <Input name="password" type="password" required minLength={6} placeholder="At least 6 characters" />
        </div>
      </div>

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Building your workspace…" : "Create my workspace"}
      </Button>
    </form>
  );
}
