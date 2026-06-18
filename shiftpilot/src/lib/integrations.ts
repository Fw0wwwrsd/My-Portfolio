// The connector registry every new org starts with. Each entry becomes an
// Integration row; the integrations page renders them as "coming soon" cards.
// Adding a real connector = implementing its client + flipping status to
// CONNECTED, with events consumed from EventLog.

export const DEFAULT_INTEGRATIONS = [
  { slug: "payroll-gusto", name: "Gusto Payroll", category: "Payroll" },
  { slug: "payroll-simplepay", name: "SimplePay", category: "Payroll" },
  { slug: "pos-square", name: "Square POS", category: "Point of Sale" },
  { slug: "pos-lightspeed", name: "Lightspeed", category: "Point of Sale" },
  { slug: "whatsapp", name: "WhatsApp Business", category: "Messaging" },
  { slug: "slack", name: "Slack", category: "Messaging" },
  { slug: "accounting-xero", name: "Xero", category: "Accounting" },
  { slug: "accounting-quickbooks", name: "QuickBooks", category: "Accounting" },
];

export const INTEGRATION_DESCRIPTIONS: Record<string, string> = {
  "payroll-gusto": "Push approved timesheets straight to payroll — no re-typing hours.",
  "payroll-simplepay": "Sync hours and leave to SimplePay each pay run.",
  "pos-square": "Pull sales data to forecast how many staff each shift really needs.",
  "pos-lightspeed": "Match staffing levels to live sales volumes.",
  whatsapp: "Send shift reminders and open-shift alerts where your team already is.",
  slack: "Post the published schedule and approvals to a channel.",
  "accounting-xero": "Send labor cost journals to Xero automatically.",
  "accounting-quickbooks": "Keep wage costs in your books without manual entry.",
};
