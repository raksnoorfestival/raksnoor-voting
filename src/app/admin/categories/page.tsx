import Link from "next/link";
import { createCategory } from "@/actions/admin";
import { StateForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Field, Input, Select, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";
import { NoEvent } from "../no-event";
import { QuickControls } from "./quick-controls";

export default async function CategoriesPage() {
  await requireAdmin();
  const event = await currentEvent();
  if (!event) return <NoEvent />;
  const levels = await db.level.findMany({
    where: { eventId: event.id },
    include: { categories: { include: { _count: { select: { entries: true } } }, orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return (
    <>
      <Title sub="One category per level and style. One tap opens or closes a category to the judges. Results can go public only once the category is closed. Tap the name for scores, participants and ties.">Categories</Title>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {levels.map((l) => (
            <Card key={l.id}>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-semibold">{l.name}</span>
                {l.hasChampionship && <Badge tone="wine">Championship</Badge>}
              </div>
              {l.categories.length === 0 && <div className="text-sm text-neutral-500">No categories in this level.</div>}
              <div className="divide-y divide-neutral-100">
                {l.categories.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/admin/categories/${c.id}`} className="font-medium hover:text-wine">
                      {c.name}
                      <span className="ml-2 text-sm font-normal text-neutral-500">{c._count.entries} participants</span>
                    </Link>
                    <QuickControls id={c.id} status={c.status} resultsVisible={c.resultsVisible} />
                  </div>
                ))}
              </div>
            </Card>
          ))}
          {levels.length === 0 && (
            <Card className="text-sm text-neutral-600">
              Create the <Link className="text-wine underline" href="/admin/levels">levels</Link> first.
            </Card>
          )}
        </div>
        <Card>
          <h2 className="mb-3 font-semibold">New category</h2>
          <StateForm action={createCategory} resetOnOk>
            <input type="hidden" name="eventId" value={event.id} />
            <Field label="Level">
              <Select name="levelId" required defaultValue="">
                <option value="" disabled>Choose</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Name"><Input name="name" placeholder="Oriental" required /></Field>
            <SubmitButton>Create</SubmitButton>
          </StateForm>
        </Card>
      </div>
    </>
  );
}
