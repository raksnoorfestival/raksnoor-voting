// Which criteria are scored in a category: the ones that count everywhere,
// and the ones that list it (2027: Synchronization only in the groups,
// Improvisation only in Live Band and Improvisation with Drummer; Miguel,
// 29 October 2026). Every screen and the ranking ask this, so a judge never
// sees a criterion that does not count there, and the sums stay comparable
// within a category.
export type ScopedCriterion = { everywhere: boolean; categories: { id: string }[] };

export function criteriaFor<T extends ScopedCriterion>(categoryId: string, criteria: T[]): T[] {
  return criteria.filter((c) => c.everywhere || c.categories.some((x) => x.id === categoryId));
}

// The two of 2027 and where they go, for a new event: by the level's name
// (the groups) and by the category's name (live music). The criteria page
// shows and changes the result.
export const SCOPED_DEFAULTS: { name: string; matches: (c: { name: string; level: { name: string } }) => boolean }[] = [
  { name: "Synchronization", matches: (c) => /group/i.test(c.level.name) },
  { name: "Improvisation", matches: (c) => /^live band/i.test(c.name) || /^improvisation/i.test(c.name) },
];
