import Link from "next/link";
import { createParticipant, deleteParticipant, importParticipants, updateParticipant } from "@/actions/admin";
import { ActionButton, StateForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";
import { NoEvent } from "../no-event";

export default async function ParticipantsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const event = await currentEvent();
  if (!event) return <NoEvent />;
  const { q = "" } = await searchParams;
  const participants = await db.participant.findMany({
    where: { eventId: event.id, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
    include: { entries: { include: { category: { include: { level: true } } } } },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <Title sub="Every dancer or group, once. Then put them in their categories, here or from the category page.">Participants</Title>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <form className="mb-3 flex gap-2">
            <Input name="q" defaultValue={q} placeholder="Search by name" />
            <SubmitButton variant="secondary">Search</SubmitButton>
          </form>
          <div className="space-y-2">
            {participants.map((p) => (
              <Card key={p.id} className="p-3">
                <StateForm action={updateParticipant} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                  <input type="hidden" name="id" value={p.id} />
                  <Field label="Name"><Input name="name" defaultValue={p.name} required /></Field>
                  <Field label="Notes"><Input name="notes" defaultValue={p.notes ?? ""} placeholder="school, country, contact" /></Field>
                  <SubmitButton variant="secondary">Save</SubmitButton>
                  <ActionButton action={deleteParticipant.bind(null, p.id)} variant="danger" confirm={`Delete ${p.name}?`}>Delete</ActionButton>
                </StateForm>
                <div className="mt-2 flex flex-wrap gap-1 text-xs">
                  {p.entries.length === 0 && <span className="text-neutral-400">In no category yet</span>}
                  {p.entries.map((e) => (
                    <Link key={e.id} href={`/admin/categories/${e.categoryId}`} className="rounded-full bg-neutral-100 px-2 py-0.5 hover:bg-wine-light hover:text-wine">
                      {e.category.level.name} / {e.category.name} #{e.number}
                    </Link>
                  ))}
                </div>
              </Card>
            ))}
            {participants.length === 0 && <Card className="text-sm text-neutral-600">{q ? "No match." : "No participants yet."}</Card>}
          </div>
        </div>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold">Add one</h2>
            <StateForm action={createParticipant} resetOnOk>
              <input type="hidden" name="eventId" value={event.id} />
              <Field label="Name"><Input name="name" required /></Field>
              <Field label="Notes"><Input name="notes" /></Field>
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
        </div>
      </div>
    </>
  );
}
