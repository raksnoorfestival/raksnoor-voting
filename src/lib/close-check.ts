import type { CategoryResults } from "@/lib/results";

// The question asked before closing a category, the same on the category
// page and on the one-tap list: how many judges submitted, and how many
// dancers still miss a score from someone (a late addition, a forgotten
// criterion). Closing with gaps counts them as zero, so it must be said.
export function closeQuestion(r: CategoryResults): string {
  const submitted = new Set(r.category.sheets.filter((s) => s.submittedAt).map((s) => s.judgeId));
  const onPanel = r.judges.filter((j) => submitted.has(j.id)).length;
  const gaps = r.rows.filter((row) => !row.complete);
  const parts: string[] = [];
  if (onPanel < r.judges.length) {
    // Who, and when her last score arrived: a tablet that lost the
    // connection keeps scoring and sends later, and closing first turns
    // those scores away.
    const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Lisbon" });
    const late = r.judges
      .filter((j) => !submitted.has(j.id))
      .map((j) => `${j.name} (${r.lastScoreAt[j.id] ? `last score ${time(r.lastScoreAt[j.id])}` : "no score yet"})`);
    parts.push(`Only ${onPanel} of ${r.judges.length} judges submitted. Not submitted: ${late.join(", ")}. A tablet without connection may still be holding scores; closing now turns them away.`);
  }
  if (gaps.length) {
    const names = gaps.slice(0, 5).map((g) => `${g.entry.number} ${g.entry.participant.name}`).join(", ");
    parts.push(`${gaps.length} dancer${gaps.length === 1 ? " is" : "s are"} missing scores (${names}${gaps.length > 5 ? ", …" : ""}); missing scores count as zero.`);
  }
  return parts.length ? `${parts.join(" ")} Close anyway?` : "Close this category? Judges will no longer be able to change scores.";
}
