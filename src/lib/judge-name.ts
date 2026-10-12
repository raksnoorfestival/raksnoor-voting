// How people really type a judge's name on a tablet: any case, with or
// without accents, with the iPad's curly apostrophe or none at all
// ("D'Ambra", "D’Ambra", "DAmbra"), extra spaces. And the first name alone
// when no other judge of the event has it. On 11 October 2026 Alessandra
// failed four times on exactly this.
export function foldName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`´.\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchJudge<T extends { name: string }>(judges: T[], typed: string): T | null {
  const t = foldName(typed);
  if (!t) return null;
  const tight = (s: string) => s.replace(/ /g, "");
  const full = judges.filter((j) => tight(foldName(j.name)) === tight(t));
  if (full.length === 1) return full[0];
  if (full.length > 1) return null;
  const first = judges.filter((j) => foldName(j.name).split(" ")[0] === t);
  return first.length === 1 ? first[0] : null;
}
