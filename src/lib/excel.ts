import * as XLSX from "xlsx";

// The import sheet the organiser fills in. One row per participant per
// category; a participant with no category is created but enters nothing.
//
//   Name              | Level        | Category   | Number
//   Kateryna Repetska | Amateur      | Baladi     | 2
//   Kateryna Repetska | Amateur      | Oriental   | 5
//
// Headers are matched loosely (case, spaces, Portuguese synonyms).
export type ImportRow = { name: string; level: string; category: string; number: number | null };

const HEADER_ALIASES: Record<keyof ImportRow, string[]> = {
  name: ["name", "participant", "nome", "participante", "dancer", "bailarina", "bailarino"],
  level: ["level", "nivel", "nível"],
  category: ["category", "categoria"],
  number: ["number", "numero", "número", "nº", "no", "n", "order", "ordem"],
};

function normalise(s: unknown) {
  return String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function parseParticipantsSheet(buffer: Buffer): ImportRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("The workbook has no sheets.");
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
  if (grid.length < 2) throw new Error("The sheet needs a header row and at least one participant.");

  const header = (grid[0] as unknown[]).map(normalise);
  const col = (key: keyof ImportRow) => header.findIndex((h) => HEADER_ALIASES[key].map(normalise).includes(h));
  const iName = col("name");
  const iLevel = col("level");
  const iCat = col("category");
  const iNum = col("number");
  if (iName < 0) throw new Error('Missing a "Name" column.');
  if ((iLevel < 0) !== (iCat < 0)) throw new Error('"Level" and "Category" go together: add both or neither.');

  const rows: ImportRow[] = [];
  for (const raw of grid.slice(1)) {
    const r = raw as unknown[];
    const name = String(r[iName] ?? "").trim();
    if (!name) continue;
    const num = iNum >= 0 ? Number(r[iNum]) : NaN;
    rows.push({
      name,
      level: iLevel >= 0 ? String(r[iLevel] ?? "").trim() : "",
      category: iCat >= 0 ? String(r[iCat] ?? "").trim() : "",
      number: Number.isInteger(num) && num > 0 ? num : null,
    });
  }
  return rows;
}

// The template the organiser downloads and fills in.
export function participantsTemplate(): Buffer {
  const ws = XLSX.utils.aoa_to_sheet([
    ["Name", "Level", "Category", "Number"],
    ["Example Dancer", "Amateur", "Baladi", 1],
    ["Example Dancer", "Amateur", "Oriental", 3],
    ["Another Dancer", "Professional", "Drum Solo", 1],
  ]);
  ws["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 20 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Participants");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// Results export: one sheet per category with every judge's score per
// criterion, plus a summary sheet with the podiums.
export type ExportCategory = {
  level: string;
  name: string;
  status: string;
  judges: string[];
  criteria: string[];
  rows: {
    place: number;
    number: number;
    participant: string;
    rankSum: number;
    unresolvedTie: boolean;
    judges: { points: number; rank: number; byCriterion: (number | null)[] }[];
  }[];
};

export function resultsWorkbook(eventName: string, categories: ExportCategory[], champions: { level: string; rows: { place: number; name: string; placeSum: number }[] }[]): Buffer {
  const wb = XLSX.utils.book_new();

  const summary: unknown[][] = [[eventName], [], ["Level", "Category", "Place", "Participant", "Sum of ranks", "Tie"]];
  for (const c of categories) {
    for (const r of c.rows) summary.push([c.level, c.name, r.place, r.participant, r.rankSum, r.unresolvedTie ? "unresolved" : ""]);
  }
  if (champions.length) {
    summary.push([], ["Championship", "", "Place", "Participant", "Sum of places"]);
    for (const ch of champions) for (const r of ch.rows) summary.push([ch.level, "", r.place, r.name, r.placeSum]);
  }
  const ws0 = XLSX.utils.aoa_to_sheet(summary);
  ws0["!cols"] = [{ wch: 14 }, { wch: 20 }, { wch: 7 }, { wch: 30 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws0, "Summary");

  const used = new Set<string>();
  for (const c of categories) {
    const head1: unknown[] = ["Place", "No.", "Participant"];
    const head2: unknown[] = ["", "", ""];
    for (const j of c.judges) {
      head1.push(j, ...Array(c.criteria.length + 1).fill(""));
      head2.push(...c.criteria, "Total", "Rank");
      head1.push("");
    }
    head1.push("Sum of ranks");
    head2.push("");
    const data: unknown[][] = [head1, head2];
    for (const r of c.rows) {
      const line: unknown[] = [r.place, r.number, r.participant];
      for (const j of r.judges) line.push(...j.byCriterion.map((v) => v ?? ""), j.points, j.rank);
      line.push(r.rankSum);
      data.push(line);
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 6 }, { wch: 5 }, { wch: 28 }, ...Array(c.judges.length * (c.criteria.length + 2)).fill({ wch: 6 }), { wch: 12 }];
    // Sheet names: 31 chars max, no []:*?/\ and unique.
    let base = `${c.level} ${c.name}`.replace(/[\[\]:*?/\\]/g, "").slice(0, 28);
    let name = base;
    let k = 2;
    while (used.has(name)) name = `${base} ${k++}`;
    used.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
