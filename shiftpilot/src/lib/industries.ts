// Single source of truth for every industry ShiftPilot serves. Drives the
// landing page, the per-industry marketing pages, and the onboarding wizard
// (which pre-creates the roles and shift templates below).

export type IndustryRole = {
  name: string;
  color: string;
  wage: number; // suggested hourly wage for seeding
};

export type IndustryShiftTemplate = {
  name: string;
  roleName: string;
  startMinute: number;
  endMinute: number; // > 1440 crosses midnight
  daysOfWeek: number[]; // 0 = Sunday … 6 = Saturday
  headcount: number;
};

export type Industry = {
  slug: string;
  name: string;
  icon: string;
  tagline: string;
  painPoints: string[];
  roles: IndustryRole[];
  shiftTemplates: IndustryShiftTemplate[];
};

const h = (hour: number, minute = 0) => hour * 60 + minute;
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const TUE_SUN = [0, 2, 3, 4, 5, 6];
const WEEKEND = [0, 6];

export const INDUSTRIES: Industry[] = [
  {
    slug: "restaurants",
    name: "Restaurants",
    icon: "🍽️",
    tagline: "Stop building rosters at midnight after close.",
    painPoints: [
      "Lunch and dinner rushes need different headcounts — spreadsheets can't keep up with demand swings.",
      "Last-minute no-shows leave the floor short and managers ringing around for cover.",
      "'Clopen' shifts (closing then opening) burn staff out and breach rest rules.",
    ],
    roles: [
      { name: "Server", color: "#3b82f6", wage: 22 },
      { name: "Cook", color: "#f97316", wage: 26 },
      { name: "Host", color: "#22c55e", wage: 19 },
      { name: "Bartender", color: "#a855f7", wage: 24 },
    ],
    shiftTemplates: [
      { name: "Lunch", roleName: "Server", startMinute: h(11), endMinute: h(15), daysOfWeek: TUE_SUN, headcount: 2 },
      { name: "Lunch", roleName: "Cook", startMinute: h(10), endMinute: h(15), daysOfWeek: TUE_SUN, headcount: 1 },
      { name: "Lunch", roleName: "Host", startMinute: h(11), endMinute: h(15), daysOfWeek: TUE_SUN, headcount: 1 },
      { name: "Dinner", roleName: "Server", startMinute: h(17), endMinute: h(22, 30), daysOfWeek: TUE_SUN, headcount: 3 },
      { name: "Dinner", roleName: "Cook", startMinute: h(16), endMinute: h(22, 30), daysOfWeek: TUE_SUN, headcount: 2 },
      { name: "Dinner", roleName: "Host", startMinute: h(17), endMinute: h(22), daysOfWeek: TUE_SUN, headcount: 1 },
      { name: "Dinner", roleName: "Bartender", startMinute: h(17), endMinute: h(23), daysOfWeek: TUE_SUN, headcount: 1 },
      { name: "Brunch", roleName: "Server", startMinute: h(9), endMinute: h(14), daysOfWeek: WEEKEND, headcount: 2 },
    ],
  },
  {
    slug: "cafes-bars",
    name: "Cafés & Bars",
    icon: "☕",
    tagline: "Cover every rush without overstaffing the lulls.",
    painPoints: [
      "Morning coffee rushes and late-night bar peaks need split shifts that are painful to plan by hand.",
      "Student staff have ever-changing class timetables and availability.",
      "Overtime creeps in unnoticed until payroll day.",
    ],
    roles: [
      { name: "Barista", color: "#92400e", wage: 20 },
      { name: "Bartender", color: "#a855f7", wage: 23 },
      { name: "Floor Staff", color: "#3b82f6", wage: 18 },
    ],
    shiftTemplates: [
      { name: "Open", roleName: "Barista", startMinute: h(6), endMinute: h(12), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Midday", roleName: "Floor Staff", startMinute: h(11), endMinute: h(17), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Night", roleName: "Bartender", startMinute: h(18), endMinute: h(26), daysOfWeek: [4, 5, 6], headcount: 2 },
    ],
  },
  {
    slug: "hotels",
    name: "Hotels",
    icon: "🏨",
    tagline: "24/7 coverage across every department, one schedule.",
    painPoints: [
      "Front desk, housekeeping and kitchen each run different patterns — coordinating them is a full-time job.",
      "Night audit shifts are hard to fill and even harder to rotate fairly.",
      "Occupancy swings mean staffing needs change week to week.",
    ],
    roles: [
      { name: "Front Desk", color: "#3b82f6", wage: 23 },
      { name: "Housekeeping", color: "#22c55e", wage: 19 },
      { name: "Night Audit", color: "#6366f1", wage: 25 },
      { name: "Concierge", color: "#eab308", wage: 22 },
    ],
    shiftTemplates: [
      { name: "Day Desk", roleName: "Front Desk", startMinute: h(7), endMinute: h(15), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Evening Desk", roleName: "Front Desk", startMinute: h(15), endMinute: h(23), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Night Audit", roleName: "Night Audit", startMinute: h(23), endMinute: h(31), daysOfWeek: EVERY_DAY, headcount: 1 },
      { name: "Housekeeping AM", roleName: "Housekeeping", startMinute: h(8), endMinute: h(16), daysOfWeek: EVERY_DAY, headcount: 4 },
    ],
  },
  {
    slug: "bnbs",
    name: "B&Bs & Guesthouses",
    icon: "🛏️",
    tagline: "Small teams, zero admin overhead.",
    painPoints: [
      "Owners juggle cleaning, breakfast and check-ins themselves when the roster slips.",
      "Part-time helpers work irregular days that never make it onto a shared calendar.",
      "Changeover days (all check-outs + check-ins) need every hand on deck.",
    ],
    roles: [
      { name: "Housekeeper", color: "#22c55e", wage: 18 },
      { name: "Breakfast Cook", color: "#f97316", wage: 21 },
      { name: "Host", color: "#3b82f6", wage: 20 },
    ],
    shiftTemplates: [
      { name: "Breakfast", roleName: "Breakfast Cook", startMinute: h(6, 30), endMinute: h(10, 30), daysOfWeek: EVERY_DAY, headcount: 1 },
      { name: "Rooms", roleName: "Housekeeper", startMinute: h(10), endMinute: h(14), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Check-in", roleName: "Host", startMinute: h(14), endMinute: h(20), daysOfWeek: EVERY_DAY, headcount: 1 },
    ],
  },
  {
    slug: "spas-salons",
    name: "Spas & Salons",
    icon: "💆",
    tagline: "Match therapist hours to bookings, automatically.",
    painPoints: [
      "Treatments need the right specialist — a misassigned shift means cancelled bookings.",
      "Therapists work strict maximum hours; tracking them manually invites mistakes.",
      "Weekend demand spikes clash with everyone wanting weekends off.",
    ],
    roles: [
      { name: "Therapist", color: "#a855f7", wage: 28 },
      { name: "Stylist", color: "#ec4899", wage: 26 },
      { name: "Receptionist", color: "#3b82f6", wage: 19 },
    ],
    shiftTemplates: [
      { name: "Morning", roleName: "Therapist", startMinute: h(9), endMinute: h(14), daysOfWeek: TUE_SUN, headcount: 2 },
      { name: "Afternoon", roleName: "Therapist", startMinute: h(14), endMinute: h(19), daysOfWeek: TUE_SUN, headcount: 2 },
      { name: "Front Desk", roleName: "Receptionist", startMinute: h(8, 30), endMinute: h(17), daysOfWeek: TUE_SUN, headcount: 1 },
    ],
  },
  {
    slug: "farms",
    name: "Farms & Agriculture",
    icon: "🚜",
    tagline: "Seasonal crews, milking rotations, harvest surges — handled.",
    painPoints: [
      "Harvest season needs triple the crew, then numbers drop overnight.",
      "Early milking and feeding shifts rotate through a small permanent team.",
      "Seasonal workers come and go — onboarding them onto a roster takes too long.",
    ],
    roles: [
      { name: "Field Worker", color: "#22c55e", wage: 17 },
      { name: "Milker", color: "#3b82f6", wage: 19 },
      { name: "Packhouse", color: "#f97316", wage: 18 },
    ],
    shiftTemplates: [
      { name: "Morning Milking", roleName: "Milker", startMinute: h(4, 30), endMinute: h(8, 30), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Field AM", roleName: "Field Worker", startMinute: h(7), endMinute: h(13), daysOfWeek: WEEKDAYS, headcount: 4 },
      { name: "Packhouse", roleName: "Packhouse", startMinute: h(8), endMinute: h(16, 30), daysOfWeek: WEEKDAYS, headcount: 3 },
      { name: "Evening Milking", roleName: "Milker", startMinute: h(15, 30), endMinute: h(19), daysOfWeek: EVERY_DAY, headcount: 2 },
    ],
  },
  {
    slug: "retail",
    name: "Retail",
    icon: "🛍️",
    tagline: "Right staff, right tills, right hours.",
    painPoints: [
      "Foot traffic peaks on weekends and paydays while quiet Tuesdays drain the wage bill.",
      "Casual staff swap shifts in group chats and the manager finds out last.",
      "Stocktake and delivery days need extra hands that never get planned ahead.",
    ],
    roles: [
      { name: "Sales Assistant", color: "#3b82f6", wage: 18 },
      { name: "Cashier", color: "#22c55e", wage: 18 },
      { name: "Stockroom", color: "#f97316", wage: 19 },
    ],
    shiftTemplates: [
      { name: "Opening", roleName: "Sales Assistant", startMinute: h(8, 30), endMinute: h(14, 30), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Closing", roleName: "Sales Assistant", startMinute: h(14), endMinute: h(20), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Tills", roleName: "Cashier", startMinute: h(9), endMinute: h(17), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Goods-in", roleName: "Stockroom", startMinute: h(6), endMinute: h(12), daysOfWeek: [1, 3, 5], headcount: 1 },
    ],
  },
  {
    slug: "clinics-care",
    name: "Clinics & Care Homes",
    icon: "🏥",
    tagline: "Safe staffing ratios around the clock, without the headache.",
    painPoints: [
      "Minimum care ratios are a compliance requirement, not a nice-to-have.",
      "Night and weekend rotations must be distributed fairly or staff leave.",
      "Agency cover is expensive — unfilled shifts need surfacing days ahead, not hours.",
    ],
    roles: [
      { name: "Nurse", color: "#ef4444", wage: 32 },
      { name: "Care Assistant", color: "#3b82f6", wage: 22 },
      { name: "Receptionist", color: "#22c55e", wage: 19 },
    ],
    shiftTemplates: [
      { name: "Early", roleName: "Nurse", startMinute: h(7), endMinute: h(14), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Late", roleName: "Nurse", startMinute: h(14), endMinute: h(21), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Night", roleName: "Nurse", startMinute: h(21), endMinute: h(31), daysOfWeek: EVERY_DAY, headcount: 1 },
      { name: "Day Care", roleName: "Care Assistant", startMinute: h(8), endMinute: h(16), daysOfWeek: EVERY_DAY, headcount: 3 },
    ],
  },
  {
    slug: "gyms",
    name: "Gyms & Fitness Studios",
    icon: "🏋️",
    tagline: "Trainers, classes and front desk in one roster.",
    painPoints: [
      "5 AM openers and 10 PM closers are the hardest slots to keep covered.",
      "Class instructors are part-timers with packed personal schedules.",
      "Front desk gaps mean members standing at a locked door.",
    ],
    roles: [
      { name: "Trainer", color: "#f97316", wage: 27 },
      { name: "Front Desk", color: "#3b82f6", wage: 18 },
      { name: "Instructor", color: "#a855f7", wage: 30 },
    ],
    shiftTemplates: [
      { name: "Open", roleName: "Front Desk", startMinute: h(5), endMinute: h(12), daysOfWeek: EVERY_DAY, headcount: 1 },
      { name: "Close", roleName: "Front Desk", startMinute: h(15), endMinute: h(22), daysOfWeek: EVERY_DAY, headcount: 1 },
      { name: "Floor AM", roleName: "Trainer", startMinute: h(6), endMinute: h(12), daysOfWeek: WEEKDAYS, headcount: 2 },
      { name: "Floor PM", roleName: "Trainer", startMinute: h(16), endMinute: h(21), daysOfWeek: WEEKDAYS, headcount: 2 },
    ],
  },
  {
    slug: "security",
    name: "Security Firms",
    icon: "🛡️",
    tagline: "Every post covered, every guard rested, every site compliant.",
    painPoints: [
      "An unmanned post is a contract breach — gaps must be impossible to miss.",
      "12-hour rotations demand strict rest tracking between shifts.",
      "Guards are licensed for specific sites and duties; assignments must match.",
    ],
    roles: [
      { name: "Day Guard", color: "#3b82f6", wage: 21 },
      { name: "Night Guard", color: "#6366f1", wage: 24 },
      { name: "Supervisor", color: "#ef4444", wage: 28 },
    ],
    shiftTemplates: [
      { name: "Day Post", roleName: "Day Guard", startMinute: h(6), endMinute: h(18), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Night Post", roleName: "Night Guard", startMinute: h(18), endMinute: h(30), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Patrol Lead", roleName: "Supervisor", startMinute: h(8), endMinute: h(17), daysOfWeek: WEEKDAYS, headcount: 1 },
    ],
  },
  {
    slug: "cleaning",
    name: "Cleaning Services",
    icon: "🧹",
    tagline: "Crews dispatched to the right place at the right time.",
    painPoints: [
      "Early-morning office cleans and late-night deep cleans bookend the day.",
      "Client sites change weekly; the roster must keep pace.",
      "No-shows are invisible until the client calls to complain.",
    ],
    roles: [
      { name: "Cleaner", color: "#22c55e", wage: 17 },
      { name: "Team Lead", color: "#3b82f6", wage: 21 },
    ],
    shiftTemplates: [
      { name: "Offices AM", roleName: "Cleaner", startMinute: h(5), endMinute: h(9), daysOfWeek: WEEKDAYS, headcount: 4 },
      { name: "Offices PM", roleName: "Cleaner", startMinute: h(18), endMinute: h(22), daysOfWeek: WEEKDAYS, headcount: 4 },
      { name: "Crew Lead", roleName: "Team Lead", startMinute: h(5), endMinute: h(13), daysOfWeek: WEEKDAYS, headcount: 1 },
    ],
  },
  {
    slug: "warehouses",
    name: "Warehouses & Logistics",
    icon: "📦",
    tagline: "Pick, pack and ship across three rotating shifts.",
    painPoints: [
      "Peak season volumes demand overtime that has to stay within legal limits.",
      "Three-shift rotations are a fairness minefield managed in spreadsheets.",
      "Forklift-certified staff must be on every shift — certification tracking is manual.",
    ],
    roles: [
      { name: "Picker", color: "#3b82f6", wage: 19 },
      { name: "Forklift Operator", color: "#f97316", wage: 24 },
      { name: "Shift Supervisor", color: "#ef4444", wage: 29 },
    ],
    shiftTemplates: [
      { name: "Early", roleName: "Picker", startMinute: h(6), endMinute: h(14), daysOfWeek: WEEKDAYS, headcount: 5 },
      { name: "Late", roleName: "Picker", startMinute: h(14), endMinute: h(22), daysOfWeek: WEEKDAYS, headcount: 5 },
      { name: "Early Forklift", roleName: "Forklift Operator", startMinute: h(6), endMinute: h(14), daysOfWeek: WEEKDAYS, headcount: 2 },
      { name: "Supervision", roleName: "Shift Supervisor", startMinute: h(6), endMinute: h(14), daysOfWeek: WEEKDAYS, headcount: 1 },
    ],
  },
  {
    slug: "call-centers",
    name: "Call Centers",
    icon: "🎧",
    tagline: "Service levels met without burning out your agents.",
    painPoints: [
      "Call volumes follow predictable curves the roster should follow too.",
      "Adherence and shrinkage tracking devours team-leader time.",
      "Split shifts and staggered starts are impossible to manage manually at scale.",
    ],
    roles: [
      { name: "Agent", color: "#3b82f6", wage: 20 },
      { name: "Team Leader", color: "#ef4444", wage: 27 },
    ],
    shiftTemplates: [
      { name: "Morning", roleName: "Agent", startMinute: h(7), endMinute: h(15), daysOfWeek: WEEKDAYS, headcount: 6 },
      { name: "Evening", roleName: "Agent", startMinute: h(13), endMinute: h(21), daysOfWeek: WEEKDAYS, headcount: 6 },
      { name: "Leads", roleName: "Team Leader", startMinute: h(8), endMinute: h(17), daysOfWeek: WEEKDAYS, headcount: 2 },
    ],
  },
  {
    slug: "event-venues",
    name: "Event Venues",
    icon: "🎪",
    tagline: "Staff up for show night, scale down the morning after.",
    painPoints: [
      "Every event is a one-off roster built from scratch.",
      "Casual staff pools are large but availability is a moving target.",
      "Setup, show and teardown crews overlap in ways spreadsheets mangle.",
    ],
    roles: [
      { name: "Event Staff", color: "#a855f7", wage: 19 },
      { name: "Setup Crew", color: "#f97316", wage: 20 },
      { name: "Security", color: "#6366f1", wage: 23 },
    ],
    shiftTemplates: [
      { name: "Setup", roleName: "Setup Crew", startMinute: h(10), endMinute: h(17), daysOfWeek: [5, 6], headcount: 4 },
      { name: "Show", roleName: "Event Staff", startMinute: h(17), endMinute: h(25), daysOfWeek: [5, 6], headcount: 6 },
      { name: "Door", roleName: "Security", startMinute: h(17), endMinute: h(26), daysOfWeek: [5, 6], headcount: 2 },
    ],
  },
  {
    slug: "petrol-stations",
    name: "Petrol Stations",
    icon: "⛽",
    tagline: "Forecourt and shop covered 24/7, fairly rotated.",
    painPoints: [
      "Round-the-clock coverage with a small team means rotations must be airtight.",
      "Night shifts need experienced staff but can't always fall on the same people.",
      "Sick-day cover at 5 AM is a phone-call scramble.",
    ],
    roles: [
      { name: "Forecourt Attendant", color: "#3b82f6", wage: 17 },
      { name: "Shop Cashier", color: "#22c55e", wage: 18 },
    ],
    shiftTemplates: [
      { name: "Day", roleName: "Forecourt Attendant", startMinute: h(6), endMinute: h(14), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Evening", roleName: "Forecourt Attendant", startMinute: h(14), endMinute: h(22), daysOfWeek: EVERY_DAY, headcount: 2 },
      { name: "Night", roleName: "Shop Cashier", startMinute: h(22), endMinute: h(30), daysOfWeek: EVERY_DAY, headcount: 1 },
    ],
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}
