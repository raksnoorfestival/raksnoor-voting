import { createJudge, deleteJudge, updateJudge } from "@/actions/admin";
import { ActionButton, StateForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Field, Input, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";
import { NoEvent } from "../no-event";
import { JudgeCategories } from "./judge-categories";

export default async function JudgesPage() {
  await requireAdmin();
  const event = await currentEvent();
  if (!event) return <NoEvent />;
  const [judges, levels] = await Promise.all([
    db.judge.findMany({ where: { eventId: event.id }, include: { _count: { select: { scores: true } }, categories: true }, orderBy: { sortOrder: "asc" } }),
    db.level.findMany({ where: { eventId: event.id }, include: { categories: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <>
      <Title sub="Each judge signs in on any tablet or phone with their name and the password you set here. A judge votes in every category unless you pick theirs below; only the judges on a panel count in its results.">Judges</Title>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {judges.map((j) => (
            <Card key={j.id}>
              <StateForm action={updateJudge} className="grid gap-3 sm:grid-cols-[1fr_1fr_80px_auto_auto_auto] sm:items-end">
                <input type="hidden" name="id" value={j.id} />
                <Field label="Name"><Input name="name" defaultValue={j.name} required /></Field>
                <Field label="New password"><Input name="password" type="text" autoComplete="off" placeholder="blank keeps the current one" /></Field>
                <Field label="Order"><Input name="sortOrder" type="number" defaultValue={j.sortOrder} /></Field>
                <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={j.active} /> Active</label>
                <SubmitButton variant="secondary">Save</SubmitButton>
                <ActionButton action={deleteJudge.bind(null, j.id)} variant="danger" confirm={`Delete judge "${j.name}"?`}>Delete</ActionButton>
              </StateForm>
              <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                {!j.active && <Badge>Inactive</Badge>}
                {j._count.scores} scores given
                {!j.allCategories && <Badge tone="wine">{j.categories.length} categories</Badge>}
              </div>
              <JudgeCategories key={`${j.allCategories}:${j.categories.map((c) => c.categoryId).sort().join(",")}`} judgeId={j.id} allCategories={j.allCategories} assigned={j.categories.map((c) => c.categoryId)} levels={levels} />
            </Card>
          ))}
          {judges.length === 0 && <Card className="text-sm text-neutral-600">No judges yet.</Card>}
        </div>
        <Card>
          <h2 className="mb-3 font-semibold">New judge</h2>
          <StateForm action={createJudge} resetOnOk>
            <input type="hidden" name="eventId" value={event.id} />
            <Field label="Name (used to sign in)"><Input name="name" required autoComplete="off" /></Field>
            <Field label="Password"><Input name="password" type="text" required autoComplete="off" /></Field>
            <SubmitButton>Create</SubmitButton>
            <p className="text-xs text-neutral-500">Write the password down for the judge. You can set a new one here at any time.</p>
          </StateForm>
        </Card>
      </div>
    </>
  );
}
