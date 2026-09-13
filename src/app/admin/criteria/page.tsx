import { createCriterion, deleteCriterion, moveCriterion, updateCriterion } from "@/actions/admin";
import { ActionButton, StateForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";
import { NoEvent } from "../no-event";

export default async function CriteriaPage() {
  await requireAdmin();
  const event = await currentEvent();
  if (!event) return <NoEvent />;
  const criteria = await db.criterion.findMany({ where: { eventId: event.id }, orderBy: { priority: "asc" } });
  return (
    <>
      <Title sub="What the judges score, 1 to the maximum. The order is the tie-break priority: when two dancers tie on ranks and placements, the first criterion decides, then the second, and so on.">Scoring criteria</Title>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {criteria.map((c, i) => (
            <Card key={c.id}>
              <StateForm action={updateCriterion} className="grid gap-3 sm:grid-cols-[40px_1fr_110px_auto_auto_auto_auto] sm:items-end">
                <input type="hidden" name="id" value={c.id} />
                <div className="pb-2 text-lg font-bold text-neutral-400">{c.priority}</div>
                <Field label="Name"><Input name="name" defaultValue={c.name} required /></Field>
                <Field label="Max points"><Input name="maxPoints" type="number" min={1} max={100} defaultValue={c.maxPoints} /></Field>
                <SubmitButton variant="secondary">Save</SubmitButton>
                <ActionButton action={moveCriterion.bind(null, c.id, -1 as const)} className={i === 0 ? "invisible" : ""}>Up</ActionButton>
                <ActionButton action={moveCriterion.bind(null, c.id, 1 as const)} className={i === criteria.length - 1 ? "invisible" : ""}>Down</ActionButton>
                <ActionButton action={deleteCriterion.bind(null, c.id)} variant="danger" confirm={`Delete "${c.name}"?`}>Delete</ActionButton>
              </StateForm>
            </Card>
          ))}
        </div>
        <Card>
          <h2 className="mb-3 font-semibold">New criterion</h2>
          <StateForm action={createCriterion} resetOnOk>
            <input type="hidden" name="eventId" value={event.id} />
            <Field label="Name"><Input name="name" required /></Field>
            <Field label="Max points"><Input name="maxPoints" type="number" min={1} max={100} defaultValue={10} /></Field>
            <SubmitButton>Create</SubmitButton>
          </StateForm>
        </Card>
      </div>
    </>
  );
}
