"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { Alert, Input, Label } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
};

export function LoginForm({
  managers,
  employees,
}: {
  managers: DemoUser[];
  employees: DemoUser[];
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const pick = (user: DemoUser) => {
    setEmail(user.email);
    setPassword("demo123");
  };

  const groups: [string, DemoUser[]][] = [
    ["Managers", managers],
    ["Employees", employees],
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pick a demo account or enter your details — the password for every demo user is{" "}
        <code className="rounded bg-slate-100 px-1">demo123</code>.
      </p>

      {groups.map(([label, users]) =>
        users.length === 0 ? null : (
          <div key={label} className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
            <div className="grid grid-cols-2 gap-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => pick(user)}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-colors ${
                    email === user.email
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
                  }`}
                >
                  <Avatar name={user.name} color={user.avatarColor} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-slate-900">{user.name}</span>
                    <span className="block text-[10px] capitalize text-slate-400">
                      {user.role.toLowerCase()}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      )}

      <form action={action} className="mt-5 space-y-3">
        <div>
          <Label>Email</Label>
          <Input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
          />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="demo123"
          />
        </div>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </div>
  );
}
