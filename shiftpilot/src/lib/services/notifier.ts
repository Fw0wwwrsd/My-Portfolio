import { db } from "@/lib/db";

export type OutgoingNotification = {
  orgId: string;
  userIds: string[];
  type: string;
  title: string;
  body: string;
  href?: string;
};

export interface NotificationChannel {
  readonly name: string;
  send(notification: OutgoingNotification): Promise<void>;
}

/** Writes to the in-app notification center (the bell). */
class InAppChannel implements NotificationChannel {
  readonly name = "in-app";
  async send(n: OutgoingNotification): Promise<void> {
    if (n.userIds.length === 0) return;
    await db.notification.createMany({
      data: n.userIds.map((userId) => ({
        orgId: n.orgId,
        userId,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
      })),
    });
  }
}

/**
 * Stubs for future delivery channels. Swapping these for real providers
 * (Resend, Twilio, WhatsApp Business API) requires no changes anywhere else —
 * just register the implementation in CHANNELS below.
 */
class EmailChannelStub implements NotificationChannel {
  readonly name = "email";
  async send(): Promise<void> {
    // Intentionally a no-op until an email provider is connected.
  }
}

class SmsChannelStub implements NotificationChannel {
  readonly name = "sms";
  async send(): Promise<void> {
    // Intentionally a no-op until an SMS/WhatsApp provider is connected.
  }
}

const CHANNELS: NotificationChannel[] = [
  new InAppChannel(),
  new EmailChannelStub(),
  new SmsChannelStub(),
];

export async function notify(notification: OutgoingNotification): Promise<void> {
  await Promise.all(CHANNELS.map((c) => c.send(notification)));
}

/** All managers + owners of an org (the approval audience). */
export async function managerIds(orgId: string): Promise<string[]> {
  const managers = await db.user.findMany({
    where: { orgId, role: { in: ["OWNER", "MANAGER"] }, isActive: true },
    select: { id: true },
  });
  return managers.map((m) => m.id);
}
