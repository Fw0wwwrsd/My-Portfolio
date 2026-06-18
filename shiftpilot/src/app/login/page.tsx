import Link from "next/link";
import { db } from "@/lib/db";
import { isManager } from "@/lib/types";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  const demoUsers = await db.user.findMany({
    where: { isActive: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, avatarColor: true },
    take: 14,
  });
  const managers = demoUsers.filter((u) => isManager(u.role));
  const employees = demoUsers.filter((u) => !isManager(u.role)).slice(0, 4);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-xl font-bold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
            SP
          </span>
          ShiftPilot
        </Link>
        <LoginForm managers={managers} employees={employees} />
        <p className="mt-6 text-center text-xs text-slate-500">
          New business?{" "}
          <Link href="/onboarding" className="font-medium text-brand-600 hover:underline">
            Set up in two minutes
          </Link>
        </p>
      </div>
    </div>
  );
}
