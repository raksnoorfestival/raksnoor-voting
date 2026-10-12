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
  if (onPanel < r.judges.length) parts.push(`Only ${onPanel} of ${r.judges.length} judges submitted.`);
  if (gaps.length) {
    const names = gaps.slice(0, 5).map((g) => `${g.entry.number} ${g.entry.participant.name}`).join(", ");
    parts.push(`${gaps.length} dancer${gaps.length === 1 ? " is" : "s are"} missing scores (${names}${gaps.length > 5 ? ", …" : ""}); missing scores count as zero.`);
  }
  return parts.length ? `${parts.join(" ")} Close anyway?` : "Close this category? Judges will no longer be able to change scores.";
}
