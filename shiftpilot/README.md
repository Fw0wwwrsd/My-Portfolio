# ShiftPilot 🛩️

**Shift scheduling on autopilot** — for restaurants, hotels, B&Bs, spas, farms, cafés & bars, retail, clinics & care homes, gyms, security firms, cleaning services, warehouses, call centers, event venues and petrol stations.

ShiftPilot automates the repetitive day-to-day of running a shift-based team:

- ⚡ **Auto-scheduler** — one click fills every open shift while respecting availability, approved time off, role qualifications, max weekly hours and minimum rest (no more "clopens"), and spreads hours fairly. Unfillable shifts come with plain-English reasons.
- 🔁 **Repeat what works** — copy last week forward, or generate the whole week from recurring shift templates.
- ✅ **Approvals on autopilot** — same-role swaps and early time-off requests can approve themselves under rules you set.
- 🙋 **Employee self-service** — claim open shifts, offer swaps, request time off, clock in/out from any phone browser.
- 📣 **Notifications** — every change notifies exactly the right people, automatically.
- 💰 **Live labor cost** — scheduled cost vs. your weekly budget while you build the roster.
- 🔌 **Integration-ready** — every action lands in an event stream (`EventLog`); payroll, POS, WhatsApp and accounting connectors plug into it without touching the core product. Try the API preview: `GET /api/v1/shifts`, `GET /api/v1/webhooks`.

## Quick start

```bash
npm install          # also generates the Prisma client
npx prisma db push   # creates dev.db (SQLite — no external services needed)
npx prisma db seed   # rich demo data, dates relative to today
npm run dev
```

Open http://localhost:3000 — the landing page links to the demo login.

**Demo accounts** (password for everyone: `demo123`):

| Role | Email |
|---|---|
| Owner | `owner@copperpot.demo` |
| Manager | `manager@copperpot.demo` |
| Employee | `zanele@copperpot.demo` (or any seeded employee) |

Or create a brand-new business at `/onboarding` — pick any of the 15 industries and roles + shift templates are pre-built for you.

## Tech

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · Prisma 7 + SQLite · Vitest

```bash
npm test             # scheduler engine unit tests
npm run build        # production build
```

## How the auto-scheduler works

Pure TypeScript, no database required (see `src/lib/scheduler/`):

1. Open shifts are sorted **most-constrained-first** (fewest eligible people first).
2. Hard constraints filter candidates: role match, availability window, no approved time off, no overlapping shift, minimum rest between shifts, max weekly hours.
3. Remaining candidates are **scored for fairness** (hours spread evenly; optional prefer-lower-cost; continuity bonus for repeating last week's slot) and the best one is tentatively assigned, informing the next pick.
4. The result is a **preview** — nothing is saved until a manager applies it, and every unfilled shift explains exactly why each near-miss candidate was rejected.

The same constraint predicates power the conflict warnings on manual edits, claim/swap eligibility checks, and dashboard alerts.
