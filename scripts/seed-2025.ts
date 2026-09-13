// Loads the 2025 festival (from the spreadsheet) as an event, with every
// judge's score, so the app can be tested against a real edition. Judges get
// the password "1234". Safe to run again: it skips if the event exists.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

type Fixture = {
  criteria: string[];
  categories: { sheet: string; level: string; name: string; judges: string[]; entries: { number: number; name: string; scores: (number | null)[][] }[] }[];
};

const db = new PrismaClient();
const NAME = "Raks Noor Festival 2025 (test data)";

async function main() {
  if (await db.event.findFirst({ where: { name: NAME } })) {
    console.log("Already loaded.");
    return;
  }
  const f: Fixture = JSON.parse(readFileSync(new URL("../tests/fixtures/festival-2025.json", import.meta.url), "utf8"));
  const makeCurrent = (await db.event.count({ where: { isCurrent: true } })) === 0;
  const event = await db.event.create({ data: { name: NAME, isCurrent: makeCurrent, publicPassword: "raksnoor" } });

  const criteria = await Promise.all(f.criteria.map((name, i) => db.criterion.create({ data: { eventId: event.id, name, maxPoints: 10, priority: i + 1 } })));

  const judgeNames = [...new Set(f.categories.flatMap((c) => c.judges))].filter(Boolean);
  const hash = await bcrypt.hash("1234", 10);
  const judges = new Map<string, string>();
  for (const [i, name] of judgeNames.entries()) {
    const j = await db.judge.create({ data: { eventId: event.id, name, passwordHash: hash, sortOrder: i + 1 } });
    judges.set(name, j.id);
  }

  const levelOrder = ["Amateur", "Advanced", "Professional", "Master", "Kids", "Teens", "Ladies", "Groups"];
  const levels = new Map<string, string>();
  for (const [i, name] of levelOrder.entries()) {
    const l = await db.level.create({ data: { eventId: event.id, name, sortOrder: i + 1, hasChampionship: ["Amateur", "Advanced", "Professional", "Master"].includes(name) } });
    levels.set(name, l.id);
  }

  const participants = new Map<string, string>();
  let scores = 0;
  for (const [ci, c] of f.categories.entries()) {
    const cat = await db.category.create({ data: { eventId: event.id, levelId: levels.get(c.level)!, name: c.name, sortOrder: ci + 1, status: "CLOSED" } });
    for (const e of c.entries) {
      let pid = participants.get(e.name.toLowerCase());
      if (!pid) {
        pid = (await db.participant.create({ data: { eventId: event.id, name: e.name } })).id;
        participants.set(e.name.toLowerCase(), pid);
      }
      const entry = await db.entry.create({ data: { categoryId: cat.id, participantId: pid, number: e.number } });
      const rows = [];
      for (const [ji, byJudge] of e.scores.entries()) {
        const judgeId = judges.get(c.judges[ji]);
        if (!judgeId) continue;
        for (const [k, v] of byJudge.entries()) if (v !== null) rows.push({ entryId: entry.id, judgeId, criterionId: criteria[k].id, value: v });
      }
      await db.score.createMany({ data: rows });
      scores += rows.length;
    }
  }
  console.log(`Loaded: ${f.categories.length} categories, ${participants.size} participants, ${judgeNames.length} judges, ${scores} scores.`);
  console.log(`Judges sign in with their name and password 1234. Public results password: raksnoor.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
