import Link from "next/link";
import { notFound } from "next/navigation";
import { INDUSTRIES, getIndustry } from "@/lib/industries";
import { formatTimeRange, DAY_NAMES_SHORT } from "@/lib/dates";

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ slug: i.slug }));
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <Link href="/" className="text-xs font-medium text-brand-600 hover:underline">
        ← All industries
      </Link>
      <div className="mt-4 flex items-center gap-4">
        <span className="text-5xl">{industry.icon}</span>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">{industry.name}</h1>
          <p className="mt-1 text-slate-600">{industry.tagline}</p>
        </div>
      </div>

      <h2 className="mt-12 text-lg font-bold text-slate-900">
        The pain points ShiftPilot removes
      </h2>
      <div className="mt-4 space-y-3">
        {industry.painPoints.map((point) => (
          <div key={point} className="flex gap-3 rounded-xl border border-slate-200 p-4">
            <span className="mt-0.5 text-brand-600">✓</span>
            <p className="text-sm text-slate-700">{point}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-lg font-bold text-slate-900">
        Your setup, pre-built on day one
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose {industry.name} during onboarding and these roles and recurring shifts are created
        for you — tweak anything afterwards.
      </p>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900">Roles</h3>
          <ul className="mt-3 space-y-2">
            {industry.roles.map((role) => (
              <li key={role.name} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                {role.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900">Recurring shifts</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {industry.shiftTemplates.map((t, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2">
                <span>
                  {t.name} · {t.roleName} ×{t.headcount}
                </span>
                <span className="text-xs text-slate-400">
                  {formatTimeRange(t.startMinute, t.endMinute)} ·{" "}
                  {t.daysOfWeek.map((d) => DAY_NAMES_SHORT[d]).join(" ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-12 rounded-2xl bg-brand-600 p-8 text-center">
        <h2 className="text-xl font-bold text-white">
          Put your {industry.name.toLowerCase()} roster on autopilot
        </h2>
        <Link
          href="/onboarding"
          className="mt-4 inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          Get started free
        </Link>
      </div>
    </div>
  );
}
