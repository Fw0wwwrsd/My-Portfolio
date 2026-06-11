import Link from "next/link";
import { INDUSTRIES } from "@/lib/industries";

const AUTOMATIONS = [
  {
    icon: "⚡",
    title: "Auto-scheduling",
    body: "One click fills every open shift — respecting availability, time off, max hours, rest periods and role qualifications, while spreading hours fairly.",
  },
  {
    icon: "🔁",
    title: "Repeat what works",
    body: "Copy last week forward or generate the whole week from your recurring shift templates. A roster that took hours now takes seconds.",
  },
  {
    icon: "✅",
    title: "Approvals on autopilot",
    body: "Same-role swaps and early time-off requests can approve themselves under rules you set. You only see the exceptions.",
  },
  {
    icon: "📣",
    title: "Everyone notified, always",
    body: "Publishing a schedule, approving a swap, assigning a shift — every change notifies exactly the right people automatically.",
  },
  {
    icon: "🕐",
    title: "Time clock built in",
    body: "Staff clock in and out against their scheduled shift. Variance shows up instantly — no more reconciling paper timesheets.",
  },
  {
    icon: "💰",
    title: "Labor cost, live",
    body: "See scheduled labor cost against your weekly budget while you build the roster, not after payroll runs.",
  },
];

const PAIN_POINTS = [
  ["Spreadsheet rosters", "Built in seconds, not Sunday nights"],
  ["Group-chat shift swaps", "Tracked, approved and logged automatically"],
  ["No-show surprises", "Open shifts flagged days ahead with one-tap claiming"],
  ["Overtime creep", "Hard limits enforced before shifts are assigned"],
  ["Paper timesheets", "Digital clock-in matched to the schedule"],
  ["Forgotten schedules", "Published straight to every employee's phone-friendly portal"],
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
          <p className="mx-auto mb-4 w-fit rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700">
            For every business that runs on shifts
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Stop building rosters.
            <span className="text-brand-600"> Start approving them.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            ShiftPilot automates everything repetitive about shift scheduling — building the week,
            filling gaps, chasing swaps, reminding staff — so managers get their evenings back.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700"
            >
              Set up your business
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Try the live demo
            </Link>
          </div>
        </div>
      </section>

      {/* Pain points */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          The daily grind, deleted
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
          Every repetitive scheduling chore your managers do today, handled by the platform.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PAIN_POINTS.map(([pain, fix]) => (
            <div key={pain} className="rounded-xl border border-slate-200 p-5">
              <p className="text-sm font-medium text-slate-400 line-through">{pain}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">→ {fix}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Automations */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Automate everything repetitive
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {AUTOMATIONS.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">Built for your industry</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
          Pick your industry during setup and ShiftPilot pre-builds your roles and recurring
          shifts — you're scheduling in minutes.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((industry) => (
            <Link
              key={industry.slug}
              href={`/industries/${industry.slug}`}
              className="group rounded-xl border border-slate-200 p-5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{industry.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-brand-700">
                    {industry.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">{industry.tagline}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Integrations teaser */}
      <section className="bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-white">Ready for the tools you'll add next</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
            Every action in ShiftPilot emits an event to an integration backbone. Payroll, POS
            forecasting, WhatsApp reminders and accounting sync plug in without re-architecting —
            and a developer API is already live.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
            {["Gusto", "SimplePay", "Square POS", "Lightspeed", "WhatsApp", "Slack", "Xero", "QuickBooks"].map(
              (name) => (
                <span key={name} className="rounded-full border border-slate-700 px-3 py-1">
                  {name}
                </span>
              )
            )}
          </div>
        </div>
      </section>
    </>
  );
}
