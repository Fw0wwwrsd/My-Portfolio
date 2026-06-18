export type UserRole = "OWNER" | "MANAGER" | "EMPLOYEE";

export type ShiftStatus = "OPEN" | "ASSIGNED" | "PUBLISHED";

export type RequestStatus = "PENDING" | "APPROVED" | "DECLINED";

export type SwapStatus =
  | "PENDING"
  | "ACCEPTED_AWAITING_APPROVAL"
  | "APPROVED"
  | "DECLINED"
  | "CANCELLED";

export type IntegrationStatus = "COMING_SOON" | "CONNECTED";

export function isManager(role: string): boolean {
  return role === "OWNER" || role === "MANAGER";
}
