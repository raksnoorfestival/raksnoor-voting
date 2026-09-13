import { changeAdminPassword, createAdmin, setPublicPassword } from "@/actions/admin";
import { StateForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, LinkButton, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const event = await currentEvent();
  const admins = await db.admin.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <Title>Settings</Title>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-semibold">Public results password</h2>
          <p className="mb-3 text-xs text-neutral-600">
            Whoever has this password can open the results page and see every category you have made public, with each judge&apos;s scores. Leave it blank to close the page.
          </p>
          {event ? (
            <StateForm action={setPublicPassword}>
              <input type="hidden" name="eventId" value={event.id} />
              <Field label={`Password for ${event.name}`}>
                <Input name="password" type="text" defaultValue={event.publicPassword ?? ""} autoComplete="off" />
              </Field>
              <SubmitButton>Save</SubmitButton>
            </StateForm>
          ) : (
            <p className="text-sm text-neutral-600">Create an event first.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold">Export</h2>
          <p className="mb-3 text-xs text-neutral-600">Every category with each judge&apos;s scores per criterion, plus a summary sheet with podiums and champions. Do this at the end of the festival and keep the file.</p>
          <LinkButton href="/admin/export" variant="secondary">Download results (Excel)</LinkButton>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Your password</h2>
          <StateForm action={changeAdminPassword} resetOnOk>
            <Field label="Current password"><Input name="current" type="password" autoComplete="current-password" required /></Field>
            <Field label="New password (8+ characters)"><Input name="next" type="password" autoComplete="new-password" required /></Field>
            <SubmitButton variant="secondary">Change</SubmitButton>
          </StateForm>
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold">Organisation accounts</h2>
          <ul className="mb-3 text-sm">
            {admins.map((a) => (
              <li key={a.id} className="py-0.5">
                {a.name} <span className="text-neutral-500">({a.email})</span>{a.id === admin.id && <span className="ml-1 text-xs text-wine">you</span>}
              </li>
            ))}
          </ul>
          <StateForm action={createAdmin} resetOnOk>
            <Field label="Name"><Input name="name" required /></Field>
            <Field label="Email"><Input name="email" type="email" required /></Field>
            <Field label="Password (8+ characters)"><Input name="password" type="text" required autoComplete="off" /></Field>
            <SubmitButton variant="secondary">Add admin</SubmitButton>
          </StateForm>
        </Card>
      </div>
    </>
  );
}
