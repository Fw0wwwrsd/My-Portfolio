import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { INTEGRATION_DESCRIPTIONS } from "@/lib/integrations";
import { EVENT_TYPES } from "@/lib/services/events";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Integrations · ShiftPilot" };

export default async function IntegrationsPage() {
  const manager = await requireManager();
  const integrations = await db.integration.findMany({
    where: { orgId: manager.orgId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const categories = [...new Set(integrations.map((i) => i.category))];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-500">
          ShiftPilot is built event-first: every action lands in an event stream that future
          tools subscribe to. Connectors below light up without changing the core product.
        </p>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{category}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {integrations
              .filter((i) => i.category === category)
              .map((i) => (
                <Card key={i.id}>
                  <CardBody className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{i.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {INTEGRATION_DESCRIPTIONS[i.slug] ?? "Connect to automate more of your day."}
                      </p>
                    </div>
                    <Badge tone={i.status === "CONNECTED" ? "green" : "gray"}>
                      {i.status === "CONNECTED" ? "connected" : "coming soon"}
                    </Badge>
                  </CardBody>
                </Card>
              ))}
          </div>
        </div>
      ))}

      <Card>
        <CardHeader
          title="Developer API (preview)"
          subtitle="The same surface future connectors use — try it now"
        />
        <CardBody className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Read this week&apos;s schedule as JSON</p>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-xs text-slate-100">
              {`curl -H "Authorization: Bearer demo-api-key" \\\n  http://localhost:3000/api/v1/shifts`}
            </pre>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">Event catalog for webhook subscribers</p>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-xs text-slate-100">
              {`curl http://localhost:3000/api/v1/webhooks`}
            </pre>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-800">
              Events emitted today ({EVENT_TYPES.length} types)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((t) => (
                <code key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                  {t}
                </code>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
