import Link from "next/link";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isManager } from "@/lib/types";
import { logout } from "@/lib/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { NavLinks } from "./nav-links";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const manager = isManager(user.role);
  const unread = await db.notification.count({
    where: { userId: user.id, readAt: null },
  });

  const links = [
    ...(manager ? [{ href: "/app/dashboard", label: "Dashboard", icon: "📊" }] : []),
    { href: "/app/my", label: "My shifts", icon: "🗓️" },
    { href: "/app/schedule", label: "Schedule", icon: "📅" },
    ...(manager ? [{ href: "/app/employees", label: "Team", icon: "👥" }] : []),
    { href: "/app/requests", label: "Requests", icon: "🔁" },
    { href: "/app/time-clock", label: "Time clock", icon: "⏱️" },
    ...(manager
      ? [
          { href: "/app/integrations", label: "Integrations", icon: "🔌" },
          { href: "/app/settings", label: "Settings", icon: "⚙️" },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-slate-200 bg-white md:flex">
        <Link href="/app/my" className="flex h-16 items-center gap-2 border-b border-slate-100 px-5 font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs text-white">
            SP
          </span>
          ShiftPilot
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavLinks links={links} />
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-2.5">
            <Avatar name={user.name} color={user.avatarColor} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">{user.name}</p>
              <p className="text-[10px] capitalize text-slate-400">{user.role.toLowerCase()}</p>
            </div>
          </div>
          <form action={logout}>
            <button className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-56">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/app/my" className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              SP
            </Link>
          </div>
          <div className="hidden text-sm text-slate-500 md:block">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          <Link
            href="/app/notifications"
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label={`Notifications (${unread} unread)`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
            </svg>
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 md:hidden">
          <NavLinks links={links} compact />
        </nav>

        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
