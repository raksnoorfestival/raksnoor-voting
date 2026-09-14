// Dumps every table to one JSON file, before anything that touches the
// structure of the database. Run: npm run db:backup
import { writeFileSync, mkdirSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const dump = {
    at: new Date().toISOString(),
    admins: await db.admin.findMany(),
    events: await db.event.findMany(),
    levels: await db.level.findMany(),
    categories: await db.category.findMany(),
    participants: await db.participant.findMany(),
    entries: await db.entry.findMany(),
    judges: await db.judge.findMany(),
    criteria: await db.criterion.findMany(),
    scores: await db.score.findMany(),
    sheets: await db.judgeSheet.findMany(),
    championshipDecisions: await db.championshipDecision.findMany(),
  };
  mkdirSync("backups", { recursive: true });
  const file = `backups/${dump.at.replace(/[:.]/g, "-")}.json`;
  writeFileSync(file, JSON.stringify(dump));
  console.log(`${file}: ${dump.events.length} events, ${dump.categories.length} categories, ${dump.scores.length} scores`);
}

main().finally(() => db.$disconnect());
