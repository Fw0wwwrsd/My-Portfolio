// Seeds the demo organization on first boot only. An existing database (or
// SEED_DEMO_DATA=false) is left untouched, so upgrades never clobber data.
import { execSync } from "node:child_process";
import Database from "better-sqlite3";

if (process.env.SEED_DEMO_DATA === "false") {
  console.log("ShiftPilot: SEED_DEMO_DATA=false — skipping demo seed.");
  process.exit(0);
}

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const path = url.replace(/^file:/, "");

const db = new Database(path);
const { count } = db
  .prepare('SELECT COUNT(*) AS count FROM "Organization"')
  .get();
db.close();

if (count > 0) {
  console.log("ShiftPilot: database already has data — skipping seed.");
  process.exit(0);
}

console.log("ShiftPilot: first boot — seeding demo data…");
execSync("npx prisma db seed", { stdio: "inherit" });
