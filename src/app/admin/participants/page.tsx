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
  const [total, participants] = await Promise.all([
    db.participant.count({ where }),
    db.participant.findMany({
      where,
      include: { entries: { include: { category: { include: { level: true } } }, orderBy: { category: { sortOrder: "asc" } } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <Title sub="Every dancer or group, once. Then put them in their categories, here or from the category page.">Participants</Title>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <form className="mb-3 flex gap-2">
            <Input name="q" defaultValue={q} placeholder="Search by name" />
            <SubmitButton variant="secondary">Search</SubmitButton>
            {q && <LinkButton href="/admin/participants" variant="ghost">Clear</LinkButton>}
          </form>
          <div className="mb-2 text-xs text-neutral-500">
            {q ? `${total} match${total === 1 ? "" : "es"}` : `${total} participant${total === 1 ? "" : "s"}`}
          </div>
          <ParticipantList
            participants={participants.map((p) => ({
              id: p.id,
              name: p.name,
              notes: p.notes,
              entries: p.entries.map((e) => ({ id: e.id, categoryId: e.categoryId, number: e.number, level: e.category.level.name, category: e.category.name })),
            }))}
          />
          {participants.length === 0 && <p className="py-2 text-sm text-neutral-600">{q ? "No match." : "No participants yet."}</p>}
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
          <Card className="text-xs text-neutral-500">
            Tip: <Link href="/admin/categories" className="text-wine underline">Categories</Link> shows each category with its running order.
          </Card>
        </div>
      </div>
    </>
  );
}
