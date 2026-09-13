import { createLevel, deleteLevel, updateLevel } from "@/actions/admin";
import { ActionButton, StateForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";
import { NoEvent } from "../no-event";

export default async function LevelsPage() {
  await requireAdmin();
  const event = await currentEvent();
  if (!event) return <NoEvent />;
  const levels = await db.level.findMany({ where: { eventId: event.id }, include: { _count: { select: { categories: true } } }, orderBy: { sortOrder: "asc" } });
  return (
    <>
      <Title sub="Amateur, Advanced, Professional, Master, Kids, Teens, Ladies, Groups. A level with a championship crowns whoever competes in all its categories.">Levels</Title>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {levels.map((l) => (
            <Card key={l.id}>
              <StateForm action={updateLevel} className="grid gap-3 sm:grid-cols-[1fr_90px_auto_auto_auto] sm:items-end">
                <input type="hidden" name="id" value={l.id} />
                <Field label="Name"><Input name="name" defaultValue={l.name} required /></Field>
                <Field label="Order"><Input name="sortOrder" type="number" defaultValue={l.sortOrder} /></Field>
                <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" name="hasChampionship" defaultChecked={l.hasChampionship} /> Championship</label>
                <SubmitButton variant="secondary">Save</SubmitButton>
                <ActionButton action={deleteLevel.bind(null, l.id)} variant="danger" confirm={`Delete level "${l.name}"?`}>Delete</ActionButton>
              </StateForm>
              <div className="mt-2 text-xs text-neutral-500">{l._count.categories} categories</div>
            </Card>
          ))}
          {levels.length === 0 && <Card className="text-sm text-neutral-600">No levels yet.</Card>}
        </div>
        <Card>
          <h2 className="mb-3 font-semibold">New level</h2>
          <StateForm action={createLevel} resetOnOk>
            <input type="hidden" name="eventId" value={event.id} />
            <Field label="Name"><Input name="name" placeholder="Amateur" required /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="hasChampionship" /> Has a championship</label>
            <SubmitButton>Create</SubmitButton>
          </StateForm>
        </Card>
      </div>
    </>
  );
}
