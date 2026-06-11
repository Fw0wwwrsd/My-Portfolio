import type { ReactNode } from "react";

type Tone = "gray" | "green" | "amber" | "red" | "blue" | "purple";

const TONES: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
};

export function Badge({
  tone = "gray",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  switch (status) {
    case "APPROVED":
    case "PUBLISHED":
    case "CONNECTED":
      return "green";
    case "PENDING":
    case "ACCEPTED_AWAITING_APPROVAL":
    case "OPEN":
      return "amber";
    case "DECLINED":
    case "CANCELLED":
      return "red";
    case "ASSIGNED":
      return "blue";
    default:
      return "gray";
  }
}
