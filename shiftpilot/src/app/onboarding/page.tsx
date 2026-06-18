import Link from "next/link";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your business" };

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
            SP
          </span>
          ShiftPilot
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Set up your business</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pick your industry and we'll pre-build your roles and recurring shifts. You can change
            everything later.
          </p>
          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
