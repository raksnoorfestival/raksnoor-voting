import Link from "next/link";
import { createCategory } from "@/actions/admin";
import { StateForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Field, Input, Select, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";
import { NoEvent } from "../no-event";

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
      <Title sub="One category per level and style. Open it when the judges are ready, close it when they are done, then make the results public.">Categories</Title>
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
                  <Link key={c.id} href={`/admin/categories/${c.id}`} className="flex items-center justify-between py-2 hover:text-wine">
                    <span className="font-medium">{c.name}</span>
                    <span className="flex items-center gap-2 text-sm text-neutral-500">
                      {c._count.entries} participants
                      {c.status === "DRAFT" && <Badge>Draft</Badge>}
                      {c.status === "OPEN" && <Badge tone="open">Open</Badge>}
                      {c.status === "CLOSED" && <Badge tone="closed">Closed</Badge>}
                      {c.resultsVisible && <Badge tone="visible">Public</Badge>}
                    </span>
                  </Link>
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
