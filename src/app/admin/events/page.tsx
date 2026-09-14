import { createEvent, deleteEvent, setCurrentEvent, updateEvent } from "@/actions/admin";
import { copyJudgesFromEvent, copyLibraryToEventForm } from "@/actions/library";
import { ActionButton, StateForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Field, Input, Select, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EventsPage() {
  await requireAdmin();
  const events = await db.event.findMany({
    include: { _count: { select: { categories: true, participants: true, judges: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <Title sub="One event per festival edition. Judges and the public always see the current one.">Events</Title>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {events.map((e) => (
            <Card key={e.id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{e.name}</span>
                  {e.isCurrent && <Badge tone="open">Current</Badge>}
                </div>
                <div className="flex gap-2">
                  {!e.isCurrent && <ActionButton action={setCurrentEvent.bind(null, e.id)}>Make current</ActionButton>}
                  {!e.isCurrent && (
                    <ActionButton action={deleteEvent.bind(null, e.id)} variant="danger" confirm={`Delete "${e.name}" and everything in it? This cannot be undone.`}>
                      Delete
                    </ActionButton>
                  )}
                </div>
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                <span>{e._count.categories} categories, {e._count.participants} participants, {e._count.judges} judges</span>
                <StateForm action={copyLibraryToEventForm} className="grid grid-cols-[auto] items-center">
                  <input type="hidden" name="eventId" value={e.id} />
                  <SubmitButton variant="ghost">Add what is missing from the library</SubmitButton>
                </StateForm>
                {events.some((o) => o.id !== e.id && o._count.judges > 0) && (
                  <StateForm action={copyJudgesFromEvent} className="grid grid-cols-[auto_auto] items-center gap-2">
                    <input type="hidden" name="eventId" value={e.id} />
                    <Select name="fromEventId" defaultValue={events.find((o) => o.id !== e.id && o._count.judges > 0)!.id} aria-label="Copy judges from">
                      {events.filter((o) => o.id !== e.id && o._count.judges > 0).map((o) => (
                        <option key={o.id} value={o.id}>{o.name} ({o._count.judges} judges)</option>
                      ))}
                    </Select>
                    <SubmitButton variant="ghost">Copy judges</SubmitButton>
                  </StateForm>
                )}
              </div>
              <StateForm action={updateEvent} className="grid gap-3 sm:grid-cols-[1fr_150px_150px_auto] sm:items-end">
                <input type="hidden" name="id" value={e.id} />
                <Field label="Name"><Input name="name" defaultValue={e.name} required /></Field>
                <Field label="Starts"><Input name="startsAt" type="date" defaultValue={day(e.startsAt)} /></Field>
                <Field label="Ends"><Input name="endsAt" type="date" defaultValue={day(e.endsAt)} /></Field>
                <SubmitButton variant="secondary">Save</SubmitButton>
              </StateForm>
            </Card>
          ))}
        </div>
        <Card>
          <h2 className="mb-3 font-semibold">New event</h2>
          <StateForm action={createEvent} resetOnOk>
            <Field label="Name"><Input name="name" placeholder="Raks Noor Festival 2026" required /></Field>
            <Field label="Starts"><Input name="startsAt" type="date" /></Field>
            <Field label="Ends"><Input name="endsAt" type="date" /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="fromLibrary" defaultChecked /> Copy levels and categories from the library</label>
            {events.some((o) => o._count.judges > 0) && (
              <>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="copyJudges" defaultChecked /> Copy the judges from</label>
                <Select name="copyJudgesFrom" defaultValue={events.find((o) => o._count.judges > 0)!.id} aria-label="Copy the judges from">
                  {events.filter((o) => o._count.judges > 0).map((o) => (
                    <option key={o.id} value={o.id}>{o.name} ({o._count.judges} judges)</option>
                  ))}
                </Select>
              </>
            )}
            <SubmitButton>Create</SubmitButton>
            <p className="text-xs text-neutral-500">The five usual criteria are added automatically. Judges and participants are entered per event.</p>
          </StateForm>
        </Card>
      </div>
    </>
  );
}
