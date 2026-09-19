import Link from "next/link";
import { createParticipant, importParticipants } from "@/actions/admin";
import { StateForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, LinkButton, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";
import { NoEvent } from "../no-event";
import { ParticipantList } from "./participant-list";

export default async function ParticipantsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const event = await currentEvent();
  if (!event) return <NoEvent />;
  const { q = "" } = await searchParams;
  const where = { eventId: event.id, ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}) };
  const [total, participants, levels] = await Promise.all([
    db.participant.count({ where }),
    db.participant.findMany({
      where,
      include: { entries: { include: { category: { include: { level: true } } }, orderBy: { category: { sortOrder: "asc" } } } },
      orderBy: { name: "asc" },
    }),
    db.level.findMany({ where: { eventId: event.id }, include: { categories: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <Title sub="Every dancer or group, once. Then put them in their categories, here or from the category page.">Participants</Title>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <ParticipantList
            query={q}
            total={total}
            participants={participants.map((p) => ({
              id: p.id,
              name: p.name,
              notes: p.notes,
              entries: p.entries.map((e) => ({ id: e.id, categoryId: e.categoryId, number: e.number, level: e.category.level.name, category: e.category.name })),
            }))}
          />
        </div>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold">Add one</h2>
            <StateForm action={createParticipant} resetOnOk>
              <input type="hidden" name="eventId" value={event.id} />
              <Field label="Name"><Input name="name" required /></Field>
              <Field label="Notes"><Input name="notes" /></Field>
              <Field label="Categories">
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 p-2">
                  {levels.map((l) => (
                    <div key={l.id}>
                      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{l.name}</div>
                      {l.categories.length === 0 && <div className="text-xs text-neutral-400">No categories.</div>}
                      {l.categories.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 py-0.5 text-sm">
                          <input type="checkbox" name="categories" value={c.id} className="h-4 w-4 accent-wine" />
                          {c.name}
                        </label>
                      ))}
                    </div>
                  ))}
                  {levels.length === 0 && <div className="text-xs text-neutral-400">No levels yet.</div>}
                </div>
              </Field>
              <SubmitButton>Add</SubmitButton>
            </StateForm>
          </Card>
          <Card>
            <h2 className="mb-1 font-semibold">Import from Excel</h2>
            <p className="mb-3 text-xs text-neutral-600">
              Columns: <strong>Name, Level, Category, Number</strong>. One row per participant per category. Levels and categories must already exist with the same names. Existing names are reused, never duplicated.{" "}
              <a href="/admin/template" className="text-wine underline">Download the template</a>.
            </p>
            <StateForm action={importParticipants} resetOnOk>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="file" name="file" accept=".xlsx,.xls,.csv" required className="block w-full text-sm" />
              <SubmitButton>Import</SubmitButton>
            </StateForm>
          </Card>
          <Card className="text-xs text-neutral-500">
            Tip: <Link href="/admin/categories" className="text-wine underline">Categories</Link> shows each category with its running order.
          </Card>
        </div>
      </div>
    </>
  );
}
