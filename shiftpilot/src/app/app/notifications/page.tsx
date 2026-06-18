import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Notifications · ShiftPilot" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">{unread} unread</p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <Button variant="secondary" size="sm" type="submit">
              Mark all read
            </Button>
          </form>
        )}
      </div>

      <Card>
        <CardHeader
          title="Inbox"
          subtitle="In-app today — email, SMS and WhatsApp delivery plug into the same notifier"
        />
        <CardBody className="space-y-1 p-2">
          {notifications.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">You&apos;re all caught up. 🎉</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${n.readAt ? "opacity-60" : "bg-brand-50/50"}`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-slate-200" : "bg-brand-500"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{n.title}</p>
                <p className="text-xs text-slate-500">{n.body}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {n.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {n.href && (
                  <Link href={n.href} className="text-xs font-medium text-brand-600 hover:underline">
                    View →
                  </Link>
                )}
                {!n.readAt && (
                  <form action={markNotificationRead.bind(null, n.id)}>
                    <button type="submit" className="text-[10px] text-slate-400 hover:text-slate-600">
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
