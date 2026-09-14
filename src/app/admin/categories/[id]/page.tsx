import Link from "next/link";
import { notFound } from "next/navigation";
import { addEntry, clearTie, deleteCategory, removeEntry, setCategoryStatus, setResultsVisible, updateCategory } from "@/actions/admin";
import { ActionButton, StateForm, SubmitButton } from "@/components/forms";
import { ResultsTable, TieNotice } from "@/components/results-table";
import { Badge, Card, Field, Input, Notice, Select, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { categoryResults } from "@/lib/results";
import { EntryNumber } from "./entry-number";
import { TieDecider } from "./tie-decider";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const results = await categoryResults(id);
  if (!results) notFound();
  const { category, judges, rows } = results;
  const [levels, participants] = await Promise.all([
    db.level.findMany({ where: { eventId: category.eventId }, orderBy: { sortOrder: "asc" } }),
    db.participant.findMany({ where: { eventId: category.eventId }, orderBy: { name: "asc" } }),
  ]);
  const inCategory = new Set(category.entries.map((e) => e.participantId));
  const available = participants.filter((p) => !inCategory.has(p.id));
  const submitted = new Set(category.sheets.filter((s) => s.submittedAt).map((s) => s.judgeId));
  const hasScores = rows.some((r) => r.judges.some((j) => j.byCriterion.some((v) => v !== null)));
  const tieGroups = new Map<number, typeof rows>();
  for (const r of rows.filter((x) => x.unresolvedTie)) tieGroups.set(r.place, [...(tieGroups.get(r.place) ?? []), r]);
  const decidedTies = rows.some((r) => r.decidedByAdmin);

  return (
    <>
      <div className="mb-2">
        <Link href="/admin/categories" className="text-sm text-wine">&larr; Categories</Link>
      </div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{category.level.name}</div>
          <h1 className="text-2xl font-bold">{category.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {category.status === "DRAFT" && <Badge>Draft</Badge>}
          {category.status === "OPEN" && <Badge tone="open">Open to judges</Badge>}
          {category.status === "CLOSED" && <Badge tone="closed">Closed</Badge>}
          {category.resultsVisible && <Badge tone="visible">Public</Badge>}
        </div>
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-2">
        {category.status !== "OPEN" && (
          <ActionButton action={setCategoryStatus.bind(null, id, "OPEN" as const)} variant="primary" confirm={category.status === "CLOSED" ? "Reopen this category? Judges will be able to change their scores again." : undefined}>
            {category.status === "CLOSED" ? "Reopen" : "Open to judges"}
          </ActionButton>
        )}
        {category.status === "OPEN" && (
          <ActionButton action={setCategoryStatus.bind(null, id, "CLOSED" as const)} variant="primary" confirm={submitted.size < judges.length ? `Only ${submitted.size} of ${judges.length} judges submitted. Close anyway?` : "Close this category? Judges will no longer be able to change scores."}>
            Close category
          </ActionButton>
        )}
        {category.resultsVisible ? (
          <ActionButton action={setResultsVisible.bind(null, id, false)}>Hide from public</ActionButton>
        ) : (
          <ActionButton action={setResultsVisible.bind(null, id, true)} disabled={category.status !== "CLOSED"} title={category.status !== "CLOSED" ? "Close the category first" : undefined}>
            Show on public page
          </ActionButton>
        )}
        <span className="ml-auto text-sm text-neutral-600">
          Judges submitted: {submitted.size}/{judges.length}
          {judges.length > 0 && (
            <span className="ml-2 text-xs text-neutral-500">({judges.map((j) => (submitted.has(j.id) ? `${j.name} ✓` : j.name)).join(", ")})</span>
          )}
        </span>
      </Card>

      {tieGroups.size > 0 && (
        <Card className="mb-4 space-y-3">
          <TieNotice results={results} />
          {[...tieGroups.entries()].map(([place, group]) => (
            <TieDecider
              key={place}
              categoryId={id}
              place={place}
              entries={group.map((r) => ({ id: r.entryId, name: r.entry.participant.name }))}
            />
          ))}
        </Card>
      )}
      {decidedTies && (
        <div className="mb-4 flex items-center gap-3">
          <Notice kind="info">A tie in this category was decided by the jury.</Notice>
          <ActionButton action={clearTie.bind(null, id)} variant="ghost" confirm="Remove the jury decision and show the tie again?">Undo decision</ActionButton>
        </div>
      )}

      <Card className="mb-4">
        <h2 className="mb-3 font-semibold">Results {category.status === "OPEN" && <span className="text-xs font-normal text-neutral-500">(live, refreshes every 15 s)</span>}</h2>
        <ResultsTable results={results} detailed />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <h2 className="mb-3 font-semibold">Participants and running order</h2>
          {category.entries.length === 0 && <p className="text-sm text-neutral-600">Nobody yet. Add participants on the right.</p>}
          <div className="divide-y divide-neutral-100">
            {category.entries.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2">
                <EntryNumber entryId={e.id} number={e.number} disabled={category.status === "CLOSED"} />
                <span className="flex-1 font-medium">{e.participant.name}</span>
                <ActionButton action={removeEntry.bind(null, e.id)} variant="ghost" confirm={`Remove ${e.participant.name} from this category?`}>Remove</ActionButton>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold">Add participant</h2>
            {available.length === 0 ? (
              <p className="text-sm text-neutral-600">
                Everyone is already in. <Link href="/admin/participants" className="text-wine underline">Add participants</Link>.
              </p>
            ) : (
              <StateForm action={addEntry} resetOnOk>
                <input type="hidden" name="categoryId" value={id} />
                <Field label="Participant">
                  <Select name="participantId" required defaultValue="">
                    <option value="" disabled>Choose</option>
                    {available.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Number (blank = next)"><Input name="number" type="number" min={1} /></Field>
                <SubmitButton>Add</SubmitButton>
              </StateForm>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">Edit category</h2>
            <StateForm action={updateCategory}>
              <input type="hidden" name="id" value={id} />
              <Field label="Name"><Input name="name" defaultValue={category.name} required /></Field>
              <Field label="Level">
                <Select name="levelId" defaultValue={category.levelId}>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Order within level"><Input name="sortOrder" type="number" defaultValue={category.sortOrder} /></Field>
              <SubmitButton variant="secondary">Save</SubmitButton>
            </StateForm>
            <div className="mt-4 border-t border-neutral-100 pt-3">
              {hasScores ? (
                <p className="text-xs text-neutral-500">This category has scores and cannot be deleted.</p>
              ) : (
                <ActionButton action={deleteCategory.bind(null, id)} variant="danger" confirm={`Delete "${category.name}"?`}>Delete category</ActionButton>
              )}
            </div>
          </Card>
        </div>
      </div>
      {category.status === "OPEN" && <AutoRefresh seconds={15} />}
    </>
  );
}
