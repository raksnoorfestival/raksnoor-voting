import { createLibraryCategory, createLibraryLevel, deleteLibraryCategory, deleteLibraryLevel, fillLibraryFromEvent, updateLibraryCategory, updateLibraryLevel } from "@/actions/library";
import { ActionButton, StateForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Field, Input, Select, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function LibraryPage() {
  await requireAdmin();
  const [levels, events] = await Promise.all([
    db.libraryLevel.findMany({ include: { categories: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }),
    db.event.findMany({ where: { levels: { some: {} } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <Title sub="The levels and categories the festival always has. A new event copies them; changing the library never touches an event already created, so past editions keep their history.">
        Category library
      </Title>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {levels.length === 0 && (
            <Card className="text-sm text-neutral-600">The library is empty. Fill it from an existing event (on the right) or add levels one by one.</Card>
          )}
          {levels.map((l) => (
            <Card key={l.id}>
              <StateForm action={updateLibraryLevel} className="grid gap-3 sm:grid-cols-[1fr_90px_auto_auto_auto] sm:items-end">
                <input type="hidden" name="id" value={l.id} />
                <Field label="Level"><Input name="name" defaultValue={l.name} required /></Field>
                <Field label="Order"><Input name="sortOrder" type="number" defaultValue={l.sortOrder} /></Field>
                <label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" name="hasChampionship" defaultChecked={l.hasChampionship} /> Championship</label>
                <SubmitButton variant="secondary">Save</SubmitButton>
                <ActionButton action={deleteLibraryLevel.bind(null, l.id)} variant="danger" confirm={`Remove level "${l.name}" and its ${l.categories.length} categories from the library? Events already created keep theirs.`}>Delete</ActionButton>
              </StateForm>
              <div className="mt-3 divide-y divide-neutral-100 border-t border-neutral-100 pt-2">
                {l.categories.length === 0 && <div className="py-2 text-sm text-neutral-500">No categories in this level.</div>}
                {l.categories.map((c) => (
                  <StateForm key={c.id} action={updateLibraryCategory} className="grid gap-2 py-2 sm:grid-cols-[1fr_80px_auto_auto] sm:items-end">
                    <input type="hidden" name="id" value={c.id} />
                    <Field label="Category"><Input name="name" defaultValue={c.name} required /></Field>
                    <Field label="Order"><Input name="sortOrder" type="number" defaultValue={c.sortOrder} /></Field>
                    <SubmitButton variant="secondary">Save</SubmitButton>
                    <ActionButton action={deleteLibraryCategory.bind(null, c.id)} variant="ghost" confirm={`Remove "${c.name}" from the library?`}>Remove</ActionButton>
                  </StateForm>
                ))}
              </div>
              <StateForm action={createLibraryCategory} resetOnOk className="mt-3 grid gap-2 border-t border-neutral-100 pt-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <input type="hidden" name="levelId" value={l.id} />
                <Field label={`New category in ${l.name}`}><Input name="name" placeholder="Pop Song" required /></Field>
                <SubmitButton variant="secondary">Add</SubmitButton>
              </StateForm>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-semibold">New level</h2>
            <StateForm action={createLibraryLevel} resetOnOk>
              <Field label="Name"><Input name="name" placeholder="Amateur" required /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="hasChampionship" /> Has a championship</label>
              <SubmitButton>Add level</SubmitButton>
            </StateForm>
          </Card>
          <Card>
            <h2 className="mb-1 font-semibold">Fill from an event</h2>
            <p className="mb-3 text-xs text-neutral-600">Copies the levels and categories of an event into the library. Only adds what is missing; the event is not changed.</p>
            {events.length === 0 ? (
              <p className="text-sm text-neutral-600">No event with levels yet.</p>
            ) : (
              <StateForm action={fillLibraryFromEvent}>
                <Field label="Event">
                  <Select name="eventId" defaultValue={events[0].id}>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </Select>
                </Field>
                <SubmitButton variant="secondary">Fill the library</SubmitButton>
              </StateForm>
            )}
          </Card>
          <Card className="text-xs text-neutral-600">
            <div className="mb-1 font-semibold text-neutral-800">How it works</div>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Keep the library up to date once a year.</li>
              <li>Create the new event in <Badge>Events</Badge>: it copies the library.</li>
              <li>Added a category later? On the event, in Events, use &quot;Add what is missing from the library&quot;.</li>
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
